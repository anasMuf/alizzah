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
	ID                 uint              `json:"id"`
	ClosingDate        string            `json:"closing_date"`
	PhysicalCashAmount float64           `json:"physical_cash_amount"`
	SystemCashAmount   float64           `json:"system_cash_amount"`
	Difference         float64           `json:"difference"`
	Notes              *string           `json:"notes"`
	IsConfirmed        bool              `json:"is_confirmed"`
	ClosedBy           UserBriefResponse `json:"closed_by"`
}

type DailyClosingQueryParams struct {
	AcademicYearID uint
	StartDate      string
	EndDate        string
	IsConfirmed    *bool
	Page           int
	Limit          int
}
