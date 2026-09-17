# Task 1: Backend — Endpoint Create Invoice Manual + Guard Regenerate

> **Epic:** [Tagihan Tunggakan (Backfill) + CRUD Tagihan Manual](./tagihan-tunggakan-backfill.md)
> **Status:** Done (backend)
> **Priority:** P1 (foundation — semua task frontend bergantung pada ini)

---

## Goal

Invoice manual dapat dibuat lewat API: **satu endpoint `POST /v1/invoices`** yang melayani dua mode — `type=arrears` (tunggakan historis, tepat 1 item nominal total) dan `type=manual` (rinci, N item) — dengan **total dihitung server**. Sekaligus menutup risiko kehilangan data dengan mengecualikan `arrears`/`manual` dari hard-delete `RegenerateForStudent`.

**Setelah task ini selesai, invoice manual bisa dibuat & diverifikasi lewat API/Swagger — belum ada UI, dan belum ada DELETE/PUT (Task 2).**

## Dependencies

- Epic requirements **R.1, R.2, R.3, R.7, R.12**
- Tidak ada task prasyarat (task pertama)

## Files to Modify

| File | Operasi |
|------|---------|
| `apps/api/dto/invoice.go` | **Ubah** — tambah `CreateInvoiceRequest` & `CreateInvoiceItemRequest` |
| `apps/api/service/invoice_service.go` | **Ubah** — tambah `db`, `studentRepo`, `ayRepo`; method `CreateManual` |
| `apps/api/handler/invoice_handler.go` | **Ubah** — handler `Create` + anotasi Swagger |
| `apps/api/cmd/api/main.go` | **Ubah** — wiring `NewInvoiceService` + registrasi `invoices.POST("")` |
| `apps/api/service/invoice_generate_service.go` | **Ubah** — guard `type` di `RegenerateForStudent` |

Tidak perlu model baru, tabel baru, atau migrasi.

## Step 1: Study Existing Code

- `apps/api/dto/invoice.go:18-43` — pola `InvoiceListResponse` / `InvoiceDetailResponse`
- `apps/api/dto/invoice.go:80-84` — pola `AddInvoiceItemRequest` (tag `validate`)
- `apps/api/dto/payment.go:43-51` — pola request bersarang (`Items` / `IncidentalItems`)
- `apps/api/service/invoice_service.go:16-42` — interface & struct `invoiceService` (perhatikan: **belum ada `db`**)
- `apps/api/service/invoice_service.go:147-184` — `AddItem`: pola validasi, `IsMandatory: false`, pemetaan response
- `apps/api/utility/invoice_helper.go:48-54` — `SumInvoiceItems`
- `apps/api/utility/error.go:31-37` — `NewValidationError` (400) & `NewUnprocessableError` (422)
- `apps/api/repository/invoice_repository.go:25-29, 38-40` — `WithTx(tx)` pada `InvoiceRepository`
- `apps/api/repository/invoice_item_repository.go:9-25, 74-79` — `WithTx` & `BulkCreate`
- `apps/api/service/invoice_generate_service.go:141-156` — pola `s.db.Transaction(...)` di service
- `apps/api/service/payment_service.go:219-268` — pola pembuatan header + item dalam satu tx
- `apps/api/handler/invoice_handler.go:21-40` — pola handler + anotasi Swagger + `utility.GetErrorStatusAndCode`
- `apps/api/cmd/api/main.go:364` — pemanggilan `NewInvoiceService` yang akan diubah
- `apps/api/cmd/api/main.go:745-761` — grup route `invoices`
- `apps/api/service/invoice_generate_service.go:2844-2846` — query yang akan diberi guard

## Step 2: Implementation Checklist

### 2a. DTO (`dto/invoice.go`)

```go
type CreateInvoiceItemRequest struct {
    Name      string   `json:"name" validate:"required,max=100"`
    Category  string   `json:"category" validate:"required,max=30"`
    Amount    float64  `json:"amount" validate:"required,gt=0"`
    Quantity  *uint    `json:"quantity"`
    UnitPrice *float64 `json:"unit_price"`
    Notes     string   `json:"notes"`
}

type CreateInvoiceRequest struct {
    StudentID      uint                      `json:"student_id" validate:"required"`
    AcademicYearID uint                      `json:"academic_year_id" validate:"required"`
    Type           string                    `json:"type" validate:"required,oneof=arrears manual"`
    DueDate        *string                   `json:"due_date" validate:"omitempty,dateonly"`
    Notes          string                    `json:"notes"`
    Items          []CreateInvoiceItemRequest `json:"items" validate:"required,min=1,dive"`
}
```

- [ ] **Tidak ada** field `total_amount` di request (R.2)

### 2b. Service (`service/invoice_service.go`)

- [ ] Tambah `db *gorm.DB` pada struct `invoiceService`
- [ ] Tambah `studentRepo repository.StudentRepository` dan `ayRepo repository.AcademicYearRepository` (keduanya sudah di-instantiate di `main.go:270-272`)
- [ ] Ubah `NewInvoiceService(db *gorm.DB, invoiceRepo, studentRepo, ayRepo, itemRepo, installmentRepo, paymentRepo, exclSvc)` — sesuaikan urutan dengan konvensi constructor lain (`NewInvoiceGenerateService` menaruh `db` pertama)
- [ ] Tambah ke interface `InvoiceService`:
  ```go
  CreateManual(req dto.CreateInvoiceRequest) (*dto.InvoiceDetailResponse, error)
  ```
- [ ] Implementasi `CreateManual`:
  1. **Validasi mode** — bila `req.Type == "arrears"`:
     - `len(req.Items) != 1` → `utility.NewUnprocessableError("Tagihan tunggakan harus berisi tepat 1 item")`
     - `strings.TrimSpace(req.Notes) == ""` → `utility.NewUnprocessableError("Keterangan wajib diisi untuk tagihan tunggakan")`
     - Set `items[0].Category = "arrears"` (paksa, jangan percaya client)
  2. **Validasi referensi** — `studentRepo.FindByID(req.StudentID)` & `ayRepo.FindByID(req.AcademicYearID)`; gagal → `utility.NewNotFoundError("Siswa tidak ditemukan")` / `"...Tahun ajaran tidak ditemukan")`
  3. **Validasi item** — `amount > 0` untuk setiap item (R.1); `name` tidak boleh kosong setelah di-trim
  4. **Bangun** `model.Invoice{StudentID, AcademicYearID, Type, Month: nil, Year: nil, Status: "unpaid", TotalAmount: 0, PaidAmount: 0, DueDate: <parse dari req.DueDate>, Notes: req.Notes}`
  5. **Transaksi** via `s.db.Transaction(func(tx *gorm.DB) error { ... })`:
     - `s.invoiceRepo.WithTx(tx).Create(&invoice)` (dapatkan `invoice.ID`)
     - bangun `[]model.InvoiceItem` dengan `InvoiceID: invoice.ID`, `IsMandatory: false`, `Status: "unpaid"`, `PaidAmount: 0`
     - `invoice.TotalAmount = utility.SumInvoiceItems(items)` — **setelah** dibangun, **sebelum** commit
     - `s.itemRepo.WithTx(tx).BulkCreate(items)`
     - `s.invoiceRepo.WithTx(tx).UpdateTotalAmount(invoice.ID, invoice.TotalAmount)`
  6. **Response** — muat ulang via `s.invoiceRepo.FindByID(invoice.ID)` (agar `Student` & `AcademicYear` ter-`Preload`), lalu `mapInvoiceToDetailResponse(...)`
- [ ] Gunakan `utility.ParseDate` untuk `DueDate` (sudah menangani `YYYY-MM-DD` & RFC3339) — jangan tulis parser baru
- [ ] Konsisten dengan gaya error existing: pesan berbahasa Indonesia, `utility.New*Error` untuk status non-500

### 2c. Handler (`handler/invoice_handler.go`)

- [ ] `func (h *InvoiceHandler) Create(c echo.Context) error`:
  - `c.Bind(&req)` → `c.Validate(req)` (pola sama dengan handler existing)
  - `h.invoiceService.CreateManual(req)`
  - error → `utility.GetErrorStatusAndCode(err)`
  - sukses → `dto.SuccessResponse{Message: "Tagihan berhasil dibuat", Data: resp}` dengan status `201`
- [ ] Anotasi Swagger lengkap mengikuti pola `AddItem` (`@Summary`, `@Description`, `@Tags`, `@Security ApiKeyAuth`, `@Param`, `@Success`, `@Failure`, `@Router /v1/invoices [post]`)

### 2d. Wiring (`cmd/api/main.go`)

- [ ] Perbarui pemanggilan di **L364** menjadi `service.NewInvoiceService(db, invoiceRepo, studentRepo, ayRepo, invoiceItemRepo, invoiceInstallmentRepo, paymentRepo, billingExclusionService)`
- [ ] Daftarkan route pada grup `invoices` (**L746**) — **sebelum** route `/:id`:
  ```go
  invoices.POST("", invoiceHandler.Create, guard.RequireModule(middleware.ModuleKeuangan))
  ```
- [ ] Pastikan urutan route tidak menabrak `GET /invoices/batch` & `POST /invoices/:id/items`

### 2e. Guard Regenerate (`service/invoice_generate_service.go:2844-2846`)

- [ ] Tambahkan filter type pada query pengambilan ID yang akan di-hard-delete:
  ```go
  Where("student_id = ? AND academic_year_id = ? AND type NOT IN (?)", studentID, academicYearID, []string{"arrears", "manual"})
  ```
- [ ] **Jangan** mengubah baris lain di `RegenerateForStudent` (bug `payment_items` yatim di L2852 berada di luar scope — epic §8)

## Step 3: Tests (TDD)

Ikuti pola test service existing: sqlite in-memory, `SetMaxOpenConns(1)`, `AutoMigrate` model yang dibutuhkan, testify (`assert`/`require`).

- [ ] Study `apps/api/service/billing_exclusion_invoice_test.go:16-54` — pola `setup*TestDB` (termasuk alasan `SetMaxOpenConns(1)`) dan pola fixture seed
- [ ] Study `apps/api/service/unenroll_exclusion_cleanup_test.go` — contoh test service yang memverifikasi efek terhadap invoice
- [ ] ⚠️ **Semua file `_test.go` di `service/` berada dalam satu package `service`.** Nama helper setup/fixture harus **unik** di package — jangan memakai nama yang sudah ada (`setupTestDB`, `setupBillingExclusionInvoiceTestDB`, dst). Gunakan nama baru, mis. `setupManualInvoiceTestDB`.
- [ ] Buat file baru `apps/api/service/manual_invoice_service_test.go`
- [ ] AutoMigrate minimal: `User`, `AcademicYear`, `ClassGroup`, `Student`, `StudentEnrollment`, `Invoice`, `InvoiceItem`, `Payment`, `PaymentItem`, `FeeConfig`, `FeeConfigItem`

**Test case wajib:**

| Test | Yang diverifikasi |
|---|---|
| `TestCreateManual_Arrears_Success` | 1 item, total = amount item, `type=arrears`, `month`/`year` NULL, `status=unpaid`, `category` item dipaksa `"arrears"` |
| `TestCreateManual_Manual_MultipleItems_Success` | 3 item, `TotalAmount` = jumlah ketiganya (bukan nilai dari client) |
| `TestCreateManual_Arrears_MultipleItems_Rejected` | `type=arrears` + 2 item → error 422 |
| `TestCreateManual_Arrears_EmptyNotes_Rejected` | `notes` kosong/whitespace → error 422 |
| `TestCreateManual_EmptyItems_Rejected` | `items: []` → error 422 |
| `TestCreateManual_NonPositiveAmount_Rejected` | `amount: 0` dan `amount: -100` → error 422 |
| `TestCreateManual_StudentNotFound` | `student_id` tidak ada → error 404 |
| `TestCreateManual_AcademicYearNotFound` | `academic_year_id` tidak ada → error 404 |
| `TestRegenerateForStudent_PreservesManualAndArrears` | seed invoice `initial`/`monthly` + `arrears` + `manual` pada TA yang sama → setelah `RegenerateForStudent`, invoice `arrears`/`manual` **masih ada** (dan itemnya utuh) |

Untuk test regenerate, manfaatkan pola fixture yang sudah menyiapkan AY + siswa + enrollment + fee config (lihat `seedExclusionBaseFixture` di `billing_exclusion_invoice_test.go:63-70`) — jangan bangun fixture dari nol bila bisa diadaptasi.

## Step 4: Verification

- [ ] `go test ./service/... -run 'CreateManual|RegenerateForStudent_Preserves' -v` lulus
- [ ] `go test ./...` di `apps/api` tidak ada regresi
- [ ] `go build ./...` di `apps/api` sukses
- [ ] `swag init` (atau script yang dipakai repo) sukses & endpoint `POST /v1/invoices` muncul di Swagger
- [ ] `POST /v1/invoices` dengan `type=arrears`, 1 item, nominal 1.500.000, `notes` terisi → **201**; `total_amount` = 1.500.000
- [ ] `POST /v1/invoices` dengan `type=arrears` dan **2 item** → **422**
- [ ] `POST /v1/invoices` dengan `items: []` → **422**
- [ ] `POST /v1/invoices` dengan `amount: 0` → **422**
- [ ] `POST /v1/invoices` dengan `student_id` tidak ada → **404**
- [ ] `POST /v1/invoices` dengan `type=manual` dan 3 item → total = jumlah ketiga item (bukan dari client)
- [ ] `invoice.month` & `invoice.year` bernilai NULL untuk kedua type
- [ ] `GET /v1/invoices/:id` menampilkan invoice yang baru dibuat beserta item & nama TA asal
- [ ] `GET /v1/students/:id/invoices` (tanpa `academic_year_id`) mengembalikan invoice `arrears` tersebut
- [ ] `GET /v1/students/:id` → `financial_summary.total_unpaid` **naik** sebesar nominal tunggakan
- [ ] Panggil `POST /v1/students/:id/regenerate-invoices` → invoice `arrears`/`manual` **masih ada**, sementara invoice `monthly`/`initial`/`registration` ter-regenerate
- [ ] Transaksi rollback: paksa kegagalan `BulkCreate` (mis. item invalid) → tidak ada invoice yatim tersimpan

## Success Criteria

- [x] `POST /v1/invoices` tersedia, terdokumentasi di Swagger, dan ter-guard `RequireModule(ModuleKeuangan)`
- [x] `total_amount` selalu dihitung server dari item (client tidak mengirim total)
- [x] Aturan `type=arrears`: tepat 1 item + `category` dipaksa `"arrears"` + `notes` wajib
- [x] Pembuatan invoice + item bersifat atomik (satu transaksi)
- [x] `RegenerateForStudent` tidak menghapus invoice `arrears`/`manual`
- [x] Unit test `CreateManual` (happy path + seluruh jalur penolakan) & unit test guard regenerate lulus
- [x] `go build ./...` sukses
- [x] Pre-commit hooks passing (`go vet ./...` bersih; `gofmt` bersih untuk semua file yang disentuh)

## Catatan Implementasi

### Temuan yang wajib diketahui task berikutnya

1. **Jebakan GORM pada `is_mandatory`.** `InvoiceItem.IsMandatory` punya tag `gorm:"default:true"`, dan GORM **selalu mengecualikan field bernilai zero yang memiliki tag `default` dari INSERT** — `Select(...)` pun tidak menolong. Akibatnya `IsMandatory: false` akan tersimpan `true`. Karena itu ditambahkan `InvoiceItemRepository.BulkCreateNonMandatoryItems` yang melakukan `Create` lalu `UPDATE is_mandatory = false`.
   > ⚠️ **Pemaknaan untuk Task 3/4:** tombol Hapus item di `tagihan/$id.tsx` digate oleh `!item.is_mandatory`. Item dari `CreateManual` aman (sudah dipaksa `false`). Namun `InvoiceService.AddItem` **memakai `BulkCreate`/`Create` biasa**, sehingga item yang ditambahkan lewat UI "Tambah Item" pada invoice yang sudah ada berpotensi tersimpan `is_mandatory=true`. Itu **bug pre-existing**, di luar scope epik ini — catat, jangan perbaiki tanpa keputusan.
2. **Perintah regenerasi Swagger.** Perintah yang benar adalah:
   ```
   swag init -g cmd/api/main.go -o docs --parseInternal --parseDependency
   ```
   Tanpa `--parseInternal --parseDependency`, seluruh referensi definisi paket `internal/modules/koperasi/*` berubah nama dan menghasilkan diff ~1.700 baris yang tidak relevan. Dengan flag tersebut, diff menjadi **murni aditif** (402 penambahan, 0 penghapusan).
3. **`DueDate` memakai `string`, bukan `*string`.** Mengikuti dua pemakaian `dateonly` yang sudah ada di codebase (`InstallmentItem.DueDate`, `UpdateInstallmentRequest.DueDate`), agar tidak bergantung pada perilaku dereference pointer validator.

### Penyimpangan dari rencana awal

- Signature `NewInvoiceService` bertambah `db`, `studentRepo`, `ayRepo` (butuh `db` untuk transaksi; dua repo untuk validasi eksistensi). Pemanggil yang ikut disesuaikan: `cmd/api/main.go:364` dan helper test `service/facility_month_days_test.go`.
- Ditambahkan `InvoiceItemRepository.BulkCreateNonMandatoryItems` (tidak ada di rencana awal) — konsekuensi temuan #1.
- Validasi tag `validate` pada DTO **tidak** ter-cover oleh test service (karena dieksekusi di handler via `c.Validate`). Ditutup dengan `TestCreateInvoiceRequest_ValidationTags` yang memakai `utility.NewValidator()` langsung — termasuk memverifikasi `oneof=arrears manual` dan `dateonly`.

### Verifikasi yang sudah dijalankan

- `go build ./...` — OK
- `go vet ./...` — bersih
- `go test ./...` — `api/repository` & `api/service` hijau (10 test baru: 9 `CreateManual`/DTO + 1 guard regenerate)
- `gofmt -l` pada seluruh file yang disentuh — bersih
- Regenerasi Swagger — diff murni aditif, endpoint `POST /v1/invoices` + definisi `dto.CreateInvoiceRequest` / `dto.CreateInvoiceItemRequest` muncul di spec
- **Test guard dibuktikan tidak vacuous**: guard dilepas sementara → test gagal pada keempat assertion (invoice `arrears`/`manual` beserta itemnya benar-benar terhapus tanpa guard), lalu guard dikembalikan → hijau

### Verifikasi yang BELUM dijalankan

- **Verifikasi HTTP end-to-end** (status 201/404/422 nyata, binding body, urutan route di Echo) — butuh server + PostgreSQL yang berjalan. Belum dijalankan. Logika service sudah tercakup unit test, dan handler mengikuti pola `AddItem` yang sudah terbukti, tetapi gate ini tetap perlu dilewati sebelum dianggap production-ready.
- `pnpm build` / `pnpm lint` dashboard — tidak relevan untuk task backend ini (tidak ada file frontend yang disentuh).
