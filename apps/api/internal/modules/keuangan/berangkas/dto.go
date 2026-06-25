package berangkas

import "api/dto"

type BalanceResponse struct {
	Balance               float64 `json:"balance"`
	TotalSavingsGeneral   float64 `json:"total_savings_general"`
	TotalSavingsMandatory float64 `json:"total_savings_mandatory"`
}

type TransactionResponse struct {
	ID              uint                `json:"id"`
	TransactionDate string              `json:"transaction_date"`
	TransactionType string              `json:"transaction_type"`
	Amount          float64             `json:"amount"`
	SourceType      string              `json:"source_type"`
	SourceID        *uint               `json:"source_id"`
	Description     string              `json:"description"`
	CreatedBy       dto.UserBriefResponse `json:"created_by"`
}

type QueryParams struct {
	AcademicYearID  uint
	StartDate       string
	EndDate         string
	TransactionType string
	SourceType      string
	Page            int
	Limit           int
}
