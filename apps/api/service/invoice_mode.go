package service

// Aturan mode tagihan manual terhadap tahun ajaran.
//
// Ini adalah cermin server dari `modeAvailability` di
// apps/dashboard/src/features/keuangan/manual-invoice.ts. Redaksi pesannya
// sengaja disamakan persis dengan versi klien supaya UI dan API tidak pernah
// memberi penjelasan berbeda saat menolak kombinasi yang sama.
//
// Klien sudah mencegah kombinasi tidak sah lewat tombol mode yang disabled dan
// validasi submit; fungsi ini adalah pertahanan lapis kedua untuk pemanggil API
// langsung (skrip, klien lain, atau state basi yang lolos).
//
// Aturan:
//   - `manual` (rinci) hanya sah untuk TA aktif yang punya item tarif aktif,
//     karena itemnya diambil dari tarif milik TA itu.
//   - `arrears` (nominal total) hanya sah untuk TA selain TA aktif.
//
// Mengembalikan alasan penolakan, atau "" bila kombinasi sah.
func invoiceModeViolation(invoiceType string, isActiveAcademicYear bool, activeTariffItemCount int64) string {
	if invoiceType == "manual" {
		if !isActiveAcademicYear {
			return "Mode rinci hanya untuk tahun ajaran aktif."
		}
		if activeTariffItemCount == 0 {
			return "Tahun ajaran ini belum punya item tarif aktif."
		}
		return ""
	}

	// `arrears` — satu-satunya type lain yang lolos validasi jenis di CreateManual.
	if isActiveAcademicYear {
		return "Tahun ajaran aktif memakai mode rinci sesuai tarif."
	}
	return ""
}
