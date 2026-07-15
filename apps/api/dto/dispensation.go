package dto

// Request
type CreateDispensationRequest struct {
	AcademicYearID uint    `json:"academic_year_id" validate:"required"`
	FeeCategory    string  `json:"fee_category" validate:"omitempty,oneof=monthly_spp initial daycare"`
	DiscountType   string  `json:"discount_type" validate:"required,oneof=percent fixed"`
	DiscountValue  float64 `json:"discount_value" validate:"required,min=1"`
	IsPermanent    bool    `json:"is_permanent"`
	StartMonth     uint    `json:"start_month" validate:"required,min=1,max=12"`
	StartYear      uint    `json:"start_year" validate:"required,min=2020"`
	EndMonth       *uint   `json:"end_month" validate:"omitempty,min=1,max=12"`
	EndYear        *uint   `json:"end_year" validate:"omitempty,min=2020"`
	Reason         string  `json:"reason" validate:"required,max=100"`
	Notes          string  `json:"notes" validate:"omitempty"`
}

type UpdateDispensationRequest struct {
	DiscountType  string  `json:"discount_type" validate:"required,oneof=percent fixed"`
	DiscountValue float64 `json:"discount_value" validate:"required,min=1"`
	IsPermanent   bool    `json:"is_permanent"`
	EndMonth      *uint   `json:"end_month" validate:"omitempty,min=1,max=12"`
	EndYear       *uint   `json:"end_year" validate:"omitempty,min=2020"`
	Reason        string  `json:"reason" validate:"required,max=100"`
	Notes         string  `json:"notes" validate:"omitempty"`
}

// Response
type DispensationResponse struct {
	ID            uint                      `json:"id"`
	StudentID     uint                      `json:"student_id"`
	AcademicYear  AcademicYearBriefResponse `json:"academic_year"`
	FeeCategory   string                    `json:"fee_category"`
	DiscountType  string                    `json:"discount_type"`
	DiscountValue float64                   `json:"discount_value"`
	IsPermanent   bool                      `json:"is_permanent"`
	StartMonth    uint                      `json:"start_month"`
	StartYear     uint                      `json:"start_year"`
	EndMonth      *uint                     `json:"end_month"`
	EndYear       *uint                     `json:"end_year"`
	Reason        string                    `json:"reason"`
	Notes         *string                   `json:"notes"`
	IsActive      bool                      `json:"is_active"`
	CreatedBy     UserBriefResponse         `json:"created_by"`
	CreatedAt     string                    `json:"created_at"`
}

// Query
type DispensationQueryParams struct {
	AcademicYearID uint
	IsActive       *bool
}
