package dto

// BillingExclusionMonth merepresentasikan satu bulan yang di-skip tagihannya.
type BillingExclusionMonth struct {
	Month uint `json:"month" validate:"required,min=1,max=12"`
	Year  uint `json:"year" validate:"required"`
}

// SetBillingExclusionsRequest berisi daftar bulan yang di-skip (replace-all).
// Daftar kosong = hapus semua exclusion (boleh dikirim).
type SetBillingExclusionsRequest struct {
	Months []BillingExclusionMonth `json:"months" validate:"omitempty,dive"`
}

// BillingExclusionsResponse adalah daftar bulan yang sedang di-skip.
type BillingExclusionsResponse struct {
	Months []BillingExclusionMonth `json:"months"`
	// PaidMonths = bulan di mana entity tsb sudah punya item yang DIBIAYAR
	// (paid_amount > 0) pada invoice siswa. UI memakai daftar ini untuk
	// men-disable bulan yang tidak bisa di-skip (item berbayar tidak bisa
	// dihapus backend) — berbeda dengan sekadar "invoice bulan tsb sudah bayar".
	PaidMonths []BillingExclusionMonth `json:"paid_months,omitempty"`
}
