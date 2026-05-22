package dto

type EnrollExtracurricularRequest struct {
	ExtracurricularID uint   `json:"extracurricular_id" validate:"required"`
	AcademicYearID    uint   `json:"academic_year_id" validate:"required"`
	StartDate         string `json:"start_date" validate:"required,datetime"`
}

type UpdateStudentExtracurricularRequest struct {
	EndDate string `json:"end_date" validate:"required,datetime"`
}

type StudentExtracurricularResponse struct {
	ID              uint                    `json:"id"`
	Extracurricular ExtracurricularResponse `json:"extracurricular"`
	StartDate       string                  `json:"start_date"`
	EndDate         *string                 `json:"end_date"`
}

type StudentExtracurricularQueryParams struct {
	AcademicYearID uint
}
