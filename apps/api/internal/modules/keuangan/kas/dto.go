package kas

import "api/dto"

type BalanceResponse struct {
	Balance         float64 `json:"balance"`
	LastClosingDate *string `json:"last_closing_date"`
	TodayCredit     float64 `json:"today_credit"`
	TodayDebit      float64 `json:"today_debit"`
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

type TransferRequest struct {
	Amount      float64 `json:"amount" validate:"required,min=1"`
	Description string  `json:"description" validate:"required"`
}
