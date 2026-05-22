# Batch 4 — Siklus Akademik & Konfigurasi Tarif

> **Scope:** Academic Events (write) · Fee Configs · Fee Config Items
> **Endpoint:** 13
> **Dependensi:** Batch 3 selesai
> **Harus selesai sebelum:** Batch 5

---

## Tujuan Batch Ini

Batch paling kompleks dari sisi logika bisnis. Mengimplementasikan seluruh siklus akademik siswa (kenaikan kelas, kelulusan, mutasi, pindah rombel, keluar) dan konfigurasi tarif per tahun ajaran. Semua aksi di batch ini menghasilkan `student_academic_events` sebagai audit log dan menjadi **trigger utama** generate tagihan di Batch 5.

---

## Daftar Endpoint

| # | Method | Endpoint | Role |
|---|--------|----------|------|
| 1 | POST | `/api/v1/academic-events/promotions` | superadmin, admin_administrasi |
| 2 | POST | `/api/v1/academic-events/graduations` | superadmin, admin_administrasi |
| 3 | POST | `/api/v1/academic-events/class-changes` | superadmin, admin_administrasi |
| 4 | POST | `/api/v1/academic-events/transfers` | superadmin, admin_administrasi |
| 5 | POST | `/api/v1/academic-events/withdrawals` | superadmin, admin_administrasi |
| 6 | GET | `/api/v1/fee-configs` | superadmin |
| 7 | POST | `/api/v1/fee-configs` | superadmin |
| 8 | GET | `/api/v1/fee-configs/:id` | superadmin |
| 9 | PUT | `/api/v1/fee-configs/:id` | superadmin |
| 10 | GET | `/api/v1/fee-configs/:id/items` | superadmin |
| 11 | POST | `/api/v1/fee-configs/:id/items` | superadmin |
| 12 | PUT | `/api/v1/fee-configs/:id/items/:item_id` | superadmin |
| 13 | DELETE | `/api/v1/fee-configs/:id/items/:item_id` | superadmin |

---

## Checklist Implementasi

### 1. Academic Events

Seluruh endpoint academic events dikelola dalam satu handler tapi service terpisah per event type untuk menjaga single responsibility.

#### DTO

- [ ] `dto/academic_event.go`

```go
// Kenaikan Kelas Massal
type PromotionRequest struct {
    FromAcademicYearID  uint   `json:"from_academic_year_id" validate:"required"`
    ToAcademicYearID    uint   `json:"to_academic_year_id" validate:"required"`
    EventDate           string `json:"event_date" validate:"required,datetime=2006-01-02"`
    RetainedStudentIDs  []uint `json:"retained_student_ids" validate:"omitempty"`
    Notes               string `json:"notes" validate:"omitempty"`
}

type PromotionResult struct {
    Promoted int           `json:"promoted"`
    Retained int           `json:"retained"`
    Errors   []EventError  `json:"errors"`
}

// Kelulusan
type GraduationRequest struct {
    StudentIDs     []uint `json:"student_ids" validate:"required,min=1"`
    AcademicYearID uint   `json:"academic_year_id" validate:"required"`
    EventDate      string `json:"event_date" validate:"required,datetime=2006-01-02"`
    Notes          string `json:"notes" validate:"omitempty"`
}

type GraduationStudentResult struct {
    StudentID                  uint    `json:"student_id"`
    StudentName                string  `json:"student_name"`
    GraduationInvoiceID        uint    `json:"graduation_invoice_id"`
    GraduationAmount           float64 `json:"graduation_amount"`
    MandatorySavingsUsed       float64 `json:"mandatory_savings_used"`
    RemainingDebt              float64 `json:"remaining_debt"`
    SurplusReturnedToGeneral   float64 `json:"surplus_returned_to_general"`
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
    StudentID  uint   `json:"student_id" validate:"required"`
    EventDate  string `json:"event_date" validate:"required,datetime=2006-01-02"`
    EventType  string `json:"event_type" validate:"required,oneof=transfer_out dropout"`
    Notes      string `json:"notes" validate:"omitempty"`
}

// Shared
type EventError struct {
    StudentID   uint   `json:"student_id"`
    StudentName string `json:"student_name"`
    Message     string `json:"message"`
}
```

#### Repository (tambahan ke Batch 3)

- [ ] Tambahkan method ke `repository/student_enrollment_repository.go`:

```go
// Tambahan untuk keperluan academic events
FindAllActiveByAcademicYear(academicYearID uint) ([]model.StudentEnrollment, error)
FindAllActiveByLevel(academicYearID uint, level string) ([]model.StudentEnrollment, error)
CloseEnrollment(id uint, endDate time.Time, status string) error
BulkCreate(enrollments []model.StudentEnrollment) error
```

- [ ] Tambahkan method ke `repository/student_repository.go`:

```go
UpdateStatus(id uint, status string) error
FindByIDs(ids []uint) ([]model.Student, error)
```

#### Service

- [ ] `service/academic_event_service.go`

```go
type AcademicEventService interface {
    ProcessPromotion(createdBy uint, req dto.PromotionRequest) (*dto.PromotionResult, error)
    ProcessGraduation(createdBy uint, req dto.GraduationRequest) (*dto.GraduationResult, error)
    ProcessClassChange(createdBy uint, req dto.ClassChangeRequest) error
    ProcessTransferIn(createdBy uint, req dto.TransferInRequest) error
    ProcessWithdrawal(createdBy uint, req dto.WithdrawalRequest) error
}
```

---

#### 1a. ProcessPromotion — Kenaikan Kelas Massal

Jalankan seluruh proses dalam **satu DB transaction**.

```
Validasi:
  - from_academic_year_id ≠ to_academic_year_id
  - to_academic_year_id ada di DB
  - Tidak ada enrollment aktif di to_academic_year_id (belum pernah diproses)

Per siswa aktif di from_academic_year_id:
  1. Tentukan level baru:
     - mutiara → intan (kecuali retained)
     - intan   → berlian (kecuali retained)
     - berlian → skip (harus diproses via graduation)
  2. Tutup enrollment lama: UPDATE status=completed, end_date=event_date
  3. Buat enrollment baru di to_academic_year_id:
     - enrollment_type = "promotion" (atau "retained" jika masuk retained_ids)
     - class_group: assign ke rombel pertama level baru yang tersedia
       (NOTE: assignment rombel spesifik bisa diubah via class-change setelahnya)
  4. Log student_academic_events (event_type=promotion atau retained)
  5. TODO(batch-5): generate tagihan registrasi tahunan untuk tahun ajaran baru
```

- [ ] Implementasi `processPromotion` di service

**Catatan penting:** Untuk siswa berlian yang masuk `retained_student_ids`, mereka tetap di berlian (tinggal kelas). Siswa berlian yang TIDAK ada di `retained_student_ids` di-skip — mereka harus diproses via `ProcessGraduation` secara terpisah.

---

#### 1b. ProcessGraduation — Kelulusan

Jalankan per siswa dalam **satu DB transaction per siswa**. Jika satu siswa gagal, rollback hanya untuk siswa tersebut, lanjut ke berikutnya.

```
Validasi per siswa:
  - Siswa ada di DB
  - Enrollment aktif siswa adalah level berlian
  - Siswa belum pernah diproses graduation

Per siswa:
  1. Ambil fee_config untuk academic_year_id → ambil item "graduation" (nominal wisuda)
  2. Generate invoice type=graduation:
     - INSERT invoices (type=graduation, status=unpaid, total_amount=graduation_fee)
     - INSERT invoice_items (name="Biaya Wisuda", amount=graduation_fee)
  3. Ambil saldo student_savings type=mandatory untuk siswa
  4. Alokasi tabungan wajib:
     - Jika saldo ≥ graduation_fee:
         a. Lunasi invoice_items sepenuhnya (paid_amount = graduation_fee, status=paid)
         b. Update invoices.status = paid
         c. Hitung surplus = saldo - graduation_fee
         d. Buat savings_transactions DEBIT (mandatory, amount=graduation_fee, source_type=graduation_allocation)
         e. Buat savings_transactions CREDIT (general, amount=surplus, source_type=transfer_return) jika surplus > 0
         f. Update student_savings.balance (mandatory → 0, general += surplus)
         g. Buat vault_transactions DEBIT (graduation_allocation, amount=graduation_fee)
     - Jika saldo < graduation_fee:
         a. Lunasi sebagian invoice_items (paid_amount=saldo, status=partial)
         b. Update invoices.paid_amount=saldo, status=partial
         c. Buat savings_transactions DEBIT (mandatory, amount=saldo)
         d. Update student_savings.balance mandatory → 0
         e. Buat vault_transactions DEBIT (amount=saldo)
  5. Tutup enrollment aktif siswa (status=completed, end_date=event_date)
  6. Update students.status = graduated
  7. Log student_academic_events (event_type=graduation)
```

- [ ] Implementasi `processGraduation` di service
- [ ] Inject `InvoiceRepository`, `StudentSavingsRepository`, `VaultTransactionRepository` ke service ini (akan dibuat di Batch 5 & 6 — gunakan interface, implementasi nyata di-wire di Batch 5)

**Strategi dependency ke Batch 5:**
Definisikan interface minimal yang dibutuhkan di file `service/academic_event_service.go` sendiri:

```go
// Interface lokal — akan di-fulfill oleh implementasi Batch 5
type invoiceCreator interface {
    CreateGraduationInvoice(studentID, academicYearID uint, amount float64, createdBy uint) (uint, error)
    FullyPayInvoice(invoiceID uint, amount float64) error
    PartialPayInvoice(invoiceID uint, amount float64) error
}

type savingsManager interface {
    GetMandatoryBalance(studentID uint) (float64, error)
    DebitMandatory(studentID uint, amount float64, sourceType string, sourceID uint, createdBy uint) error
    CreditGeneral(studentID uint, amount float64, sourceType string, sourceID uint, createdBy uint) error
}
```

Di `main.go`, wire-nya dengan `nil` sementara, dan endpoint graduation kembalikan `501 Not Implemented` hingga Batch 5 selesai:

```go
// main.go — sementara
academicEventService := service.NewAcademicEventService(
    enrollmentRepo,
    studentRepo,
    academicEventRepo,
    nil, // invoiceCreator — wire di Batch 5
    nil, // savingsManager — wire di Batch 5
)
```

---

#### 1c. ProcessClassChange — Pindah Rombel

```
Validasi:
  - student_id ada dan status active
  - from_class_group_id adalah enrollment aktif siswa saat ini
  - to_class_group_id ada dan level-nya sama dengan from_class_group_id
  - from_class_group_id ≠ to_class_group_id

Proses (dalam transaction):
  1. Tutup enrollment aktif (status=completed, end_date=event_date)
  2. Buat enrollment baru (enrollment_type=class_change, class_group_id=to_class_group_id)
  3. Log student_academic_events (event_type=class_change)
  (Tidak ada efek ke tagihan)
```

- [ ] Implementasi `processClassChange` di service

---

#### 1d. ProcessTransferIn — Mutasi Masuk

```
Validasi:
  - student_id ada di DB
  - to_class_group_id adalah level intan DAN (name = "Intan 1" ATAU name = "Intan 8")
  - academic_year_id ada di DB
  - Siswa belum punya enrollment aktif di academic_year_id ini

Proses (dalam transaction):
  1. Buat enrollment baru:
     - enrollment_type = mutation
     - start_date = request.start_date
     - class_group_id = to_class_group_id
  2. Update students.status = active (jika sebelumnya transferred)
  3. Log student_academic_events (event_type=transfer_in)
  4. TODO(batch-5): generate tagihan mulai dari bulan start_date
     (registrasi tahunan + monthly dari bulan start_date s/d akhir tahun ajaran)
```

- [ ] Implementasi `processTransferIn` di service

---

#### 1e. ProcessWithdrawal — Keluar / Pindah Sekolah

```
Validasi:
  - student_id ada dan status active
  - Siswa punya enrollment aktif

Proses (dalam transaction):
  1. Tutup enrollment aktif (status=dropped, end_date=event_date)
  2. Update students.status:
     - event_type=transfer_out → status=transferred
     - event_type=dropout      → status=dropped
  3. Log student_academic_events (event_type sesuai request)
  4. TODO(batch-5): bekukan invoice aktif yang belum lunas
     (UPDATE invoices SET notes='frozen - siswa keluar' WHERE status != 'paid')
```

- [ ] Implementasi `processWithdrawal` di service

---

#### Handler

- [ ] `handler/academic_event_handler.go`

```go
type AcademicEventHandler struct {
    service service.AcademicEventService
}

func (h *AcademicEventHandler) Promotion(c echo.Context) error  {}
func (h *AcademicEventHandler) Graduation(c echo.Context) error {}
func (h *AcademicEventHandler) ClassChange(c echo.Context) error {}
func (h *AcademicEventHandler) TransferIn(c echo.Context) error {}
func (h *AcademicEventHandler) Withdrawal(c echo.Context) error {}
```

Semua handler: parse body → validate → panggil service → return response.
Graduation dan Promotion mengembalikan summary result (bukan hanya message).

#### Route

- [ ] Register di `main.go`:

```go
events := api.Group("/academic-events", jwtMiddleware,
    roleMiddleware("superadmin", "admin_administrasi"))
events.POST("/promotions", academicEventHandler.Promotion)
events.POST("/graduations", academicEventHandler.Graduation)
events.POST("/class-changes", academicEventHandler.ClassChange)
events.POST("/transfers", academicEventHandler.TransferIn)
events.POST("/withdrawals", academicEventHandler.Withdrawal)
```

---

### 2. Fee Configs (Konfigurasi Tarif)

> Seluruh endpoint hanya dapat diakses oleh `superadmin`.

#### Model

- [ ] `model/fee_config.go`

```go
type FeeConfig struct {
    model.PrimaryKey
    AcademicYearID    uint    `gorm:"not null;uniqueIndex"`
    SavingsAdminRate  float64 `gorm:"type:decimal(5,2);not null;default:2.50"`
    model.BaseModelTimeAt

    AcademicYear model.AcademicYear `gorm:"foreignKey:AcademicYearID"`
    Items        []FeeConfigItem    `gorm:"foreignKey:FeeConfigID"`
}
```

- [ ] `model/fee_config_item.go`

```go
type FeeConfigItem struct {
    model.PrimaryKey
    FeeConfigID uint    `gorm:"not null;index"`
    Category    string  `gorm:"size:30;not null"`
    // initial | registration | monthly_spp | monthly_infaq |
    // pasta | calisan | ekskul | savings_mandatory | daycare | graduation
    ItemKey     string  `gorm:"size:50;not null"`
    Name        string  `gorm:"size:100;not null"`
    Level       string  `gorm:"size:20;not null;default:all"`
    // all | mutiara | intan | berlian
    Gender      string  `gorm:"size:5;not null;default:all"`
    // all | L | P
    Amount      float64 `gorm:"type:decimal(15,2);not null"`
    Unit        string  `gorm:"size:20;not null;default:fixed"`
    // fixed | per_day | per_monday | percent
    model.BaseModelTimeAt

    FeeConfig FeeConfig `gorm:"foreignKey:FeeConfigID"`
}

// UNIQUE constraint: (fee_config_id, item_key, level, gender)
```

#### DTO

- [ ] `dto/fee_config.go`

```go
// FeeConfig
type CreateFeeConfigRequest struct {
    AcademicYearID   uint    `json:"academic_year_id" validate:"required"`
    SavingsAdminRate float64 `json:"savings_admin_rate" validate:"required,min=0,max=100"`
}

type UpdateFeeConfigRequest struct {
    SavingsAdminRate float64 `json:"savings_admin_rate" validate:"required,min=0,max=100"`
}

type FeeConfigResponse struct {
    ID               uint                    `json:"id"`
    AcademicYear     AcademicYearBriefResponse `json:"academic_year"`
    SavingsAdminRate float64                 `json:"savings_admin_rate"`
    Items            []FeeConfigItemResponse  `json:"items,omitempty"`
    CreatedAt        string                  `json:"created_at"`
}

// FeeConfigItem
type CreateFeeConfigItemRequest struct {
    Category string  `json:"category" validate:"required,oneof=initial registration monthly_spp monthly_infaq pasta calisan ekskul savings_mandatory daycare graduation"`
    ItemKey  string  `json:"item_key" validate:"required,max=50"`
    Name     string  `json:"name" validate:"required,max=100"`
    Level    string  `json:"level" validate:"required,oneof=all mutiara intan berlian"`
    Gender   string  `json:"gender" validate:"required,oneof=all L P"`
    Amount   float64 `json:"amount" validate:"required,min=0"`
    Unit     string  `json:"unit" validate:"required,oneof=fixed per_day per_monday percent"`
}

type FeeConfigItemResponse struct {
    ID       uint    `json:"id"`
    Category string  `json:"category"`
    ItemKey  string  `json:"item_key"`
    Name     string  `json:"name"`
    Level    string  `json:"level"`
    Gender   string  `json:"gender"`
    Amount   float64 `json:"amount"`
    Unit     string  `json:"unit"`
}

type FeeConfigItemQueryParams struct {
    Category string
    Level    string
    Gender   string
}
```

#### Repository

- [ ] `repository/fee_config_repository.go`

```go
type FeeConfigRepository interface {
    FindAll() ([]model.FeeConfig, error)
    FindByID(id uint) (*model.FeeConfig, error)
    FindByAcademicYearID(academicYearID uint) (*model.FeeConfig, error)
    Create(fc *model.FeeConfig) error
    Update(fc *model.FeeConfig) error
}
```

- [ ] `repository/fee_config_item_repository.go`

```go
type FeeConfigItemRepository interface {
    FindByFeeConfigID(feeConfigID uint, params dto.FeeConfigItemQueryParams) ([]model.FeeConfigItem, error)
    FindByID(id uint) (*model.FeeConfigItem, error)
    FindByItemKey(feeConfigID uint, itemKey, level, gender string) (*model.FeeConfigItem, error)
    FindByCategory(feeConfigID uint, category string) ([]model.FeeConfigItem, error)
    FindForStudent(feeConfigID uint, level, gender string) ([]model.FeeConfigItem, error)
    // dipakai Batch 5 untuk generate tagihan
    Create(item *model.FeeConfigItem) error
    Update(item *model.FeeConfigItem) error
    Delete(id uint) error
    IsUsedByInvoices(id uint) (bool, error)
}
```

#### Service

- [ ] `service/fee_config_service.go`

```go
type FeeConfigService interface {
    GetAll() ([]dto.FeeConfigResponse, error)
    GetByID(id uint) (*dto.FeeConfigResponse, error)
    GetByAcademicYear(academicYearID uint) (*dto.FeeConfigResponse, error)
    Create(req dto.CreateFeeConfigRequest) (*dto.FeeConfigResponse, error)
    Update(id uint, req dto.UpdateFeeConfigRequest) (*dto.FeeConfigResponse, error)
    // Item management
    GetItems(feeConfigID uint, params dto.FeeConfigItemQueryParams) ([]dto.FeeConfigItemResponse, error)
    CreateItem(feeConfigID uint, req dto.CreateFeeConfigItemRequest) (*dto.FeeConfigItemResponse, error)
    UpdateItem(feeConfigID, itemID uint, req dto.CreateFeeConfigItemRequest) (*dto.FeeConfigItemResponse, error)
    DeleteItem(feeConfigID, itemID uint) error
}
```

Logika bisnis:
- `Create` → cek apakah `academic_year_id` sudah punya fee_config; jika ada kembalikan 409
- `CreateItem` → cek unique `(fee_config_id, item_key, level, gender)`; jika duplikat kembalikan 409
- `DeleteItem` → cek `IsUsedByInvoices`; jika sudah dipakai kembalikan 422
- `GetByAcademicYear` → dipakai internal oleh service lain (graduation, generate invoice)

#### Handler

- [ ] `handler/fee_config_handler.go`

```go
type FeeConfigHandler struct {
    service service.FeeConfigService
}

func (h *FeeConfigHandler) List(c echo.Context) error       {}
func (h *FeeConfigHandler) Create(c echo.Context) error     {}
func (h *FeeConfigHandler) Get(c echo.Context) error        {}
func (h *FeeConfigHandler) Update(c echo.Context) error     {}
func (h *FeeConfigHandler) ListItems(c echo.Context) error  {}
func (h *FeeConfigHandler) CreateItem(c echo.Context) error {}
func (h *FeeConfigHandler) UpdateItem(c echo.Context) error {}
func (h *FeeConfigHandler) DeleteItem(c echo.Context) error {}
```

#### Route

- [ ] Register di `main.go`:

```go
feeConfigs := api.Group("/fee-configs", jwtMiddleware,
    roleMiddleware("superadmin"))
feeConfigs.GET("", feeConfigHandler.List)
feeConfigs.POST("", feeConfigHandler.Create)
feeConfigs.GET("/:id", feeConfigHandler.Get)
feeConfigs.PUT("/:id", feeConfigHandler.Update)
feeConfigs.GET("/:id/items", feeConfigHandler.ListItems)
feeConfigs.POST("/:id/items", feeConfigHandler.CreateItem)
feeConfigs.PUT("/:id/items/:item_id", feeConfigHandler.UpdateItem)
feeConfigs.DELETE("/:id/items/:item_id", feeConfigHandler.DeleteItem)
```

---

### 3. Auto-Migrate Update

- [ ] Tambahkan model baru ke `config/database.go`:

```go
db.AutoMigrate(
    // ...Batch 1, 2, 3...
    // Batch 4
    &model.FeeConfig{},
    &model.FeeConfigItem{},
)
// StudentAcademicEvent & StudentEnrollment sudah di-migrate Batch 3
```

- [ ] Tambahkan unique constraint fee config item:

```go
db.Exec(`ALTER TABLE fee_config_items
    ADD CONSTRAINT uq_fee_config_items
    UNIQUE (fee_config_id, item_key, level, gender)`)
```

---

## Catatan Teknis Batch 4

### Strategi Transaction untuk Promotion

Gunakan `db.Transaction` dari GORM untuk seluruh proses massal:

```go
func (s *academicEventService) ProcessPromotion(createdBy uint, req dto.PromotionRequest) (*dto.PromotionResult, error) {
    result := &dto.PromotionResult{}

    err := s.db.Transaction(func(tx *gorm.DB) error {
        // gunakan tx untuk semua operasi DB
        enrollments, err := s.enrollmentRepo.WithTx(tx).FindAllActiveByAcademicYear(req.FromAcademicYearID)
        if err != nil {
            return err
        }
        for _, enrollment := range enrollments {
            // proses per siswa
        }
        return nil
    })

    return result, err
}
```

Agar repository support `WithTx`, tambahkan pattern berikut di base repository:

```go
type BaseRepository struct {
    db *gorm.DB
}

func (r *BaseRepository) WithTx(tx *gorm.DB) *BaseRepository {
    return &BaseRepository{db: tx}
}
```

### Menentukan Rombel Target saat Promotion

Saat kenaikan kelas, siswa harus di-assign ke rombel level baru. Strategi:
- Ambil rombel pertama yang tersedia di level baru (`ORDER BY name ASC LIMIT 1`)
- Admin bisa memindahkan ke rombel yang tepat via `class-change` setelahnya
- Catat di `notes` enrollment bahwa ini adalah assignment sementara: `"Auto-assigned saat kenaikan kelas. Mohon sesuaikan via pindah rombel."`

### Graduation sebagai Two-Phase Process

Setelah Batch 5 selesai dan `invoiceCreator` & `savingsManager` di-wire, lakukan:

1. Buka `service/academic_event_service.go`
2. Hapus `nil` pada injection di `main.go`
3. Wire `invoiceService` dan `savingsService` yang sudah ada
4. Aktifkan logika graduation yang sebelumnya di-skip dengan `501`

Tandai dengan komentar yang jelas di `main.go`:

```go
// WIRE-BATCH-5: uncomment setelah batch 5 selesai
// academicEventService.SetInvoiceCreator(invoiceService)
// academicEventService.SetSavingsManager(savingsService)
```

### FindForStudent di FeeConfigItemRepository

Method ini penting untuk generate invoice di Batch 5. Querynya:

```go
func (r *feeConfigItemRepo) FindForStudent(feeConfigID uint, level, gender string) ([]model.FeeConfigItem, error) {
    return r.db.Where(
        "fee_config_id = ? AND (level = 'all' OR level = ?) AND (gender = 'all' OR gender = ?)",
        feeConfigID, level, gender,
    ).Find(&[]model.FeeConfigItem{}).Error
}
```

### Validasi Mutasi ke Intan 1 atau 8

```go
// Di service ProcessTransferIn
classGroup, err := s.classGroupRepo.FindByID(req.ToClassGroupID)
if err != nil { return err }
if classGroup.Level != "intan" {
    return echo.NewHTTPError(422, "Mutasi hanya diperbolehkan ke jenjang Intan")
}
if classGroup.Name != "Intan 1" && classGroup.Name != "Intan 8" {
    return echo.NewHTTPError(422, "Mutasi hanya diperbolehkan ke Intan 1 atau Intan 8")
}
```

---

## Acceptance Criteria Batch 4

### Academic Events

- [ ] `POST /academic-events/promotions`:
  - Siswa Mutiara → enrollment baru di Intan di `to_academic_year_id`
  - Siswa Intan → enrollment baru di Berlian
  - Siswa Berlian di-skip (tidak diproses)
  - Siswa di `retained_student_ids` → enrollment baru di level yang sama
  - Response mengembalikan `{promoted, retained, errors}`
  - Jika sudah diproses sebelumnya → kembalikan 422
- [ ] `POST /academic-events/graduations`:
  - Hanya bisa untuk siswa berlian aktif
  - `student_academic_events` ter-insert untuk setiap siswa
  - `students.status` berubah menjadi `graduated`
  - Endpoint mengembalikan `501` hingga Batch 5 di-wire (graduation invoice & savings)
- [ ] `POST /academic-events/class-changes`:
  - Validasi level rombel asal dan tujuan harus sama
  - Enrollment lama ditutup, enrollment baru dibuat
  - Tidak ada perubahan ke tagihan
- [ ] `POST /academic-events/transfers`:
  - Hanya ke `intan` level
  - Hanya ke rombel bernama `Intan 1` atau `Intan 8`
  - Enrollment baru dibuat dengan `start_date` sesuai request
- [ ] `POST /academic-events/withdrawals`:
  - `students.status` berubah sesuai `event_type`
  - Enrollment aktif ditutup
  - `student_academic_events` ter-insert

### Fee Configs

- [ ] `POST /fee-configs` → gagal 409 jika `academic_year_id` sudah punya konfigurasi
- [ ] `GET /fee-configs/:id` → response menyertakan `items`
- [ ] `POST /fee-configs/:id/items` → gagal 409 jika kombinasi `(item_key, level, gender)` sudah ada
- [ ] `DELETE /fee-configs/:id/items/:item_id` → gagal 422 jika item sudah dipakai invoice
- [ ] `GET /fee-configs/:id/items` → filter `category`, `level`, `gender` berfungsi
- [ ] Seluruh endpoint fee-configs hanya bisa diakses `superadmin`; role lain → 403

### Seed Data Rekomendasi

Setelah Batch 4 selesai, buat seeder untuk fee config default tahun ajaran 2025/2026 berdasarkan dokumen sekolah:

```go
// seeders/fee_config_seeder.go
// Isi berdasarkan:
// - pos_pemasukan_infaq_pembayaran.md
// - rincian_biaya_registrasi.md
// - pos_pemasukan_biaya_awal.md
// - pos_pemasukan_biaya_daycare.md
// - list_pasta.md
```

Ini akan sangat membantu testing Batch 5 (generate invoice).
