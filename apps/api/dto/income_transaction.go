package dto

// Query
type IncomeTransactionQueryParams struct {
	AcademicYearID   uint
	IncomeCategoryID uint
	StartDate        string
	EndDate          string
	SortBy           string
	SortDir          string
	Page             int
	Limit            int
}

// Request
type CreateIncomeTransactionRequest struct {
	AcademicYearID   uint    `json:"academic_year_id" validate:"required"`
	IncomeCategoryID uint    `json:"income_category_id" validate:"required"`
	SourceName       string  `json:"source_name" validate:"required,max=100"`
	Amount           float64 `json:"amount" validate:"required,min=1"`
	TransactionDate  string  `json:"transaction_date" validate:"required,dateonly"`
	ReferenceNumber  string  `json:"reference_number" validate:"omitempty,max=50"`
	Notes            string  `json:"notes" validate:"omitempty"`
}

// Response
type IncomeTransactionResponse struct {
	ID              uint                        `json:"id"`
	AcademicYear    AcademicYearBriefResponse   `json:"academic_year"`
	IncomeCategory  IncomeCategoryBriefResponse `json:"income_category"`
	SourceName      string                      `json:"source_name"`
	Amount          float64                     `json:"amount"`
	TransactionDate string                      `json:"transaction_date"`
	ReferenceNumber *string                     `json:"reference_number"`
	Notes           *string                     `json:"notes"`
	CreatedBy       UserBriefResponse           `json:"created_by"`
	CreatedAt       string                      `json:"created_at"`
}
