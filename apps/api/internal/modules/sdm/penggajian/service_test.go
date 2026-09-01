package penggajian

import (
	"testing"
	"time"

	"api/internal/modules/sdm/absen"
	"api/internal/modules/sdm/guru"
	"api/internal/modules/sdm/master"
	"api/internal/modules/sdm/periode"
	"api/model"
)

func ptr(v int) *int { return &v }

func testGolongans() []master.Golongan {
	return []master.Golongan{
		{PrimaryKey: model.PrimaryKey{ID: 1}, Kode: "A", FromDay: ptr(0), ToDay: ptr(730), Nilai: 250000},
		{PrimaryKey: model.PrimaryKey{ID: 2}, Kode: "B", FromDay: ptr(760), ToDay: ptr(1826), Nilai: 300000},
		{PrimaryKey: model.PrimaryKey{ID: 3}, Kode: "C", FromDay: ptr(1856), ToDay: ptr(3652), Nilai: 350000},
		{PrimaryKey: model.PrimaryKey{ID: 4}, Kode: "D", FromDay: ptr(3682), ToDay: ptr(5478), Nilai: 400000},
		{PrimaryKey: model.PrimaryKey{ID: 5}, Kode: "E", FromDay: ptr(5508), ToDay: ptr(7305), Nilai: 450000},
		{PrimaryKey: model.PrimaryKey{ID: 6}, Kode: "F", FromDay: ptr(7335), ToDay: ptr(9131), Nilai: 500000},
	}
}

func testKedisiplinan() map[string]master.Kedisiplinan {
	return map[string]master.Kedisiplinan{
		"siaga":       {Kode: "siaga", Nilai: 10000},
		"terlambat":   {Kode: "terlambat", Nilai: 0},
		"piket":       {Kode: "piket", Nilai: 15000},
		"pulang_awal": {Kode: "pulang_awal", Nilai: 0},
	}
}

func date(s string) *time.Time {
	t, _ := time.Parse("2006-01-02", s)
	return &t
}

func baseData() *Data {
	return &Data{
		Golongan:      testGolongans(),
		Kehadiran:     5000,
		Kedisiplinan:  testKedisiplinan(),
		AbsenByEmp:    map[uint]absen.Absen{},
		Fungsional:    map[uint][]guru.FungsionalDetail{},
		TugasTambahan: map[uint][]guru.TugasTambahanDetail{},
		Penanggung:    map[uint][]guru.PenanggungJawabDetail{},
		Lainlain:      map[uint][]guru.LainlainDetail{},
		Angsuran:      map[uint]int{},
	}
}

// Contoh ilustrasi dari Dokumen 03: guru golongan A, hadir 20, siaga 15,
// piket 2, tidak terlambat, tidak pulang awal → Total Absensi 680.000.
func TestCalculate_ContohDokumen03(t *testing.T) {
	svc := &Service{}
	d := baseData()
	d.AbsenByEmp[1] = absen.Absen{
		EmployeeID: 1, Periode: periode.MustParse("2026-01"),
		Hadir: 20, HadirSiaga: 15, HadirTerlambat: 0, HadirPiket: 2, PulangAwal: 0,
	}
	emp := &guru.Employee{PrimaryKey: model.PrimaryKey{ID: 1}, Nama: "Guru A", GolonganID: ptrUint(1), TglMasuk: date("2025-01-15")}

	asOf := periode.MustParse("2026-01")
	resp := svc.calculate(emp, d, asOf)

	if resp.HRPokok != 250000 {
		t.Errorf("HR Pokok = %d, want 250000", resp.HRPokok)
	}
	if resp.Kehadiran != 100000 {
		t.Errorf("Kehadiran = %d, want 100000", resp.Kehadiran)
	}
	if resp.Siaga != 150000 {
		t.Errorf("Siaga = %d, want 150000", resp.Siaga)
	}
	if resp.Piket != 30000 {
		t.Errorf("Piket = %d, want 30000", resp.Piket)
	}
	if resp.BonusTerlambat != 100000 {
		t.Errorf("BonusTerlambat = %d, want 100000", resp.BonusTerlambat)
	}
	if resp.BonusPulang != 50000 {
		t.Errorf("BonusPulang = %d, want 50000", resp.BonusPulang)
	}
	if resp.SubtotalAbsen != 680000 {
		t.Errorf("Total Absensi = %d, want 680000", resp.SubtotalAbsen)
	}
}

func ptrUint(v uint) *uint { return &v }

func TestCalculate_Sertifikasi(t *testing.T) {
	svc := &Service{}
	d := baseData()
	d.AbsenByEmp[1] = absen.Absen{EmployeeID: 1, Hadir: 20, HadirSiaga: 0, HadirTerlambat: 0, HadirPiket: 0, PulangAwal: 0}
	emp := &guru.Employee{PrimaryKey: model.PrimaryKey{ID: 1}, GolonganID: ptrUint(3), Sertifikasi: true, TglMasuk: date("2020-01-01")}
	asOf := periode.MustParse("2026-01")

	resp := svc.calculate(emp, d, asOf)

	// Golongan C (350.000) × 50% = 175.000 (CEIL).
	if resp.HRPokok != 175000 {
		t.Errorf("HR Pokok sertifikasi = %d, want 175000", resp.HRPokok)
	}
}

func TestCalculate_Impasing(t *testing.T) {
	svc := &Service{}
	d := baseData()
	d.AbsenByEmp[1] = absen.Absen{EmployeeID: 1, Hadir: 20, HadirSiaga: 0, HadirTerlambat: 0, HadirPiket: 0, PulangAwal: 0}
	emp := &guru.Employee{PrimaryKey: model.PrimaryKey{ID: 1}, GolonganID: ptrUint(3), Impasing: true, TglMasuk: date("2020-01-01")}
	asOf := periode.MustParse("2026-01")

	resp := svc.calculate(emp, d, asOf)

	if resp.HRPokok != 0 {
		t.Errorf("HR Pokok impasing = %d, want 0", resp.HRPokok)
	}
}

func TestCalculate_BonusHilangSaatTelat(t *testing.T) {
	svc := &Service{}
	d := baseData()
	d.AbsenByEmp[1] = absen.Absen{
		EmployeeID: 1, Hadir: 20, HadirSiaga: 0, HadirTerlambat: 3, HadirPiket: 0, PulangAwal: 2,
	}
	emp := &guru.Employee{PrimaryKey: model.PrimaryKey{ID: 1}, GolonganID: ptrUint(1), TglMasuk: date("2025-01-15")}
	asOf := periode.MustParse("2026-01")

	resp := svc.calculate(emp, d, asOf)

	if resp.BonusTerlambat != 0 {
		t.Errorf("BonusTerlambat saat telat = %d, want 0", resp.BonusTerlambat)
	}
	if resp.BonusPulang != 0 {
		t.Errorf("BonusPulang saat pulang awal = %d, want 0", resp.BonusPulang)
	}
}

func TestCalculate_KomponenHRDanAngsuran(t *testing.T) {
	svc := &Service{}
	d := baseData()
	d.AbsenByEmp[1] = absen.Absen{EmployeeID: 1, Hadir: 20, HadirSiaga: 0, HadirTerlambat: 0, HadirPiket: 0, PulangAwal: 0}
	d.Fungsional[1] = []guru.FungsionalDetail{{Fungsional: &master.Fungsional{Nilai: 200000}}}
	d.TugasTambahan[1] = []guru.TugasTambahanDetail{{Nilai: 100000}}
	d.Penanggung[1] = []guru.PenanggungJawabDetail{{PenanggungJawab: &master.PenanggungJawab{Nilai: 50000}}}
	d.Lainlain[1] = []guru.LainlainDetail{{Nilai: 75000}}
	d.Angsuran[1] = 100000
	emp := &guru.Employee{PrimaryKey: model.PrimaryKey{ID: 1}, GolonganID: ptrUint(1), TglMasuk: date("2025-01-15")}
	asOf := periode.MustParse("2026-01")

	resp := svc.calculate(emp, d, asOf)

	// SubtotalAbsen = 250000 + 100000 + 0 + 0 + 100000 + 50000 = 500000
	if resp.SubtotalAbsen != 500000 {
		t.Errorf("SubtotalAbsen = %d, want 500000", resp.SubtotalAbsen)
	}
	if resp.SubtotalF != 200000 || resp.SubtotalT != 100000 || resp.SubtotalP != 50000 || resp.SubtotalL != 75000 {
		t.Errorf("Subtotal HR = F:%d T:%d P:%d L:%d", resp.SubtotalF, resp.SubtotalT, resp.SubtotalP, resp.SubtotalL)
	}
	// Total = 500000 + 200000 + 100000 + 50000 + 75000 - 100000 = 825000
	if resp.TotalGaji != 825000 {
		t.Errorf("TotalGaji = %d, want 825000", resp.TotalGaji)
	}
}

// Golongan efektif historis: guru masuk 2005-11-15, periode 2026-05 (payday 5)
// → ~20,5 tahun → golongan F (7335–9131 hari).
func TestGolonganEfektifHistoris(t *testing.T) {
	emp := &guru.Employee{PrimaryKey: model.PrimaryKey{ID: 1}, GolonganID: ptrUint(1), TglMasuk: date("2005-11-15")}
	asOf := periode.MustParse("2026-05")
	got := guru.ResolveEffectiveGolongan(testGolongans(), emp, asOf)
	if got != 6 {
		t.Errorf("Golongan efektif = %d, want 6 (F)", got)
	}
}

// Guru tanpa tgl_masuk → fallback ke golongan tersimpan.
func TestGolonganEfektifTanpaTglMasuk(t *testing.T) {
	emp := &guru.Employee{PrimaryKey: model.PrimaryKey{ID: 1}, GolonganID: ptrUint(1)}
	asOf := periode.MustParse("2026-05")
	got := guru.ResolveEffectiveGolongan(testGolongans(), emp, asOf)
	if got != 1 {
		t.Errorf("Golongan efektif tanpa tgl_masuk = %d, want 1 (tersimpan)", got)
	}
}

func TestParsePeriode(t *testing.T) {
	tm, err := periode.Parse("2026-05")
	if err != nil {
		t.Fatal(err)
	}
	if tm.Month() != 5 || tm.Day() != periode.PaydayDay || tm.Year() != 2026 {
		t.Errorf("Parse(2026-05) = %v, want 2026-05-05", tm)
	}
	// Format 10 digit juga diterima dan dinormalisasi ke payday.
	tm2, err := periode.Parse("2026-05-05")
	if err != nil || tm2.Day() != 5 {
		t.Errorf("Parse(2026-05-05) = %v err %v, want day 5", tm2, err)
	}
	// Format salah / bulan invalid ditolak.
	if _, err := periode.Parse("13-2026"); err == nil {
		t.Error("Parse(13-2026) harus error")
	}
	if _, err := periode.Parse("2026-13"); err == nil {
		t.Error("Parse(2026-13) harus error")
	}
	if _, err := periode.Parse("052026"); err == nil {
		t.Error("Parse(mmYYYY) harus error — format lama tidak didukung")
	}
}
