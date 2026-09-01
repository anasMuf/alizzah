package penggajian

import (
	"testing"

	"api/internal/modules/sdm/absen"
	"api/internal/modules/sdm/guru"
	"api/internal/modules/sdm/master"
	"api/internal/modules/sdm/periode"
	"api/model"
)

// Snapshot harus merekonstruksi respons yang sama persis dengan kalkulasi
// (round-trip): calculate → buildSnapshotDetails → responseFromSnapshot.
func TestSnapshotRoundTrip(t *testing.T) {
	svc := &Service{}
	d := baseData()
	d.AbsenByEmp[1] = absen.Absen{
		EmployeeID: 1, Periode: periode.MustParse("2026-01"),
		Hadir: 20, HadirSiaga: 15, HadirTerlambat: 0, HadirPiket: 2, PulangAwal: 0,
	}
	d.Fungsional[1] = []guru.FungsionalDetail{{Fungsional: &master.Fungsional{Nama: "Guru Kelas", Nilai: 200000}}}
	d.TugasTambahan[1] = []guru.TugasTambahanDetail{{TugasTambahan: &master.TugasTambahan{Nama: "Kurikulum"}, Nilai: 100000}}
	d.Penanggung[1] = []guru.PenanggungJawabDetail{{PenanggungJawab: &master.PenanggungJawab{Nama: "Koperasi", Nilai: 100000}}}
	d.Lainlain[1] = []guru.LainlainDetail{{Lainlain: &master.Lainlain{Nama: "jasa antar jemput"}, Nilai: 300000}}
	d.Angsuran[1] = 200000
	emp := &guru.Employee{
		PrimaryKey: model.PrimaryKey{ID: 1}, Nama: "Abdul Rohim, S.PdI",
		GolonganID: ptrUint(1), TglMasuk: date("2005-11-15"),
	}
	d.Employees = []guru.Employee{*emp}
	asOf := periode.MustParse("2026-01")

	expected := svc.calculate(emp, d, asOf)

	details, rows, total := svc.buildSnapshotDetails(d, asOf)

	if len(rows) != 1 {
		t.Fatalf("buildSnapshotDetails rows = %d, want 1", len(rows))
	}
	if rows[0].TotalGaji != expected.TotalGaji {
		t.Errorf("rows[0].TotalGaji = %d, want %d", rows[0].TotalGaji, expected.TotalGaji)
	}
	if total != expected.TotalGaji {
		t.Errorf("total = %d, want %d", total, expected.TotalGaji)
	}

	// Rekonstruksi dari detail.
	got, rincian := responseFromSnapshot(details, []guru.Employee{*emp})
	if len(got) != 1 {
		t.Fatalf("responseFromSnapshot rows = %d, want 1", len(got))
	}
	g := got[0]
	if g.TotalGaji != expected.TotalGaji || g.HRPokok != expected.HRPokok || g.SubtotalAbsen != expected.SubtotalAbsen {
		t.Errorf("rekonstruksi total/pokok/subtotal = %d/%d/%d, want %d/%d/%d",
			g.TotalGaji, g.HRPokok, g.SubtotalAbsen, expected.TotalGaji, expected.HRPokok, expected.SubtotalAbsen)
	}
	if g.Angsuran != 200000 || g.SubtotalF != 200000 || g.SubtotalL != 300000 {
		t.Errorf("rekonstruksi angsuran/F/L = %d/%d/%d", g.Angsuran, g.SubtotalF, g.SubtotalL)
	}
	if g.NamaKaryawan != "Abdul Rohim, S.PdI" {
		t.Errorf("nama dari snapshot = %q", g.NamaKaryawan)
	}

	rin := rincian[1]
	if len(rin.Fungsional) != 1 || rin.Fungsional[0].Nama != "Guru Kelas" || rin.Fungsional[0].Nominal != 200000 {
		t.Errorf("rincian fungsional tidak sesuai: %+v", rin.Fungsional)
	}
	if len(rin.TugasTambahan) != 1 || rin.TugasTambahan[0].Nominal != 100000 {
		t.Errorf("rincian tugas tambahan tidak sesuai: %+v", rin.TugasTambahan)
	}
	if len(rin.Lainlain) != 1 || rin.Lainlain[0].Nama != "jasa antar jemput" {
		t.Errorf("rincian lainlain tidak sesuai: %+v", rin.Lainlain)
	}
}

// Snapshot harus berisi baris total_gaji per karyawan (untuk rekap cepat).
func TestSnapshotMengandungTotalDanKomponen(t *testing.T) {
	svc := &Service{}
	d := baseData()
	d.AbsenByEmp[1] = absen.Absen{
		EmployeeID: 1, Periode: periode.MustParse("2026-01"),
		Hadir: 20, HadirSiaga: 0, HadirTerlambat: 0, HadirPiket: 0, PulangAwal: 0,
	}
	emp := &guru.Employee{PrimaryKey: model.PrimaryKey{ID: 1}, GolonganID: ptrUint(1), TglMasuk: date("2025-01-15")}
	d.Employees = []guru.Employee{*emp}

	details, _, _ := svc.buildSnapshotDetails(d, periode.MustParse("2026-01"))

	kodes := map[string]bool{}
	for _, dd := range details {
		kodes[dd.KodeKomponen] = true
	}
	for _, k := range []string{
		KodeHRPokok, KodeKehadiran, KodeSiaga, KodePiket, KodeBonusTerlambat, KodeBonusPulang,
		KodeSubtotalAbsen, KodeSubtotalF, KodeSubtotalT, KodeSubtotalP, KodeSubtotalL,
		KodeAngsuran, KodeTotal,
	} {
		if !kodes[k] {
			t.Errorf("snapshot tidak mengandung komponen %q", k)
		}
	}
}
