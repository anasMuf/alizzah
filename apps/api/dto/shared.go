package dto

type StudentBriefResponse struct {
	ID       uint   `json:"id"`
	FullName string `json:"full_name"`
	Gender   string `json:"gender"`
	Status   string `json:"status"`
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
