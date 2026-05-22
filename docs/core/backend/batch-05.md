# Batch 5 — Keuangan: Tagihan (Invoice)

> **Scope:** Invoices · Invoice Items · Invoice Installments · Generate Engine
> **Endpoint:** 12
> **Dependensi:** Batch 4 selesai + Fee Config seeder sudah ada
> **Harus selesai sebelum:** Batch 6

---

## Tujuan Batch Ini

Membangun mesin generate tagihan otomatis dan seluruh CRUD invoice. Ini adalah batch yang **membayar semua utang TODO(batch-5)** dari Batch 3 dan 4. Setelah batch ini selesai, endpoint graduation di Batch 4 juga di-wire penuh.

---

## Daftar Endpoint

| # | Method | Endpoint | Role |
|---|--------|----------|------|
| 1 | GET | `/api/v1/invoices` | superadmin, admin_keuangan |
| 2 | GET | `/api/v1/invoices/:id` | superadmin, admin_keuangan |
| 3 | GET | `/api/v1/students/:id/invoices` | superadmin, admin_keuangan |
| 4 | POST | `/api/v1/invoices/:id/items` | superadmin, admin_keuangan |
| 5 | PUT | `/api/v1/invoices/:id/items/:item_id` | superadmin, admin_keuangan |
| 6 | DELETE | `/api/v1/invoices/:id/items/:item_id` | superadmin, admin_keuangan |
| 7 | GET | `/api/v1/invoices/:id/installments` | superadmin, admin_keuangan |
| 8 | POST | `/api/v1/invoices/:id/installments` | superadmin, admin_keuangan |
| 9 | PUT | `/api/v1/invoices/:id/installments/:inst_id` | superadmin, admin_keuangan |
| 10 | DELETE | `/api/v1/invoices/:id/installments/:inst_id` | superadmin, admin_keuangan |
| 11 | — | *(internal)* Generate Initial Invoice | — |
| 12 | — | *(internal)* Generate Monthly Invoice | — |

> Endpoint 11 dan 12 bukan HTTP endpoint — ini adalah internal service method yang dipanggil oleh academic event service dan scheduler. Masuk hitungan karena merupakan deliverable utama batch ini.

---

## Checklist Implementasi

### 1. Models

- [x] `model/invoice.go`

```go
type Invoice struct {
    model.PrimaryKey
    StudentID      uint       `gorm:"not null;index"`
    AcademicYearID uint       `gorm:"not null;index"`
    Type           string     `gorm:"size:20;not null"`
    // initial | registration | monthly | graduation
    Month          *uint      `gorm:""`          // hanya untuk type=monthly
    Year           *uint      `gorm:""`          // hanya untuk type=monthly
    Status         string     `gorm:"size:20;not null;default:unpaid"`
    // unpaid | partial | paid
    TotalAmount    float64    `gorm:"type:decimal(15,2);not null"`
    PaidAmount     float64    `gorm:"type:decimal(15,2);not null;default:0"`
    DueDate        *time.Time `gorm:"type:date"`
    Notes          string     `gorm:"type:text"`
    model.BaseModelTimeAt

    Student      model.Student      `gorm:"foreignKey:StudentID"`
    AcademicYear model.AcademicYear `gorm:"foreignKey:AcademicYearID"`
    Items        []InvoiceItem      `gorm:"foreignKey:InvoiceID"`
    Installments []InvoiceInstallment `gorm:"foreignKey:InvoiceID"`
}
```

- [x] `model/invoice_item.go`

```go
type InvoiceItem struct {
    model.PrimaryKey
    InvoiceID    uint    `gorm:"not null;index"`
    Name         string  `gorm:"size:100;not null"`
    Category     string  `gorm:"size:30;not null"`
    Amount       float64 `gorm:"type:decimal(15,2);not null"`
    PaidAmount   float64 `gorm:"type:decimal(15,2);not null;default:0"`
    Status       string  `gorm:"size:20;not null;default:unpaid"`
    // unpaid | partial | paid
    IsMandatory  bool    `gorm:"default:true"`
    CreatedAt    time.Time
    UpdatedAt    time.Time

    Invoice      model.Invoice   `gorm:"foreignKey:InvoiceID"`
    PaymentItems []PaymentItem   `gorm:"foreignKey:InvoiceItemID"` // relasi ke Batch 6
}
```

- [x] `model/invoice_installment.go`

```go
type InvoiceInstallment struct {
    model.PrimaryKey
    InvoiceID          uint      `gorm:"not null;index"`
    InstallmentNumber  uint      `gorm:"not null"`
    DueDate            time.Time `gorm:"type:date;not null"`
    Amount             float64   `gorm:"type:decimal(15,2);not null"`
    Notes              string    `gorm:"type:text"`
    CreatedAt          time.Time
    UpdatedAt          time.Time

    Invoice model.Invoice `gorm:"foreignKey:InvoiceID"`
}
```

---

### 2. DTO

- [x] `dto/invoice.go`

```go
// Query
type InvoiceQueryParams struct {
    StudentID      uint
    AcademicYearID uint
    Type           string
    Status         string
    Month          uint
    Year           uint
    ClassGroupID   uint
    Page           int
    Limit          int
}

// Response
type InvoiceListResponse struct {
    ID             uint                     `json:"id"`
    Student        StudentBriefResponse     `json:"student"`
    AcademicYear   AcademicYearBriefResponse `json:"academic_year"`
    Type           string                   `json:"type"`
    Month          *uint                    `json:"month,omitempty"`
    Year           *uint                    `json:"year,omitempty"`
    Status         string                   `json:"status"`
    TotalAmount    float64                  `json:"total_amount"`
    PaidAmount     float64                  `json:"paid_amount"`
    DueDate        *string                  `json:"due_date"`
    CreatedAt      string                   `json:"created_at"`
}

type InvoiceDetailResponse struct {
    ID             uint                     `json:"id"`
    Student        StudentBriefResponse     `json:"student"`
    AcademicYear   AcademicYearBriefResponse `json:"academic_year"`
    Type           string                   `json:"type"`
    Month          *uint                    `json:"month,omitempty"`
    Year           *uint                    `json:"year,omitempty"`
    Status         string                   `json:"status"`
    TotalAmount    float64                  `json:"total_amount"`
    PaidAmount     float64                  `json:"paid_amount"`
    DueDate        *string                  `json:"due_date"`
    Notes          *string                  `json:"notes"`
    Items          []InvoiceItemResponse    `json:"items"`
    Installments   []InstallmentResponse    `json:"installments"`
    CreatedAt      string                   `json:"created_at"`
}

type InvoiceItemResponse struct {
    ID          uint    `json:"id"`
    Name        string  `json:"name"`
    Category    string  `json:"category"`
    Amount      float64 `json:"amount"`
    PaidAmount  float64 `json:"paid_amount"`
    Status      string  `json:"status"`
    IsMandatory bool    `json:"is_mandatory"`
}

// Request — Item
type AddInvoiceItemRequest struct {
    Name     string  `json:"name" validate:"required,max=100"`
    Category string  `json:"category" validate:"required"`
    Amount   float64 `json:"amount" validate:"required,min=1"`
}

type UpdateInvoiceItemRequest struct {
    Name   string  `json:"name" validate:"required,max=100"`
    Amount float64 `json:"amount" validate:"required,min=1"`
}

// Request — Installment
type InstallmentResponse struct {
    ID                 uint    `json:"id"`
    InstallmentNumber  uint    `json:"installment_number"`
    DueDate            string  `json:"due_date"`
    Amount             float64 `json:"amount"`
    Notes              *string `json:"notes"`
}

type CreateInstallmentScheduleRequest struct {
    Installments []InstallmentItem `json:"installments" validate:"required,min=1,dive"`
}

type InstallmentItem struct {
    InstallmentNumber uint    `json:"installment_number" validate:"required,min=1"`
    DueDate           string  `json:"due_date" validate:"required,datetime=2006-01-02"`
    Amount            float64 `json:"amount" validate:"required,min=1"`
    Notes             string  `json:"notes" validate:"omitempty"`
}

type UpdateInstallmentRequest struct {
    DueDate string  `json:"due_date" validate:"required,datetime=2006-01-02"`
    Amount  float64 `json:"amount" validate:"required,min=1"`
    Notes   string  `json:"notes" validate:"omitempty"`
}

// Internal — Generate
type GenerateInitialInvoiceParams struct {
    StudentID      uint
    AcademicYearID uint
    Level          string // mutiara | intan | berlian
    Gender         string // L | P
    CreatedBy      uint
}

type GenerateMonthlyInvoiceParams struct {
    StudentID        uint
    AcademicYearID   uint
    ClassGroupID     uint
    Level            string
    Gender           string
    Month            uint
    Year             uint
    ExtracurricularIDs []uint // pasta/calisan/ekskul aktif siswa
    CreatedBy        uint
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
```

---

### 3. Repository

- [x] `repository/invoice_repository.go`

```go
type InvoiceRepository interface {
    FindAll(params dto.InvoiceQueryParams) ([]model.Invoice, int64, error)
    FindByID(id uint) (*model.Invoice, error)
    FindByStudentID(studentID uint, invoiceType, status string, academicYearID uint) ([]model.Invoice, error)
    FindMonthlyByStudent(studentID, month, year uint) (*model.Invoice, error)
    Create(invoice *model.Invoice) error
    UpdateStatus(id uint, status string, paidAmount float64) error
    UpdateNotes(id uint, notes string) error
    ExistsInitialByStudent(studentID, academicYearID uint) (bool, error)
    ExistsRegistrationByStudent(studentID, academicYearID uint) (bool, error)
    ExistsMonthlyByStudent(studentID, month, year uint) (bool, error)
}
```

- [x] `repository/invoice_item_repository.go`

```go
type InvoiceItemRepository interface {
    FindByInvoiceID(invoiceID uint) ([]model.InvoiceItem, error)
    FindByID(id uint) (*model.InvoiceItem, error)
    FindUnpaidByInvoiceID(invoiceID uint) ([]model.InvoiceItem, error)
    Create(item *model.InvoiceItem) error
    BulkCreate(items []model.InvoiceItem) error
    Update(item *model.InvoiceItem) error
    UpdatePaidAmount(id uint, paidAmount float64, status string) error
    Delete(id uint) error
    HasPayments(id uint) (bool, error)
    // dipakai graduation Batch 4
    FullyPay(id uint, tx *gorm.DB) error
    PartialPay(id uint, amount float64, tx *gorm.DB) error
    // dipakai recalculate infaq harian
    FindByInvoiceAndCategory(invoiceID uint, category string) (*model.InvoiceItem, error)
}
```

- [x] `repository/invoice_installment_repository.go`

```go
type InvoiceInstallmentRepository interface {
    FindByInvoiceID(invoiceID uint) ([]model.InvoiceInstallment, error)
    FindByID(id uint) (*model.InvoiceInstallment, error)
    BulkCreate(installments []model.InvoiceInstallment) error
    Update(inst *model.InvoiceInstallment) error
    Delete(id uint) error
    DeleteByInvoiceID(invoiceID uint) error
}
```

---

### 4. Generate Engine

Ini adalah inti dari batch ini. Buat di `service/invoice_generate_service.go`.

```go
type InvoiceGenerateService interface {
    // Dipanggil saat siswa baru di-assign ke rombel (enrollment type=new)
    GenerateInitial(params dto.GenerateInitialInvoiceParams) error

    // Dipanggil saat kenaikan kelas / mutasi masuk / enrollment baru
    GenerateRegistration(params dto.GenerateRegistrationInvoiceParams) error

    // Dipanggil setiap bulan untuk semua siswa aktif (batch job)
    // atau saat siswa baru masuk di tengah tahun
    GenerateMonthly(params dto.GenerateMonthlyInvoiceParams) error

    // Dipanggil dari academic_event_service saat graduation
    GenerateGraduation(params dto.GenerateGraduationInvoiceParams) (*model.Invoice, error)

    // Dipanggil saat effective_days di-update
    RecalculateInfaqHarian(classGroupID, month, year uint) error

    // Dipanggil saat siswa daftar/keluar dari ekskul
    AddExtracurricularToNextMonthly(studentID, extracurricularID, academicYearID uint) error
    RemoveExtracurricularFromNextMonthly(studentID, extracurricularID, academicYearID uint) error
}
```

---

#### 4a. GenerateInitial

```
Input: student_id, academic_year_id, level, gender, created_by

Proses:
  1. Cek ExistsInitialByStudent → jika sudah ada, skip (idempotent)
  2. Ambil fee_config untuk academic_year_id
  3. Filter items: category = 'initial', level in (all, {level}), gender in (all, {gender})
  4. Buat invoice (type=initial, total_amount=sum(items))
  5. BulkCreate invoice_items dari fee_config_items yang sudah difilter
```

```go
func (s *invoiceGenerateService) GenerateInitial(params dto.GenerateInitialInvoiceParams) error {
    // Idempotency check
    exists, _ := s.invoiceRepo.ExistsInitialByStudent(params.StudentID, params.AcademicYearID)
    if exists {
        return nil
    }

    feeConfig, err := s.feeConfigRepo.FindByAcademicYearID(params.AcademicYearID)
    if err != nil {
        return fmt.Errorf("fee config tidak ditemukan untuk tahun ajaran ini")
    }

    items, err := s.feeConfigItemRepo.FindByStudentForCategory(
        feeConfig.ID, "initial", params.Level, params.Gender,
    )

    return s.db.Transaction(func(tx *gorm.DB) error {
        invoice := &model.Invoice{
            StudentID:      params.StudentID,
            AcademicYearID: params.AcademicYearID,
            Type:           "initial",
            Status:         "unpaid",
            TotalAmount:    sumItems(items),
        }
        if err := s.invoiceRepo.WithTx(tx).Create(invoice); err != nil {
            return err
        }
        return s.invoiceItemRepo.WithTx(tx).BulkCreate(
            mapFeeItemsToInvoiceItems(invoice.ID, items),
        )
    })
}
```

---

#### 4b. GenerateRegistration

```
Input: student_id, academic_year_id, level, gender, created_by

Proses:
  1. Cek ExistsRegistrationByStudent → skip jika sudah ada
  2. Ambil fee_config
  3. Filter items: category = 'registration', level in (all, {level}), gender in (all, {gender})
  4. Buat invoice (type=registration, total_amount=sum(items))
  5. BulkCreate invoice_items
  (Jadwal cicilan diisi manual oleh admin keuangan via endpoint installments)
```

---

#### 4c. GenerateMonthly

```
Input: student_id, academic_year_id, class_group_id, level, gender,
       month, year, extracurricular_ids, created_by

Proses:
  1. Cek ExistsMonthlyByStudent(student_id, month, year) → skip jika sudah ada
  2. Ambil fee_config untuk academic_year_id
  3. Ambil effective_days untuk (class_group_id, month, year)
  4. Kumpulkan items:

     [SPP]
     - Filter fee_config_items: category=monthly_spp, level in (all, {level})
     - Nominal = amount (fixed)

     [Infaq Harian]
     - Filter fee_config_items: category=monthly_infaq, unit=per_day
     - Nominal = amount × effective_days.total_days
     - Jika effective_days belum diinput → nominal = 0, tandai notes "Menunggu input hari efektif"

     [Pasta / Calisan / Ekskul]
     - Untuk setiap extracurricular_id aktif siswa:
       - Tentukan category dari extracurricular.type
       - Filter fee_config_items: item_key match dengan extracurricular
       - Nominal = amount (fixed)

     [Tabungan Wajib Berlian] (hanya jika level=berlian)
     - Filter fee_config_items: category=savings_mandatory, unit=per_monday
     - Nominal = amount × effective_days.total_mondays

  5. Buat invoice (type=monthly, month, year, total_amount=sum semua items)
  6. BulkCreate invoice_items
```

```go
func (s *invoiceGenerateService) GenerateMonthly(params dto.GenerateMonthlyInvoiceParams) error {
    exists, _ := s.invoiceRepo.ExistsMonthlyByStudent(params.StudentID, params.Month, params.Year)
    if exists {
        return nil
    }

    feeConfig, err := s.feeConfigRepo.FindByAcademicYearID(params.AcademicYearID)
    if err != nil {
        return fmt.Errorf("fee config tidak ditemukan")
    }

    effectiveDays, _ := s.effectiveDayRepo.FindByClassGroupMonthYear(
        params.ClassGroupID, params.Month, params.Year,
    )

    var invoiceItems []model.InvoiceItem

    // SPP
    sppItems, _ := s.feeConfigItemRepo.FindByCategory(feeConfig.ID, "monthly_spp")
    invoiceItems = append(invoiceItems, mapToInvoiceItems(sppItems, nil)...)

    // Infaq harian
    infaqItems, _ := s.feeConfigItemRepo.FindByCategory(feeConfig.ID, "monthly_infaq")
    for _, item := range infaqItems {
        amount := item.Amount
        notes := ""
        if effectiveDays != nil {
            amount = item.Amount * float64(effectiveDays.TotalDays)
        } else {
            amount = 0
            notes = "Menunggu input hari efektif"
        }
        invoiceItems = append(invoiceItems, model.InvoiceItem{
            Name: fmt.Sprintf("%s (%d hari)", item.Name,
                getOrZero(effectiveDays)),
            Category: item.Category,
            Amount:   amount,
            Notes:    notes,
        })
    }

    // Pasta / Calisan / Ekskul
    for _, exID := range params.ExtracurricularIDs {
        ex, _ := s.extracurricularRepo.FindByID(exID)
        feeItems, _ := s.feeConfigItemRepo.FindByExtracurricular(feeConfig.ID, ex.Type, ex.Name)
        invoiceItems = append(invoiceItems, mapToInvoiceItems(feeItems, nil)...)
    }

    // Tabungan Wajib Berlian
    if params.Level == "berlian" {
        mandatoryItems, _ := s.feeConfigItemRepo.FindByCategory(feeConfig.ID, "savings_mandatory")
        for _, item := range mandatoryItems {
            amount := float64(0)
            if effectiveDays != nil {
                amount = item.Amount * float64(effectiveDays.TotalMondays)
            }
            invoiceItems = append(invoiceItems, model.InvoiceItem{
                Name:     fmt.Sprintf("%s (%d Senin)", item.Name, getOrZero(effectiveDays)),
                Category: "savings_mandatory",
                Amount:   amount,
            })
        }
    }

    totalAmount := sumInvoiceItems(invoiceItems)

    return s.db.Transaction(func(tx *gorm.DB) error {
        invoice := &model.Invoice{
            StudentID:      params.StudentID,
            AcademicYearID: params.AcademicYearID,
            Type:           "monthly",
            Month:          &params.Month,
            Year:           &params.Year,
            Status:         "unpaid",
            TotalAmount:    totalAmount,
        }
        if err := s.invoiceRepo.WithTx(tx).Create(invoice); err != nil {
            return err
        }
        for i := range invoiceItems {
            invoiceItems[i].InvoiceID = invoice.ID
        }
        return s.invoiceItemRepo.WithTx(tx).BulkCreate(invoiceItems)
    })
}
```

---

#### 4d. GenerateGraduation

```
Input: student_id, academic_year_id, created_by

Proses:
  1. Ambil fee_config
  2. Filter items: category=graduation
  3. Buat invoice (type=graduation, total_amount=graduation_fee)
  4. Buat invoice_item tunggal "Biaya Wisuda"
  5. Return invoice (dipakai graduation service untuk alokasi tabungan wajib)
```

---

#### 4e. RecalculateInfaqHarian

Dipanggil oleh `effective_day_service` setelah upsert hari efektif.

```
Input: class_group_id, month, year

Proses:
  1. Ambil effective_days baru
  2. Ambil semua siswa aktif di class_group tersebut
  3. Per siswa:
     a. Cari invoice monthly (month, year)
     b. Cari invoice_item dengan category=monthly_infaq
     c. Jika item belum dibayar (paid_amount=0):
        - UPDATE amount = infaq_rate × new_total_days
        - UPDATE name = "Infaq Harian ({n} hari)"
        - Recalculate invoice.total_amount
     d. Jika sudah sebagian dibayar (partial):
        - UPDATE amount hanya jika amount baru ≥ paid_amount
        - Jika amount baru < paid_amount → skip, catat warning
  4. Untuk berlian: lakukan hal yang sama untuk savings_mandatory dengan total_mondays
```

---

#### 4f. AddExtracurricularToNextMonthly & RemoveExtracurricularFromNextMonthly

Dipanggil oleh `student_extracurricular_service` setelah enroll/unenroll.

```
AddExtracurricular:
  1. Tentukan bulan berikutnya dari tanggal hari ini
  2. Cari invoice monthly bulan tersebut untuk siswa
  3. Jika sudah ada → tambahkan invoice_item baru (category=pasta/calisan/ekskul)
  4. Recalculate invoice.total_amount

RemoveExtracurricular:
  1. Tentukan bulan berikutnya dari tanggal hari ini
  2. Cari invoice monthly bulan tersebut
  3. Cari invoice_item yang sesuai ekstrakurikuler tersebut
  4. Jika item belum dibayar → DELETE invoice_item
  5. Recalculate invoice.total_amount
```

---

### 5. Invoice Service (HTTP Endpoints)

- [x] `service/invoice_service.go`

```go
type InvoiceService interface {
    GetAll(params dto.InvoiceQueryParams) ([]dto.InvoiceListResponse, *dto.Meta, error)
    GetByID(id uint) (*dto.InvoiceDetailResponse, error)
    GetByStudentID(studentID uint, invoiceType, status string, academicYearID uint) ([]dto.InvoiceListResponse, error)
    // Item management
    AddItem(invoiceID uint, req dto.AddInvoiceItemRequest) (*dto.InvoiceItemResponse, error)
    UpdateItem(invoiceID, itemID uint, req dto.UpdateInvoiceItemRequest) (*dto.InvoiceItemResponse, error)
    DeleteItem(invoiceID, itemID uint) error
    // Installment management
    GetInstallments(invoiceID uint) ([]dto.InstallmentResponse, error)
    CreateInstallmentSchedule(invoiceID uint, req dto.CreateInstallmentScheduleRequest) ([]dto.InstallmentResponse, error)
    UpdateInstallment(invoiceID, instID uint, req dto.UpdateInstallmentRequest) (*dto.InstallmentResponse, error)
    DeleteInstallment(invoiceID, instID uint) error
    // Internal helpers (dipakai payment service Batch 6)
    RecalculateTotalAmount(invoiceID uint, tx *gorm.DB) error
    UpdateInvoiceStatus(invoiceID uint, tx *gorm.DB) error
}
```

Logika bisnis:

**AddItem:**
- Hanya bisa ditambahkan ke invoice yang belum lunas (`status != paid`)
- Item baru otomatis `is_mandatory = false` (item insidental)
- Setelah insert, panggil `RecalculateTotalAmount`

**UpdateItem:**
- Hanya bisa update item yang `paid_amount = 0` (belum ada pembayaran sama sekali)
- Jika `paid_amount > 0` → kembalikan 422 "Item sudah sebagian dibayar, tidak bisa diubah"
- Setelah update, panggil `RecalculateTotalAmount`

**DeleteItem:**
- Hanya bisa hapus item dengan `is_mandatory = false`
- Hanya bisa hapus item dengan `paid_amount = 0`
- Cek `HasPayments(itemID)` → jika ada kembalikan 422
- Setelah delete, panggil `RecalculateTotalAmount`

**CreateInstallmentSchedule:**
- Hapus jadwal cicilan lama (`DeleteByInvoiceID`) lalu insert baru
- Hanya untuk invoice `type = registration`
- Validasi: invoice type harus `registration`

**RecalculateTotalAmount (internal):**
```go
func (s *invoiceService) RecalculateTotalAmount(invoiceID uint, tx *gorm.DB) error {
    items, _ := s.invoiceItemRepo.WithTx(tx).FindByInvoiceID(invoiceID)
    total := float64(0)
    paid := float64(0)
    for _, item := range items {
        total += item.Amount
        paid += item.PaidAmount
    }
    status := calculateStatus(total, paid)
    return s.invoiceRepo.WithTx(tx).UpdateStatus(invoiceID, status, paid)
}
```

**UpdateInvoiceStatus (internal, dipanggil setelah payment di Batch 6):**
```go
// Sama dengan RecalculateTotalAmount — recalculate dari items
// Dipanggil oleh payment_service setelah mencatat pembayaran
```

---

### 6. Handler

- [x] `handler/invoice_handler.go`

```go
type InvoiceHandler struct {
    service service.InvoiceService
}

func (h *InvoiceHandler) List(c echo.Context) error              {}
func (h *InvoiceHandler) Get(c echo.Context) error               {}
func (h *InvoiceHandler) GetByStudent(c echo.Context) error      {}
func (h *InvoiceHandler) AddItem(c echo.Context) error           {}
func (h *InvoiceHandler) UpdateItem(c echo.Context) error        {}
func (h *InvoiceHandler) DeleteItem(c echo.Context) error        {}
func (h *InvoiceHandler) GetInstallments(c echo.Context) error   {}
func (h *InvoiceHandler) CreateInstallments(c echo.Context) error {}
func (h *InvoiceHandler) UpdateInstallment(c echo.Context) error  {}
func (h *InvoiceHandler) DeleteInstallment(c echo.Context) error  {}
```

---

### 7. Route

- [x] Register di `main.go`:

```go
invoices := api.Group("/invoices", jwtMiddleware,
    roleMiddleware("superadmin", "admin_keuangan"))
invoices.GET("", invoiceHandler.List)
invoices.GET("/:id", invoiceHandler.Get)
invoices.POST("/:id/items", invoiceHandler.AddItem)
invoices.PUT("/:id/items/:item_id", invoiceHandler.UpdateItem)
invoices.DELETE("/:id/items/:item_id", invoiceHandler.DeleteItem)
invoices.GET("/:id/installments", invoiceHandler.GetInstallments)
invoices.POST("/:id/installments", invoiceHandler.CreateInstallments)
invoices.PUT("/:id/installments/:inst_id", invoiceHandler.UpdateInstallment)
invoices.DELETE("/:id/installments/:inst_id", invoiceHandler.DeleteInstallment)

// Nested di students
students.GET("/:id/invoices", invoiceHandler.GetByStudent,
    roleMiddleware("superadmin", "admin_keuangan"))
```

---

### 8. Wire TODO(batch-5) dari Batch Sebelumnya

Setelah `invoice_generate_service` selesai, kembali ke semua TODO dan wire:

- [x] `service/student_enrollment_service.go` — saat enrollment baru dibuat:
  ```go
  // Setelah INSERT student_enrollment
  switch enrollment.EnrollmentType {
  case "new":
      s.invoiceGen.GenerateInitial(...)
      s.invoiceGen.GenerateRegistration(...)
      // generate monthly untuk bulan berjalan s/d akhir tahun ajaran
      s.generateMonthlyRange(...)
  case "promotion", "retained":
      s.invoiceGen.GenerateRegistration(...)
      // generate monthly full 1 tahun ajaran baru
      s.generateMonthlyRange(...)
  case "mutation":
      s.invoiceGen.GenerateRegistration(...)
      // generate monthly mulai bulan start_date s/d akhir tahun ajaran
      s.generateMonthlyFromDate(...)
  }
  ```

- [x] `service/effective_day_service.go` — setelah upsert:
  ```go
  // Hapus TODO, ganti dengan:
  s.invoiceGen.RecalculateInfaqHarian(classGroupID, month, year)
  ```

- [x] `service/student_extracurricular_service.go` — setelah enroll/unenroll:
  ```go
  s.invoiceGen.AddExtracurricularToNextMonthly(...)
  s.invoiceGen.RemoveExtracurricularFromNextMonthly(...)
  ```

- [x] `service/academic_event_service.go` — wire graduation:
  ```go
  // Hapus komentar WIRE-BATCH-5 di main.go
  // Wire invoiceGenerateService ke academicEventService
  invoice, err := s.invoiceGen.GenerateGraduation(...)
  // lanjutkan logika alokasi tabungan wajib...
  ```

---

### 9. Helper Functions

Tambahkan ke `utility/invoice_helper.go`:

```go
// Mapping fee_config_items → invoice_items
func MapFeeItemsToInvoiceItems(invoiceID uint, items []model.FeeConfigItem) []model.InvoiceItem {
    result := make([]model.InvoiceItem, len(items))
    for i, item := range items {
        result[i] = model.InvoiceItem{
            InvoiceID:   invoiceID,
            Name:        item.Name,
            Category:    item.Category,
            Amount:      item.Amount,
            IsMandatory: true,
        }
    }
    return result
}

// Hitung total dari slice invoice items
func SumInvoiceItems(items []model.InvoiceItem) float64 {
    total := float64(0)
    for _, item := range items {
        total += item.Amount
    }
    return total
}

// Tentukan status invoice dari total & paid
func CalculateInvoiceStatus(total, paid float64) string {
    if paid == 0 {
        return "unpaid"
    }
    if paid >= total {
        return "paid"
    }
    return "partial"
}

// Hitung bulan-bulan dari start_date sampai end_date tahun ajaran
func MonthRangeFromDate(startDate time.Time, academicYearEnd time.Time) []struct{ Month, Year uint } {
    var months []struct{ Month, Year uint }
    current := time.Date(startDate.Year(), startDate.Month(), 1, 0, 0, 0, 0, time.UTC)
    end := time.Date(academicYearEnd.Year(), academicYearEnd.Month(), 1, 0, 0, 0, 0, time.UTC)
    for !current.After(end) {
        months = append(months, struct{ Month, Year uint }{
            Month: uint(current.Month()),
            Year:  uint(current.Year()),
        })
        current = current.AddDate(0, 1, 0)
    }
    return months
}
```

---

### 10. Auto-Migrate Update

- [x] Tambahkan model baru ke `config/database.go`:

```go
db.AutoMigrate(
    // ...Batch 1-4...
    // Batch 5
    &model.Invoice{},
    &model.InvoiceItem{},
    &model.InvoiceInstallment{},
)
```

---

### 11. Update Student Detail Response

Setelah batch ini selesai, kembali ke `service/student_service.go` dan isi `FinancialSummary`:

```go
// Hapus komentar TODO(batch-5), ganti dengan:
unpaidTotal, _ := s.invoiceRepo.SumUnpaidByStudent(studentID)
generalBalance, _ := s.savingsRepo.GetBalance(studentID, "general")   // wire Batch 6
mandatoryBalance, _ := s.savingsRepo.GetBalance(studentID, "mandatory") // wire Batch 6

FinancialSummary: &dto.FinancialSummaryResponse{
    TotalUnpaid:             unpaidTotal,
    SavingsGeneralBalance:   generalBalance,
    SavingsMandatoryBalance: mandatoryBalance,
},
```

Tambahkan method ke `InvoiceRepository`:
```go
SumUnpaidByStudent(studentID uint) (float64, error)
```

---

## Catatan Teknis Batch 5

### Idempotency Generate

Semua generate method bersifat idempotent — jika dipanggil dua kali untuk input yang sama, tidak akan membuat duplikat. Ini penting karena generate bisa dipanggil dari beberapa tempat (enrollment, seeder, retry).

### generateMonthlyRange

Helper private di service untuk generate tagihan bulanan dari rentang bulan:

```go
func (s *invoiceGenerateService) generateMonthlyRange(
    studentID, academicYearID, classGroupID uint,
    level, gender string,
    startDate, endDate time.Time,
    createdBy uint,
) error {
    months := utility.MonthRangeFromDate(startDate, endDate)
    extracurricularIDs := s.getActiveExtracurricularsForStudent(studentID, academicYearID)
    for _, m := range months {
        err := s.GenerateMonthly(dto.GenerateMonthlyInvoiceParams{
            StudentID:          studentID,
            AcademicYearID:     academicYearID,
            ClassGroupID:       classGroupID,
            Level:              level,
            Gender:             gender,
            Month:              m.Month,
            Year:               m.Year,
            ExtracurricularIDs: extracurricularIDs,
            CreatedBy:          createdBy,
        })
        if err != nil {
            return err
        }
    }
    return nil
}
```

### Matching Fee Config Item dengan Extracurricular

Konvensi `item_key` untuk ekstrakurikuler mengikuti format `{type}_{name_slug}`:
- Robotika → `pasta_robotika`
- Calisan KB → `calisan_kb`
- Aslin → `ekskul_aslin`

Saat generate monthly, query fee config item:
```go
func (r *feeConfigItemRepo) FindByExtracurricular(
    feeConfigID uint, exType, exName string,
) ([]model.FeeConfigItem, error) {
    slug := strings.ToLower(strings.ReplaceAll(exName, " ", "_"))
    itemKey := fmt.Sprintf("%s_%s", exType, slug)
    return r.db.Where(
        "fee_config_id = ? AND item_key = ?",
        feeConfigID, itemKey,
    ).Find(&[]model.FeeConfigItem{}).Error
}
```

---

## Acceptance Criteria Batch 5

### Generate Engine

- [x] Saat siswa baru di-assign ke rombel → invoice `initial` dan `registration` ter-generate otomatis
- [x] Invoice bulanan ter-generate untuk setiap bulan aktif tahun ajaran
- [x] Nominal infaq harian = `rate × total_days` dari effective_days
- [x] Jika effective_days belum diinput → item infaq harian = 0 dengan notes
- [x] Setelah effective_days diinput/update → nominal infaq harian di semua invoice bulan tersebut ter-update
- [x] Saat siswa daftar pasta → item pasta masuk ke invoice bulan berikutnya
- [x] Saat siswa keluar pasta → item pasta dihapus dari invoice bulan berikutnya (jika belum dibayar)
- [x] Graduation invoice ter-generate dan alokasi tabungan wajib berfungsi (endpoint graduation aktif)
- [x] Generate bersifat idempotent — tidak ada duplikat jika dipanggil dua kali

### HTTP Endpoints

- [x] `GET /invoices` → filter `student_id`, `type`, `status`, `month`, `year` berfungsi
- [x] `GET /invoices/:id` → response menyertakan `items` dan `installments`
- [x] `GET /students/:id/invoices` → mengembalikan semua invoice siswa
- [x] `POST /invoices/:id/items` → item baru ditambahkan, `total_amount` invoice ter-update
- [x] `PUT /invoices/:id/items/:item_id` → gagal 422 jika item sudah ada `paid_amount > 0`
- [x] `DELETE /invoices/:id/items/:item_id` → gagal 422 jika `is_mandatory=true` atau sudah ada payment
- [x] `POST /invoices/:id/installments` → menggantikan jadwal cicilan lama
- [x] `POST /invoices/:id/installments` → gagal 422 jika invoice bukan type `registration`
- [x] `financial_summary` di `GET /students/:id` sekarang terisi (tidak lagi `null`)
