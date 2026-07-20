package dto

// FinancialSummaryResponse is a placeholder for Batch 5
type FinancialSummaryResponse struct {
	TotalUnpaid             float64 `json:"total_unpaid"`
	SavingsGeneralBalance   float64 `json:"savings_general_balance"`
	SavingsMandatoryBalance float64 `json:"savings_mandatory_balance"`
}

// CreateStudentRequest is the request body for POST /api/v1/students.
type CreateStudentRequest struct {
	FullName      string                 `json:"full_name" validate:"required,min=3,max=100"`
	BirthPlace    string                 `json:"birth_place" validate:"required,max=100"`
	BirthDate     string                 `json:"birth_date" validate:"required"`
	Gender        string                 `json:"gender" validate:"required,oneof=L P"`
	Religion      string                 `json:"religion" validate:"omitempty,max=30"`
	IsDaycareOnly bool                   `json:"is_daycare_only"`
	Guardians     []CreateGuardianInline `json:"guardians" validate:"omitempty,dive"`

	// Optional: tandai siswa sebagai ABK (Anak Berkebutuhan Khusus)
	Exceptionality *ExceptionalityRequest `json:"exceptionality" validate:"omitempty"`

	// Optional: langsung enroll ke kelas saat pendaftaran
	ClassGroupID     uint   `json:"class_group_id" validate:"omitempty"`
	AcademicYearID   uint   `json:"academic_year_id" validate:"omitempty"`
	EnrollmentType   string `json:"enrollment_type" validate:"omitempty,oneof=new mutation"`
	EnrollmentStatus string `json:"enrollment_status" validate:"omitempty,oneof=active pending"`
	StartDate        string `json:"start_date" validate:"omitempty,dateonly"`
}

// ExceptionalityRequest is used to set/update a student's exceptional (ABK) status.
type ExceptionalityRequest struct {
	Description string `json:"description" validate:"omitempty,max=255"`
	IsActive    *bool  `json:"is_active"` // nil = activate, false = deactivate
}

// CreateGuardianInline is used within CreateStudentRequest to optionally add guardians during student creation.
type CreateGuardianInline struct {
	FullName     string `json:"full_name" validate:"required,max=100"`
	Relationship string `json:"relationship" validate:"required,oneof=ayah ibu wali"`
	Phone        string `json:"phone" validate:"required,max=20"`
	Address      string `json:"address" validate:"omitempty"`
	IsPrimary    bool   `json:"is_primary"`
}

// UpdateStudentRequest is the request body for PUT /api/v1/students/:id.
type UpdateStudentRequest struct {
	FullName       string                 `json:"full_name" validate:"required,min=3,max=100"`
	BirthPlace     string                 `json:"birth_place" validate:"required,max=100"`
	BirthDate      string                 `json:"birth_date" validate:"required"`
	Gender         string                 `json:"gender" validate:"required,oneof=L P"`
	Religion       string                 `json:"religion" validate:"omitempty,max=30"`
	IsDaycareOnly  bool                   `json:"is_daycare_only"`
	Exceptionality *ExceptionalityRequest `json:"exceptionality" validate:"omitempty"`
}

// StudentQueryParams holds query parameters for listing students.
type StudentQueryParams struct {
	Search         string
	Status         string
	ClassGroupID   uint
	NoClassGroup   bool
	AcademicYearID uint
	IsDaycareOnly  *bool
	Page           int
	Limit          int
}

// StudentListResponse is the standard response for list endpoints.
type StudentListResponse struct {
	ID                uint                     `json:"id"`
	FullName          string                   `json:"full_name"`
	Gender            string                   `json:"gender"`
	BirthDate         string                   `json:"birth_date"`
	Status            string                   `json:"status"`
	IsDaycareOnly     bool                     `json:"is_daycare_only"`
	CurrentEnrollment *EnrollmentBriefResponse `json:"active_enrollment,omitempty"`
}

// ExceptionalityResponse is the response for a student's exceptional (ABK) status.
type ExceptionalityResponse struct {
	IsExceptional bool   `json:"is_exceptional"`
	Description   string `json:"description,omitempty"`
}

// StudentDetailResponse is the detailed response.
type StudentDetailResponse struct {
	ID                uint                      `json:"id"`
	FullName          string                    `json:"full_name"`
	Gender            string                    `json:"gender"`
	BirthPlace        string                    `json:"birth_place"`
	BirthDate         string                    `json:"birth_date"`
	Religion          string                    `json:"religion"`
	PhotoURL          *string                   `json:"photo_url"`
	Status            string                    `json:"status"`
	IsDaycareOnly     bool                      `json:"is_daycare_only"`
	Exceptionality    *ExceptionalityResponse   `json:"exceptionality,omitempty"`
	Guardians         []GuardianBriefResponse   `json:"guardians"`
	CurrentEnrollment *EnrollmentBriefResponse  `json:"active_enrollment,omitempty"`
	FinancialSummary  *FinancialSummaryResponse `json:"financial_summary,omitempty"`
	CreatedAt         string                    `json:"created_at"`
}

// ImportResult is the response item for student import.
type ImportResult struct {
	Row     int    `json:"row"`
	Name    string `json:"name"`
	Success bool   `json:"success"`
	Error   string `json:"error,omitempty"`
}

// ImportSummaryResponse is the summary for the bulk import operation.
type ImportSummaryResponse struct {
	TotalProcessed int            `json:"total_processed"`
	TotalSuccess   int            `json:"total_success"`
	TotalFailed    int            `json:"total_failed"`
	Details        []ImportResult `json:"details"`
}
