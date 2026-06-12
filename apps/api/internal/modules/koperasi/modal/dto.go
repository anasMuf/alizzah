package modal

type CreateRequest struct {
	AcademicYearID uint    `json:"academic_year_id" validate:"required"`
	InjectionDate  string  `json:"injection_date" validate:"required,dateonly"`
	Amount         float64 `json:"amount" validate:"required,gt=0"`
	Notes          string  `json:"notes" validate:"omitempty"`
}

type Response struct {
	ID             uint    `json:"id"`
	AcademicYearID uint    `json:"academic_year_id"`
	InjectionDate  string  `json:"injection_date"`
	Amount         float64 `json:"amount"`
	Notes          string  `json:"notes,omitempty"`
	CreatedBy      string  `json:"created_by,omitempty"`
	CreatedAt      string  `json:"created_at"`
}

func toResponse(ci CapitalInjection) Response {
	return Response{
		ID:             ci.ID,
		AcademicYearID: ci.AcademicYearID,
		InjectionDate:  ci.InjectionDate.Format("2006-01-02"),
		Amount:         ci.Amount,
		Notes:          ci.Notes,
		CreatedBy:      ci.Creator.FullName,
		CreatedAt:      ci.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}
