package penggajian

import (
	"errors"
	"math"
	"strconv"
	"time"

	"api/internal/modules/sdm/guru"
	"api/internal/modules/sdm/master"
	"api/internal/modules/sdm/periode"
)

// Konstanta bonus kedisiplinan — dikode dari aplikasi lama (vslip_absen):
// tidak terlambat sebulan penuh → bonus 100.000; tidak pulang awal → 50.000.
const (
	bonusTidakTerlambat  = 100_000
	bonusTidakPulangAwal = 50_000
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service { return &Service{repo: repo} }

// List menghitung gaji seluruh karyawan yang punya absen pada periode tsb.
// Periode diterima "YYYY-MM" / "YYYY-MM-05" dan dinormalisasi ke day=payday.
func (s *Service) List(periodeInput string) ([]Response, error) {
	p, err := periode.Parse(periodeInput)
	if err != nil {
		return nil, err
	}
	data, err := s.repo.LoadData(p)
	if err != nil {
		return nil, err
	}
	out := make([]Response, 0, len(data.Employees))
	for i := range data.Employees {
		out = append(out, s.calculate(&data.Employees[i], data, p))
	}
	return out, nil
}

// Slip menghitung gaji 1 karyawan + rincian komponen untuk slip.
// Bila periode sudah difinalisasi → dibaca dari snapshot (stabil).
func (s *Service) Slip(periodeInput string, employeeID uint) (*SlipResponse, error) {
	p, err := periode.Parse(periodeInput)
	if err != nil {
		return nil, err
	}

	pp, err := s.repo.FindPayrollPeriode(p)
	if err != nil {
		return nil, err
	}
	if pp != nil && pp.Status == StatusFinalized {
		details, err := s.repo.FindPayrollDetails(pp.ID)
		if err != nil {
			return nil, err
		}
		emps, _ := s.repo.FindEmployeesByIDs([]uint{employeeID})
		rows, rincian := responseFromSnapshot(details, emps)
		for _, r := range rows {
			if r.EmployeeID == employeeID {
				rin := rincian[employeeID]
				if rin == nil {
					rin = &slipRincian{}
				}
				// Pastikan rincian selalu [] (bukan null) agar slip & rekap konsisten.
				fungsional := rin.Fungsional
				if fungsional == nil {
					fungsional = []SlipItem{}
				}
				tugas := rin.TugasTambahan
				if tugas == nil {
					tugas = []SlipItem{}
				}
				pj := rin.PenanggungJawab
				if pj == nil {
					pj = []SlipItem{}
				}
				lain := rin.Lainlain
				if lain == nil {
					lain = []SlipItem{}
				}
				return &SlipResponse{
					Response:               r,
					RincianFungsional:      fungsional,
					RincianTugasTambahan:   tugas,
					RincianPenanggungJawab: pj,
					RincianLainlain:        lain,
				}, nil
			}
		}
		return nil, errors.New("Karyawan tidak ada pada snapshot periode ini")
	}

	// Preview — hitung dinamis.
	data, err := s.repo.LoadData(p)
	if err != nil {
		return nil, err
	}
	var emp *guru.Employee
	for i := range data.Employees {
		if data.Employees[i].ID == employeeID {
			emp = &data.Employees[i]
			break
		}
	}
	if emp == nil {
		return nil, errors.New("Karyawan tidak memiliki absensi pada periode ini")
	}
	resp := s.calculate(emp, data, p)
	return &SlipResponse{
		Response:               resp,
		RincianFungsional:      slipItemsFromFungsional(data.Fungsional[employeeID]),
		RincianTugasTambahan:   slipItemsFromTugas(data.TugasTambahan[employeeID]),
		RincianPenanggungJawab: slipItemsFromPJ(data.Penanggung[employeeID]),
		RincianLainlain:        slipItemsFromLainlain(data.Lainlain[employeeID]),
	}, nil
}

// ── Snapshot & finalisasi (K2/K3) ──

// Get mengembalikan status + baris gaji satu periode. Bila periode sudah
// difinalisasi → baris dibaca dari snapshot (stabil); selainnya → preview
// (dihitung dinamis dari data terbaru).
func (s *Service) Get(periodeInput string) (*PayrollStatusResponse, error) {
	p, err := periode.Parse(periodeInput)
	if err != nil {
		return nil, err
	}
	pp, err := s.repo.FindPayrollPeriode(p)
	if err != nil {
		return nil, err
	}
	if pp != nil && pp.Status == StatusFinalized {
		details, err := s.repo.FindPayrollDetails(pp.ID)
		if err != nil {
			return nil, err
		}
		ids := uniqueEmployeeIDs(details)
		emps, _ := s.repo.FindEmployeesByIDs(ids)
		rows, _ := responseFromSnapshot(details, emps)
		resp := &PayrollStatusResponse{Status: StatusFinalized, TotalGaji: pp.TotalGaji, Rows: rows}
		if pp.FinalizedAt != nil {
			s := pp.FinalizedAt.Format(time.RFC3339)
			resp.FinalizedAt = &s
		}
		return resp, nil
	}

	// Preview — hitung dinamis.
	rows, err := s.List(periodeInput)
	if err != nil {
		return nil, err
	}
	total := 0
	for _, r := range rows {
		total += r.TotalGaji
	}
	return &PayrollStatusResponse{Status: StatusOpen, TotalGaji: total, Rows: rows}, nil
}

// Finalize menghitung gaji seluruh karyawan periode tsb, menyimpan snapshot
// (header + baris komponen) secara transaksional, lalu mengunci periode.
// Idempotent: finalize ulang akan mengganti snapshot.
func (s *Service) Finalize(periodeInput string, userID uint) (*PayrollStatusResponse, error) {
	p, err := periode.Parse(periodeInput)
	if err != nil {
		return nil, err
	}
	data, err := s.repo.LoadData(p)
	if err != nil {
		return nil, err
	}
	details, rows, total := s.buildSnapshotDetails(data, p)
	pp, err := s.repo.SaveSnapshot(p, userID, total, details)
	if err != nil {
		return nil, err
	}
	resp := &PayrollStatusResponse{Status: StatusFinalized, TotalGaji: total, Rows: rows}
	if pp.FinalizedAt != nil {
		s := pp.FinalizedAt.Format(time.RFC3339)
		resp.FinalizedAt = &s
	}
	return resp, nil
}

// Unlock membuka kembali periode yang sudah difinalisasi (koreksi data):
// snapshot dihapus, status kembali ke preview. Finalize ulang setelah perbaikan.
func (s *Service) Unlock(periodeInput string) error {
	p, err := periode.Parse(periodeInput)
	if err != nil {
		return err
	}
	return s.repo.UnlockSnapshot(p)
}

// buildSnapshotDetails menghitung semua karyawan sekaligus menyusun baris
// detail snapshot (mengembalikan baris respons untuk tampilan langsung).
func (s *Service) buildSnapshotDetails(data *Data, asOf time.Time) ([]PayrollDetail, []Response, int) {
	details := make([]PayrollDetail, 0)
	responses := make([]Response, 0, len(data.Employees))
	total := 0
	for i := range data.Employees {
		emp := &data.Employees[i]
		r := s.calculate(emp, data, asOf)
		responses = append(responses, r)
		total += r.TotalGaji

		u := 0
		add := func(kode, nama string, nominal int) {
			u++
			details = append(details, PayrollDetail{
				EmployeeID: r.EmployeeID, KodeKomponen: kode,
				NamaKomponen: nama, Nominal: nominal, Urutan: u,
			})
		}

		add(KodeHRPokok, "Gaji Pokok", r.HRPokok)
		add(KodeJumlahHadir, "Jumlah Hadir", r.JumlahHadir)
		add(KodeKehadiran, "Kehadiran", r.Kehadiran)
		add(KodeJumlahSiaga, "Jumlah Siaga", r.JumlahSiaga)
		add(KodeSiaga, "Hadir Siaga", r.Siaga)
		add(KodeJumlahPiket, "Jumlah Piket", r.JumlahPiket)
		add(KodePiket, "Hadir Piket", r.Piket)
		add(KodeJumlahTelat, "Jumlah Terlambat", r.JumlahTelat)
		add(KodeBonusTerlambat, "Bonus Tidak Terlambat", r.BonusTerlambat)
		add(KodeJumlahPulang, "Jumlah Pulang Awal", r.JumlahPulang)
		add(KodeBonusPulang, "Bonus Tidak Pulang Awal", r.BonusPulang)
		add(KodeSubtotalAbsen, "Subtotal Absensi", r.SubtotalAbsen)

		for _, it := range data.Fungsional[r.EmployeeID] {
			add(KodeFungsional, it.Fungsional.Nama, it.Fungsional.Nilai)
		}
		add(KodeSubtotalF, "Subtotal Fungsional", r.SubtotalF)
		for _, it := range data.TugasTambahan[r.EmployeeID] {
			add(KodeTugasTambahan, it.TugasTambahan.Nama, it.Nilai)
		}
		add(KodeSubtotalT, "Subtotal Tugas Tambahan", r.SubtotalT)
		for _, it := range data.Penanggung[r.EmployeeID] {
			add(KodePenanggungJawab, it.PenanggungJawab.Nama, it.PenanggungJawab.Nilai)
		}
		add(KodeSubtotalP, "Subtotal Penanggung Jawab", r.SubtotalP)
		for _, it := range data.Lainlain[r.EmployeeID] {
			add(KodeLainlain, it.Lainlain.Nama, it.Nilai)
		}
		add(KodeSubtotalL, "Subtotal Lain-lain", r.SubtotalL)

		add(KodeAngsuran, "Angsuran Pinjaman", r.Angsuran)
		add(KodeTotal, "Total Gaji", r.TotalGaji)
	}
	return details, responses, total
}

// responseFromSnapshot merekonstruksi baris Response + rincian slip dari baris
// detail snapshot (nama & kode golongan diambil dari data karyawan saat ini —
// hanya label; nominal sepenuhnya historis).
func responseFromSnapshot(details []PayrollDetail, emps []guru.Employee) ([]Response, map[uint]*slipRincian) {
	empName := make(map[uint]string, len(emps))
	empGol := make(map[uint]string, len(emps))
	for _, e := range emps {
		empName[e.ID] = e.Nama
		if e.Golongan != nil {
			empGol[e.ID] = e.Golongan.Kode
		}
	}

	values := map[uint]map[string]int{}
	rincian := map[uint]*slipRincian{}
	var order []uint
	for _, d := range details {
		if _, ok := values[d.EmployeeID]; !ok {
			values[d.EmployeeID] = map[string]int{}
			rincian[d.EmployeeID] = &slipRincian{}
			order = append(order, d.EmployeeID)
		}
		switch d.KodeKomponen {
		case KodeFungsional:
			rincian[d.EmployeeID].Fungsional = append(rincian[d.EmployeeID].Fungsional, SlipItem{Nama: d.NamaKomponen, Nominal: d.Nominal})
		case KodeTugasTambahan:
			rincian[d.EmployeeID].TugasTambahan = append(rincian[d.EmployeeID].TugasTambahan, SlipItem{Nama: d.NamaKomponen, Nominal: d.Nominal})
		case KodePenanggungJawab:
			rincian[d.EmployeeID].PenanggungJawab = append(rincian[d.EmployeeID].PenanggungJawab, SlipItem{Nama: d.NamaKomponen, Nominal: d.Nominal})
		case KodeLainlain:
			rincian[d.EmployeeID].Lainlain = append(rincian[d.EmployeeID].Lainlain, SlipItem{Nama: d.NamaKomponen, Nominal: d.Nominal})
		default:
			values[d.EmployeeID][d.KodeKomponen] = d.Nominal
		}
	}

	responses := make([]Response, 0, len(order))
	for _, id := range order {
		v := values[id]
		responses = append(responses, Response{
			EmployeeID: id, NamaKaryawan: empName[id], GolonganKode: empGol[id],
			HRPokok: v[KodeHRPokok], JumlahHadir: v[KodeJumlahHadir], Kehadiran: v[KodeKehadiran],
			JumlahSiaga: v[KodeJumlahSiaga], Siaga: v[KodeSiaga], JumlahPiket: v[KodeJumlahPiket],
			Piket: v[KodePiket], JumlahTelat: v[KodeJumlahTelat], BonusTerlambat: v[KodeBonusTerlambat],
			JumlahPulang: v[KodeJumlahPulang], BonusPulang: v[KodeBonusPulang],
			SubtotalAbsen: v[KodeSubtotalAbsen], SubtotalF: v[KodeSubtotalF], SubtotalT: v[KodeSubtotalT],
			SubtotalP: v[KodeSubtotalP], SubtotalL: v[KodeSubtotalL], Angsuran: v[KodeAngsuran],
			TotalGaji: v[KodeTotal],
		})
	}
	return responses, rincian
}

// slipRincian — rincian komponen per karyawan dari snapshot.
type slipRincian struct {
	Fungsional      []SlipItem
	TugasTambahan   []SlipItem
	PenanggungJawab []SlipItem
	Lainlain        []SlipItem
}

func uniqueEmployeeIDs(details []PayrollDetail) []uint {
	seen := map[uint]bool{}
	var ids []uint
	for _, d := range details {
		if !seen[d.EmployeeID] {
			seen[d.EmployeeID] = true
			ids = append(ids, d.EmployeeID)
		}
	}
	return ids
}

// calculate — rumus gaji (wajib identik dengan aplikasi lama, lihat Dokumen 03).
func (s *Service) calculate(emp *guru.Employee, d *Data, asOf time.Time) Response {
	golongan := resolveGolongan(d.Golongan, guru.ResolveEffectiveGolongan(d.Golongan, emp, asOf))
	resp := Response{
		EmployeeID:   emp.ID,
		NamaKaryawan: emp.Nama,
		Sertifikasi:  emp.Sertifikasi,
		Impasing:     emp.Impasing,
	}
	if golongan != nil {
		resp.GolonganKode = golongan.Kode
	}

	// 1. HR Pokok — dipengaruhi status sertifikasi/impasing.
	pokok := 0
	if golongan != nil {
		pokok = golongan.Nilai
	}
	if emp.Sertifikasi {
		pokok = ceilHalf(pokok) // CEIL(nilai − nilai×50/100)
	}
	if emp.Impasing {
		pokok = 0 // CEIL(nilai − nilai×100/100)
	}
	resp.HRPokok = pokok

	// 2. Absensi periode tsb.
	if a, ok := d.AbsenByEmp[emp.ID]; ok {
		resp.JumlahHadir = a.Hadir
		resp.Kehadiran = a.Hadir * d.Kehadiran

		resp.JumlahSiaga = a.HadirSiaga
		resp.Siaga = a.HadirSiaga * d.Kedisiplinan["siaga"].Nilai
		resp.JumlahPiket = a.HadirPiket
		resp.Piket = a.HadirPiket * d.Kedisiplinan["piket"].Nilai

		resp.JumlahTelat = a.HadirTerlambat
		if a.HadirTerlambat == 0 {
			resp.BonusTerlambat = bonusTidakTerlambat
		}
		resp.JumlahPulang = a.PulangAwal
		if a.PulangAwal == 0 {
			resp.BonusPulang = bonusTidakPulangAwal
		}
	}

	resp.SubtotalAbsen = resp.HRPokok + resp.Kehadiran + resp.Siaga + resp.Piket +
		resp.BonusTerlambat + resp.BonusPulang

	// 3. Komponen HR tetap (per guru, tanpa periode — perilaku lama).
	resp.SubtotalF = sumFungsional(d.Fungsional[emp.ID])
	resp.SubtotalT = sumTugas(d.TugasTambahan[emp.ID])
	resp.SubtotalP = sumPJ(d.Penanggung[emp.ID])
	resp.SubtotalL = sumLainlain(d.Lainlain[emp.ID])

	// 4. Potongan angsuran pinjaman periode tsb.
	resp.Angsuran = d.Angsuran[emp.ID]

	// 5. Total.
	resp.TotalGaji = resp.SubtotalAbsen + resp.SubtotalF + resp.SubtotalT +
		resp.SubtotalP + resp.SubtotalL - resp.Angsuran

	return resp
}

// ceilHalf = CEIL(v − v×50/100), dibulatkan ke atas (perilaku view lama).
func ceilHalf(v int) int {
	half := float64(v) * 0.5
	return int(math.Ceil(float64(v) - half))
}

func resolveGolongan(all []master.Golongan, id uint) *master.Golongan {
	for i := range all {
		if all[i].ID == id {
			return &all[i]
		}
	}
	return nil
}

func sumFungsional(items []guru.FungsionalDetail) int {
	sum := 0
	for _, it := range items {
		sum += it.Fungsional.Nilai
	}
	return sum
}

func sumTugas(items []guru.TugasTambahanDetail) int {
	sum := 0
	for _, it := range items {
		sum += it.Nilai
	}
	return sum
}

func sumPJ(items []guru.PenanggungJawabDetail) int {
	sum := 0
	for _, it := range items {
		sum += it.PenanggungJawab.Nilai
	}
	return sum
}

func sumLainlain(items []guru.LainlainDetail) int {
	sum := 0
	for _, it := range items {
		sum += it.Nilai
	}
	return sum
}

func slipItemsFromFungsional(items []guru.FungsionalDetail) []SlipItem {
	out := make([]SlipItem, 0, len(items))
	for _, it := range items {
		out = append(out, SlipItem{Nama: it.Fungsional.Nama, Nominal: it.Fungsional.Nilai})
	}
	return out
}

func slipItemsFromTugas(items []guru.TugasTambahanDetail) []SlipItem {
	out := make([]SlipItem, 0, len(items))
	for _, it := range items {
		out = append(out, SlipItem{Nama: it.TugasTambahan.Nama, Nominal: it.Nilai})
	}
	return out
}

func slipItemsFromPJ(items []guru.PenanggungJawabDetail) []SlipItem {
	out := make([]SlipItem, 0, len(items))
	for _, it := range items {
		out = append(out, SlipItem{Nama: it.PenanggungJawab.Nama, Nominal: it.PenanggungJawab.Nilai})
	}
	return out
}

func slipItemsFromLainlain(items []guru.LainlainDetail) []SlipItem {
	out := make([]SlipItem, 0, len(items))
	for _, it := range items {
		out = append(out, SlipItem{Nama: it.Lainlain.Nama, Nominal: it.Nilai})
	}
	return out
}

// Rekap menyusun ringkasan gaji seluruh bulan dalam rentang Tahun Ajaran.
// Bulan yang termasuk = tanggal payday (5) dalam [start_date, end_date].
func (s *Service) Rekap(academicYearID uint) (*RekapResponse, error) {
	say, err := s.repo.FindAcademicYear(academicYearID)
	if err != nil {
		return nil, err
	}
	resp := &RekapResponse{
		AcademicYearID:   say.ID,
		AcademicYearName: say.Name,
		PerBulan:         []RekapBulan{},
	}
	for _, p := range monthsInRange(say.StartDate, say.EndDate) {
		got, err := s.Get(p.Format("2006-01-02"))
		if err != nil {
			return nil, err
		}
		resp.PerBulan = append(resp.PerBulan, RekapBulan{
			Periode:        periode.Format(p),
			Label:          periode.MonthLabel(p),
			Status:         got.Status,
			TotalGaji:      got.TotalGaji,
			JumlahKaryawan: len(got.Rows),
		})
		resp.TotalGaji += got.TotalGaji
	}
	return resp, nil
}

// monthsInRange mengembalikan tanggal payday (5) tiap bulan yang berada dalam
// [start, end]. Contoh TA 2025-07-14..2026-07-13 → 2025-08-05 .. 2026-07-05.
func monthsInRange(start, end time.Time) []time.Time {
	out := []time.Time{}
	cur := time.Date(start.Year(), start.Month(), 1, 0, 0, 0, 0, time.Local)
	for !cur.After(end) {
		p := time.Date(cur.Year(), cur.Month(), periode.PaydayDay, 0, 0, 0, 0, time.Local)
		if !p.Before(start) && !p.After(end) {
			out = append(out, p)
		}
		cur = cur.AddDate(0, 1, 0)
	}
	return out
}

// Summary menghitung statistik dashboard modul SDM: total karyawan, pinjaman
// aktif, total gaji bulan berjalan, dan grafik total gaji per bulan. Bila
// academicYearID diberikan → grafik mengikuti rentang TA; selainnya tahun berjalan.
func (s *Service) Summary(academicYearID *uint, tahun string) (*SummaryResponse, error) {
	resp := &SummaryResponse{}

	karyawan, err := s.repo.CountActiveEmployees()
	if err != nil {
		return nil, err
	}
	resp.JumlahKaryawanAktif = int(karyawan)

	golongan, err := s.repo.CountGolongan()
	if err != nil {
		return nil, err
	}
	resp.JumlahGolongan = int(golongan)

	pinjamCount, pinjamSisa, err := s.repo.PinjamanStats()
	if err != nil {
		return nil, err
	}
	resp.PinjamanAktif = int(pinjamCount)
	resp.TotalSisaPinjaman = int(pinjamSisa)

	perGolongan, err := s.repo.GuruPerGolongan()
	if err != nil {
		return nil, err
	}
	resp.GuruPerGolongan = perGolongan

	// Grafik total gaji per bulan: rentang TA (bila diberikan) atau tahun berjalan.
	var bulanList []time.Time
	if academicYearID != nil {
		say, err := s.repo.FindAcademicYear(*academicYearID)
		if err != nil {
			return nil, err
		}
		bulanList = monthsInRange(say.StartDate, say.EndDate)
	} else {
		year := time.Now().Year()
		if len(tahun) == 4 {
			if v, err := strconv.Atoi(tahun); err == nil && v >= 2000 && v <= 2100 {
				year = v
			}
		}
		for m := 1; m <= 12; m++ {
			bulanList = append(bulanList, time.Date(year, time.Month(m), periode.PaydayDay, 0, 0, 0, 0, time.Local))
		}
	}

	totalBulanIni := 0
	now := time.Now()
	for _, p := range bulanList {
		rows, err := s.List(p.Format("2006-01-02"))
		if err != nil {
			// Periode kosong (belum ada absen) → total 0, bukan error.
			rows = []Response{}
		}
		sum := 0
		for _, r := range rows {
			sum += r.TotalGaji
		}
		resp.PerBulan = append(resp.PerBulan, BulanGaji{Bulan: p.Format("2006-01"), TotalGaji: sum})
		if p.Year() == now.Year() && p.Month() == now.Month() {
			totalBulanIni = sum
		}
	}
	resp.TotalGajiBulanIni = totalBulanIni

	return resp, nil
}
