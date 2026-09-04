package dto

// Query
type PaymentQueryParams struct {
	StudentID      uint
	AcademicYearID uint
	StartDate      string
	EndDate        string
	Source         string
	Search         string
	Level          string // jenjang siswa (intan/berlian) via enrollment aktif
	ClassGroupID   uint   // rombel siswa via enrollment aktif
	CreatedBy      uint   // petugas pencatat
	Category       string // kategori item yang dibayar (monthly_spp, pasta, dll)
	Month          uint   // periode tagihan yang dibayar (bulan)
	Year           uint   // periode tagihan yang dibayar (tahun)
	Page           int
	Limit          int
}

type StudentPaymentQueryParams struct {
	AcademicYearID uint
	StartDate      string
	EndDate        string
}

// Request
type CreatePaymentRequest struct {
	StudentID       uint                `json:"student_id" validate:"required"`
	AcademicYearID  uint                `json:"academic_year_id" validate:"required"`
	PaymentDate     string              `json:"payment_date" validate:"required,dateonly"`
	Source          string              `json:"source" validate:"required,oneof=cash savings"`
	Notes           string              `json:"notes" validate:"omitempty"`
	Items           []PaymentItemReq    `json:"items" validate:"omitempty,dive"`
	IncidentalItems []IncidentalItemReq `json:"incidental_items" validate:"omitempty,dive"`
	SavingsDeposit  float64             `json:"savings_deposit" validate:"omitempty,min=0"`
	// SavingsUsage: berapa dari total tagihan yang didanai dari tabungan umum
	// (sisanya tunai). Opsional; 0 = seluruhnya tunai. Bila kosong dan
	// source="savings", di-default ke seluruh total (kompat perilaku lama).
	SavingsUsage float64 `json:"savings_usage_amount" validate:"omitempty,min=0"`
}

type PaymentItemReq struct {
	InvoiceItemID uint    `json:"invoice_item_id" validate:"required"`
	Amount        float64 `json:"amount" validate:"required"`
}

type IncidentalItemReq struct {
	Name   string  `json:"name" validate:"required,max=100"`
	Amount float64 `json:"amount" validate:"required,min=1"`
}

// Response
type PaymentListResponse struct {
	ID             uint                  `json:"id"`
	Student        StudentBriefResponse  `json:"student"`
	PaymentDate    string                `json:"payment_date"`
	TotalAmount    float64               `json:"total_amount"`
	SavingsDeposit float64               `json:"savings_deposit"`
	Source         string                `json:"source"`
	Items          []PaymentItemResponse `json:"items"`
	CreatedBy      UserBriefResponse     `json:"created_by"`
	CreatedAt      string                `json:"created_at"`
}

type PaymentDetailResponse struct {
	ID             uint                  `json:"id"`
	Student        StudentBriefResponse  `json:"student"`
	PaymentDate    string                `json:"payment_date"`
	TotalAmount    float64               `json:"total_amount"`
	SavingsDeposit float64               `json:"savings_deposit"`
	SavingsUsage   float64               `json:"savings_usage_amount"` // porsi dibayar dari tabungan umum
	Source         string                `json:"source"`
	Notes          *string               `json:"notes"`
	Items          []PaymentItemResponse `json:"items"`
	CreatedBy      UserBriefResponse     `json:"created_by"`
	CreatedAt      string                `json:"created_at"`
}

type PaymentItemResponse struct {
	ID              uint    `json:"id"`
	InvoiceItemID   uint    `json:"invoice_item_id"`
	InvoiceID       uint    `json:"invoice_id"`
	InvoiceItemName string  `json:"invoice_item_name"`
	Category        string  `json:"category"`
	Amount          float64 `json:"amount"`
	InvoiceMonth    *uint   `json:"invoice_month,omitempty"`
	InvoiceYear     *uint   `json:"invoice_year,omitempty"`
}
