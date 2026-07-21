package dto

// Cash
type CashBalanceResponse struct {
	Balance         float64 `json:"balance"`
	LastClosingDate *string `json:"last_closing_date"`
	TodayCredit     float64 `json:"today_credit"`
	TodayDebit      float64 `json:"today_debit"`
}

type CashTransactionResponse struct {
	ID              uint              `json:"id"`
	TransactionDate string            `json:"transaction_date"`
	TransactionType string            `json:"transaction_type"`
	Amount          float64           `json:"amount"`
	SourceType      string            `json:"source_type"`
	SourceID        *uint             `json:"source_id"`
	Description     string            `json:"description"`
	CreatedBy       UserBriefResponse `json:"created_by"`
}

type CashTransactionQueryParams struct {
	AcademicYearID  uint
	StartDate       string
	EndDate         string
	TransactionType string
	SourceType      string
	Page            int
	Limit           int
}

type TransferToCashRequest struct {
	Amount      float64 `json:"amount" validate:"required,min=1"`
	Description string  `json:"description" validate:"required"`
}

// Vault
type VaultBalanceResponse struct {
	Balance                      float64 `json:"balance"`
	TotalSavingsGeneral          float64 `json:"total_savings_general"`
	TotalSavingsMandatory        float64 `json:"total_savings_mandatory"`
	TotalSavingsMandatoryBerlian float64 `json:"total_savings_mandatory_berlian"`
	TotalSavingsMandatoryMutiara float64 `json:"total_savings_mandatory_mutiara"`
}

type VaultTransactionResponse struct {
	ID              uint              `json:"id"`
	TransactionDate string            `json:"transaction_date"`
	TransactionType string            `json:"transaction_type"`
	Amount          float64           `json:"amount"`
	SourceType      string            `json:"source_type"`
	SourceID        *uint             `json:"source_id"`
	Description     string            `json:"description"`
	CreatedBy       UserBriefResponse `json:"created_by"`
}

type VaultTransactionQueryParams struct {
	AcademicYearID  uint
	StartDate       string
	EndDate         string
	TransactionType string
	SourceType      string
	Page            int
	Limit           int
}
