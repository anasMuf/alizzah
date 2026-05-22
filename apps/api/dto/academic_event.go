package dto

// Kenaikan Kelas Massal
type PromotionRequest struct {
	FromAcademicYearID uint   `json:"from_academic_year_id" validate:"required"`
	ToAcademicYearID   uint   `json:"to_academic_year_id" validate:"required"`
	EventDate          string `json:"event_date" validate:"required,datetime=2006-01-02"`
	RetainedStudentIDs []uint `json:"retained_student_ids" validate:"omitempty"`
	Notes              string `json:"notes" validate:"omitempty"`
}

type PromotionResult struct {
	Promoted int          `json:"promoted"`
	Retained int          `json:"retained"`
	Errors   []EventError `json:"errors"`
}

// Kelulusan
type GraduationRequest struct {
	StudentIDs     []uint `json:"student_ids" validate:"required,min=1"`
	AcademicYearID uint   `json:"academic_year_id" validate:"required"`
	EventDate      string `json:"event_date" validate:"required,datetime=2006-01-02"`
	Notes          string `json:"notes" validate:"omitempty"`
}

type GraduationStudentResult struct {
	StudentID                uint    `json:"student_id"`
	StudentName              string  `json:"student_name"`
	GraduationInvoiceID      uint    `json:"graduation_invoice_id"`
	GraduationAmount         float64 `json:"graduation_amount"`
	MandatorySavingsUsed     float64 `json:"mandatory_savings_used"`
	RemainingDebt            float64 `json:"remaining_debt"`
	SurplusReturnedToGeneral float64 `json:"surplus_returned_to_general"`
}

type GraduationResult struct {
	Total   int                       `json:"total"`
	Results []GraduationStudentResult `json:"results"`
}

// Pindah Rombel
type ClassChangeRequest struct {
	StudentID        uint   `json:"student_id" validate:"required"`
	FromClassGroupID uint   `json:"from_class_group_id" validate:"required"`
	ToClassGroupID   uint   `json:"to_class_group_id" validate:"required"`
	EventDate        string `json:"event_date" validate:"required,datetime=2006-01-02"`
	Notes            string `json:"notes" validate:"omitempty"`
}

// Mutasi Masuk
type TransferInRequest struct {
	StudentID      uint   `json:"student_id" validate:"required"`
	ToClassGroupID uint   `json:"to_class_group_id" validate:"required"`
	AcademicYearID uint   `json:"academic_year_id" validate:"required"`
	StartDate      string `json:"start_date" validate:"required,datetime=2006-01-02"`
	Notes          string `json:"notes" validate:"omitempty"`
}

// Keluar / Pindah Sekolah
type WithdrawalRequest struct {
	StudentID uint   `json:"student_id" validate:"required"`
	EventDate string `json:"event_date" validate:"required,datetime=2006-01-02"`
	EventType string `json:"event_type" validate:"required,oneof=transfer_out dropout"`
	Notes     string `json:"notes" validate:"omitempty"`
}

// Shared
type EventError struct {
	StudentID   uint   `json:"student_id"`
	StudentName string `json:"student_name"`
	Message     string `json:"message"`
}
