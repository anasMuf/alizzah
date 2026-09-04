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
	// Zona EFEKTIF bulan yang diminta (override ?: default) — dipakai dropdown
	// zona per bulan di tab bulanan. Absence field = default tanpa zona.
	MonthZoneFeeConfigItemID *uint `json:"month_zone_fee_config_item_id,omitempty"`
	// MonthZoneOverridden true bila bulan tsb punya override eksplisit.
	MonthZoneOverridden bool `json:"month_zone_overridden"`
	// MonthItemPaid true bila item invoice fasilitas bulan tsb sudah dibayar
	// (memicu konfirmasi saat ubah zona/hari).
	MonthItemPaid bool `json:"month_item_paid"`
}

type PaginatedFacilityStudentResponse struct {
	Data []FacilityStudentItemResponse `json:"data"`
	Meta Meta                          `json:"meta"`
}

// --- Per-bulan zone override (fasilitas antar jemput) ---

// UpdateStudentFacilityMonthZoneRequest — set zona eksplisit utk SATU bulan.
// fee_config_item_id null = "tanpa zona". Untuk kembali ke default (hapus
// override) gunakan DELETE month-zone, bukan PUT dengan nilai default.
type UpdateStudentFacilityMonthZoneRequest struct {
	Month uint `json:"month" validate:"required,min=1,max=12"`
	Year  uint `json:"year" validate:"required,min=2000,max=2100"`
	// FeeConfigItemID zona utk bulan tsb; null = "tanpa zona".
	FeeConfigItemID *uint `json:"fee_config_item_id"`
	// Force=true mengizinkan rewrite item invoice yang sudah dibayar
	// (paid_amount dipertahankan; selisih jadi sisa tagihan/kelebihan bayar).
	Force bool `json:"force"`
}

// FacilityMonthZoneResponse — hasil PUT/DELETE month-zone.
type FacilityMonthZoneResponse struct {
	Month uint `json:"month"`
	Year  uint `json:"year"`
	// Zona efektif setelah operasi (override ?: default); null = tanpa zona.
	FeeConfigItemID *uint  `json:"fee_config_item_id"`
	Source          string `json:"source"` // "override" | "default"
	// InvoiceItemUpdated true bila item invoice bulan tsb ditemukan & ditulis ulang.
	InvoiceItemUpdated bool `json:"invoice_item_updated"`
	// ItemPaidAmount jumlah yang sudah dibayar pada item bulan tsb.
	ItemPaidAmount float64 `json:"item_paid_amount"`
	// RemainingOrExcess = amount - paid; positif = sisa tagihan,
	// negatif = kelebihan bayar (setelah rewrite).
	RemainingOrExcess float64 `json:"remaining_or_excess"`
}

// FacilityDefaultZoneSummary — ringkasan penyelarasan saat ubah zona default.
type FacilityDefaultZoneSummary struct {
	Reconciled      int `json:"reconciled"`
	SkippedPaid     int `json:"skipped_paid"`
	SkippedOverride int `json:"skipped_override"`
}

// FacilityMonthRewriteResult — hasil rewrite item invoice fasilitas satu bulan
// (dikembalikan InvoiceGenerateService.RewriteFacilityMonthItem).
type FacilityMonthRewriteResult struct {
	// InvoiceItemUpdated true bila item bulan tsb ditemukan & ditulis ulang.
	InvoiceItemUpdated bool `json:"invoice_item_updated"`
	// BlockedByPayment true bila item sudah dibayar & allowPaid=false.
	BlockedByPayment bool    `json:"blocked_by_payment"`
	ItemPaidAmount   float64 `json:"item_paid_amount"`
	// RemainingOrExcess = amount - paid; positif = sisa tagihan,
	// negatif = kelebihan bayar.
	RemainingOrExcess float64 `json:"remaining_or_excess"`
}

// StudentFacilityUpdateResponse — response PUT enrollment (ubah zona default)
// dengan ringkasan penyelarasan item invoice.
type StudentFacilityUpdateResponse struct {
	Facility StudentFacilityResponse     `json:"facility"`
	Summary  *FacilityDefaultZoneSummary `json:"summary,omitempty"`
}
