package guru

import (
	"errors"

	"gorm.io/gorm"
)

// Repository menyediakan operasi baca/tulis karyawan & lampiran HR.
type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository { return &Repository{db: db} }

// ── Employee ──

func (r *Repository) FindAll(search string, golonganID *uint, activeOnly bool) ([]Employee, error) {
	var rows []Employee
	q := r.db.Preload("Golongan").Order("nama ASC")
	if search != "" {
		q = q.Where("nama ILIKE ?", "%"+search+"%")
	}
	if golonganID != nil {
		q = q.Where("golongan_id = ?", *golonganID)
	}
	if activeOnly {
		q = q.Where("is_active = ?", true)
	}
	err := q.Find(&rows).Error
	return rows, err
}

func (r *Repository) FindByID(id uint) (*Employee, error) {
	var e Employee
	err := r.db.Preload("Golongan").First(&e, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, errors.New("Karyawan tidak ditemukan")
	}
	return &e, err
}

func (r *Repository) Create(e *Employee) error { return r.db.Create(e).Error }

func (r *Repository) Update(e *Employee) error { return r.db.Save(e).Error }

func (r *Repository) Delete(id uint) error { return r.db.Delete(&Employee{}, id).Error }

// HasTransactionData memeriksa apakah karyawan sudah punya absen/pinjaman
// (pelindung hapus — mencegah kehilangan data historis).
func (r *Repository) HasTransactionData(employeeID uint) (bool, error) {
	var absenCount, pinjamCount int64
	if err := r.db.Table("sdm_absen").Where("employee_id = ?", employeeID).Count(&absenCount).Error; err != nil {
		return false, err
	}
	if err := r.db.Table("sdm_pinjam").Where("employee_id = ?", employeeID).Count(&pinjamCount).Error; err != nil {
		return false, err
	}
	return absenCount > 0 || pinjamCount > 0, nil
}

// ── HR details ──

func (r *Repository) GetHRBundle(employeeID uint) (*HRBundle, error) {
	var f []FungsionalDetail
	if err := r.db.Preload("Fungsional").Where("employee_id = ?", employeeID).Order("id ASC").Find(&f).Error; err != nil {
		return nil, err
	}
	var t []TugasTambahanDetail
	if err := r.db.Preload("TugasTambahan").Where("employee_id = ?", employeeID).Order("id ASC").Find(&t).Error; err != nil {
		return nil, err
	}
	var p []PenanggungJawabDetail
	if err := r.db.Preload("PenanggungJawab").Where("employee_id = ?", employeeID).Order("id ASC").Find(&p).Error; err != nil {
		return nil, err
	}
	var l []LainlainDetail
	if err := r.db.Preload("Lainlain").Where("employee_id = ?", employeeID).Order("id ASC").Find(&l).Error; err != nil {
		return nil, err
	}

	bundle := &HRBundle{
		Fungsional:      make([]FungsionalItem, 0, len(f)),
		TugasTambahan:   make([]TugasTambahanItem, 0, len(t)),
		PenanggungJawab: make([]PenanggungJawabItem, 0, len(p)),
		Lainlain:        make([]LainlainItem, 0, len(l)),
	}
	for _, d := range f {
		bundle.Fungsional = append(bundle.Fungsional, FungsionalItem{
			ID: d.ID, FungsionalID: d.FungsionalID,
			Nama: d.Fungsional.Nama, Nilai: d.Fungsional.Nilai,
		})
	}
	for _, d := range t {
		bundle.TugasTambahan = append(bundle.TugasTambahan, TugasTambahanItem{
			ID: d.ID, TugasTambahanID: d.TugasTambahanID,
			Nama: d.TugasTambahan.Nama, Nilai: d.Nilai,
		})
	}
	for _, d := range p {
		bundle.PenanggungJawab = append(bundle.PenanggungJawab, PenanggungJawabItem{
			ID: d.ID, PenanggungJawabID: d.PenanggungJawabID,
			Nama: d.PenanggungJawab.Nama, Nilai: d.PenanggungJawab.Nilai,
		})
	}
	for _, d := range l {
		bundle.Lainlain = append(bundle.Lainlain, LainlainItem{
			ID: d.ID, LainlainID: d.LainlainID,
			Nama: d.Lainlain.Nama, Nilai: d.Nilai,
		})
	}
	return bundle, nil
}

func (r *Repository) CreateFungsional(d *FungsionalDetail) error { return r.db.Create(d).Error }
func (r *Repository) DeleteFungsional(id, employeeID uint) error {
	return r.db.Where("id = ? AND employee_id = ?", id, employeeID).Delete(&FungsionalDetail{}).Error
}

func (r *Repository) CreateTugasTambahan(d *TugasTambahanDetail) error { return r.db.Create(d).Error }
func (r *Repository) DeleteTugasTambahan(id, employeeID uint) error {
	return r.db.Where("id = ? AND employee_id = ?", id, employeeID).Delete(&TugasTambahanDetail{}).Error
}

func (r *Repository) CreatePenanggungJawab(d *PenanggungJawabDetail) error {
	return r.db.Create(d).Error
}
func (r *Repository) DeletePenanggungJawab(id, employeeID uint) error {
	return r.db.Where("id = ? AND employee_id = ?", id, employeeID).Delete(&PenanggungJawabDetail{}).Error
}

func (r *Repository) CreateLainlain(d *LainlainDetail) error { return r.db.Create(d).Error }
func (r *Repository) DeleteLainlain(id, employeeID uint) error {
	return r.db.Where("id = ? AND employee_id = ?", id, employeeID).Delete(&LainlainDetail{}).Error
}

func (r *Repository) MasterExists(table string, id uint) (bool, error) {
	var count int64
	if err := r.db.Table(table).Where("id = ?", id).Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}
