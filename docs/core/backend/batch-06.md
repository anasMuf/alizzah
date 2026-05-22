# Batch 6 — Keuangan: Pembayaran, Tabungan & Pengeluaran

> **Scope:** Payments · Student Savings · Savings Transactions · Guardian Withdrawals · Expense Categories · Expenses
> **Endpoint:** 17
> **Dependensi:** Batch 5 selesai
> **Harus selesai sebelum:** Batch 7

---

## Tujuan Batch Ini

Membangun seluruh alur transaksi uang masuk (pembayaran tagihan + setoran tabungan), uang keluar dari tabungan (penarikan wali murid), dan pencatatan pengeluaran operasional. Setiap transaksi di batch ini otomatis mencatat mutasi ke `cash_transactions` dan `vault_transactions` (model dari Batch 7 — definisikan sekarang, implementasi kasnya di Batch 7).

---

## Daftar Endpoint

| # | Method | Endpoint | Role |
|---|--------|----------|------|
| 1 | GET | `/api/v1/payments` | superadmin, admin_keuangan |
| 2 | POST | `/api/v1/payments` | superadmin, admin_keuangan |
| 3 | GET | `/api/v1/payments/:id` | superadmin, admin_keuangan |
| 4 | GET | `/api/v1/students/:id/payments` | superadmin, admin_keuangan |
| 5 | GET | `/api/v1/students/:id/savings` | superadmin, admin_keuangan |
| 6 | GET | `/api/v1/students/:id/savings/transactions` | superadmin, admin_keuangan |
| 7 | POST | `/api/v1/students/:id/savings/withdrawals` | superadmin, admin_keuangan |
| 8 | GET | `/api/v1/expense-categories` | superadmin, admin_keuangan |
| 9 | POST | `/api/v1/expense-categories` | superadmin, admin_keuangan |
| 10 | PUT | `/api/v1/expense-categories/:id` | superadmin |
| 11 | DELETE | `/api/v1/expense-categories/:id` | superadmin |
| 12 | GET | `/api/v1/expenses` | superadmin, admin_keuangan |
| 13 | POST | `/api/v1/expenses` | superadmin, admin_keuangan |
| 14 | GET | `/api/v1/expenses/:id` | superadmin, admin_keuangan |
| 15 | PUT | `/api/v1/expenses/:id` | superadmin, admin_keuangan |
| 16 | DELETE | `/api/v1/expenses/:id` | superadmin, admin_keuangan |
| 17 | — | *(internal)* Cash & Vault Transaction Writer | — |

> Endpoint 17 adalah internal method yang menjembatani ke Batch 7. Definisi model `CashTransaction` dan `VaultTransaction` dibuat di batch ini, implementasi endpoint-nya di Batch 7.

---

## Checklist Implementasi

### 1. Models

#### Payments

- [x] `model/payment.go`

```go
type Payment struct {
    model.PrimaryKey
    StudentID      uint      `gorm:"not null;index"`
    AcademicYearID uint      `gorm:"not null;index"`
    PaymentDate    time.Time `gorm:"type:date;not null"`
    TotalAmount    float64   `gorm:"type:decimal(15,2);not null"`
    Source         string    `gorm:"size:20;not null"` // cash | savings
    Notes          string    `gorm:"type:text"`
    CreatedBy      uint      `gorm:"not null"`
    CreatedAt      time.Time
    UpdatedAt      time.Time

    Student      model.Student      `gorm:"foreignKey:StudentID"`
    AcademicYear model.AcademicYear `gorm:"foreignKey:AcademicYearID"`
    Creator      model.User         `gorm:"foreignKey:CreatedBy"`
    Items        []PaymentItem      `gorm:"foreignKey:PaymentID"`
}
```

- [x] `model/payment_item.go`

```go
type PaymentItem struct {
    model.PrimaryKey
    PaymentID     uint    `gorm:"not null;index"`
    InvoiceItemID uint    `gorm:"not null;index"`
    Amount        float64 `gorm:"type:decimal(15,2);not null"`
    CreatedAt     time.Time
    UpdatedAt     time.Time

    Payment     model.Payment     `gorm:"foreignKey:PaymentID"`
    InvoiceItem model.InvoiceItem `gorm:"foreignKey:InvoiceItemID"`
}
```

#### Savings

- [x] `model/student_savings.go`

```go
type StudentSavings struct {
    model.PrimaryKey
    StudentID uint    `gorm:"not null;index"`
    Type      string  `gorm:"size:20;not null"` // general | mandatory
    Balance   float64 `gorm:"type:decimal(15,2);not null;default:0"`
    CreatedAt time.Time
    UpdatedAt time.Time

    Student      model.Student         `gorm:"foreignKey:StudentID"`
    Transactions []SavingsTransaction  `gorm:"foreignKey:StudentSavingsID"`
}
// UNIQUE constraint: (student_id, type)
```

- [x] `model/savings_transaction.go`

```go
type SavingsTransaction struct {
    model.PrimaryKey
    StudentSavingsID uint    `gorm:"not null;index"`
    TransactionType  string  `gorm:"size:10;not null"` // credit | debit
    Amount           float64 `gorm:"type:decimal(15,2);not null"`
    AdminFee         float64 `gorm:"type:decimal(15,2);not null;default:0"`
    NetAmount        float64 `gorm:"type:decimal(15,2);not null"`
    SourceType       string  `gorm:"size:30;not null"`
    // payment_deposit | guardian_withdrawal | payment_usage
    // graduation_allocation | transfer_return
    SourceID         *uint   `gorm:""`
    Notes            string  `gorm:"type:text"`
    CreatedBy        uint    `gorm:"not null"`
    CreatedAt        time.Time
    UpdatedAt        time.Time

    StudentSavings model.StudentSavings `gorm:"foreignKey:StudentSavingsID"`
    Creator        model.User           `gorm:"foreignKey:CreatedBy"`
}
```

#### Expense

- [x] `model/expense_category.go`

```go
type ExpenseCategory struct {
    model.PrimaryKey
    ParentID *uint  `gorm:"index"`
    Name     string `gorm:"size:100;not null"`
    model.BaseModelTimeAt

    Parent   *ExpenseCategory  `gorm:"foreignKey:ParentID"`
    Children []ExpenseCategory `gorm:"foreignKey:ParentID"`
}
```

- [x] `model/expense.go`

```go
type Expense struct {
    model.PrimaryKey
    AcademicYearID    uint      `gorm:"not null;index"`
    ExpenseCategoryID uint      `gorm:"not null;index"`
    ExpenseDate       time.Time `gorm:"type:date;not null"`
    Amount            float64   `gorm:"type:decimal(15,2);not null"`
    Description       string    `gorm:"type:text;not null"`
    ReceiptURL        string    `gorm:"size:255"`
    CreatedBy         uint      `gorm:"not null"`
    model.BaseModelTimeAt

    AcademicYear    model.AcademicYear    `gorm:"foreignKey:AcademicYearID"`
    ExpenseCategory model.ExpenseCategory `gorm:"foreignKey:ExpenseCategoryID"`
    Creator         model.User            `gorm:"foreignKey:CreatedBy"`
}
```

#### Cash & Vault (model saja — endpoint di Batch 7)

- [x] `model/cash_transaction.go`

```go
type CashTransaction struct {
    model.PrimaryKey
    AcademicYearID   uint      `gorm:"not null;index"`
    TransactionDate  time.Time `gorm:"type:date;not null;index"`
    TransactionType  string    `gorm:"size:10;not null"` // credit | debit
    Amount           float64   `gorm:"type:decimal(15,2);not null"`
    SourceType       string    `gorm:"size:30;not null"`
    // payment | expense | transfer_to_vault | transfer_from_vault
    SourceID         *uint     `gorm:""`
    Description      string    `gorm:"size:255;not null"`
    CreatedBy        uint      `gorm:"not null"`
    CreatedAt        time.Time
    UpdatedAt        time.Time

    AcademicYear model.AcademicYear `gorm:"foreignKey:AcademicYearID"`
    Creator      model.User         `gorm:"foreignKey:CreatedBy"`
}
```

- [x] `model/vault_transaction.go`

```go
type VaultTransaction struct {
    model.PrimaryKey
    AcademicYearID   uint      `gorm:"not null;index"`
    TransactionDate  time.Time `gorm:"type:date;not null;index"`
    TransactionType  string    `gorm:"size:10;not null"` // credit | debit
    Amount           float64   `gorm:"type:decimal(15,2);not null"`
    SourceType       string    `gorm:"size:30;not null"`
    // transfer_from_cash | savings_deposit | savings_withdrawal | graduation_allocation
    SourceID         *uint     `gorm:""`
    Description      string    `gorm:"size:255;not null"`
    CreatedBy        uint      `gorm:"not null"`
    CreatedAt        time.Time
    UpdatedAt        time.Time

    AcademicYear model.AcademicYear `gorm:"foreignKey:AcademicYearID"`
    Creator      model.User         `gorm:"foreignKey:CreatedBy"`
}
```

---

### 2. DTO

- [x] `dto/payment.go`

```go
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
    StudentID      uint              `json:"student_id" validate:"required"`
    AcademicYearID uint              `json:"academic_year_id" validate:"required"`
    PaymentDate    string            `json:"payment_date" validate:"required,datetime=2006-01-02"`
    Source         string            `json:"source" validate:"required,oneof=cash savings"`
    Notes          string            `json:"notes" validate:"omitempty"`
    Items          []PaymentItemReq  `json:"items" validate:"omitempty,dive"`
    SavingsDeposit float64           `json:"savings_deposit" validate:"omitempty,min=0"`
}

type PaymentItemReq struct {
    InvoiceItemID uint    `json:"invoice_item_id" validate:"required"`
    Amount        float64 `json:"amount" validate:"required,min=1"`
}

// Response
type PaymentListResponse struct {
    ID          uint                     `json:"id"`
    Student     StudentBriefResponse     `json:"student"`
    PaymentDate string                   `json:"payment_date"`
    TotalAmount float64                  `json:"total_amount"`
    Source      string                   `json:"source"`
    CreatedBy   UserBriefResponse        `json:"created_by"`
    CreatedAt   string                   `json:"created_at"`
}

type PaymentDetailResponse struct {
    ID          uint                     `json:"id"`
    Student     StudentBriefResponse     `json:"student"`
    PaymentDate string                   `json:"payment_date"`
    TotalAmount float64                  `json:"total_amount"`
    Source      string                   `json:"source"`
    Notes       *string                  `json:"notes"`
    Items       []PaymentItemResponse    `json:"items"`
    CreatedBy   UserBriefResponse        `json:"created_by"`
    CreatedAt   string                   `json:"created_at"`
}

type PaymentItemResponse struct {
    ID              uint    `json:"id"`
    InvoiceItemID   uint    `json:"invoice_item_id"`
    InvoiceItemName string  `json:"invoice_item_name"`
    Amount          float64 `json:"amount"`
}
```

- [x] `dto/savings.go`

```go
// Query
type SavingsTransactionQueryParams struct {
    Type      string // general | mandatory
    StartDate string
    EndDate   string
    Page      int
    Limit     int
}

// Request
type WithdrawalRequest struct {
    Amount float64 `json:"amount" validate:"required,min=1"`
    Notes  string  `json:"notes" validate:"omitempty"`
}

// Response
type StudentSavingsResponse struct {
    General   *SavingsBalanceResponse `json:"general"`
    Mandatory *SavingsBalanceResponse `json:"mandatory"`
}

type SavingsBalanceResponse struct {
    ID      uint    `json:"id"`
    Type    string  `json:"type"`
    Balance float64 `json:"balance"`
}

type SavingsTransactionResponse struct {
    ID              uint    `json:"id"`
    SavingsType     string  `json:"savings_type"`
    TransactionType string  `json:"transaction_type"`
    Amount          float64 `json:"amount"`
    AdminFee        float64 `json:"admin_fee"`
    NetAmount       float64 `json:"net_amount"`
    SourceType      string  `json:"source_type"`
    Notes           *string `json:"notes"`
    CreatedAt       string  `json:"created_at"`
}

type WithdrawalResponse struct {
    Amount           float64 `json:"amount"`
    AdminFee         float64 `json:"admin_fee"`
    NetAmount        float64 `json:"net_amount"`
    RemainingBalance float64 `json:"remaining_balance"`
}
```

- [x] `dto/expense.go`

```go
// Query
type ExpenseQueryParams struct {
    AcademicYearID    uint
    ExpenseCategoryID uint
    StartDate         string
    EndDate           string
    Page              int
    Limit             int
}

// Request
type CreateExpenseCategoryRequest struct {
    Name     string `json:"name" validate:"required,max=100"`
    ParentID *uint  `json:"parent_id" validate:"omitempty"`
}

type CreateExpenseRequest struct {
    AcademicYearID    uint    `json:"academic_year_id" validate:"required"`
    ExpenseCategoryID uint    `json:"expense_category_id" validate:"required"`
    ExpenseDate       string  `json:"expense_date" validate:"required,datetime=2006-01-02"`
    Amount            float64 `json:"amount" validate:"required,min=1"`
    Description       string  `json:"description" validate:"required"`
    ReceiptURL        string  `json:"receipt_url" validate:"omitempty,url"`
}

// Response
type ExpenseCategoryResponse struct {
    ID       uint                      `json:"id"`
    Name     string                    `json:"name"`
    ParentID *uint                     `json:"parent_id"`
    Children []ExpenseCategoryResponse `json:"children,omitempty"`
}

type ExpenseResponse struct {
    ID          uint                    `json:"id"`
    Category    ExpenseCategoryBrief    `json:"category"`
    ExpenseDate string                  `json:"expense_date"`
    Amount      float64                 `json:"amount"`
    Description string                  `json:"description"`
    ReceiptURL  *string                 `json:"receipt_url"`
    CreatedBy   UserBriefResponse       `json:"created_by"`
    CreatedAt   string                  `json:"created_at"`
}

type ExpenseCategoryBrief struct {
    ID         uint   `json:"id"`
    Name       string `json:"name"`
    ParentName string `json:"parent_name"`
}
```

---

### 3. Repository

- [x] `repository/payment_repository.go`

```go
type PaymentRepository interface {
    FindAll(params dto.PaymentQueryParams) ([]model.Payment, int64, error)
    FindByID(id uint) (*model.Payment, error)
    FindByStudentID(studentID uint, params dto.StudentPaymentQueryParams) ([]model.Payment, error)
    Create(payment *model.Payment) error
}
```

- [x] `repository/payment_item_repository.go`

```go
type PaymentItemRepository interface {
    BulkCreate(items []model.PaymentItem) error
    FindByPaymentID(paymentID uint) ([]model.PaymentItem, error)
}
```

- [x] `repository/student_savings_repository.go`

```go
type StudentSavingsRepository interface {
    FindByStudentID(studentID uint) ([]model.StudentSavings, error)
    FindByStudentAndType(studentID uint, savingsType string) (*model.StudentSavings, error)
    GetBalance(studentID uint, savingsType string) (float64, error)
    Create(savings *model.StudentSavings) error
    UpdateBalance(id uint, balance float64, tx *gorm.DB) error
    // Dipakai academic event service (graduation)
    DebitMandatory(studentID uint, amount float64, sourceType string, sourceID *uint, notes string, createdBy uint, tx *gorm.DB) error
    CreditGeneral(studentID uint, amount float64, sourceType string, sourceID *uint, notes string, createdBy uint, tx *gorm.DB) error
    InitForStudent(studentID uint, tx *gorm.DB) error
    // Inisialisasi savings saat siswa baru — buat record general (dan mandatory jika berlian)
}
```

- [x] `repository/savings_transaction_repository.go`

```go
type SavingsTransactionRepository interface {
    FindByStudentSavingsID(savingsID uint, params dto.SavingsTransactionQueryParams) ([]model.SavingsTransaction, int64, error)
    Create(tx *model.SavingsTransaction) error
    CreateWithTx(tx *model.SavingsTransaction, db *gorm.DB) error
}
```

- [x] `repository/expense_category_repository.go`

```go
type ExpenseCategoryRepository interface {
    FindAll() ([]model.ExpenseCategory, error)              // tree structure
    FindByID(id uint) (*model.ExpenseCategory, error)
    FindRootCategories() ([]model.ExpenseCategory, error)
    IsLeafNode(id uint) (bool, error)                       // tidak punya children
    HasExpenses(id uint) (bool, error)
    Create(ec *model.ExpenseCategory) error
    Update(ec *model.ExpenseCategory) error
    Delete(id uint) error
}
```

- [x] `repository/expense_repository.go`

```go
type ExpenseRepository interface {
    FindAll(params dto.ExpenseQueryParams) ([]model.Expense, int64, error)
    FindByID(id uint) (*model.Expense, error)
    Create(expense *model.Expense) error
    Update(expense *model.Expense) error
    Delete(id uint) error
    IsDateLocked(expenseDate time.Time) (bool, error)
    // cek apakah tanggal sudah melewati daily_closing yang dikonfirmasi
}
```

- [x] `repository/cash_transaction_repository.go` *(stub — dipakai Batch 7 untuk full impl)*

```go
type CashTransactionRepository interface {
    Create(ct *model.CashTransaction) error
    CreateWithTx(ct *model.CashTransaction, db *gorm.DB) error
    SumByDate(academicYearID uint, date time.Time) (credit, debit float64, err error)
    // dipakai daily closing Batch 7
}
```

- [x] `repository/vault_transaction_repository.go` *(stub)*

```go
type VaultTransactionRepository interface {
    Create(vt *model.VaultTransaction) error
    CreateWithTx(vt *model.VaultTransaction, db *gorm.DB) error
}
```

---

### 4. Transaction Writer (Internal)

Buat `service/transaction_writer_service.go` sebagai central writer untuk kas dan berangkas. Dipakai oleh payment service, expense service, dan savings service agar tidak ada yang langsung write ke cash/vault transaction secara tersebar.

```go
type TransactionWriterService interface {
    // Dipanggil saat pembayaran cash masuk
    WriteCashCredit(
        academicYearID uint,
        date time.Time,
        amount float64,
        sourceType string,
        sourceID *uint,
        description string,
        createdBy uint,
        tx *gorm.DB,
    ) error

    // Dipanggil saat pengeluaran dicatat
    WriteCashDebit(
        academicYearID uint,
        date time.Time,
        amount float64,
        sourceType string,
        sourceID *uint,
        description string,
        createdBy uint,
        tx *gorm.DB,
    ) error

    // Dipanggil saat tabungan disetor (setoran masuk berangkas)
    WriteVaultCredit(
        academicYearID uint,
        date time.Time,
        amount float64,
        sourceType string,
        sourceID *uint,
        description string,
        createdBy uint,
        tx *gorm.DB,
    ) error

    // Dipanggil saat tabungan dicairkan / alokasi wisuda
    WriteVaultDebit(
        academicYearID uint,
        date time.Time,
        amount float64,
        sourceType string,
        sourceID *uint,
        description string,
        createdBy uint,
        tx *gorm.DB,
    ) error
}
```

---

### 5. Payment Service

- [x] `service/payment_service.go`

```go
type PaymentService interface {
    GetAll(params dto.PaymentQueryParams) ([]dto.PaymentListResponse, *dto.Meta, error)
    GetByID(id uint) (*dto.PaymentDetailResponse, error)
    GetByStudentID(studentID uint, params dto.StudentPaymentQueryParams) ([]dto.PaymentListResponse, error)
    Create(createdBy uint, req dto.CreatePaymentRequest) (*dto.PaymentDetailResponse, error)
}
```

#### Alur Create Payment (Transaction Penuh)

```
Validasi awal:
  1. Student ada dan status active
  2. AcademicYear ada
  3. Minimal ada items ATAU savings_deposit > 0
  4. Jika source=savings:
     - Ambil saldo tabungan umum siswa
     - Total items yang dibayar ≤ saldo tabungan umum

Jalankan dalam satu DB transaction:

[A] Proses setiap payment item:
    Per item dalam req.Items:
      a. Ambil invoice_item dari DB
      b. Validasi: amount ≤ (invoice_item.amount - invoice_item.paid_amount)
         Jika melebihi → rollback, kembalikan 422
      c. Hitung total_amount += item.amount

[B] Buat record payment:
    INSERT payments (student_id, academic_year_id, payment_date, total_amount, source, notes, created_by)

[C] Buat payment_items:
    BulkCreate payment_items dari req.Items + payment.ID

[D] Update invoice_items:
    Per item:
      UPDATE invoice_items SET paid_amount = paid_amount + item.amount
      UPDATE status:
        - paid_amount + item.amount >= invoice_item.amount → "paid"
        - else → "partial"

[E] Update status invoice:
    Panggil invoiceService.UpdateInvoiceStatus(invoice_id) untuk setiap invoice yang tersentuh

[F] Jika source=cash:
    WriteCashCredit(amount=total_items_amount, sourceType="payment", sourceID=payment.id)

[G] Jika source=savings:
    - SavingsTransactionRepository.CreateWithTx (debit general, source_type=payment_usage)
    - StudentSavingsRepository.UpdateBalance (kurangi saldo general)
    - WriteVaultDebit (amount=total_items_amount, source_type=savings_withdrawal)
      CATATAN: saat tabungan dipakai bayar, berangkas berkurang karena "keluar" dari simpanan

[H] Jika ada savings_deposit > 0:
    - SavingsTransactionRepository.CreateWithTx (credit general, source_type=payment_deposit)
    - StudentSavingsRepository.UpdateBalance (tambah saldo general)
    - WriteVaultCredit (amount=savings_deposit, source_type=savings_deposit)
    - Tambahkan savings_deposit ke total_amount payment jika ingin dicatat dalam satu kwitansi
      (opsional — bisa juga hanya dicatat di savings_transactions)
```

> **Catatan penting:** Tabungan wajib Berlian tidak bisa digunakan source pembayaran manual — hanya bisa dialokasikan via graduation di academic event service.

```go
func (s *paymentService) Create(createdBy uint, req dto.CreatePaymentRequest) (*dto.PaymentDetailResponse, error) {
    // Validasi
    if len(req.Items) == 0 && req.SavingsDeposit == 0 {
        return nil, echo.NewHTTPError(400, "Minimal ada item pembayaran atau setoran tabungan")
    }

    if req.Source == "savings" {
        balance, _ := s.savingsRepo.GetBalance(req.StudentID, "general")
        totalItems := sumPaymentItems(req.Items)
        if totalItems > balance {
            return nil, echo.NewHTTPError(422, fmt.Sprintf(
                "Saldo tabungan tidak mencukupi. Saldo: %.0f, Dibutuhkan: %.0f",
                balance, totalItems,
            ))
        }
    }

    var result *model.Payment
    err := s.db.Transaction(func(tx *gorm.DB) error {
        // ... semua proses di dalam transaction
        return nil
    })
    if err != nil {
        return nil, err
    }
    return s.mapToDetail(result), nil
}
```

---

### 6. Savings Service

- [x] `service/savings_service.go`

```go
type SavingsService interface {
    GetByStudentID(studentID uint) (*dto.StudentSavingsResponse, error)
    GetTransactions(studentID uint, params dto.SavingsTransactionQueryParams) ([]dto.SavingsTransactionResponse, *dto.Meta, error)
    GuardianWithdrawal(studentID, createdBy uint, req dto.WithdrawalRequest) (*dto.WithdrawalResponse, error)
    // Internal — dipakai graduation service (Batch 4 wire)
    GetBalance(studentID uint, savingsType string) (float64, error)
    InitForNewStudent(studentID uint, level string, tx *gorm.DB) error
}
```

#### Alur GuardianWithdrawal

```
Validasi:
  1. Ambil student_savings type=general untuk student
  2. Jika tidak ada record → 404
  3. Jika req.amount > balance → 422 "Saldo tidak mencukupi"

Ambil fee_config untuk tahun ajaran aktif → savings_admin_rate
Hitung:
  admin_fee = amount × (savings_admin_rate / 100)
  net_amount = amount - admin_fee

Jalankan dalam transaction:
  1. CreateWithTx savings_transactions (debit, source_type=guardian_withdrawal)
  2. UpdateBalance (kurangi saldo general dengan amount penuh)
  3. WriteVaultDebit (amount=net_amount, source_type=savings_withdrawal)
     (berangkas berkurang sebesar net_amount yang keluar secara fisik)
```

#### InitForNewStudent

Dipanggil saat siswa baru di-assign ke rombel (dari enrollment service, setelah TODO Batch 5 di-wire):

```go
func (s *savingsService) InitForNewStudent(studentID uint, level string, tx *gorm.DB) error {
    // Selalu buat tabungan general
    general := &model.StudentSavings{StudentID: studentID, Type: "general", Balance: 0}
    if err := s.savingsRepo.WithTx(tx).Create(general); err != nil {
        return err
    }
    // Buat tabungan mandatory hanya untuk berlian
    if level == "berlian" {
        mandatory := &model.StudentSavings{StudentID: studentID, Type: "mandatory", Balance: 0}
        return s.savingsRepo.WithTx(tx).Create(mandatory)
    }
    return nil
}
```

> **Wire ke Batch 5:** Setelah `SavingsService` selesai, kembali ke `service/invoice_generate_service.go` dan isi bagian graduation wire yang masih menggantung.

---

### 7. Expense Category Service

- [x] `service/expense_category_service.go`

```go
type ExpenseCategoryService interface {
    GetAll() ([]dto.ExpenseCategoryResponse, error) // mengembalikan tree
    Create(req dto.CreateExpenseCategoryRequest) (*dto.ExpenseCategoryResponse, error)
    Update(id uint, req dto.CreateExpenseCategoryRequest) (*dto.ExpenseCategoryResponse, error)
    Delete(id uint) error
}
```

Logika bisnis:
- `GetAll` → query root categories dengan preload Children (dua level)
- `Create` → jika `parent_id` diisi, validasi parent ada dan `parent.parent_id = null` (hanya boleh 2 level)
- `Delete` → cek `HasExpenses` dan tidak punya children; jika ada kembalikan 422

Seed default categories:

```go
// seeders/expense_category_seeder.go
var defaultCategories = []struct {
    Name     string
    Children []string
}{
    {"Biaya Awal", []string{"Infaq Sarpras", "Infaq APE", "Biaya Psikotes IQ", "Koperasi"}},
    {"Biaya Registrasi", []string{"Biaya MPLS", "Buku PK Karakter", "Alat Belajar", "Iuran Kegiatan Kecamatan/Kabupaten", "Administrasi LPP", "Kalender", "Koperasi"}},
    {"SPP", []string{"Gaji Guru"}},
}
```

---

### 8. Expense Service

- [x] `service/expense_service.go`

```go
type ExpenseService interface {
    GetAll(params dto.ExpenseQueryParams) ([]dto.ExpenseResponse, *dto.Meta, error)
    GetByID(id uint) (*dto.ExpenseResponse, error)
    Create(createdBy uint, req dto.CreateExpenseRequest) (*dto.ExpenseResponse, error)
    Update(id uint, req dto.CreateExpenseRequest) (*dto.ExpenseResponse, error)
    Delete(id uint) error
}
```

Logika bisnis:
- `Create` → validasi `expense_category_id` adalah leaf node (bukan root); dalam transaction: INSERT expense + `WriteCashDebit`
- `Update` / `Delete` → cek `IsDateLocked(expense.expense_date)` → jika terkunci (daily_closing confirmed) kembalikan 422 "Tanggal sudah dikunci oleh tutup buku"

#### Alur Create Expense (Transaction)

```
Validasi:
  1. expense_category_id ada dan merupakan leaf node
  2. Tanggal tidak terkunci (belum ada daily_closing confirmed pada tanggal tersebut)

Dalam transaction:
  1. INSERT expenses
  2. WriteCashDebit(
       academicYearID, expense_date, amount,
       sourceType="expense", sourceID=expense.id,
       description=expense.description,
       createdBy
     )
```

---

### 9. Wire TODO dari Batch 5

Setelah `SavingsService` selesai, buka kembali:

- [x] `service/invoice_generate_service.go` (graduation):

```go
// Ganti stub dengan implementasi nyata
// Sebelumnya:
// s.savingsManager == nil → skip

// Setelah Batch 6:
balance, _ := s.savingsService.GetBalance(studentID, "mandatory")
// lanjutkan alokasi graduation...
```

- [x] `service/student_enrollment_service.go` atau `academic_event_service.go`:

```go
// Setelah INSERT enrollment baru (siswa baru pertama kali):
s.savingsService.InitForNewStudent(studentID, level, tx)
```

- [x] Update `financial_summary` di student detail (dari Batch 5 TODO):

```go
generalBalance, _ := s.savingsService.GetBalance(studentID, "general")
mandatoryBalance, _ := s.savingsService.GetBalance(studentID, "mandatory")
```

---

### 10. Handler

- [x] `handler/payment_handler.go`

```go
func (h *PaymentHandler) List(c echo.Context) error         {}
func (h *PaymentHandler) Create(c echo.Context) error       {}
func (h *PaymentHandler) Get(c echo.Context) error          {}
func (h *PaymentHandler) GetByStudent(c echo.Context) error {}
```

- [x] `handler/savings_handler.go`

```go
func (h *SavingsHandler) GetByStudent(c echo.Context) error     {}
func (h *SavingsHandler) GetTransactions(c echo.Context) error  {}
func (h *SavingsHandler) GuardianWithdrawal(c echo.Context) error {}
```

- [x] `handler/expense_category_handler.go`

```go
func (h *ExpenseCategoryHandler) List(c echo.Context) error   {}
func (h *ExpenseCategoryHandler) Create(c echo.Context) error {}
func (h *ExpenseCategoryHandler) Update(c echo.Context) error {}
func (h *ExpenseCategoryHandler) Delete(c echo.Context) error {}
```

- [x] `handler/expense_handler.go`

```go
func (h *ExpenseHandler) List(c echo.Context) error   {}
func (h *ExpenseHandler) Create(c echo.Context) error {}
func (h *ExpenseHandler) Get(c echo.Context) error    {}
func (h *ExpenseHandler) Update(c echo.Context) error {}
func (h *ExpenseHandler) Delete(c echo.Context) error {}
```

---

### 11. Route

- [x] Register di `main.go`:

```go
// Payments
payments := api.Group("/payments", jwtMiddleware,
    roleMiddleware("superadmin", "admin_keuangan"))
payments.GET("", paymentHandler.List)
payments.POST("", paymentHandler.Create)
payments.GET("/:id", paymentHandler.Get)

students.GET("/:id/payments", paymentHandler.GetByStudent,
    roleMiddleware("superadmin", "admin_keuangan"))

// Savings (nested di students)
students.GET("/:id/savings", savingsHandler.GetByStudent,
    roleMiddleware("superadmin", "admin_keuangan"))
students.GET("/:id/savings/transactions", savingsHandler.GetTransactions,
    roleMiddleware("superadmin", "admin_keuangan"))
students.POST("/:id/savings/withdrawals", savingsHandler.GuardianWithdrawal,
    roleMiddleware("superadmin", "admin_keuangan"))

// Expense Categories
expCats := api.Group("/expense-categories", jwtMiddleware)
expCats.GET("", expenseCategoryHandler.List,
    roleMiddleware("superadmin", "admin_keuangan"))
expCats.POST("", expenseCategoryHandler.Create,
    roleMiddleware("superadmin", "admin_keuangan"))
expCats.PUT("/:id", expenseCategoryHandler.Update,
    roleMiddleware("superadmin"))
expCats.DELETE("/:id", expenseCategoryHandler.Delete,
    roleMiddleware("superadmin"))

// Expenses
expenses := api.Group("/expenses", jwtMiddleware,
    roleMiddleware("superadmin", "admin_keuangan"))
expenses.GET("", expenseHandler.List)
expenses.POST("", expenseHandler.Create)
expenses.GET("/:id", expenseHandler.Get)
expenses.PUT("/:id", expenseHandler.Update)
expenses.DELETE("/:id", expenseHandler.Delete)
```

---

### 12. Auto-Migrate Update

- [x] Tambahkan model baru ke `config/database.go`:

```go
db.AutoMigrate(
    // ...Batch 1-5...
    // Batch 6
    &model.Payment{},
    &model.PaymentItem{},
    &model.StudentSavings{},
    &model.SavingsTransaction{},
    &model.ExpenseCategory{},
    &model.Expense{},
    // Batch 6 juga migrate model Batch 7 (tapi endpoint belum ada)
    &model.CashTransaction{},
    &model.VaultTransaction{},
)
```

- [x] Unique constraint student savings:

```go
db.Exec(`ALTER TABLE student_savings
    ADD CONSTRAINT uq_student_savings_type
    UNIQUE (student_id, type)`)
```

---

## Catatan Teknis Batch 6

### Menentukan Invoice yang Tersentuh oleh Payment

Dalam `Create Payment`, setiap `invoice_item_id` yang dibayar bisa berasal dari invoice yang berbeda. Perlu collect semua unique `invoice_id` yang tersentuh untuk dipanggil `UpdateInvoiceStatus`:

```go
invoiceIDs := map[uint]bool{}
for _, item := range req.Items {
    invoiceItem, _ := s.invoiceItemRepo.FindByID(item.InvoiceItemID)
    invoiceIDs[invoiceItem.InvoiceID] = true
}
// Setelah semua item diproses:
for invoiceID := range invoiceIDs {
    s.invoiceService.UpdateInvoiceStatus(invoiceID, tx)
}
```

### Savings Deposit dalam Satu Sesi Pembayaran

Jika `savings_deposit > 0`, ini berarti orang tua membayar tagihan sekaligus menyetorkan uang ke tabungan umum dalam satu kunjungan. Total yang diterima admin:

```
Total diterima = sum(items[].amount) + savings_deposit
```

`payment.total_amount` menyimpan `sum(items[].amount)` saja. `savings_deposit` dicatat terpisah di `savings_transactions`. Struk cetak menampilkan keduanya.

### IsDateLocked untuk Expense

```go
func (r *expenseRepo) IsDateLocked(expenseDate time.Time) (bool, error) {
    var count int64
    err := r.db.Model(&model.DailyClosing{}).
        Where("closing_date = ? AND is_confirmed = true", expenseDate).
        Count(&count).Error
    return count > 0, err
}
```

Model `DailyClosing` sudah ada definisinya di Batch 7, tapi tabel belum ada. Agar tidak error, buat stub dulu:

```go
// Jika daily_closing belum ada tabelnya, selalu return false (tidak terkunci)
// Wire penuh setelah Batch 7 selesai
```

Tandai dengan `TODO(batch-7)`:

```go
// TODO(batch-7): aktifkan pengecekan IsDateLocked setelah DailyClosing di-migrate
```

### WithTx Pattern Konsisten

Semua repository yang dipakai dalam transaction harus support `WithTx`. Pastikan semua repo yang dibuat di batch ini mengikuti pattern dari Batch 4.

---

## Acceptance Criteria Batch 6

### Payments

- [x] `POST /payments` dengan `source=cash`:
  - `payment_items` ter-insert per item
  - `invoice_items.paid_amount` terupdate
  - `invoices.status` berubah ke `partial` atau `paid` sesuai kondisi
  - `cash_transactions` credit ter-insert otomatis
- [x] `POST /payments` dengan `source=savings`:
  - Validasi saldo tabungan umum mencukupi
  - `savings_transactions` debit ter-insert
  - `student_savings.balance` berkurang
  - `vault_transactions` debit ter-insert
- [x] `POST /payments` dengan `savings_deposit`:
  - `savings_transactions` credit ter-insert
  - `student_savings.balance` bertambah
  - `vault_transactions` credit ter-insert
- [x] `POST /payments` dengan `amount` melebihi sisa tagihan item → 422
- [x] `GET /payments` → filter `student_id`, `source`, `start_date`, `end_date` berfungsi
- [x] `GET /payments/:id` → response menyertakan `items` dengan `invoice_item_name`

### Savings

- [x] `GET /students/:id/savings` → mengembalikan saldo `general` dan `mandatory` (null jika tidak ada)
- [x] `POST /students/:id/savings/withdrawals`:
  - Admin fee dihitung dari `fee_config.savings_admin_rate`
  - `savings_transactions` debit ter-insert dengan `admin_fee` yang benar
  - `vault_transactions` debit ter-insert dengan `net_amount`
  - Response mengembalikan `remaining_balance` setelah penarikan
- [x] `POST /students/:id/savings/withdrawals` dengan `amount > balance` → 422
- [x] `GET /students/:id/savings/transactions` → filter `type`, `start_date`, `end_date` berfungsi

### Expenses

- [x] `POST /expense-categories` dengan `parent_id` level 3 → 422 (hanya 2 level diizinkan)
- [x] `DELETE /expense-categories/:id` → gagal 422 jika punya children atau sudah dipakai expenses
- [x] `GET /expense-categories` → mengembalikan tree (root + children)
- [x] `POST /expenses` → gagal 422 jika `expense_category_id` adalah root (bukan leaf)
- [x] `POST /expenses` → `cash_transactions` debit ter-insert otomatis
- [x] `PUT /expenses/:id` pada tanggal yang sudah terkunci → 422 *(bisa diabaikan sementara jika Batch 7 belum selesai)*
- [x] Expense category seeder default ter-insert

### Graduation Wire (dari Batch 4)

- [x] `POST /academic-events/graduations` sudah tidak lagi mengembalikan 501
- [x] Alokasi tabungan wajib berlian berfungsi dengan benar:
  - Tabungan wajib = 480.000, biaya wisuda = 500.000 → sisa hutang 20.000 di invoice graduation
  - Tabungan wajib = 550.000, biaya wisuda = 500.000 → surplus 50.000 pindah ke tabungan umum
