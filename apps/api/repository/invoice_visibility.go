package repository

import "fmt"

// monthlyVisibilityCond mengembalikan kondisi SQL (untuk .Where) yang membatasi
// TAGIHAN BULANAN agar hanya sampai bulan "berjalan" yang di-clamp ke rentang tahun
// ajaran masing-masing: CURRENT_DATE diklem ke [start_date, end_date] tiap TA, lalu
// dibandingkan dengan periode (year, month) invoice. Tagihan non-bulanan TIDAK
// terpengaruh; tagihan bulan depan dikecualikan sepenuhnya (daftar, total, laporan
// agregat, pemilihan pembayaran).
//
// Perilaku clamp:
//   - hari ini sebelum TA mulai -> batas = bulan pertama TA
//   - hari ini di dalam TA       -> batas = bulan berjalan
//   - hari ini setelah TA selesai-> batas = bulan terakhir TA (semua tampil)
//
// invAlias = nama/alias tabel invoices pada query (mis. "invoices" atau "i").
// Memakai subkueri terkorelasi agar tidak menambah JOIN (menghindari kolom ambigu
// seperti created_at/deleted_at saat di-join ke academic_years).
func monthlyVisibilityCond(invAlias string) string {
	return fmt.Sprintf(
		`(%[1]s.type <> 'monthly' OR make_date(%[1]s.year::int, %[1]s.month::int, 1) <= `+
			`(SELECT date_trunc('month', LEAST(GREATEST(CURRENT_DATE, ay.start_date), ay.end_date))::date `+
			`FROM academic_years ay WHERE ay.id = %[1]s.academic_year_id))`,
		invAlias,
	)
}
