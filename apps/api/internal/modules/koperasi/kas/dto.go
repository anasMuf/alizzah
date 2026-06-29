package kas

type BalanceResponse struct {
	AcademicYearID uint    `json:"academic_year_id"`
	Balance        float64 `json:"balance"`
}

type TransactionResponse struct {
	ID              uint    `json:"id"`
	TransactionDate string  `json:"transaction_date"`
	TransactionType string  `json:"transaction_type"`
	Amount          float64 `json:"amount"`
	SourceType      string  `json:"source_type"`
	SourceID        *uint   `json:"source_id,omitempty"`
	Category        string  `json:"category,omitempty"`
	Description     string  `json:"description"`
	CreatedBy       string  `json:"created_by,omitempty"`
}

type QueryParams struct {
	AcademicYearID  uint
	TransactionType string
	SourceType      string
	StartDate       string
	EndDate         string
	Page            int
	Limit           int
}

func toResponse(ct CashTransaction) TransactionResponse {
	return TransactionResponse{
		ID:              ct.ID,
		TransactionDate: ct.TransactionDate.Format("2006-01-02"),
		TransactionType: ct.TransactionType,
		Amount:          ct.Amount,
		SourceType:      ct.SourceType,
		SourceID:        ct.SourceID,
		Category:        ct.Category,
		Description:     ct.Description,
		CreatedBy:       ct.Creator.FullName,
	}
}
