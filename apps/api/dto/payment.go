package dto

// Query
type PaymentQueryParams struct {
	StudentID      uint
	AcademicYearID uint
	StartDate      string
	EndDate        string
	Source         string
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
}

type PaymentItemReq struct {
	InvoiceItemID uint    `json:"invoice_item_id" validate:"required"`
	Amount        float64 `json:"amount" validate:"required,min=1"`
}

type IncidentalItemReq struct {
	Name   string  `json:"name" validate:"required,max=100"`
	Amount float64 `json:"amount" validate:"required,min=1"`
}

// Response
type PaymentListResponse struct {
	ID             uint                 `json:"id"`
	Student        StudentBriefResponse `json:"student"`
	PaymentDate    string               `json:"payment_date"`
	TotalAmount    float64              `json:"total_amount"`
	SavingsDeposit float64              `json:"savings_deposit"`
	Source         string               `json:"source"`
	CreatedBy      UserBriefResponse    `json:"created_by"`
	CreatedAt      string               `json:"created_at"`
}

type PaymentDetailResponse struct {
	ID             uint                  `json:"id"`
	Student        StudentBriefResponse  `json:"student"`
	PaymentDate    string                `json:"payment_date"`
	TotalAmount    float64               `json:"total_amount"`
	SavingsDeposit float64               `json:"savings_deposit"`
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
}
