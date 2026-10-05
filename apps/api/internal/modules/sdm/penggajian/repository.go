package penggajian

import (
	"errors"
	"time"

	"api/internal/modules/sdm/absen"
	"api/internal/modules/sdm/guru"
	"api/internal/modules/sdm/master"
	"api/model"

	"gorm.io/gorm"
)

// Data adalah kumpulan data mentah yang dibutuhkan kalkulasi satu periode.
type Data struct {
	Periode       time.Time
	Employees     []guru.Employee      // karyawan yang punya absen di periode tsb (preload Golongan)
	AbsenByEmp    map[uint]absen.Absen // key: employee_id
	Golongan      []master.Golongan    // urut id (untuk golongan efektif)
	Kehadiran     int                  // tarif per hari
	Kedisiplinan  map[string]master.Kedisiplinan
	Fungsional    map[uint][]guru.FungsionalDetail
	TugasTambahan map[uint][]guru.TugasTambahanDetail
	Penanggung    map[uint][]guru.PenanggungJawabDetail
	Lainlain      map[uint][]guru.LainlainDetail
	Angsuran      map[uint]int // key: employee_id → total angsuran periode tsb
}

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository { return &Repository{db: db} }

// CountActiveEmployees menghitung karyawan aktif.
func (r *Repository) CountActiveEmployees() (int64, error) {
	var count int64
	err := r.db.Table("sdm_employees").Where("is_active = ?", true).Count(&count).Error
	return count, err
}

// CountGolongan menghitung jumlah golongan.
func (r *Repository) CountGolongan() (int64, error) {
	var count int64
	err := r.db.Table("sdm_golongan").Count(&count).Error
	return count, err
}

// PinjamanStats menghitung pinjaman aktif (belum lunas).
func (r *Repository) PinjamanStats() (count, totalSisa int64, err error) {
	type stat struct {
		Count int64
		Sisa  int64
	}
	var s stat
	err = r.db.Table("sdm_pinjam").
		Select("COUNT(*) AS count, COALESCE(SUM(sisa),0) AS sisa").
		Where("is_lunas = ?", false).
		Scan(&s).Error
	return s.Count, s.Sisa, err
}

// GuruPerGolonganEfektif menghitung jumlah karyawan aktif per golongan
// EFEKTIF (dihitung dari masa kerja pada `asOf`), bukan golongan tersimpan —
// agar statistik konsisten dengan golongan yang dipakai menghitung gaji.
func (r *Repository) GuruPerGolonganEfektif(asOf time.Time) ([]GolonganStat, error) {
	var emps []guru.Employee
	if err := r.db.Where("is_active = ?", true).Find(&emps).Error; err != nil {
		return nil, err
	}
	var golongans []master.Golongan
	if err := r.db.Order("id ASC").Find(&golongans).Error; err != nil {
		return nil, err
	}
	kodeByID := make(map[uint]string, len(golongans))
	order := make([]string, 0, len(golongans))
	for _, g := range golongans {
		kodeByID[g.ID] = g.Kode
		order = append(order, g.Kode)
	}
	counts := map[string]int{}
	for i := range emps {
		id := guru.ResolveEffectiveGolongan(golongans, &emps[i], asOf)
		if kode, ok := kodeByID[id]; ok {
			counts[kode]++
		}
	}
	out := make([]GolonganStat, 0, len(order))
	for _, kode := range order {
		out = append(out, GolonganStat{Kode: kode, Jumlah: counts[kode]})
	}
	return out, nil
}

// ── Snapshot penggajian ──

// FindPayrollPeriode mengambil header snapshot satu periode (nil bila belum ada).
func (r *Repository) FindPayrollPeriode(periode time.Time) (*PayrollPeriode, error) {
	var pp PayrollPeriode
	err := r.db.Where("periode = ?", periode).First(&pp).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &pp, nil
}

// SaveSnapshot menulis snapshot satu periode secara transaksional: upsert
// header (status → finalized) lalu replace seluruh baris detail.
func (r *Repository) SaveSnapshot(periode time.Time, userID uint, totalGaji int, details []PayrollDetail) (*PayrollPeriode, error) {
	var saved *PayrollPeriode
	err := r.db.Transaction(func(tx *gorm.DB) error {
		now := time.Now()
		var pp PayrollPeriode
		err := tx.Where("periode = ?", periode).First(&pp).Error
		switch {
		case err == nil:
			pp.Status = StatusFinalized
			pp.UserID = &userID
			pp.TotalGaji = totalGaji
			pp.FinalizedAt = &now
			if err := tx.Save(&pp).Error; err != nil {
				return err
			}
			if err := tx.Where("payroll_periode_id = ?", pp.ID).Delete(&PayrollDetail{}).Error; err != nil {
				return err
			}
		case errors.Is(err, gorm.ErrRecordNotFound):
			pp = PayrollPeriode{
				Periode: periode, Status: StatusFinalized,
				UserID: &userID, TotalGaji: totalGaji, FinalizedAt: &now,
			}
			if err := tx.Create(&pp).Error; err != nil {
				return err
			}
		default:
			return err
		}

		for i := range details {
			details[i].PayrollPeriodeID = pp.ID
		}
		if len(details) > 0 {
			if err := tx.Create(&details).Error; err != nil {
				return err
			}
		}
		saved = &pp
		return nil
	})
	return saved, err
}

// UnlockSnapshot membuka kembali periode (koreksi): hapus snapshot, status → open.
func (r *Repository) UnlockSnapshot(periode time.Time) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var pp PayrollPeriode
		if err := tx.Where("periode = ?", periode).First(&pp).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("Periode belum difinalisasi")
			}
			return err
		}
		pp.Status = StatusOpen
		pp.FinalizedAt = nil
		if err := tx.Save(&pp).Error; err != nil {
			return err
		}
		return tx.Where("payroll_periode_id = ?", pp.ID).Delete(&PayrollDetail{}).Error
	})
}

// FindPayrollDetails mengambil seluruh baris snapshot satu periode (urutan slip).
func (r *Repository) FindPayrollDetails(payrollPeriodeID uint) ([]PayrollDetail, error) {
	var rows []PayrollDetail
	err := r.db.Where("payroll_periode_id = ?", payrollPeriodeID).
		Order("employee_id ASC, urutan ASC, id ASC").
		Find(&rows).Error
	return rows, err
}

// FindEmployeesByIDs mengambil karyawan (preload golongan) untuk rekonstruksi
// nama & kode golongan saat membaca snapshot.
func (r *Repository) FindEmployeesByIDs(ids []uint) ([]guru.Employee, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	var emps []guru.Employee
	err := r.db.Preload("Golongan").Where("id IN ?", ids).Find(&emps).Error
	return emps, err
}

// FindAcademicYear mengambil tahun ajaran (untuk rentang periode rekap).
func (r *Repository) FindAcademicYear(id uint) (*model.AcademicYear, error) {
	var ay model.AcademicYear
	err := r.db.First(&ay, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, errors.New("Tahun ajaran tidak ditemukan")
	}
	if err != nil {
		return nil, err
	}
	return &ay, nil
}

// EmployeePeriods mengambil periode (payday) di mana karyawan punya absen —
// dipakai riwayat publik lintas tahun ajaran.
func (r *Repository) EmployeePeriods(employeeID uint) ([]time.Time, error) {
	var periods []time.Time
	err := r.db.Table("sdm_absen").
		Distinct("periode").
		Where("employee_id = ? AND deleted_at IS NULL", employeeID).
		Order("periode DESC").
		Pluck("periode", &periods).Error
	return periods, err
}

// LoadData mengambil seluruh data yang dibutuhkan untuk menghitung gaji
// satu periode. Karyawan yang dihitung = yang punya absen di periode tsb
// (sesuai perilaku lama: guru tanpa absen tidak muncul di penggajian bulan itu).
func (r *Repository) LoadData(periode time.Time) (*Data, error) {
	d := &Data{
		Periode:       periode,
		AbsenByEmp:    map[uint]absen.Absen{},
		Fungsional:    map[uint][]guru.FungsionalDetail{},
		TugasTambahan: map[uint][]guru.TugasTambahanDetail{},
		Penanggung:    map[uint][]guru.PenanggungJawabDetail{},
		Lainlain:      map[uint][]guru.LainlainDetail{},
		Angsuran:      map[uint]int{},
	}

	// Golongan & konfigurasi tarif.
	if err := r.db.Order("id ASC").Find(&d.Golongan).Error; err != nil {
		return nil, err
	}
	var kehadiran master.TarifKehadiran
	if err := r.db.Order("id ASC").First(&kehadiran).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
	}
	d.Kehadiran = kehadiran.NilaiPerHari

	var kd []master.Kedisiplinan
	if err := r.db.Find(&kd).Error; err != nil {
		return nil, err
	}
	d.Kedisiplinan = make(map[string]master.Kedisiplinan, len(kd))
	for _, k := range kd {
		d.Kedisiplinan[k.Kode] = k
	}

	// Absen periode tsb → karyawan terkait (preload golongan).
	var absens []absen.Absen
	if err := r.db.Preload("Employee.Golongan").
		Where("periode = ?", periode).
		Find(&absens).Error; err != nil {
		return nil, err
	}
	for i := range absens {
		a := absens[i]
		d.AbsenByEmp[a.EmployeeID] = a
		if a.Employee != nil {
			d.Employees = append(d.Employees, *a.Employee)
		}
	}

	// Lampiran HR untuk seluruh karyawan tsb (batch).
	empIDs := make([]uint, 0, len(d.Employees))
	for _, e := range d.Employees {
		empIDs = append(empIDs, e.ID)
	}
	if len(empIDs) == 0 {
		return d, nil
	}

	var f []guru.FungsionalDetail
	if err := r.db.Preload("Fungsional").Where("employee_id IN ?", empIDs).Find(&f).Error; err != nil {
		return nil, err
	}
	for i := range f {
		d.Fungsional[f[i].EmployeeID] = append(d.Fungsional[f[i].EmployeeID], f[i])
	}

	var t []guru.TugasTambahanDetail
	if err := r.db.Preload("TugasTambahan").Where("employee_id IN ?", empIDs).Find(&t).Error; err != nil {
		return nil, err
	}
	for i := range t {
		d.TugasTambahan[t[i].EmployeeID] = append(d.TugasTambahan[t[i].EmployeeID], t[i])
	}

	var p []guru.PenanggungJawabDetail
	if err := r.db.Preload("PenanggungJawab").Where("employee_id IN ?", empIDs).Find(&p).Error; err != nil {
		return nil, err
	}
	for i := range p {
		d.Penanggung[p[i].EmployeeID] = append(d.Penanggung[p[i].EmployeeID], p[i])
	}

	var l []guru.LainlainDetail
	if err := r.db.Preload("Lainlain").Where("employee_id IN ?", empIDs).Find(&l).Error; err != nil {
		return nil, err
	}
	for i := range l {
		d.Lainlain[l[i].EmployeeID] = append(d.Lainlain[l[i].EmployeeID], l[i])
	}

	// Angsuran periode tsb: pinjam_detail → pinjam → employee_id.
	type row struct {
		EmployeeID uint
		Total      int
	}
	var angsuranRows []row
	if err := r.db.Table("sdm_pinjam_detail").
		Select("sdm_pinjam.employee_id, SUM(sdm_pinjam_detail.angsuran) AS total").
		Joins("JOIN sdm_pinjam ON sdm_pinjam.id = sdm_pinjam_detail.pinjam_id").
		Where("sdm_pinjam_detail.periode = ?", periode).
		Group("sdm_pinjam.employee_id").
		Scan(&angsuranRows).Error; err != nil {
		return nil, err
	}
	for _, rw := range angsuranRows {
		d.Angsuran[rw.EmployeeID] = rw.Total
	}

	return d, nil
}
