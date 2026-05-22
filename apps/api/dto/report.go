package dto

// Laporan Harian
type DailyReportRequest struct {
	Date           string `query:"date" validate:"required,datetime=2006-01-02"`
	AcademicYearID uint   `query:"academic_year_id"`
}

type DailyReportResponse struct {
	Date           string                 `json:"date"`
	AcademicYear   string                 `json:"academic_year"`
	IncomeSummary  IncomeSummaryResponse  `json:"income_summary"`
	ExpenseSummary ExpenseSummaryResponse `json:"expense_summary"`
	Cash           CashSummaryResponse    `json:"cash"`
	Vault          VaultSummaryResponse   `json:"vault"`
	DailyClosing   *DailyClosingInReport  `json:"daily_closing"`
}

type IncomeSummaryResponse struct {
	Total      float64          `json:"total"`
	ByCategory []CategoryAmount `json:"by_category"`
}

type ExpenseSummaryResponse struct {
	Total      float64          `json:"total"`
	ByCategory []CategoryAmount `json:"by_category"`
}

type CategoryAmount struct {
	Category    string  `json:"category"`
	SubCategory string  `json:"sub_category,omitempty"`
	Amount      float64 `json:"amount"`
}

type CashSummaryResponse struct {
	OpeningBalance float64 `json:"opening_balance"`
	TotalCredit    float64 `json:"total_credit"`
	TotalDebit     float64 `json:"total_debit"`
	ClosingBalance float64 `json:"closing_balance"`
}

type VaultSummaryResponse struct {
	Balance float64 `json:"balance"`
}

type DailyClosingInReport struct {
	PhysicalCashAmount float64 `json:"physical_cash_amount"`
	SystemCashAmount   float64 `json:"system_cash_amount"`
	Difference         float64 `json:"difference"`
	Notes              *string `json:"notes"`
	IsConfirmed        bool    `json:"is_confirmed"`
}

// Laporan Bulanan
type MonthlyReportRequest struct {
	Month          uint `query:"month" validate:"required,min=1,max=12"`
	Year           uint `query:"year" validate:"required"`
	AcademicYearID uint `query:"academic_year_id"`
}

type MonthlyReportResponse struct {
	Period         string                 `json:"period"`
	IncomeSummary  MonthlyIncomeSummary   `json:"income_summary"`
	ExpenseSummary ExpenseSummaryResponse `json:"expense_summary"`
	ArrearsByClass []ClassArrearSummary   `json:"arrears_by_class"`
	Cash           MonthlyCashSummary     `json:"cash"`
}

type MonthlyIncomeSummary struct {
	TotalBilled float64        `json:"total_billed"`
	TotalPaid   float64        `json:"total_paid"`
	TotalUnpaid float64        `json:"total_unpaid"`
	ByCategory  []BilledVsPaid `json:"by_category"`
}

type BilledVsPaid struct {
	Category string  `json:"category"`
	Billed   float64 `json:"billed"`
	Paid     float64 `json:"paid"`
}

type ClassArrearSummary struct {
	ClassGroupName string  `json:"class_group_name"`
	TotalUnpaid    float64 `json:"total_unpaid"`
	StudentCount   int     `json:"student_count"`
}

type MonthlyCashSummary struct {
	OpeningBalance float64 `json:"opening_balance"`
	TotalIncome    float64 `json:"total_income"`
	TotalExpense   float64 `json:"total_expense"`
	ClosingBalance float64 `json:"closing_balance"`
}

// Laporan Tahunan
type AnnualReportRequest struct {
	AcademicYearID uint `query:"academic_year_id" validate:"required"`
}

type AnnualReportResponse struct {
	AcademicYear   string               `json:"academic_year"`
	IncomeSummary  AnnualIncomeSummary  `json:"income_summary"`
	ExpenseSummary AnnualExpenseSummary `json:"expense_summary"`
	Net            float64              `json:"net"`
	ByMonth        []MonthlyBreakdown   `json:"by_month"`
	CashBalance    float64              `json:"cash_balance"`
	VaultBalance   float64              `json:"vault_balance"`
}

type AnnualIncomeSummary struct {
	TotalBilled float64 `json:"total_billed"`
	TotalPaid   float64 `json:"total_paid"`
	TotalUnpaid float64 `json:"total_unpaid"`
}

type AnnualExpenseSummary struct {
	Total float64 `json:"total"`
}

type MonthlyBreakdown struct {
	Month   uint    `json:"month"`
	Year    uint    `json:"year"`
	Income  float64 `json:"income"`
	Expense float64 `json:"expense"`
}

// Rekap per Siswa
type StudentReportRequest struct {
	AcademicYearID uint `query:"academic_year_id"`
	All            bool `query:"all"` // lintas tahun ajaran
}

type StudentReportResponse struct {
	Student        StudentBriefResponse     `json:"student"`
	Savings        StudentSavingsResponse   `json:"savings"`
	InvoiceSummary InvoiceSummary           `json:"invoice_summary"`
	Invoices       []InvoiceDetailForReport `json:"invoices"`
	PaymentHistory []PaymentListResponse    `json:"payment_history"`
}

type InvoiceSummary struct {
	TotalBilled float64 `json:"total_billed"`
	TotalPaid   float64 `json:"total_paid"`
	TotalUnpaid float64 `json:"total_unpaid"`
}

type InvoiceDetailForReport struct {
	ID          uint                  `json:"id"`
	Type        string                `json:"type"`
	Period      string                `json:"period"`
	TotalAmount float64               `json:"total_amount"`
	PaidAmount  float64               `json:"paid_amount"`
	Status      string                `json:"status"`
	Items       []InvoiceItemResponse `json:"items"`
}

// Rekap per Kelas
type ClassGroupReportRequest struct {
	Month          uint `query:"month" validate:"required,min=1,max=12"`
	Year           uint `query:"year" validate:"required"`
	AcademicYearID uint `query:"academic_year_id"`
}

type ClassGroupReportResponse struct {
	ClassGroup ClassGroupBriefResponse        `json:"class_group"`
	Period     string                         `json:"period"`
	Summary    ClassGroupReportSummary        `json:"summary"`
	Students   []StudentPaymentStatusInReport `json:"students"`
}

type ClassGroupReportSummary struct {
	TotalStudents int     `json:"total_students"`
	TotalBilled   float64 `json:"total_billed"`
	TotalPaid     float64 `json:"total_paid"`
	TotalUnpaid   float64 `json:"total_unpaid"`
	PaymentRate   string  `json:"payment_rate"`
}

type StudentPaymentStatusInReport struct {
	StudentID     uint    `json:"student_id"`
	StudentName   string  `json:"student_name"`
	InvoiceStatus string  `json:"invoice_status"`
	TotalAmount   float64 `json:"total_amount"`
	PaidAmount    float64 `json:"paid_amount"`
	UnpaidAmount  float64 `json:"unpaid_amount"`
}
