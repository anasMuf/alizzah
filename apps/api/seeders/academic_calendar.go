package seeders

import (
	"api/model"
	"time"
)

// acadMonth adalah pasangan bulan & tahun kalender dalam satu tahun ajaran.
type acadMonth struct {
	Month int
	Year  int
}

// acadMonthYears mengembalikan pasangan (bulan, tahun) sepanjang tahun ajaran,
// urut dari bulan StartDate sampai bulan EndDate (mis. Jul 2026 .. Jun 2027).
// Dipakai agar seeder otomatis mengikuti tahun ajaran aktif tanpa hardcode tahun.
func acadMonthYears(ay model.AcademicYear) []acadMonth {
	var out []acadMonth
	cur := time.Date(ay.StartDate.Year(), ay.StartDate.Month(), 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(ay.EndDate.Year(), ay.EndDate.Month(), 1, 0, 0, 0, 0, time.UTC)
	for !cur.After(end) {
		out = append(out, acadMonth{int(cur.Month()), cur.Year()})
		cur = cur.AddDate(0, 1, 0)
	}
	return out
}

// yearForMonth mengembalikan tahun kalender untuk sebuah bulan (1-12) dalam tahun
// ajaran ay: bulan >= bulan mulai -> tahun mulai; selain itu -> tahun akhir.
// Contoh TA 2026/2027: Jul-Des -> 2026, Jan-Jun -> 2027.
func yearForMonth(ay model.AcademicYear, month int) int {
	if month >= int(ay.StartDate.Month()) {
		return ay.StartDate.Year()
	}
	return ay.EndDate.Year()
}
