# Task 1: Backend — Refactor Helper + Dry-Run Preview (Ekstrakurikuler & Daycare)

> **Epic:** [UI Sync-Invoices dengan Preview](./ui-sync-invoices-dengan-preview.md)
> **Status:** Ready
> **Priority:** P2 (foundation — semua task lain bergantung pada ini)

---

## Goal

Backend mampu menghitung **apa yang akan dilakukan sync** tanpa menulis DB: `feeItemsToAddForMonth` (helper bersama), `PlanExtracurricularSync`, `PlanDaycareSync`, plus DTO preview + unit test. **Setelah task ini selesai, preview bisa dipanggil via service (belum ada endpoint/handler/UI — task berikutnya).**

## Dependencies

- Epic requirements R.1–R.4 (terutama R.3 anti-duplikasi & R.4 read-only)

## Files to Modify

| File | Operasi |
|------|---------|
| `apps/api/service/invoice_generate_service.go` | Refactor `addExtracurricularItemToMonthly` + `PlanExtracurricularSync` + `PlanDaycareSync` + interface |
| `apps/api/dto/sync_preview.go` | **Baru** — DTO preview |
| `apps/api/service/sync_preview_test.go` | **Baru** — unit test |

## Step 1: Study Existing Code

- `apps/api/service/invoice_generate_service.go:794-838` — `addExtracurricularItemToMonthly` (sumber logika yang akan diekstrak)
- `apps/api/service/invoice_generate_service.go:900-932` — `SyncExtracurricularMonthlyInvoices` (pola loop SE aktif; preview meniru tanpa menulis)
- `apps/api/service/invoice_generate_service.go:1846-1875` — `SyncDaycareMonthlyInvoices` (pola loop daycare; premium/regular)
- `apps/api/service/invoice_generate_service.go:16-46` — interface `InvoiceGenerateService` (tambah 2 method)
- `apps/api/repository/daycare_enrollment_repository.go:84-88` — `FindAllActive` sudah `Preload("Student")`
- `apps/api/repository/student_extracurricular_repository.go` — `FindAllActiveByAcademicYear` (preload Student, dibuktikan `ExportByAcademicYear`)

## Step 2: Implementation Checklist

### 2a. Refactor — `feeItemsToAddForMonth` (inti anti-duplikasi)
- [ ] Ekstrak dari `addExtracurricularItemToMonthly` bagian filter menjadi helper:
  ```go
  func (s *invoiceGenerateService) feeItemsToAddForMonth(
      invoiceID, month, year uint, level string, feeItems []model.FeeConfigItem,
  ) []model.FeeConfigItem
  ```
- [ ] Filter: (1) `existingKeys` dari item invoice (name+category), (2) level cocok (`all` atau sama), (3) `StartMonth` nil atau `month >= *StartMonth`
- [ ] `addExtracurricularItemToMonthly` memakai helper, lalu CREATE item hasil filter + `recalculateInvoiceTotal` — **perilaku identik dengan sebelumnya**

### 2b. DTO (`dto/sync_preview.go`)
- [ ] `MonthYearBrief { month uint; year uint }` (perhatikan: `utility.MonthYear` sudah ada — cek ulang, jangan duplikasi)
- [ ] `ExtracurricularPreviewItem { student_id, student_name, extracurricular_id, extracurricular_name, months_to_add: [], skipped_excluded, skipped_exists, skipped_no_invoice uint }`
- [ ] `ExtracurricularPreviewResponse { total_enrollments int; items []ExtracurricularPreviewItem }`
- [ ] `DaycarePreviewItem { student_id, student_name, category, will_sync bool, reason string }`
- [ ] `DaycarePreviewResponse { total_enrollments int; items []DaycarePreviewItem }`

### 2c. `PlanExtracurricularSync() (*dto.ExtracurricularPreviewResponse, error)`
- [ ] Ambil tahun ajaran aktif (`acRepo.FindActive`) — bila tidak ada, return response kosong (bukan error fatal? ikuti pola sync: `SyncExtracurricularMonthlyInvoices` error bila ay tidak ada — konsistenkan)
- [ ] `seRepo.FindAllActiveByAcademicYear(ay.ID)` → loop per SE
- [ ] Resolve fee items & level seperti `AddExtracurricularToMonthlyRange` (feeConfig + `FindByExtracurricular` + level dari enrollment)
- [ ] Iterasi `MonthRangeFromDate(se.StartDate, ay.EndDate)`; per bulan klasifikasi:
  - `isMonthExcluded` → `skipped_excluded++`
  - `FindMonthlyByStudent` gagal → `skipped_no_invoice++`
  - `feeItemsToAddForMonth` kosong → `skipped_exists++`
  - else → tambah ke `months_to_add`
- [ ] `student_name` dari `se.Student.FullName`
- [ ] **TIDAK ada pemanggilan yang menulis** (tidak `Create`, tidak `Delete`, tidak `recalculate`)

### 2d. `PlanDaycareSync() (*dto.DaycarePreviewResponse, error)`
- [ ] `daycareRepo.FindAllActive()` → loop per enrollment
- [ ] `category == "premium"` → `will_sync=true`, `reason="Item bulanan akan disinkronkan"`
- [ ] else → `will_sync=false`, `reason="Kategori regular dilewati"`
- [ ] `student_name` dari `de.Student.FullName` (sudah Preload)
- [ ] **TIDAK memanggil `InjectPremiumDaycareToMonthlyInvoices`**

### 2e. Interface (`invoice_generate_service.go:16-46`)
- [ ] Tambah `PlanExtracurricularSync()` dan `PlanDaycareSync()` ke interface `InvoiceGenerateService`

## Step 3: Verification

- [ ] `go build ./...` sukses
- [ ] `go vet ./...` sukses
- [ ] Unit test lulus (lihat bawah)
- [ ] Snapshot test: panggil `PlanExtracurricularSync` & `PlanDaycareSync` → `SELECT` semua invoice + invoice_items sebelum/sesudah → **identik** (bukti read-only, R.4)

## Success Criteria

- [ ] `feeItemsToAddForMonth` diekstrak & dipakai `addExtracurricularItemToMonthly` tanpa perubahan perilaku (test existing `TestRestoreExtracurricularItemToMonthly` dkk masih hijau)
- [ ] `PlanExtracurricularSync` mengklasifikasikan bulan (add/excluded/exists/no_invoice) dengan benar
- [ ] `PlanDaycareSync` premium → will_sync, regular → dilewati
- [ ] Preview read-only: snapshot invoice identik sebelum & sesudah preview
- [ ] `go build`, `go vet`, `go test ./...` sukses
- [ ] Pre-commit hooks passing
