package dto

// CreateGuardianRequest is the request body for POST /api/v1/guardians and PUT /api/v1/guardians/:id.
type CreateGuardianRequest struct {
	FullName     string `json:"full_name" validate:"required,max=100"`
	Relationship string `json:"relationship" validate:"required,oneof=ayah ibu wali"`
	Phone        string `json:"phone" validate:"required,max=20"`
	Address      string `json:"address" validate:"omitempty"`
}

// LinkGuardianRequest is the request body for POST /api/v1/students/:id/guardians.
type LinkGuardianRequest struct {
	GuardianID uint `json:"guardian_id" validate:"required"`
	IsPrimary  bool `json:"is_primary"`
}

// GuardianResponse is the detailed response.
type GuardianResponse struct {
	ID           uint                   `json:"id"`
	FullName     string                 `json:"full_name"`
	Relationship string                 `json:"relationship"`
	Phone        string                 `json:"phone"`
	Address      string                 `json:"address"`
	Students     []StudentBriefResponse `json:"students,omitempty"`
}

// GuardianBriefResponse is used inside StudentDetailResponse to avoid cycle.
type GuardianBriefResponse struct {
	ID           uint   `json:"id"`
	FullName     string `json:"full_name"`
	Relationship string `json:"relationship"`
	Phone        string `json:"phone"`
	Address      string `json:"address"`
	IsPrimary    bool   `json:"is_primary"`
}
