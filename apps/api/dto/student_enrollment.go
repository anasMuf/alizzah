package dto

type EnrollmentBriefResponse struct {
	ID               uint   `json:"id"`
	ClassGroupID     uint   `json:"class_group_id"`
	ClassGroupName   string `json:"class_group_name"`
	Level            string `json:"level"`
	AcademicYearID   uint   `json:"academic_year_id"`
	AcademicYearName string `json:"academic_year_name"`
	StartDate        string `json:"start_date"`
	Status           string `json:"status"`
}

type EnrollmentDetailResponse struct {
	ID             uint                      `json:"id"`
	AcademicYear   AcademicYearBriefResponse `json:"academic_year"`
	ClassGroup     ClassGroupBriefResponse   `json:"class_group"`
	StartDate      string                    `json:"start_date"`
	EndDate        *string                   `json:"end_date"`
	Status         string                    `json:"status"`
	EnrollmentType string                    `json:"enrollment_type"`
	Notes          *string                   `json:"notes"`
}

type EnrollmentQueryParams struct {
	AcademicYearID uint
}
