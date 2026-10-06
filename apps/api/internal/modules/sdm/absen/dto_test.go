package absen

import (
	"testing"

	"api/utility"
)

// TestUpsertRequest_RejectsEmptyItems mengunci perilaku: payload dengan `items`
// kosong HARUS ditolak validasi. Sebelumnya `required` saja pada slice hanya
// memeriksa "tidak nil", sehingga array kosong lolos dan tersimpan sebagai no-op
// (200 "0 baris") tanpa data apa pun.
func TestUpsertRequest_RejectsEmptyItems(t *testing.T) {
	v := utility.NewValidator()

	if err := v.Struct(UpsertRequest{Periode: "2026-10", Items: []AbsenEntry{}}); err == nil {
		t.Fatal("items kosong seharusnya ditolak validasi")
	}

	valid := UpsertRequest{
		Periode: "2026-10",
		Items:   []AbsenEntry{{EmployeeID: 1, Hadir: 20, HadirSiaga: 2}},
	}
	if err := v.Struct(valid); err != nil {
		t.Fatalf("request valid justru ditolak: %v", err)
	}
}
