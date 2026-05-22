# Batch 7 — Keuangan: Kas, Berangkas, Tutup Buku & Laporan

> **Scope:** Cash · Vault · Daily Closings · Reports (Harian, Bulanan, Tahunan, Per Siswa, Per Kelas)
> **Endpoint:** 14
> **Dependensi:** Batch 6 selesai
> **Harus selesai sebelum:** —

---

## Tujuan Batch Ini

Batch penutup. Membangun endpoint kas & berangkas, tutup buku harian, dan seluruh laporan keuangan. Setelah batch ini selesai, sistem siap digunakan secara penuh. Juga menyelesaikan semua `TODO(batch-7)` yang tersisa dari Batch 6.

---

## Daftar Endpoint

| # | Method | Endpoint | Role |
|---|--------|----------|------|
| 1 | GET | `/api/v1/cash/balance` | superadmin, admin_keuangan, kepala_sekolah |
| 2 | GET | `/api/v1/cash/transactions` | superadmin, admin_keuangan, kepala_sekolah |
| 3 | POST | `/api/v1/cash/transfers` | superadmin, admin_keuangan |
| 4 | GET | `/api/v1/vault/balance` | superadmin, admin_keuangan, kepala_sekolah |
| 5 | GET | `/api/v1/vault/transactions` | superadmin, admin_keuangan, kepala_sekolah |
| 6 | GET | `/api/v1/daily-closings` | superadmin, admin_keuangan |
| 7 | POST | `/api/v1/daily-closings` | superadmin, admin_keuangan |
| 8 | GET | `/api/v1/daily-closings/:id` | superadmin, admin_keuangan, kepala_sekolah, yayasan |
| 9 | PATCH | `/api/v1/daily-closings/:id/confirm` | superadmin, admin_keuangan |
| 10 | GET | `/api/v1/reports/daily` | superadmin, admin_keuangan, kepala_sekolah |
| 11 | GET | `/api/v1/reports/monthly` | superadmin, admin_keuangan, kepala_sekolah |
| 12 | GET | `/api/v1/reports/annual` | superadmin, admin_keuangan, kepala_sekolah, yayasan |
| 13 | GET | `/api/v1/reports/students/:id` | superadmin, admin_keuangan |
| 14 | GET | `/api/v1/reports/class-groups/:id` | superadmin, admin_keuangan, kepala_sekolah |

---

## Checklist Implementasi

### 1. Model Daily Closing

Model `CashTransaction` dan `VaultTransaction` sudah di-migrate di Batch 6. Satu model tersisa:

- [x] `model/daily_closing.go`

```go
type DailyClosing struct {
    model.PrimaryKey
    AcademicYearID     uint      `gorm:"not null;index"`
    ClosingDate        time.Time `gorm:"type:date;not null;uniqueIndex"`
    PhysicalCashAmount float64   `gorm:"type:decimal(15,2);not null"`
    SystemCashAmount   float64   `gorm:"type:decimal(15,2);not null"`
    Difference         float64   `gorm:"type:decimal(15,2);not null"`
    Notes              string    `gorm:"type:text"`
    IsConfirmed        bool      `gorm:"not null;default:false"`
    ClosedBy           uint      `gorm:"not null"`
    CreatedAt          time.Time
    UpdatedAt          time.Time

    AcademicYear model.AcademicYear `gorm:"foreignKey:AcademicYearID"`
    Closer       model.User         `gorm:"foreignKey:ClosedBy"`
}
```

---

### 2. DTO

- [x] `dto/cash.go`

```go
// Cash
type CashBalanceResponse struct {
    Balance          float64 `json:"balance"`
    LastClosingDate  *string `json:"last_closing_date"`
    TodayCredit      float64 `json:"today_credit"`
    TodayDebit       float64 `json:"today_debit"`
}

type CashTransactionResponse struct {
    ID              uint    `json:"id"`
    TransactionDate string  `json:"transaction_date"`
    TransactionType string  `json:"transaction_type"`
    Amount          float64 `json:"amount"`
    SourceType      string  `json:"source_type"`
    SourceID        *uint   `json:"source_id"`
    Description     string  `json:"description"`
    CreatedBy       UserBriefResponse `json:"created_by"`
}

type CashTransactionQueryParams struct {
    AcademicYearID  uint
    StartDate       string
    EndDate         string
    TransactionType string
    SourceType      string
    Page            int
    Limit           int
}

type TransferToCashRequest struct {
    Amount      float64 `json:"amount" validate:"required,min=1"`
    Description string  `json:"description" validate:"required"`
}

// Vault
type VaultBalanceResponse struct {
    Balance                  float64 `json:"balance"`
    TotalSavingsGeneral      float64 `json:"total_savings_general"`
    TotalSavingsMandatory    float64 `json:"total_savings_mandatory"`
}

type VaultTransactionResponse struct {
    ID              uint    `json:"id"`
    TransactionDate string  `json:"transaction_date"`
    TransactionType string  `json:"transaction_type"`
    Amount          float64 `json:"amount"`
    SourceType      string  `json:"source_type"`
    SourceID        *uint   `json:"source_id"`
    Description     string  `json:"description"`
    CreatedBy       UserBriefResponse `json:"created_by"`
}

type VaultTransactionQueryParams struct {
    AcademicYearID  uint
    StartDate       string
    EndDate         string
    TransactionType string
    SourceType      string
    Page            int
    Limit           int
}
```

- [x] `dto/daily_closing.go`

```go
type CreateDailyClosingRequest struct {
    AcademicYearID     uint    `json:"academic_year_id" validate:"required"`
    ClosingDate        string  `json:"closing_date" validate:"required,datetime=2006-01-02"`
    PhysicalCashAmount float64 `json:"physical_cash_amount" validate:"required,min=0"`
    Notes              string  `json:"notes" validate:"omitempty"`
}

type ConfirmDailyClosingRequest struct {
    Notes string `json:"notes" validate:"omitempty"`
}

type DailyClosingListResponse struct {
    ID                 uint    `json:"id"`
    ClosingDate        string  `json:"closing_date"`
    PhysicalCashAmount float64 `json:"physical_cash_amount"`
    SystemCashAmount   float64 `json:"system_cash_amount"`
    Difference         float64 `json:"difference"`
    Notes              *string `json:"notes"`
    IsConfirmed        bool    `json:"is_confirmed"`
    ClosedBy           UserBriefResponse `json:"closed_by"`
}

type DailyClosingQueryParams struct {
    AcademicYearID uint
    StartDate      string
    EndDate        string
    IsConfirmed    *bool
    Page           int
    Limit          int
}
```

- [x] `dto/report.go`

```go
// Laporan Harian
type DailyReportRequest struct {
    Date           string `query:"date" validate:"required,datetime=2006-01-02"`
    AcademicYearID uint   `query:"academic_year_id"`
}

type DailyReportResponse struct {
    Date         string                    `json:"date"`
    AcademicYear string                    `json:"academic_year"`
    IncomeSummary IncomeSummaryResponse    `json:"income_summary"`
    ExpenseSummary ExpenseSummaryResponse  `json:"expense_summary"`
    Cash          CashSummaryResponse      `json:"cash"`
    Vault         VaultSummaryResponse     `json:"vault"`
    DailyClosing  *DailyClosingInReport    `json:"daily_closing"`
}

type IncomeSummaryResponse struct {
    Total      float64           `json:"total"`
    ByCategory []CategoryAmount  `json:"by_category"`
}

type ExpenseSummaryResponse struct {
    Total      float64           `json:"total"`
    ByCategory []CategoryAmount  `json:"by_category"`
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
    PhysicalCashAmount float64  `json:"physical_cash_amount"`
    SystemCashAmount   float64  `json:"system_cash_amount"`
    Difference         float64  `json:"difference"`
    Notes              *string  `json:"notes"`
    IsConfirmed        bool     `json:"is_confirmed"`
}

// Laporan Bulanan
type MonthlyReportRequest struct {
    Month          uint `query:"month" validate:"required,min=1,max=12"`
    Year           uint `query:"year" validate:"required"`
    AcademicYearID uint `query:"academic_year_id"`
}

type MonthlyReportResponse struct {
    Period         string                      `json:"period"`
    IncomeSummary  MonthlyIncomeSummary        `json:"income_summary"`
    ExpenseSummary ExpenseSummaryResponse      `json:"expense_summary"`
    ArrearsByClass []ClassArrearSummary        `json:"arrears_by_class"`
    Cash           MonthlyCashSummary          `json:"cash"`
}

type MonthlyIncomeSummary struct {
    TotalBilled    float64          `json:"total_billed"`
    TotalPaid      float64          `json:"total_paid"`
    TotalUnpaid    float64          `json:"total_unpaid"`
    ByCategory     []BilledVsPaid   `json:"by_category"`
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
    AcademicYear   string                `json:"academic_year"`
    IncomeSummary  AnnualIncomeSummary   `json:"income_summary"`
    ExpenseSummary AnnualExpenseSummary  `json:"expense_summary"`
    Net            float64               `json:"net"`
    ByMonth        []MonthlyBreakdown    `json:"by_month"`
    CashBalance    float64               `json:"cash_balance"`
    VaultBalance   float64               `json:"vault_balance"`
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
    AcademicYearID uint   `query:"academic_year_id"`
    All            bool   `query:"all"` // lintas tahun ajaran
}

type StudentReportResponse struct {
    Student        StudentBriefResponse       `json:"student"`
    Savings        StudentSavingsResponse     `json:"savings"`
    InvoiceSummary InvoiceSummary             `json:"invoice_summary"`
    Invoices       []InvoiceDetailForReport   `json:"invoices"`
    PaymentHistory []PaymentListResponse      `json:"payment_history"`
}

type InvoiceSummary struct {
    TotalBilled float64 `json:"total_billed"`
    TotalPaid   float64 `json:"total_paid"`
    TotalUnpaid float64 `json:"total_unpaid"`
}

type InvoiceDetailForReport struct {
    ID          uint                   `json:"id"`
    Type        string                 `json:"type"`
    Period      string                 `json:"period"`
    TotalAmount float64                `json:"total_amount"`
    PaidAmount  float64                `json:"paid_amount"`
    Status      string                 `json:"status"`
    Items       []InvoiceItemResponse  `json:"items"`
}

// Rekap per Kelas
type ClassGroupReportRequest struct {
    Month          uint `query:"month" validate:"required,min=1,max=12"`
    Year           uint `query:"year" validate:"required"`
    AcademicYearID uint `query:"academic_year_id"`
}

type ClassGroupReportResponse struct {
    ClassGroup ClassGroupBriefResponse      `json:"class_group"`
    Period     string                       `json:"period"`
    Summary    ClassGroupReportSummary      `json:"summary"`
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
```

---

### 3. Repository

- [x] `repository/cash_transaction_repository.go` *(full impl — menggantikan stub Batch 6)*

```go
type CashTransactionRepository interface {
    FindAll(params dto.CashTransactionQueryParams) ([]model.CashTransaction, int64, error)
    Create(ct *model.CashTransaction) error
    CreateWithTx(ct *model.CashTransaction, db *gorm.DB) error
    SumByDate(academicYearID uint, date time.Time) (credit, debit float64, err error)
    SumByDateRange(academicYearID uint, start, end time.Time) (credit, debit float64, err error)
    SumByMonth(academicYearID uint, month, year uint) (credit, debit float64, err error)
    GetCurrentBalance(academicYearID uint) (float64, error)
    // SUM(credit) - SUM(debit) seluruh transaksi di tahun ajaran
    GetBalanceUpToDate(academicYearID uint, date time.Time) (float64, error)
    GetLastClosingDate(academicYearID uint) (*time.Time, error)
    GetTodaySummary(academicYearID uint) (credit, debit float64, err error)
    SumByCategory(academicYearID uint, start, end time.Time) ([]dto.CategoryAmount, error)
}
```

- [x] `repository/vault_transaction_repository.go` *(full impl)*

```go
type VaultTransactionRepository interface {
    FindAll(params dto.VaultTransactionQueryParams) ([]model.VaultTransaction, int64, error)
    Create(vt *model.VaultTransaction) error
    CreateWithTx(vt *model.VaultTransaction, db *gorm.DB) error
    GetCurrentBalance(academicYearID uint) (float64, error)
}
```

- [x] `repository/daily_closing_repository.go`

```go
type DailyClosingRepository interface {
    FindAll(params dto.DailyClosingQueryParams) ([]model.DailyClosing, int64, error)
    FindByID(id uint) (*model.DailyClosing, error)
    FindByDate(date time.Time) (*model.DailyClosing, error)
    GetLastConfirmed(academicYearID uint) (*model.DailyClosing, error)
    Create(dc *model.DailyClosing) error
    Confirm(id uint, notes string) error
    IsDateConfirmed(date time.Time) (bool, error)
    // dipakai expense IsDateLocked — menggantikan stub Batch 6
}
```

- [x] `repository/report_repository.go` — query agregat khusus laporan

```go
type ReportRepository interface {
    // Untuk laporan bulanan dan tahunan
    SumInvoiceByCategory(
        academicYearID uint,
        month, year uint, // 0 = semua bulan (tahunan)
    ) ([]dto.BilledVsPaid, error)

    SumExpenseByCategory(
        academicYearID uint,
        startDate, endDate time.Time,
    ) ([]dto.CategoryAmount, error)

    GetArrearsByClass(
        academicYearID uint,
        month, year uint,
    ) ([]dto.ClassArrearSummary, error)

    GetMonthlyBreakdown(academicYearID uint) ([]dto.MonthlyBreakdown, error)

    GetInvoiceSummaryByStudent(
        studentID uint,
        academicYearID uint, // 0 = semua tahun
    ) (*dto.InvoiceSummary, error)

    GetStudentsByClassGroupForMonth(
        classGroupID uint,
        month, year uint,
        academicYearID uint,
    ) ([]dto.StudentPaymentStatusInReport, error)
}
```

---

### 4. Service

#### 4a. Cash Service

- [x] `service/cash_service.go`

```go
type CashService interface {
    GetBalance(academicYearID uint) (*dto.CashBalanceResponse, error)
    GetTransactions(params dto.CashTransactionQueryParams) ([]dto.CashTransactionResponse, *dto.Meta, error)
    TransferToVault(createdBy uint, req dto.TransferToCashRequest, academicYearID uint) error
}
```

**GetBalance:**

```go
func (s *cashService) GetBalance(academicYearID uint) (*dto.CashBalanceResponse, error) {
    balance, _ := s.cashRepo.GetCurrentBalance(academicYearID)
    lastClosing, _ := s.cashRepo.GetLastClosingDate(academicYearID)
    todayCredit, todayDebit, _ := s.cashRepo.GetTodaySummary(academicYearID)

    var lastClosingStr *string
    if lastClosing != nil {
        s := lastClosing.Format("2006-01-02")
        lastClosingStr = &s
    }

    return &dto.CashBalanceResponse{
        Balance:         balance,
        LastClosingDate: lastClosingStr,
        TodayCredit:     todayCredit,
        TodayDebit:      todayDebit,
    }, nil
}
```

**TransferToVault:**

```go
// Dalam satu transaction:
// 1. Cek balance mencukupi
// 2. WriteCashDebit (source_type=transfer_to_vault)
// 3. WriteVaultCredit (source_type=transfer_from_cash)
func (s *cashService) TransferToVault(createdBy uint, req dto.TransferToCashRequest, academicYearID uint) error {
    balance, _ := s.cashRepo.GetCurrentBalance(academicYearID)
    if req.Amount > balance {
        return echo.NewHTTPError(422, fmt.Sprintf(
            "Saldo kas tidak mencukupi. Saldo: %.0f, Transfer: %.0f",
            balance, req.Amount,
        ))
    }
    return s.db.Transaction(func(tx *gorm.DB) error {
        now := time.Now()
        if err := s.txWriter.WriteCashDebit(
            academicYearID, now, req.Amount,
            "transfer_to_vault", nil, req.Description, createdBy, tx,
        ); err != nil {
            return err
        }
        return s.txWriter.WriteVaultCredit(
            academicYearID, now, req.Amount,
            "transfer_from_cash", nil, req.Description, createdBy, tx,
        )
    })
}
```

---

#### 4b. Vault Service

- [x] `service/vault_service.go`

```go
type VaultService interface {
    GetBalance(academicYearID uint) (*dto.VaultBalanceResponse, error)
    GetTransactions(params dto.VaultTransactionQueryParams) ([]dto.VaultTransactionResponse, *dto.Meta, error)
}
```

**GetBalance:**

```go
func (s *vaultService) GetBalance(academicYearID uint) (*dto.VaultBalanceResponse, error) {
    balance, _ := s.vaultRepo.GetCurrentBalance(academicYearID)

    // Total saldo tabungan umum dan wajib dari semua siswa di tahun ajaran ini
    totalGeneral, _ := s.savingsRepo.SumBalanceByType(academicYearID, "general")
    totalMandatory, _ := s.savingsRepo.SumBalanceByType(academicYearID, "mandatory")

    return &dto.VaultBalanceResponse{
        Balance:               balance,
        TotalSavingsGeneral:   totalGeneral,
        TotalSavingsMandatory: totalMandatory,
    }, nil
}
```

Tambahkan method ke `StudentSavingsRepository`:

```go
SumBalanceByType(academicYearID uint, savingsType string) (float64, error)
// JOIN ke student_enrollments untuk filter siswa di tahun ajaran tersebut
```

---

#### 4c. Daily Closing Service

- [x] `service/daily_closing_service.go`

```go
type DailyClosingService interface {
    GetAll(params dto.DailyClosingQueryParams) ([]dto.DailyClosingListResponse, *dto.Meta, error)
    GetByID(id uint) (*dto.DailyClosingListResponse, error)
    Create(closedBy uint, req dto.CreateDailyClosingRequest) (*dto.DailyClosingListResponse, error)
    Confirm(id uint, closedBy uint, req dto.ConfirmDailyClosingRequest) error
}
```

**Create:**

```go
func (s *dailyClosingService) Create(closedBy uint, req dto.CreateDailyClosingRequest) (*dto.DailyClosingListResponse, error) {
    closingDate, _ := time.Parse("2006-01-02", req.ClosingDate)

    // Validasi: tidak boleh ada tutup buku untuk tanggal yang sama
    existing, _ := s.repo.FindByDate(closingDate)
    if existing != nil {
        return nil, echo.NewHTTPError(409, "Tutup buku untuk tanggal ini sudah ada")
    }

    // Validasi: closing_date ≤ hari ini
    if closingDate.After(time.Now()) {
        return nil, echo.NewHTTPError(400, "Tanggal tutup buku tidak boleh di masa depan")
    }

    // Hitung system_cash_amount dari cash_transactions pada tanggal tersebut
    // Ambil saldo kas sampai EOD tanggal tersebut
    systemCash, _ := s.cashRepo.GetBalanceUpToDate(req.AcademicYearID, closingDate)

    difference := req.PhysicalCashAmount - systemCash

    // Validasi notes wajib diisi jika ada selisih
    if difference != 0 && req.Notes == "" {
        return nil, echo.NewHTTPError(400, "Keterangan wajib diisi jika ada selisih kas")
    }

    dc := &model.DailyClosing{
        AcademicYearID:     req.AcademicYearID,
        ClosingDate:        closingDate,
        PhysicalCashAmount: req.PhysicalCashAmount,
        SystemCashAmount:   systemCash,
        Difference:         difference,
        Notes:              req.Notes,
        IsConfirmed:        false,
        ClosedBy:           closedBy,
    }

    if err := s.repo.Create(dc); err != nil {
        return nil, err
    }
    return s.mapToResponse(dc), nil
}
```

**Confirm:**

```go
func (s *dailyClosingService) Confirm(id uint, closedBy uint, req dto.ConfirmDailyClosingRequest) error {
    dc, err := s.repo.FindByID(id)
    if err != nil {
        return echo.NewHTTPError(404, "Tutup buku tidak ditemukan")
    }
    if dc.IsConfirmed {
        return echo.NewHTTPError(409, "Tutup buku sudah dikonfirmasi sebelumnya")
    }
    if dc.Difference != 0 && req.Notes == "" {
        return echo.NewHTTPError(400, "Keterangan wajib diisi jika ada selisih kas")
    }
    return s.repo.Confirm(id, req.Notes)
    // Setelah confirmed, transaksi pada ClosingDate terkunci
    // IsDateLocked di expense_repository sudah menggunakan tabel ini
}
```

---

#### 4d. Report Service

- [x] `service/report_service.go`

```go
type ReportService interface {
    GetDailyReport(req dto.DailyReportRequest) (*dto.DailyReportResponse, error)
    GetMonthlyReport(req dto.MonthlyReportRequest) (*dto.MonthlyReportResponse, error)
    GetAnnualReport(req dto.AnnualReportRequest) (*dto.AnnualReportResponse, error)
    GetStudentReport(studentID uint, req dto.StudentReportRequest) (*dto.StudentReportResponse, error)
    GetClassGroupReport(classGroupID uint, req dto.ClassGroupReportRequest) (*dto.ClassGroupReportResponse, error)
}
```

**GetDailyReport:**

```go
func (s *reportService) GetDailyReport(req dto.DailyReportRequest) (*dto.DailyReportResponse, error) {
    academicYearID := req.AcademicYearID
    if academicYearID == 0 {
        ay, _ := s.academicYearRepo.FindActive()
        academicYearID = ay.ID
    }

    date, _ := time.Parse("2006-01-02", req.Date)
    startOfDay := date
    endOfDay := date.Add(23*time.Hour + 59*time.Minute + 59*time.Second)

    // Income: dari payment per kategori
    incomeByCategory, _ := s.cashRepo.SumByCategory(academicYearID, startOfDay, endOfDay)
    totalIncome := sumCategoryAmounts(incomeByCategory)

    // Expense: dari expense per kategori
    expenseByCategory, _ := s.reportRepo.SumExpenseByCategory(academicYearID, startOfDay, endOfDay)
    totalExpense := sumCategoryAmounts(expenseByCategory)

    // Cash summary
    openingBalance, _ := s.cashRepo.GetBalanceUpToDate(academicYearID,
        date.AddDate(0, 0, -1)) // saldo s/d kemarin
    closingBalance := openingBalance + totalIncome - totalExpense

    // Vault balance
    vaultBalance, _ := s.vaultRepo.GetCurrentBalance(academicYearID)

    // Daily closing (jika ada)
    dc, _ := s.dailyClosingRepo.FindByDate(date)
    var dcInReport *dto.DailyClosingInReport
    if dc != nil {
        dcInReport = &dto.DailyClosingInReport{
            PhysicalCashAmount: dc.PhysicalCashAmount,
            SystemCashAmount:   dc.SystemCashAmount,
            Difference:         dc.Difference,
            Notes:              nilIfEmpty(dc.Notes),
            IsConfirmed:        dc.IsConfirmed,
        }
    }

    ay, _ := s.academicYearRepo.FindByID(academicYearID)
    return &dto.DailyReportResponse{
        Date:         req.Date,
        AcademicYear: ay.Name,
        IncomeSummary: dto.IncomeSummaryResponse{
            Total:      totalIncome,
            ByCategory: incomeByCategory,
        },
        ExpenseSummary: dto.ExpenseSummaryResponse{
            Total:      totalExpense,
            ByCategory: expenseByCategory,
        },
        Cash: dto.CashSummaryResponse{
            OpeningBalance: openingBalance,
            TotalCredit:    totalIncome,
            TotalDebit:     totalExpense,
            ClosingBalance: closingBalance,
        },
        Vault:        dto.VaultSummaryResponse{Balance: vaultBalance},
        DailyClosing: dcInReport,
    }, nil
}
```

**GetMonthlyReport:**

```go
func (s *reportService) GetMonthlyReport(req dto.MonthlyReportRequest) (*dto.MonthlyReportResponse, error) {
    academicYearID := resolveAcademicYear(req.AcademicYearID, s.academicYearRepo)
    startDate := time.Date(int(req.Year), time.Month(req.Month), 1, 0, 0, 0, 0, time.UTC)
    endDate := startDate.AddDate(0, 1, -1)

    byCategory, _ := s.reportRepo.SumInvoiceByCategory(academicYearID, req.Month, req.Year)
    totalBilled := sumBilled(byCategory)
    totalPaid := sumPaid(byCategory)

    expenseByCategory, _ := s.reportRepo.SumExpenseByCategory(academicYearID, startDate, endDate)
    totalExpense := sumCategoryAmounts(expenseByCategory)

    arrearsByClass, _ := s.reportRepo.GetArrearsByClass(academicYearID, req.Month, req.Year)

    openingBalance, _ := s.cashRepo.GetBalanceUpToDate(academicYearID, startDate.AddDate(0, 0, -1))
    _, _, credit, debit := s.cashRepo.SumByDateRange(academicYearID, startDate, endDate)

    period := startDate.Format("January 2006")

    return &dto.MonthlyReportResponse{
        Period: period,
        IncomeSummary: dto.MonthlyIncomeSummary{
            TotalBilled: totalBilled,
            TotalPaid:   totalPaid,
            TotalUnpaid: totalBilled - totalPaid,
            ByCategory:  byCategory,
        },
        ExpenseSummary: dto.ExpenseSummaryResponse{
            Total:      totalExpense,
            ByCategory: expenseByCategory,
        },
        ArrearsByClass: arrearsByClass,
        Cash: dto.MonthlyCashSummary{
            OpeningBalance: openingBalance,
            TotalIncome:    credit,
            TotalExpense:   debit,
            ClosingBalance: openingBalance + credit - debit,
        },
    }, nil
}
```

**GetAnnualReport:**

```go
func (s *reportService) GetAnnualReport(req dto.AnnualReportRequest) (*dto.AnnualReportResponse, error) {
    ay, _ := s.academicYearRepo.FindByID(req.AcademicYearID)

    byCategory, _ := s.reportRepo.SumInvoiceByCategory(req.AcademicYearID, 0, 0)
    totalBilled := sumBilled(byCategory)
    totalPaid := sumPaid(byCategory)

    expenseByCategory, _ := s.reportRepo.SumExpenseByCategory(
        req.AcademicYearID, ay.StartDate, ay.EndDate,
    )
    totalExpense := sumCategoryAmounts(expenseByCategory)

    byMonth, _ := s.reportRepo.GetMonthlyBreakdown(req.AcademicYearID)

    cashBalance, _ := s.cashRepo.GetCurrentBalance(req.AcademicYearID)
    vaultBalance, _ := s.vaultRepo.GetCurrentBalance(req.AcademicYearID)

    return &dto.AnnualReportResponse{
        AcademicYear: ay.Name,
        IncomeSummary: dto.AnnualIncomeSummary{
            TotalBilled: totalBilled,
            TotalPaid:   totalPaid,
            TotalUnpaid: totalBilled - totalPaid,
        },
        ExpenseSummary: dto.AnnualExpenseSummary{Total: totalExpense},
        Net:            totalPaid - totalExpense,
        ByMonth:        byMonth,
        CashBalance:    cashBalance,
        VaultBalance:   vaultBalance,
    }, nil
}
```

**GetStudentReport:**

```go
func (s *reportService) GetStudentReport(studentID uint, req dto.StudentReportRequest) (*dto.StudentReportResponse, error) {
    student, _ := s.studentRepo.FindByID(studentID)

    academicYearID := uint(0) // 0 = semua tahun
    if !req.All {
        academicYearID = resolveAcademicYear(req.AcademicYearID, s.academicYearRepo)
    }

    invoiceSummary, _ := s.reportRepo.GetInvoiceSummaryByStudent(studentID, academicYearID)
    invoices, _ := s.invoiceRepo.FindByStudentID(studentID, "", "", academicYearID)
    payments, _ := s.paymentRepo.FindByStudentID(studentID, dto.StudentPaymentQueryParams{})
    savings, _ := s.savingsService.GetByStudentID(studentID)

    invoicesForReport := make([]dto.InvoiceDetailForReport, len(invoices))
    for i, inv := range invoices {
        items, _ := s.invoiceItemRepo.FindByInvoiceID(inv.ID)
        period := formatInvoicePeriod(inv)
        invoicesForReport[i] = dto.InvoiceDetailForReport{
            ID:          inv.ID,
            Type:        inv.Type,
            Period:      period,
            TotalAmount: inv.TotalAmount,
            PaidAmount:  inv.PaidAmount,
            Status:      inv.Status,
            Items:       mapInvoiceItemsToResponse(items),
        }
    }

    return &dto.StudentReportResponse{
        Student:        mapStudentBrief(student),
        Savings:        *savings,
        InvoiceSummary: *invoiceSummary,
        Invoices:       invoicesForReport,
        PaymentHistory: mapPaymentsToList(payments),
    }, nil
}
```

**GetClassGroupReport:**

```go
func (s *reportService) GetClassGroupReport(classGroupID uint, req dto.ClassGroupReportRequest) (*dto.ClassGroupReportResponse, error) {
    academicYearID := resolveAcademicYear(req.AcademicYearID, s.academicYearRepo)
    classGroup, _ := s.classGroupRepo.FindByID(classGroupID)

    students, _ := s.reportRepo.GetStudentsByClassGroupForMonth(
        classGroupID, req.Month, req.Year, academicYearID,
    )

    totalStudents := len(students)
    totalBilled, totalPaid, totalUnpaid := float64(0), float64(0), float64(0)
    for _, st := range students {
        totalBilled += st.TotalAmount
        totalPaid += st.PaidAmount
        totalUnpaid += st.UnpaidAmount
    }

    paymentRate := "0%"
    if totalBilled > 0 {
        paymentRate = fmt.Sprintf("%.1f%%", (totalPaid/totalBilled)*100)
    }

    startDate := time.Date(int(req.Year), time.Month(req.Month), 1, 0, 0, 0, 0, time.UTC)
    period := startDate.Format("January 2006")

    return &dto.ClassGroupReportResponse{
        ClassGroup: mapClassGroupBrief(classGroup),
        Period:     period,
        Summary: dto.ClassGroupReportSummary{
            TotalStudents: totalStudents,
            TotalBilled:   totalBilled,
            TotalPaid:     totalPaid,
            TotalUnpaid:   totalUnpaid,
            PaymentRate:   paymentRate,
        },
        Students: students,
    }, nil
}
```

---

### 5. Handler

- [x] `handler/cash_handler.go`

```go
func (h *CashHandler) GetBalance(c echo.Context) error     {}
func (h *CashHandler) GetTransactions(c echo.Context) error {}
func (h *CashHandler) TransferToVault(c echo.Context) error {}
```

- [x] `handler/vault_handler.go`

```go
func (h *VaultHandler) GetBalance(c echo.Context) error     {}
func (h *VaultHandler) GetTransactions(c echo.Context) error {}
```

- [x] `handler/daily_closing_handler.go`

```go
func (h *DailyClosingHandler) List(c echo.Context) error    {}
func (h *DailyClosingHandler) Create(c echo.Context) error  {}
func (h *DailyClosingHandler) Get(c echo.Context) error     {}
func (h *DailyClosingHandler) Confirm(c echo.Context) error {}
```

- [x] `handler/report_handler.go`

```go
func (h *ReportHandler) Daily(c echo.Context) error           {}
func (h *ReportHandler) Monthly(c echo.Context) error         {}
func (h *ReportHandler) Annual(c echo.Context) error          {}
func (h *ReportHandler) ByStudent(c echo.Context) error       {}
func (h *ReportHandler) ByClassGroup(c echo.Context) error    {}
```

---

### 6. Route

- [x] Register di `main.go`:

```go
// Cash
cash := api.Group("/cash", jwtMiddleware)
cash.GET("/balance", cashHandler.GetBalance,
    roleMiddleware("superadmin", "admin_keuangan", "kepala_sekolah"))
cash.GET("/transactions", cashHandler.GetTransactions,
    roleMiddleware("superadmin", "admin_keuangan", "kepala_sekolah"))
cash.POST("/transfers", cashHandler.TransferToVault,
    roleMiddleware("superadmin", "admin_keuangan"))

// Vault
vault := api.Group("/vault", jwtMiddleware)
vault.GET("/balance", vaultHandler.GetBalance,
    roleMiddleware("superadmin", "admin_keuangan", "kepala_sekolah"))
vault.GET("/transactions", vaultHandler.GetTransactions,
    roleMiddleware("superadmin", "admin_keuangan", "kepala_sekolah"))

// Daily Closings
dc := api.Group("/daily-closings", jwtMiddleware)
dc.GET("", dailyClosingHandler.List,
    roleMiddleware("superadmin", "admin_keuangan"))
dc.POST("", dailyClosingHandler.Create,
    roleMiddleware("superadmin", "admin_keuangan"))
dc.GET("/:id", dailyClosingHandler.Get,
    roleMiddleware("superadmin", "admin_keuangan", "kepala_sekolah", "yayasan"))
dc.PATCH("/:id/confirm", dailyClosingHandler.Confirm,
    roleMiddleware("superadmin", "admin_keuangan"))

// Reports
reports := api.Group("/reports", jwtMiddleware)
reports.GET("/daily", reportHandler.Daily,
    roleMiddleware("superadmin", "admin_keuangan", "kepala_sekolah"))
reports.GET("/monthly", reportHandler.Monthly,
    roleMiddleware("superadmin", "admin_keuangan", "kepala_sekolah"))
reports.GET("/annual", reportHandler.Annual,
    roleMiddleware("superadmin", "admin_keuangan", "kepala_sekolah", "yayasan"))
reports.GET("/students/:id", reportHandler.ByStudent,
    roleMiddleware("superadmin", "admin_keuangan"))
reports.GET("/class-groups/:id", reportHandler.ByClassGroup,
    roleMiddleware("superadmin", "admin_keuangan", "kepala_sekolah"))
```

---

### 7. Wire TODO(batch-7) dari Batch 6

Setelah `DailyClosingRepository` selesai:

- [x] `repository/expense_repository.go` — aktifkan `IsDateLocked`:

```go
// Hapus TODO(batch-7), implementasi penuh:
func (r *expenseRepo) IsDateLocked(expenseDate time.Time) (bool, error) {
    var count int64
    err := r.db.Model(&model.DailyClosing{}).
        Where("closing_date = ? AND is_confirmed = true", expenseDate).
        Count(&count).Error
    return count > 0, err
}
```

---

### 8. Auto-Migrate Update (Final)

- [x] Tambahkan model terakhir ke `config/database.go`:

```go
db.AutoMigrate(
    // ...Batch 1-6...
    // Batch 7
    &model.DailyClosing{},
)
// CashTransaction & VaultTransaction sudah di-migrate di Batch 6
```

---

### 9. Utilitas Helper Laporan

Tambahkan ke `utility/report_helper.go`:

```go
// Format periode invoice untuk laporan rekap siswa
func FormatInvoicePeriod(inv model.Invoice) string {
    switch inv.Type {
    case "monthly":
        t := time.Date(int(*inv.Year), time.Month(*inv.Month), 1, 0, 0, 0, 0, time.UTC)
        return t.Format("January 2006")
    case "initial":
        return "Biaya Awal"
    case "registration":
        return "Registrasi Tahunan"
    case "graduation":
        return "Wisuda"
    default:
        return inv.Type
    }
}

// Hitung payment rate string
func FormatPaymentRate(paid, billed float64) string {
    if billed == 0 {
        return "0%"
    }
    return fmt.Sprintf("%.1f%%", (paid/billed)*100)
}

// Resolve academic year ID — gunakan aktif jika 0
func ResolveAcademicYear(id uint, repo repository.AcademicYearRepository) uint {
    if id != 0 {
        return id
    }
    ay, err := repo.FindActive()
    if err != nil || ay == nil {
        return 0
    }
    return ay.ID
}

// Sum billed dari slice BilledVsPaid
func SumBilled(items []dto.BilledVsPaid) float64 {
    total := float64(0)
    for _, item := range items {
        total += item.Billed
    }
    return total
}

// Sum paid dari slice BilledVsPaid
func SumPaid(items []dto.BilledVsPaid) float64 {
    total := float64(0)
    for _, item := range items {
        total += item.Paid
    }
    return total
}
```

---

## Catatan Teknis Batch 7

### Performance Laporan

Query laporan — terutama bulanan dan tahunan — berpotensi lambat karena aggregasi data besar. Terapkan beberapa optimasi:

**Index yang direkomendasikan:**

```sql
-- cash_transactions
CREATE INDEX idx_cash_tx_date ON cash_transactions(academic_year_id, transaction_date);
CREATE INDEX idx_cash_tx_type ON cash_transactions(academic_year_id, source_type);

-- vault_transactions
CREATE INDEX idx_vault_tx_date ON vault_transactions(academic_year_id, transaction_date);

-- invoices
CREATE INDEX idx_invoices_student_month ON invoices(student_id, month, year);
CREATE INDEX idx_invoices_class_month ON invoices(academic_year_id, month, year, status);

-- expenses
CREATE INDEX idx_expenses_date ON expenses(academic_year_id, expense_date);
```

Tambahkan via GORM tag di model atau via raw SQL setelah AutoMigrate.

**Caching ringan untuk laporan tahunan:**

Laporan tahunan tidak berubah untuk periode yang sudah lewat. Pertimbangkan menyimpan result di memory (in-process map) dengan TTL 1 jam. Cukup implementasi sederhana di service layer:

```go
var annualReportCache = map[uint]*dto.AnnualReportResponse{}
var annualReportCacheTime = map[uint]time.Time{}

func (s *reportService) GetAnnualReport(req dto.AnnualReportRequest) (*dto.AnnualReportResponse, error) {
    if cached, ok := annualReportCache[req.AcademicYearID]; ok {
        if time.Since(annualReportCacheTime[req.AcademicYearID]) < time.Hour {
            return cached, nil
        }
    }
    // ... compute
    annualReportCache[req.AcademicYearID] = result
    annualReportCacheTime[req.AcademicYearID] = time.Now()
    return result, nil
}
```

### SumByCategory untuk Cash Transactions

Query ini perlu menggabungkan data dari `cash_transactions` dan `payments` untuk mendapatkan breakdown per kategori SPP. Strategi terbaik: query `payments → payment_items → invoice_items.category` untuk breakdown pemasukan, bukan dari `cash_transactions` langsung (yang tidak menyimpan kategori).

```go
func (r *cashRepo) SumByCategory(academicYearID uint, start, end time.Time) ([]dto.CategoryAmount, error) {
    // Query via payment_items JOIN invoice_items untuk mendapat kategori
    var results []dto.CategoryAmount
    err := r.db.
        Table("payment_items pi").
        Select("ii.category as category, SUM(pi.amount) as amount").
        Joins("JOIN invoice_items ii ON ii.id = pi.invoice_item_id").
        Joins("JOIN payments p ON p.id = pi.payment_id").
        Where("p.academic_year_id = ? AND p.payment_date BETWEEN ? AND ?",
            academicYearID, start, end).
        Group("ii.category").
        Scan(&results).Error
    return results, err
}
```

### Tutup Buku untuk Hari yang Terlewat

Jika admin keuangan melewatkan tutup buku beberapa hari, `Create` tetap bisa dilakukan untuk tanggal lampau. Tidak diperlukan konfirmasi superadmin secara teknis — ini kebijakan bisnis yang cukup dikomunikasikan via SOP, bukan di-enforce di sistem.

---

## Acceptance Criteria Batch 7

### Kas & Berangkas

- [x] `GET /cash/balance` → saldo akurat = SUM(credit) - SUM(debit) di `cash_transactions`
- [x] `GET /cash/balance` → `today_credit` dan `today_debit` menunjukkan transaksi hari ini
- [x] `POST /cash/transfers` dengan `amount > saldo kas` → 422
- [x] `POST /cash/transfers` → `cash_transactions` debit + `vault_transactions` credit ter-insert
- [x] `GET /vault/balance` → `total_savings_general` dan `total_savings_mandatory` akurat

### Daily Closing

- [x] `POST /daily-closings` → `system_cash_amount` dihitung otomatis dari saldo kas
- [x] `POST /daily-closings` → gagal 409 jika tanggal yang sama sudah ada
- [x] `POST /daily-closings` dengan selisih ≠ 0 dan tanpa notes → 400
- [x] `PATCH /daily-closings/:id/confirm` → `is_confirmed` menjadi `true`
- [x] Setelah confirm → `PUT /expenses/:id` pada tanggal tersebut → 422
- [x] `PATCH /daily-closings/:id/confirm` yang sudah confirmed → 409

### Laporan

- [x] `GET /reports/daily` → income, expense, cash summary, vault, dan daily closing ter-render
- [x] `GET /reports/monthly?month=7&year=2025` → breakdown per kategori, arrears by class, cash summary
- [x] `GET /reports/annual?academic_year_id=1` → breakdown per bulan, net, saldo akhir
- [x] `GET /reports/students/:id` → seluruh invoice dan payment history siswa ter-render
- [x] `GET /reports/students/:id?all=true` → data lintas tahun ajaran
- [x] `GET /reports/class-groups/:id?month=7&year=2025` → payment rate akurat
- [x] `yayasan` hanya bisa akses `/reports/annual` → endpoint lain → 403
- [x] `kepala_sekolah` bisa akses daily, monthly, annual, class-groups → student report → 403

### Wire TODO(batch-7)

- [x] `PUT /expenses/:id` pada tanggal yang sudah confirmed daily closing → 422 "Tanggal sudah dikunci"
- [x] `DELETE /expenses/:id` pada tanggal yang sudah dikunci → 422

---

## Ringkasan Akhir: Seluruh Backend Selesai

Setelah Batch 7 selesai, semua 7 batch telah diimplementasikan:

| Batch | Status | Endpoint |
|-------|--------|----------|
| Batch 1 — Foundation | ✅ | 13 |
| Batch 2 — Master Data | ✅ | 18 |
| Batch 3 — Relasi & Daycare | ✅ | 19 |
| Batch 4 — Siklus Akademik & Tarif | ✅ | 13 |
| Batch 5 — Invoice | ✅ | 12 |
| Batch 6 — Pembayaran, Tabungan, Pengeluaran | ✅ | 17 |
| Batch 7 — Kas, Tutup Buku, Laporan | ✅ | 14 |
| **Total** | | **106** |

Langkah setelah seluruh backend selesai:
1. Jalankan `swag init` untuk generate Swagger docs
2. Jalankan Orval di frontend untuk generate API hooks dari Swagger spec
3. Mulai implementasi frontend sesuai UX Flow dan UI Spec
