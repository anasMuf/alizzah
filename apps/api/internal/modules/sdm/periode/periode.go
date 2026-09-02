// Package periode menyediakan helper untuk periode penggajian yang disimpan
// sebagai DATE dengan hari tetap = tanggal payday (kebijakan sekolah: 5).
// Contoh: `2026-05-05` = periode gaji Mei 2026 (dibayar tgl 5).
//
// Konsistensi tanggal payday penting: semua baris absen/pinjaman/payroll pada
// satu periode harus memakai tanggal yang sama (day = PaydayDay), sehingga
// query rentang & grouping bulan (date_trunc) berperilaku deterministik.
package periode

import (
	"errors"
	"fmt"
	"time"
)

// PaydayDay — tanggal payday (hari dalam bulan). Kebijakan sekolah; bisa
// dipindah ke Settings bila berubah.
const PaydayDay = 5

// Parse mengubah input "YYYY-MM" atau "YYYY-MM-05" menjadi time.Time dengan
// day = PaydayDay (tanggal yang sama dipakai semua tabel periode).
func Parse(s string) (time.Time, error) {
	if s == "" {
		return time.Time{}, errors.New("Periode wajib diisi")
	}
	var t time.Time
	var err error
	switch len(s) {
	case 7: // YYYY-MM
		t, err = time.Parse("2006-01", s)
	case 10: // YYYY-MM-05
		t, err = time.Parse("2006-01-02", s)
	default:
		return time.Time{}, errors.New("Periode harus format YYYY-MM (mis. 2026-05)")
	}
	if err != nil {
		return time.Time{}, errors.New("Periode harus format YYYY-MM (mis. 2026-05)")
	}
	if t.Year() < 2000 || t.Year() > 2100 {
		return time.Time{}, errors.New("Tahun periode tidak valid")
	}
	return time.Date(t.Year(), t.Month(), PaydayDay, 0, 0, 0, 0, time.Local), nil
}

// MustParse seperti Parse tetapi panic bila gagal — untuk nilai yang sudah
// divalidasi (mis. dari DB).
func MustParse(s string) time.Time {
	t, err := Parse(s)
	if err != nil {
		panic(err)
	}
	return t
}

// Format mengubah tanggal periode menjadi "YYYY-MM-DD" (selalu day = PaydayDay).
func Format(t time.Time) string {
	return time.Date(t.Year(), t.Month(), PaydayDay, 0, 0, 0, 0, time.Local).
		Format("2006-01-02")
}

// IsPayday memeriksa apakah tanggal adalah periode yang valid (day = payday).
func IsPayday(t time.Time) bool {
	return t.Day() == PaydayDay
}

// MonthLabel menampilkan "Mei 2026" untuk keperluan UI/laporan.
func MonthLabel(t time.Time) string {
	names := [...]string{
		"Januari", "Februari", "Maret", "April", "Mei", "Juni",
		"Juli", "Agustus", "September", "Oktober", "November", "Desember",
	}
	return fmt.Sprintf("%s %d", names[t.Month()-1], t.Year())
}
