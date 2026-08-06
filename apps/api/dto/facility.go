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

// FeeConfigItem brief (minimal response untuk dropdown/enrollment)
type FeeConfigItemBriefResponse struct {
	ID     uint    `json:"id"`
	Name   string  `json:"name"`
	Amount float64 `json:"amount"`
	Unit   string  `json:"unit"`
}

// Student Facility (enrollment)
type EnrollFacilityRequest struct {
	FacilityID      uint   `json:"facility_id" validate:"required"`
	AcademicYearID  uint   `json:"academic_year_id" validate:"required"`
	FeeConfigItemID *uint  `json:"fee_config_item_id"`
	StartDate       string `json:"start_date" validate:"required,dateonly"`
}

type StudentFacilityResponse struct {
	ID            uint                        `json:"id"`
	Facility      FacilityResponse            `json:"facility"`
	FeeConfigItem *FeeConfigItemBriefResponse `json:"fee_config_item,omitempty"`
	StartDate     string                      `json:"start_date"`
	EndDate       *string                     `json:"end_date"`
}

type StudentFacilityQueryParams struct {
	AcademicYearID uint
}

// Update enrollment (change zone/package)
type UpdateStudentFacilityRequest struct {
	FeeConfigItemID *uint `json:"fee_config_item_id"`
}

// --- Facility detail: list students by facility ---

type FacilityStudentQueryParams struct {
	AcademicYearID uint
	Search         string
	Page           int
	Limit          int
}

type FacilityStudentItemResponse struct {
	ID            uint                        `json:"id"`
	Student       StudentBriefResponse        `json:"student"`
	FeeConfigItem *FeeConfigItemBriefResponse `json:"fee_config_item,omitempty"`
	StartDate     string                      `json:"start_date"`
	EndDate       *string                     `json:"end_date"`
}

type PaginatedFacilityStudentResponse struct {
	Data []FacilityStudentItemResponse `json:"data"`
	Meta Meta                          `json:"meta"`
}
