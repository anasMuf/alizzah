package dto

// FeeConfig
type CreateFeeConfigRequest struct {
	AcademicYearID   uint    `json:"academic_year_id" validate:"required"`
	SavingsAdminRate float64 `json:"savings_admin_rate" validate:"required,min=0,max=100"`
}

type UpdateFeeConfigRequest struct {
	SavingsAdminRate float64 `json:"savings_admin_rate" validate:"required,min=0,max=100"`
}

type FeeConfigResponse struct {
	ID               uint                      `json:"id"`
	AcademicYear     AcademicYearBriefResponse `json:"academic_year"`
	SavingsAdminRate float64                   `json:"savings_admin_rate"`
	Items            []FeeConfigItemResponse   `json:"items,omitempty"`
	CreatedAt        string                    `json:"created_at"`
}

// FeeConfigItem
type CreateFeeConfigItemRequest struct {
	Category    string  `json:"category" validate:"required,oneof=initial registration monthly_spp monthly_infaq pasta calisan ekskul savings_mandatory daycare graduation"`
	ItemKey     string  `json:"item_key" validate:"required,max=50"`
	Name        string  `json:"name" validate:"required,max=100"`
	Level       string  `json:"level" validate:"required,oneof=all mutiara intan berlian"`
	Gender      string  `json:"gender" validate:"required,oneof=all L P"`
	Amount      float64 `json:"amount" validate:"required,min=0"`
	Unit        string  `json:"unit" validate:"required,oneof=fixed per_day per_monday percent"`
	IsMandatory bool    `json:"is_mandatory"`
}

type FeeConfigItemResponse struct {
	ID          uint    `json:"id"`
	Category    string  `json:"category"`
	ItemKey     string  `json:"item_key"`
	Name        string  `json:"name"`
	Level       string  `json:"level"`
	Gender      string  `json:"gender"`
	Amount      float64 `json:"amount"`
	Unit        string  `json:"unit"`
	IsMandatory bool    `json:"is_mandatory"`
}

type FeeConfigItemQueryParams struct {
	Category string
	Level    string
	Gender   string
}
