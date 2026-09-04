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

// Current month facility invoice item days info
type FacilityCurrentMonthDaysResponse struct {
	InvoiceItemID *uint   `json:"invoice_item_id"`
	DefaultDays   uint    `json:"default_days"`
	CurrentDays   uint    `json:"current_days"`
	ZoneAmount    float64 `json:"zone_amount"`
	InvoiceID     *uint   `json:"invoice_id"`
}

// --- Facility detail: list students by facility ---

type FacilityStudentQueryParams struct {
	AcademicYearID uint
	Search         string
	Page           int
	Limit          int
	// Month & Year opsional: bila > 0, kuantitas hari dihitung untuk bulan
	// tersebut. Bila 0, default ke bulan berjalan (kompatibel mundur).
	Month uint
	Year  uint
}

type FacilityStudentItemResponse struct {
	ID            uint                        `json:"id"`
	Student       StudentBriefResponse        `json:"student"`
	FeeConfigItem *FeeConfigItemBriefResponse `json:"fee_config_item,omitempty"`
	StartDate     string                      `json:"start_date"`
	EndDate       *string                     `json:"end_date"`
	// Jumlah hari (kuantitas item fasilitas per_day) untuk bulan yang diminta.
	CurrentMonthDays *uint `json:"current_month_days,omitempty"`
	// InvoiceID & InvoiceItemID item fasilitas pada bulan yang diminta —
	// diisi hanya bila item per_day tersedia, dipakai FE untuk menyimpan
	// perubahan jumlah hari tanpa panggilan resolve terpisah.
	InvoiceID     *uint `json:"invoice_id,omitempty"`
	InvoiceItemID *uint `json:"invoice_item_id,omitempty"`
}

type PaginatedFacilityStudentResponse struct {
	Data []FacilityStudentItemResponse `json:"data"`
	Meta Meta                          `json:"meta"`
}
