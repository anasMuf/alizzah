package dto

type StudentBriefResponse struct {
	ID               uint                     `json:"id"`
	FullName         string                   `json:"full_name"`
	Gender           string                   `json:"gender"`
	Status           string                   `json:"status"`
	ActiveEnrollment *EnrollmentBriefForStudent `json:"active_enrollment,omitempty"`
}

type EnrollmentBriefForStudent struct {
	ClassGroupID   uint                   `json:"class_group_id"`
	ClassGroup     ClassGroupBriefResponse `json:"class_group"`
}

type ClassGroupBriefResponse struct {
	ID    uint   `json:"id"`
	Name  string `json:"name"`
	Level string `json:"level"`
}

type AcademicYearBriefResponse struct {
	ID   uint   `json:"id"`
	Name string `json:"name"`
}

type UserBriefResponse struct {
	ID       uint   `json:"id"`
	FullName string `json:"full_name"`
}
