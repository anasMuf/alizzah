package dto

type CreateDaycareEnrollmentRequest struct {
	StudentID      uint   `json:"student_id" validate:"required"`
	AcademicYearID uint   `json:"academic_year_id" validate:"required"`
	PackageType    string `json:"package_type" validate:"required,oneof=monthly_kb monthly_tk monthly_package_kb monthly_package_tk daily"`
	StartDate      string `json:"start_date" validate:"required,datetime"`
}

type UpdateDaycareStatusRequest struct {
	Status  string `json:"status" validate:"required,oneof=active inactive"`
	EndDate string `json:"end_date" validate:"required_if=Status inactive,omitempty,datetime"`
}

type DaycareEnrollmentResponse struct {
	ID           uint                      `json:"id"`
	Student      StudentBriefResponse      `json:"student"`
	AcademicYear AcademicYearBriefResponse `json:"academic_year"`
	PackageType  string                    `json:"package_type"`
	StartDate    string                    `json:"start_date"`
	EndDate      *string                   `json:"end_date"`
	Status       string                    `json:"status"`
}

type DaycareEnrollmentQueryParams struct {
	AcademicYearID uint
	Status         string
	Search         string
	Page           int
	Limit          int
}
