# Task 2: Backend — `DELETE` & `PUT /v1/invoices/:id`

> **Epic:** [Tagihan Tunggakan (Backfill) + CRUD Tagihan Manual](./tagihan-tunggakan-backfill.md)
> **Status:** Done (backend)
> **Priority:** P1 (melengkapi CRUD backend sebelum UI dibangun)

---

## Goal

Melengkapi operasi CRUD di level invoice: **hapus** invoice manual dengan guard ketat (409 bila tidak boleh dihapus) dan **ubah** metadata invoice (`notes`, `due_date`) tanpa menyentuh item/total/status. Setelah task ini, sisi backend CRUD manual sudah utuh dan bisa dibangun UI-nya (Task 3).

## Dependencies

- **Task 1 selesai** — `POST /v1/invoices` sudah ada, sehingga invoice `arrears`/`manual` bisa dibuat untuk diuji.
- Epic requirements **R.5, R.6, R.12**

## Files to Modify

| File | Operasi |
|------|---------|
| `apps/api/dto/invoice.go` | **Ubah** — tambah `UpdateInvoiceRequest` |
| `apps/api/repository/invoice_repository.go` | **Ubah** — tambah `Delete` & `UpdateNotesAndDueDate` |
| `apps/api/service/invoice_service.go` | **Ubah** — tambah `Delete` & `Update` |
| `apps/api/handler/invoice_handler.go` | **Ubah** — handler `Delete` & `Update` + anotasi Swagger |
| `apps/api/cmd/api/main.go` | **Ubah** — registrasi `PUT` & `DELETE` pada grup `invoices` |
| `apps/api/service/manual_invoice_service_test.go` | **Ubah** — tambah test guard delete & update |

## Kontrak API

### `DELETE /v1/invoices/:id`

Guard (semua harus terpenuhi; jika tidak → **409 Conflict**):

1. `type IN ('arrears','manual')` — invoice hasil generate **tidak boleh** dihapus lewat endpoint ini (itu tugas `RegenerateForStudent`).
2. `paid_amount == 0`.
3. Tidak ada `payment_item` yang menunjuk item invoice ini (`paymentRepo.FindByInvoiceID` → `len == 0`).

Bila lolos: **soft delete** invoice + item-itemnya dalam **satu transaksi**.
Item ikut di-soft-delete bukan sekadar kerapian: `InvoiceItemRepository.FindByID` dipakai `payment_service` untuk memvalidasi `invoice_item_id`, dan **tidak** memeriksa apakah invoice induknya masih ada. Tanpa ikut menghapus item, item dari invoice yang sudah dihapus masih bisa dibayar.

Invoice tidak ditemukan → **404**.

### `PUT /v1/invoices/:id`

Body: `{ "notes": "...", "due_date": "YYYY-MM-DD" }`

- Hanya `notes` & `due_date` yang berubah. Item, `total_amount`, `paid_amount`, dan `status` **tidak** disentuh.
- `due_date` kosong (`""`) berarti **menghapus** jatuh tempo (set NULL).
- Tidak ada guard `type` (epic R.6 tidak membatasinya) — tetapi bila `type == "arrears"`, `notes` wajib diisi (konsisten dengan R.3) → **422** bila kosong.
- Format `due_date` divalidasi tag `dateonly` (menerima `YYYY-MM-DD` maupun RFC3339).
- Invoice tidak ditemukan → **404**.

Kedua route terdaftar pada grup `invoices` existing sehingga otomatis `RequireModule(ModuleKeuangan)`.

## Step 1: Study Existing Code

- `apps/api/service/invoice_service.go:16-40` — interface `InvoiceService` (tempat menambah `Delete` & `Update`)
- `apps/api/service/invoice_service.go:147-184` — `AddItem`: pola validasi + pesan error
- `apps/api/repository/invoice_repository.go:10-28` — interface `InvoiceRepository` (pola penamaan `UpdateNotes`, `UpdateTotalAmount`)
- `apps/api/repository/invoice_item_repository.go` — `DeleteByInvoiceID` (soft delete per invoice, sudah ada)
- `apps/api/repository/payment_repository.go:176-186` — `FindByInvoiceID` (join `payment_items` → `invoice_items`)
- `apps/api/handler/income_category_handler.go:132-142` — pola handler `Delete`
- `apps/api/utility/error.go:27-37` — `NewConflictError` (409) & `NewUnprocessableError` (422)
- `apps/api/cmd/api/main.go:745-760` — grup route `invoices`
- `apps/api/service/manual_invoice_service_test.go` — fixture & helper dari Task 1 (dipakai ulang)

## Step 2: Implementation Checklist

### 2a. DTO
- [ ] `UpdateInvoiceRequest{ Notes string; DueDate string \`validate:"omitempty,dateonly"\` }`

### 2b. Repository (`invoice_repository.go`)
- [ ] `Delete(id uint) error` — soft delete (`r.db.Delete(&model.Invoice{}, id)`)
- [ ] `UpdateNotesAndDueDate(id uint, notes string, dueDate *time.Time) error` — satu statement `Updates(map[string]any{...})` agar atomik; `dueDate == nil` menulis NULL

### 2c. Service (`invoice_service.go`)
- [ ] `Delete(id uint) error`:
  1. `FindByID` → 404 bila `gorm.ErrRecordNotFound`
  2. Guard type → `utility.NewConflictError(...)`
  3. Guard `PaidAmount != 0` → 409
  4. Guard `paymentRepo.FindByInvoiceID(id)` → 409
  5. Transaksi: `itemRepo.WithTx(tx).DeleteByInvoiceID(id)` lalu `invoiceRepo.WithTx(tx).Delete(id)`
- [ ] `Update(id uint, req dto.UpdateInvoiceRequest) (*dto.InvoiceDetailResponse, error)`:
  1. `FindByID` → 404
  2. Bila `Type == "arrears"` dan `strings.TrimSpace(req.Notes) == ""` → 422
  3. Parse `req.DueDate` bila tidak kosong (`utility.ParseDate`); gagal → 422
  4. `invoiceRepo.UpdateNotesAndDueDate(...)`
  5. Muat ulang & `mapInvoiceToDetailResponse`

### 2d. Handler + Route
- [ ] Handler `Update` & `Delete` mengikuti pola existing (`c.Bind` → `c.Validate` → service → `utility.GetErrorStatusAndCode`)
- [ ] Anotasi Swagger lengkap untuk keduanya (`@Router /v1/invoices/{id} [put]` dan `[delete]`)
- [ ] `invoices.PUT("/:id", invoiceHandler.Update)` dan `invoices.DELETE("/:id", invoiceHandler.Delete)`

## Step 3: Tests

Tambahkan ke `service/manual_invoice_service_test.go` (pakai helper Task 1 yang sudah ada).

| Test | Yang diverifikasi |
|---|---|
| `TestDeleteInvoice_Success` | invoice `arrears` tanpa pembayaran → terhapus (soft); item ikut terhapus sehingga tidak bisa dibayar |
| `TestDeleteInvoice_GeneratedType_Rejected` | `type=monthly` → 409 |
| `TestDeleteInvoice_AlreadyPaid_Rejected` | `paid_amount > 0` → 409 |
| `TestDeleteInvoice_HasPaymentItem_Rejected` | ada `payment_item` walau `paid_amount = 0` → 409 |
| `TestDeleteInvoice_NotFound` | id tidak ada → 404 |
| `TestUpdateInvoice_NotesAndDueDate_Success` | `notes` & `due_date` berubah; `total_amount`/`paid_amount`/`status`/items tidak berubah |
| `TestUpdateInvoice_ClearDueDate` | `due_date: ""` → NULL |
| `TestUpdateInvoice_Arrears_EmptyNotes_Rejected` | `type=arrears`, `notes` kosong → 422 |
| `TestUpdateInvoice_NotFound` | id tidak ada → 404 |

## Step 4: Verification

- [ ] `go test ./...` di `apps/api` hijau, tidak ada regresi
- [ ] `go build ./...` sukses
- [ ] `go vet ./...` bersih; `gofmt -l` bersih untuk file yang disentuh
- [ ] Regenerasi Swagger dengan flag yang benar (lihat Catatan Implementasi Task 1):
  `swag init -g cmd/api/main.go -o docs --parseInternal --parseDependency`
  → diff harus **murni aditif**
- [ ] `DELETE /v1/invoices/:id` pada invoice `monthly` → 409; pada invoice manual tanpa pembayaran → sukses
- [ ] `GET /v1/students/:id` → `financial_summary.total_unpaid` turun setelah invoice tunggakan dihapus

## Success Criteria

- [x] `DELETE /v1/invoices/:id` menolak dengan 409 untuk invoice hasil generate, invoice yang sudah dibayar, dan invoice yang punya `payment_item`
- [x] `DELETE /v1/invoices/:id` melakukan soft delete invoice **dan** itemnya dalam satu transaksi
- [x] `PUT /v1/invoices/:id` hanya menyentuh `notes` & `due_date` (item/total/status tidak berubah)
- [x] `PUT` menolak `notes` kosong untuk `type=arrears` (422)
- [x] Kedua route ter-guard `RequireModule(ModuleKeuangan)` dan terdokumentasi di Swagger
- [x] Seluruh test di Step 3 lulus
- [x] `go build ./...` sukses, `go vet` bersih, pre-commit hooks passing
- [ ] Verifikasi HTTP end-to-end — **belum dijalankan** (butuh server + PostgreSQL), sama seperti Task 1

## Catatan Implementasi

### Temuan yang perlu diketahui task berikutnya

1. **`SumUnpaidByStudent` tidak bisa diuji di sqlite.** Method ini memakai `monthlyVisibilityCond` yang berisi SQL khusus PostgreSQL (`make_date(...)::int`, `date_trunc`), sehingga gagal dengan `unrecognized token: ":"` di sqlite. Karena itu assertion "total tunggakan turun" diganti dengan `FindByStudentID(..., showAll=true)` yang sqlite-safe; **verifikasi `financial_summary.total_unpaid` dipindahkan ke tahap HTTP/e2e** (butuh PostgreSQL). Ini juga berlaku untuk test repo lain yang menyentuh invoice bulanan.
2. **Mapper memetakan `notes` kosong menjadi `nil`.** `mapInvoiceToDetailResponse` hanya set `resp.Notes` bila `inv.Notes != ""` — jadi setelah mengosongkan keterangan, response berisi `notes: null`, bukan `""`. Frontend (Task 3) harus memperlakukan `null` dan `""` sama.
3. **`PUT` sengaja tanpa guard `type`.** Sesuai R.6 yang hanya membatasi field. Satu-satunya validasi kontekstual adalah `notes` wajib untuk `type=arrears`.

### Verifikasi yang sudah dijalankan

- `go build ./...` — OK
- `go vet ./...` — bersih
- `go test ./...` — `api/repository` & `api/service` hijau (11 test baru: 5 DELETE + 6 UPDATE)
- `gofmt -l` pada file yang disentuh — bersih
- Regenerasi Swagger dengan `--parseInternal --parseDependency` — **864 penambahan, 0 penghapusan**; `PUT /v1/invoices/{id}` & `DELETE /v1/invoices/{id}` muncul di spec

### Verifikasi yang BELUM dijalankan

- Verifikasi HTTP end-to-end (status 404/409/422 nyata, binding body) — butuh server + PostgreSQL.
- `financial_summary.total_unpaid` turun setelah tunggakan dihapus — butuh PostgreSQL (lihat temuan #1).
