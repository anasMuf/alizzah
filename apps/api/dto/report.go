package dto

// Laporan Harian
type DailyReportRequest struct {
	Date           string `query:"date" validate:"required,dateonly"`
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

// ===== Laporan Posisi Kas =====

type PosisiKasRequest struct {
	Month          uint   `query:"month" validate:"omitempty,min=1,max=12"`
	Year           uint   `query:"year"`
	DateFrom       string `query:"date_from"`  // YYYY-MM-DD, takes priority over month/year
	DateTo         string `query:"date_to"`    // YYYY-MM-DD
	Categories     string `query:"categories"` // comma-separated invoice categories filter
	AcademicYearID uint   `query:"academic_year_id"`
}

type PosisiKasResponse struct {
	Month        uint            `json:"month"`
	Year         uint            `json:"year"`
	DateFrom     string          `json:"date_from,omitempty"`
	DateTo       string          `json:"date_to,omitempty"`
	AcademicYear string          `json:"academic_year"`
	Posts        []PosisiKasPost `json:"posts"`
	GrandTotal   PosisiKasTotal  `json:"grand_total"`
}

type PosisiKasPost struct {
	Name           string             `json:"name"`
	Category       string             `json:"category"`
	SaldoSebelum   float64            `json:"saldo_sebelum"`
	Penerimaan     float64            `json:"penerimaan"`
	Pengeluaran    float64            `json:"pengeluaran"`
	SaldoBulan     float64            `json:"saldo_bulan"`
	SaldoSampai    float64            `json:"saldo_sampai"`
	ExpenseDetails []PosisiKasExpense `json:"expense_details"`
}

type PosisiKasExpense struct {
	Name   string  `json:"name"`
	Amount float64 `json:"amount"`
}

type PosisiKasTotal struct {
	SaldoSebelum float64 `json:"saldo_sebelum"`
	Penerimaan   float64 `json:"penerimaan"`
	Pengeluaran  float64 `json:"pengeluaran"`
	SaldoBulan   float64 `json:"saldo_bulan"`
	SaldoSampai  float64 `json:"saldo_sampai"`
}

// ===== Laporan Saldo Per Pos / Semua Pos =====

type SaldoRequest struct {
	Month           uint   `query:"month" validate:"omitempty,min=1,max=12"`
	Year            uint   `query:"year"`
	DateFrom        string `query:"date_from"`  // YYYY-MM-DD, takes priority over month/year
	DateTo          string `query:"date_to"`    // YYYY-MM-DD, takes priority over month/year
	Category        string `query:"category"`   // single category (backward compatible)
	Categories      string `query:"categories"` // comma-separated category names (takes priority)
	AcademicYearID  uint   `query:"academic_year_id"`
	AcademicYearIDs string `query:"academic_year_ids"` // comma-separated IDs (multi-TA)
}

type SaldoResponse struct {
	Month        uint            `json:"month"`
	Year         uint            `json:"year"`
	DateFrom     string          `json:"date_from,omitempty"`
	DateTo       string          `json:"date_to,omitempty"`
	AcademicYear string          `json:"academic_year"`
	PostName     string          `json:"post_name"`
	Category     string          `json:"category,omitempty"`
	Categories   []string        `json:"categories,omitempty"` // multiple selected categories
	PostList     []string        `json:"post_list,omitempty"`
	SaldoSebelum float64         `json:"saldo_sebelum"`
	Rows         []SaldoRow      `json:"rows"`
	TotalBulan   SaldoTotalBulan `json:"total_bulan"`
	SaldoAkhir   float64         `json:"saldo_akhir"`
}

type SaldoRow struct {
	Date        string  `json:"date"`
	Penerimaan  float64 `json:"penerimaan"`
	Pengeluaran float64 `json:"pengeluaran"`
	Selisih     float64 `json:"selisih"`
	Saldo       float64 `json:"saldo"`
}

type SaldoTotalBulan struct {
	Penerimaan  float64 `json:"penerimaan"`
	Pengeluaran float64 `json:"pengeluaran"`
	Selisih     float64 `json:"selisih"`
}

// ===== Laporan Transaksi Pengeluaran =====

type TransaksiPengeluaranRequest struct {
	Month          uint `query:"month" validate:"required,min=1,max=12"`
	Year           uint `query:"year" validate:"required"`
	AcademicYearID uint `query:"academic_year_id"`
}

type TransaksiPengeluaranResponse struct {
	Month        uint                        `json:"month"`
	Year         uint                        `json:"year"`
	AcademicYear string                      `json:"academic_year"`
	Transactions []TransaksiPengeluaranBlock `json:"transactions"`
	GrandTotal   float64                     `json:"grand_total"`
}

type TransaksiPengeluaranBlock struct {
	ID              uint                       `json:"id"`
	TransactionDate string                     `json:"transaction_date"`
	Source          string                     `json:"source"`
	TotalAmount     float64                    `json:"total_amount"`
	TotalTerbilang  string                     `json:"total_terbilang"`
	Description     string                     `json:"description"`
	CategoryName    string                     `json:"category_name"`
	CreatedByName   string                     `json:"created_by_name"`
	CreatedAt       string                     `json:"created_at"`
	Items           []TransaksiPengeluaranItem `json:"items"`
}

type TransaksiPengeluaranItem struct {
	No           int     `json:"no"`
	CategoryName string  `json:"category_name"`
	Description  string  `json:"description"`
	Amount       float64 `json:"amount"`
}

// ===== Laporan Tabungan =====

type TabunganReportRequest struct {
	Month uint   `query:"month" validate:"required,min=1,max=12"`
	Year  uint   `query:"year" validate:"required"`
	Type  string `query:"type"` // general | mandatory | kosong = semua
}

type TabunganReportResponse struct {
	Month        uint                `json:"month"`
	Year         uint                `json:"year"`
	TypeLabel    string              `json:"type_label"`
	Type         string              `json:"type,omitempty"`
	SaldoSebelum float64             `json:"saldo_sebelum"`
	Rows         []TabunganReportRow `json:"rows"`
	TotalBulan   SaldoTotalBulan     `json:"total_bulan"`
	SaldoAkhir   float64             `json:"saldo_akhir"`
}

type TabunganReportRow struct {
	Date        string  `json:"date"`
	Penerimaan  float64 `json:"penerimaan"`
	Pengeluaran float64 `json:"pengeluaran"`
	Selisih     float64 `json:"selisih"`
	Saldo       float64 `json:"saldo"`
}

// ===== Laporan Tabungan Per Siswa =====

type TabunganSiswaReportRequest struct {
	StartDate string `query:"start_date"` // opsional, default: awal tahun ajaran aktif
	EndDate   string `query:"end_date"`   // opsional, default: hari ini
}

type TabunganSiswaReportResponse struct {
	Student     TabunganSiswaStudent `json:"student"`
	Period      TabunganSiswaPeriod  `json:"period"`
	SaldoAwal   float64              `json:"saldo_awal"`
	Rows        []TabunganSiswaRow   `json:"rows"`
	TotalDebit  float64              `json:"total_debit"`
	TotalCredit float64              `json:"total_credit"`
	SaldoAkhir  float64              `json:"saldo_akhir"`
}

type TabunganSiswaStudent struct {
	ID         uint   `json:"id"`
	FullName   string `json:"full_name"`
	ClassGroup string `json:"class_group"`
}

type TabunganSiswaPeriod struct {
	StartDate string `json:"start_date"`
	EndDate   string `json:"end_date"`
}

type TabunganSiswaRow struct {
	Date        string  `json:"date"`
	Type        string  `json:"type"` // deposit | withdrawal | usage | allocation | return
	Description string  `json:"description"`
	Debit       float64 `json:"debit"`  // masuk (setoran)
	Credit      float64 `json:"credit"` // keluar (penarikan)
	Saldo       float64 `json:"saldo"`  // running balance
}

// ===== Laporan Pemasukan =====

// ===== Laporan Pemasukan (summary per date per category) =====

type PemasukanRequest struct {
	DateFrom       string `query:"date_from"`
	DateTo         string `query:"date_to"`
	PaymentMethod  string `query:"payment_method"` // tunai, tabungan, kosong=semua
	FeeItemIDs     string `query:"fee_item_ids"`   // comma-separated IDs
	Categories     string `query:"categories"`     // comma-separated category names (takes priority)
	AcademicYearID uint   `query:"academic_year_id"`
}

type PemasukanRow struct {
	Date        string  `json:"date"`
	Category    string  `json:"category"`
	Description string  `json:"description"` // siapa + untuk apa
	Amount      float64 `json:"amount"`
}

type PemasukanResponse struct {
	DateFrom     string         `json:"date_from"`
	DateTo       string         `json:"date_to"`
	AcademicYear string         `json:"academic_year"`
	Rows         []PemasukanRow `json:"rows"`
	GrandTotal   float64        `json:"grand_total"`
}

// ===== Laporan Pengeluaran (per-transaction detail) =====

type PengeluaranRequest struct {
	DateFrom           string `query:"date_from"`
	DateTo             string `query:"date_to"`
	PaymentMethod      string `query:"payment_method"`       // tunai, tabungan, kosong=semua
	FeeItemIDs         string `query:"fee_item_ids"`         // comma-separated IDs
	ExpenseCategoryIDs string `query:"expense_category_ids"` // comma-separated IDs
	AcademicYearID     uint   `query:"academic_year_id"`
}

type PengeluaranRow struct {
	Date        string  `json:"date"`
	Category    string  `json:"category"`    // expense category name
	Description string  `json:"description"` // expense description + petugas
	Amount      float64 `json:"amount"`
}

type PengeluaranResponse struct {
	DateFrom     string           `json:"date_from"`
	DateTo       string           `json:"date_to"`
	AcademicYear string           `json:"academic_year"`
	Rows         []PengeluaranRow `json:"rows"`
	GrandTotal   float64          `json:"grand_total"`
}
