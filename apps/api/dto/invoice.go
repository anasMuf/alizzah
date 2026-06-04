package dto

// Query
type InvoiceQueryParams struct {
	StudentID      uint
	AcademicYearID uint
	Type           string
	Status         string
	Month          uint
	Year           uint
	ClassGroupID   uint
	Search         string
	Page           int
	Limit          int
}

// Response — List
type InvoiceListResponse struct {
	ID           uint                     `json:"id"`
	Student      StudentBriefResponse     `json:"student"`
	AcademicYear AcademicYearBriefResponse `json:"academic_year"`
	Type         string                   `json:"type"`
	Month        *uint                    `json:"month,omitempty"`
	Year         *uint                    `json:"year,omitempty"`
	Status       string                   `json:"status"`
	TotalAmount  float64                  `json:"total_amount"`
	PaidAmount   float64                  `json:"paid_amount"`
	DueDate      *string                  `json:"due_date"`
	CreatedAt    string                   `json:"created_at"`
}

// Response — Detail
type InvoiceDetailResponse struct {
	ID           uint                     `json:"id"`
	Student      StudentBriefResponse     `json:"student"`
	AcademicYear AcademicYearBriefResponse `json:"academic_year"`
	Type         string                   `json:"type"`
	Month        *uint                    `json:"month,omitempty"`
	Year         *uint                    `json:"year,omitempty"`
	Status       string                   `json:"status"`
	TotalAmount  float64                  `json:"total_amount"`
	PaidAmount   float64                  `json:"paid_amount"`
	DueDate      *string                  `json:"due_date"`
	Notes        *string                  `json:"notes"`
	Items        []InvoiceItemResponse    `json:"items"`
	Installments []InstallmentResponse    `json:"installments"`
	CreatedAt    string                   `json:"created_at"`
}

// Response — Item
type InvoiceItemResponse struct {
	ID          uint     `json:"id"`
	Name        string   `json:"name"`
	Category    string   `json:"category"`
	Amount      float64  `json:"amount"`
	PaidAmount  float64  `json:"paid_amount"`
	Status      string   `json:"status"`
	IsMandatory bool     `json:"is_mandatory"`
	Quantity    *uint    `json:"quantity,omitempty"`
	UnitPrice   *float64 `json:"unit_price,omitempty"`
}

// Request — Add Item
type AddInvoiceItemRequest struct {
	Name     string  `json:"name" validate:"required,max=100"`
	Category string  `json:"category" validate:"required"`
	Amount   float64 `json:"amount" validate:"required,min=1"`
}

// Request — Update Item
type UpdateInvoiceItemRequest struct {
	Name   string  `json:"name" validate:"required,max=100"`
	Amount float64 `json:"amount" validate:"required,min=1"`
}

// Request — Update Item Quantity (override hari efektif per item)
type UpdateInvoiceItemQuantityRequest struct {
	Quantity uint `json:"quantity" validate:"required,min=1"`
}

// Response — Installment
type InstallmentResponse struct {
	ID                uint    `json:"id"`
	InstallmentNumber uint    `json:"installment_number"`
	DueDate           string  `json:"due_date"`
	Amount            float64 `json:"amount"`
	Notes             *string `json:"notes"`
}

// Request — Installment Schedule
type CreateInstallmentScheduleRequest struct {
	Installments []InstallmentItem `json:"installments" validate:"required,min=1,dive"`
}

type InstallmentItem struct {
	InstallmentNumber uint    `json:"installment_number" validate:"required,min=1"`
	DueDate           string  `json:"due_date" validate:"required,datetime=2006-01-02"`
	Amount            float64 `json:"amount" validate:"required,min=1"`
	Notes             string  `json:"notes" validate:"omitempty"`
}

// Request — Update Installment
type UpdateInstallmentRequest struct {
	DueDate string  `json:"due_date" validate:"required,datetime=2006-01-02"`
	Amount  float64 `json:"amount" validate:"required,min=1"`
	Notes   string  `json:"notes" validate:"omitempty"`
}

// Internal — Generate Params
type GenerateInitialInvoiceParams struct {
	StudentID      uint
	AcademicYearID uint
	Level          string
	Gender         string
	CreatedBy      uint
}

type GenerateMonthlyInvoiceParams struct {
	StudentID          uint
	AcademicYearID     uint
	ClassGroupID       uint
	Level              string
	Gender             string
	Month              uint
	Year               uint
	ExtracurricularIDs []uint
	CreatedBy          uint
}

type GenerateRegistrationInvoiceParams struct {
	StudentID      uint
	AcademicYearID uint
	Level          string
	Gender         string
	CreatedBy      uint
}

type GenerateGraduationInvoiceParams struct {
	StudentID      uint
	AcademicYearID uint
	CreatedBy      uint
}

type GenerateDaycareMonthlyParams struct {
	StudentID      uint
	AcademicYearID uint
	PackageType    string
	StartDate      string
	CreatedBy      uint
}

type DaycareSyncResult struct {
	TotalEnrollments int                `json:"total_enrollments"`
	TotalSynced      int                `json:"total_synced"`
	TotalSkipped     int                `json:"total_skipped"`
	Errors           []DaycareSyncError `json:"errors,omitempty"`
}

type DaycareSyncError struct {
	StudentID uint   `json:"student_id"`
	Message   string `json:"message"`
}

type ExtracurricularSyncResult struct {
	TotalEnrollments int                          `json:"total_enrollments"`
	TotalSynced      int                          `json:"total_synced"`
	TotalSkipped     int                          `json:"total_skipped"`
	Errors           []ExtracurricularSyncError   `json:"errors,omitempty"`
}

type ExtracurricularSyncError struct {
	StudentID         uint   `json:"student_id"`
	ExtracurricularID uint   `json:"extracurricular_id"`
	Message           string `json:"message"`
}
