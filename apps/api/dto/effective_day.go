package dto

type UpsertEffectiveDayRequest struct {
	AcademicYearID uint `json:"academic_year_id" validate:"required"`
	Month          uint `json:"month" validate:"required,min=1,max=12"`
	Year           uint `json:"year" validate:"required,min=2020"`
	TotalDays      uint `json:"total_days" validate:"required,min=0,max=31"`
	TotalMondays   uint `json:"total_mondays" validate:"required,min=0,max=5"`
}

type EffectiveDayResponse struct {
	ID           uint              `json:"id"`
	ClassGroupID uint              `json:"class_group_id"`
	Level        string            `json:"level,omitempty"`
	Month        uint              `json:"month"`
	Year         uint              `json:"year"`
	TotalDays    uint              `json:"total_days"`
	TotalMondays uint              `json:"total_mondays"`
	CreatedBy    UserBriefResponse `json:"created_by"`
	CreatedAt    string            `json:"created_at"`
}

type EffectiveDayQueryParams struct {
	AcademicYearID uint
	Year           uint
}
