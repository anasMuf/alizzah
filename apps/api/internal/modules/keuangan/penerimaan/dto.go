package penerimaan

import "api/dto"

// --- Query Params ---

type QueryParams struct {
	AcademicYearID uint
	Category       string
	StartDate      string
	EndDate        string
	Page           int
	Limit          int
}

// --- Requests ---

type CreateRequest struct {
	AcademicYearID  uint    `json:"academic_year_id" validate:"required"`
	Category        string  `json:"category" validate:"required,oneof=bos donasi hibah lainnya"`
	SourceName      string  `json:"source_name" validate:"required,max=100"`
	Amount          float64 `json:"amount" validate:"required,min=1"`
	TransactionDate string  `json:"transaction_date" validate:"required,dateonly"`
	ReferenceNumber string  `json:"reference_number" validate:"omitempty,max=50"`
	Notes           string  `json:"notes" validate:"omitempty"`
}

// --- Responses ---

type Response struct {
	ID              uint                        `json:"id"`
	AcademicYear    dto.AcademicYearBriefResponse `json:"academic_year"`
	Category        string                      `json:"category"`
	SourceName      string                      `json:"source_name"`
	Amount          float64                     `json:"amount"`
	TransactionDate string                      `json:"transaction_date"`
	ReferenceNumber *string                     `json:"reference_number"`
	Notes           *string                     `json:"notes"`
	CreatedBy       dto.UserBriefResponse       `json:"created_by"`
	CreatedAt       string                      `json:"created_at"`
}
