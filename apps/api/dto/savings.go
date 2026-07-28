package dto

// Query
type SavingsTransactionQueryParams struct {
	Type      string // general | mandatory
	StartDate string
	EndDate   string
	Page      int
	Limit     int
}

// Request
type SavingsWithdrawalRequest struct {
	Amount        float64 `json:"amount" validate:"required,min=1"`
	Notes         string  `json:"notes" validate:"omitempty"`
	ApplyAdminFee bool    `json:"apply_admin_fee"`
}

// Response
type StudentSavingsResponse struct {
	General   *SavingsBalanceResponse `json:"general"`
	Mandatory *SavingsBalanceResponse `json:"mandatory"`
}

type SavingsBalanceResponse struct {
	ID      uint    `json:"id"`
	Type    string  `json:"type"`
	Balance float64 `json:"balance"`
}

type SavingsTransactionResponse struct {
	ID              uint    `json:"id"`
	SavingsType     string  `json:"savings_type"`
	TransactionType string  `json:"transaction_type"`
	Amount          float64 `json:"amount"`
	AdminFee        float64 `json:"admin_fee"`
	NetAmount       float64 `json:"net_amount"`
	SourceType      string  `json:"source_type"`
	Notes           *string `json:"notes"`
	CreatedAt       string  `json:"created_at"`
}

type WithdrawalResponse struct {
	Amount           float64 `json:"amount"`
	AdminFee         float64 `json:"admin_fee"`
	NetAmount        float64 `json:"net_amount"`
	RemainingBalance float64 `json:"remaining_balance"`
}
