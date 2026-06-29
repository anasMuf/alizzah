package lainlain

type CreateRequest struct {
	AcademicYearID  uint    `json:"academic_year_id" validate:"required"`
	Flow            string  `json:"flow" validate:"required,oneof=income expense"`
	Category        string  `json:"category" validate:"required,max=50"`
	Amount          float64 `json:"amount" validate:"required,gt=0"`
	TransactionDate string  `json:"transaction_date" validate:"required,dateonly"`
	Description     string  `json:"description" validate:"omitempty"`
}

type Response struct {
	ID              uint    `json:"id"`
	AcademicYearID  uint    `json:"academic_year_id"`
	Flow            string  `json:"flow"`
	Category        string  `json:"category"`
	Amount          float64 `json:"amount"`
	TransactionDate string  `json:"transaction_date"`
	Description     string  `json:"description,omitempty"`
	CreatedBy       string  `json:"created_by,omitempty"`
	CreatedAt       string  `json:"created_at"`
}

type QueryParams struct {
	AcademicYearID uint
	Flow           string
	Page           int
	Limit          int
}

func toResponse(m MiscTransaction) Response {
	return Response{
		ID:              m.ID,
		AcademicYearID:  m.AcademicYearID,
		Flow:            m.Flow,
		Category:        m.Category,
		Amount:          m.Amount,
		TransactionDate: m.TransactionDate.Format("2006-01-02"),
		Description:     m.Description,
		CreatedBy:       m.Creator.FullName,
		CreatedAt:       m.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}
