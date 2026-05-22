package dto

// CreateAcademicYearRequest is the request body for POST /api/v1/academic-years.
type CreateAcademicYearRequest struct {
	Name      string `json:"name" validate:"required,max=20"`
	StartDate string `json:"start_date" validate:"required"`
	EndDate   string `json:"end_date" validate:"required"`
}

// AcademicYearResponse is the standard response for academic year endpoints.
type AcademicYearResponse struct {
	ID        uint   `json:"id"`
	Name      string `json:"name"`
	StartDate string `json:"start_date"`
	EndDate   string `json:"end_date"`
	IsActive  bool   `json:"is_active"`
	CreatedAt string `json:"created_at"`
}
