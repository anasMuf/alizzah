package dto

type CreateDailyClosingRequest struct {
	AcademicYearID     uint    `json:"academic_year_id" validate:"required"`
	ClosingDate        string  `json:"closing_date" validate:"required,dateonly"`
	PhysicalCashAmount float64 `json:"physical_cash_amount" validate:"required,min=0"`
	Notes              string  `json:"notes" validate:"omitempty"`
}

type ConfirmDailyClosingRequest struct {
	Notes string `json:"notes" validate:"omitempty"`
}

type DailyClosingListResponse struct {
	ID                   uint              `json:"id"`
	ClosingDate          string            `json:"closing_date"`
	PhysicalCashAmount   float64           `json:"physical_cash_amount"`
	SystemCashAmount     float64           `json:"system_cash_amount"`
	LedgerCashAmount     float64           `json:"ledger_cash_amount"`    // saldo kas mentah (sebelum koreksi)
	WorkaroundAdjustment float64           `json:"workaround_adjustment"` // uang-hantu tarik-lalu-bayar
	Difference           float64           `json:"difference"`
	Notes                *string           `json:"notes"`
	IsConfirmed          bool              `json:"is_confirmed"`
	ClosedBy             UserBriefResponse `json:"closed_by"`
}

// DailyClosingPreviewResponse: hitung kas sistem (terkoreksi) untuk tanggal
// terpilih TANPA menyimpan — agar kasir bisa pilih tanggal & lihat perkiraan
// tunai sebelum menghitung/menginput uang fisik.
type DailyClosingPreviewResponse struct {
	ClosingDate string `json:"closing_date"`
	// Arus kas KHUSUS tanggal terpilih (difilter tepat pada tanggal itu):
	OpeningBalance float64 `json:"opening_balance"` // saldo kas ledger s/d H-1
	DayCashIn      float64 `json:"day_cash_in"`     // uang masuk pada tanggal ini
	DayCashOut     float64 `json:"day_cash_out"`    // uang keluar pada tanggal ini
	// Saldo kumulatif s/d tanggal + koreksi:
	LedgerCashAmount     float64 `json:"ledger_cash_amount"` // = opening + in - out
	WorkaroundAdjustment float64 `json:"workaround_adjustment"`
	SystemCashAmount     float64 `json:"system_cash_amount"`
	AlreadyClosed        bool    `json:"already_closed"`
}

type DailyClosingQueryParams struct {
	AcademicYearID uint
	StartDate      string
	EndDate        string
	IsConfirmed    *bool
	Page           int
	Limit          int
}
