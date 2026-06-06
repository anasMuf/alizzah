package dto

// Master Facility
type CreateFacilityRequest struct {
	Name        string `json:"name" validate:"required,max=100"`
	Description string `json:"description" validate:"omitempty"`
}

type FacilityResponse struct {
	ID          uint   `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	IsActive    bool   `json:"is_active"`
}

// Student Facility (enrollment)
type EnrollFacilityRequest struct {
	FacilityID     uint   `json:"facility_id" validate:"required"`
	AcademicYearID uint   `json:"academic_year_id" validate:"required"`
	StartDate      string `json:"start_date" validate:"required,dateonly"`
}

type StudentFacilityResponse struct {
	ID        uint             `json:"id"`
	Facility  FacilityResponse `json:"facility"`
	StartDate string           `json:"start_date"`
	EndDate   *string          `json:"end_date"`
}

type StudentFacilityQueryParams struct {
	AcademicYearID uint
}
