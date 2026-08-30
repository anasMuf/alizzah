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
}
