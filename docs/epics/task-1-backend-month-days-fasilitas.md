# Task 1: Backend — Endpoint `month-days` (0 ⇄ N) + Skip/Unskip Fasilitas + `month_excluded`

> **Epic:** [input-hari-0-fasilitas-antar-jemput.md](./input-hari-0-fasilitas-antar-jemput.md)
> **Status:** Ready

## Goal

Admin dapat menyimpan **0 hari** untuk sebuah pendaftaran fasilitas pada bulan tertentu lewat satu endpoint atomik: bulan itu menjadi **ter-skip** (item fasilitas unpaid dihapus dari invoice + dicatat di `billing_month_exclusions`), dan menyimpan `N >= 1` memulihkan item dengan `N` hari. Ditambah penanda `month_excluded` agar UI tahu baris mana yang ter-skip.

Belum ada perubahan frontend, dan **belum** ada perubahan perilaku pada endpoint quantity generik (itu Task 2).

## Implementation

1. Pelajari pola yang ditiru:
   - Endpoint per-bulan fasilitas yang sudah ada: `apps/api/handler/facility_handler.go` (`SetMonthZone`), `apps/api/service/facility_service.go` (`SetMonthZone`), route di `apps/api/cmd/api/main.go:643-644`
   - Mesin skip: `apps/api/service/billing_exclusion_service.go:112-206` (`SetExclusions`) + `invoice_generate_service.go:1131-1177` (`RemoveFacilityItemFromMonthly`) & `:1179-1208` (`RestoreFacilityItemToMonthly`)
   - Pola mencari item fasilitas pada invoice: `apps/api/service/facility_service.go:657-678` (`GetCurrentMonthDays`) & `:872-895` (`GetStudentsByFacility`)
   - Pola test: `apps/api/service/billing_exclusion_service_test.go`, `billing_exclusion_invoice_test.go`, `facility_month_zone_test.go`

2. Tulis test lebih dulu (TDD), lalu implementasi.

3. Checklist file:
   - [ ] `apps/api/dto/facility.go` — `UpdateFacilityMonthDaysRequest`, `FacilityMonthDaysResponse`, field `Excluded` pada `FacilityCurrentMonthDaysResponse`, field `MonthExcluded` pada `FacilityStudentItemResponse`
   - [ ] `apps/api/service/billing_exclusion_service.go` — `SkipFacilityMonth` + `UnskipFacilityMonth` (interface + impl, memakai `SetExclusions`)
   - [ ] `apps/api/service/facility_service.go` — `SetMonthDays` (orkestrasi) + isi `MonthExcluded` & `Excluded`
   - [ ] `apps/api/handler/facility_handler.go` — handler `SetMonthDays` + komentar swagger
   - [ ] `apps/api/cmd/api/main.go` — reorder konstruksi service + daftarkan route
   - [ ] `apps/api/service/facility_month_days_test.go` (baru) — unit test perilaku

## Detail

### 1. DTO (`dto/facility.go`)

```go
// UpdateFacilityMonthDaysRequest — set jumlah hari (kuantitas item fasilitas
// per_day) untuk SATU bulan. Days = 0 berarti bulan itu di-skip (tidak ditagih).
type UpdateFacilityMonthDaysRequest struct {
    Month uint  `json:"month" validate:"required,min=1,max=12"`
    Year  uint  `json:"year" validate:"required,min=2000,max=2100"`
    // Pointer agar "field tidak dikirim" (nil) ditolak, bukan dianggap 0.
    Days  *uint `json:"days" validate:"required,min=0,max=31"`
}

// FacilityMonthDaysResponse — hasil operasi.
type FacilityMonthDaysResponse struct {
    Month         uint  `json:"month"`
    Year          uint  `json:"year"`
    Days          uint  `json:"days"`            // 0 bila ter-skip
    Excluded      bool  `json:"excluded"`        // true = bulan di-skip
    InvoiceID     *uint `json:"invoice_id,omitempty"`
    InvoiceItemID *uint `json:"invoice_item_id,omitempty"`
    ItemPaid      bool  `json:"item_paid"`
}
```

Tambahan pada response yang sudah ada:
- `FacilityCurrentMonthDaysResponse` (bulan berjalan, `:50-56`) → `Excluded bool \`json:"excluded"\``
- `FacilityStudentItemResponse` (`:71-92`) → `MonthExcluded bool \`json:"month_excluded"\``

### 2. `BillingExclusionService` — dua helper tipis

Tambah ke interface + impl (`billing_exclusion_service.go`). Keduanya **memakai ulang `SetExclusions`** agar logika diff/apply tidak diduplikasi:

```go
// SkipFacilityMonth menandai satu bulan sebagai skip untuk sebuah fasilitas
// (idempotent): bulan ditambahkan ke daftar exclusion berjalan → item unpaid
// bulan tsb dihapus oleh SetExclusions.
SkipFacilityMonth(studentID, facilityID, month, year uint) error

// UnskipFacilityMonth mencabut skip satu bulan untuk sebuah fasilitas
// (idempotent): bulan dibuang dari daftar berjalan → item dipulihkan.
UnskipFacilityMonth(studentID, facilityID, month, year uint) error
```

Pola implementasi (keduanya sama, beda arah):

1. `old, err := s.exclRepo.FindByStudentAndEntity(studentID, "facility", facilityID)`
2. Susun daftar bulan baru (tambah/buang `{month, year}`; dedupe).
3. `s.SetExclusions(studentID, "facility", facilityID, dto.SetBillingExclusionsRequest{Months: months})`

Catatan: `SetExclusions` memvalidasi bulan terhadap tahun ajaran **aktif** (`ayRepo.FindActive()`) — sama seperti dialog "Kelola Bulan" yang ada. Bila bulan di luar tahun ajaran aktif, biarkan error-nya mengalir (`422`) tanpa menulis apa pun.

### 3. `studentFacilityService.SetMonthDays`

Tambah ke interface + impl. Dependensi baru pada struct: `invoiceSvc service.InvoiceService` dan `exclSvc service.BillingExclusionService` (keduanya di-inject di `main.go`; lihat §4). Tambahkan juga ke `NewStudentFacilityService(...)`.

Algoritma:

1. `sf, err := s.sfRepo.FindByID(sfID)`; pastikan `sf.StudentID == studentID` → `facilityID = sf.FacilityID`, `month/year` dari request, `days = *req.Days`.
2. Bila `req.Days == nil` → error validasi (defensif bila dipanggil dari test/internal).
3. Cari invoice bulan tsb (`invoiceRepo.FindMonthlyByStudent`) dan item fasilitasnya (cocokkan `FacilityID`; fallback nama via `facilityItemNameMatches` seperti `GetCurrentMonthDays:660-678`).
4. **Guard wajib sebelum skip**: bila item ditemukan dan `item.PaidAmount > 0` → `errors.New("Item fasilitas bulan ini sudah ada pembayaran — tidak bisa di-nol-kan. Selesaikan lewat penyesuaian pembayaran (kasir).")` dan **tidak menulis exclusion apa pun**. (Alasan: `RemoveFacilityItemFromMonthly:1159` melewati item berbayar secara silent.)
5. `days == 0` → `s.exclSvc.SkipFacilityMonth(studentID, facilityID, month, year)`.
6. `days >= 1`:
   - `s.exclSvc.UnskipFacilityMonth(studentID, facilityID, month, year)` (aman dipanggil walau tidak ada exclusion)
   - Ambil ulang invoice + item fasilitas. Bila **tidak ada** item → `errors.New("Belum ada tagihan fasilitas untuk bulan ini")`.
   - Bila jumlah hari item ≠ `days` → `s.invoiceSvc.UpdateItemQuantity(invoice.ID, item.ID, dto.UpdateInvoiceItemQuantityRequest{Quantity: days})` (reuse guard & perhitungan yang ada; untuk Task 1 nilai `>= 1` sehingga DTO lama masih cocok — **Task 2 akan mengubah `Quantity` menjadi `*uint`**, sesuaikan call site ini saat itu).
7. Susun respons: buka ulang `invoiceRepo`/`invoiceItemRepo` + `exclRepo.Exists(studentID, "facility", facilityID, month, year)` → isi `Days`, `Excluded`, `InvoiceID`, `InvoiceItemID`, `ItemPaid`.

Error message yang dipakai handler: pesan `$3c` epic. Handler memetakan error "sudah ada pembayaran" ke `422 UNPROCESSABLE_ENTITY` (pola `invoice_handler.go:360-373`), sisanya mengikuti `utility.GetErrorStatusAndCode`.

### 4. Wiring (`cmd/api/main.go`)

- Pindahkan konstruksi `billingExclusionService` ke **setelah** `invoiceGenService` (`:347`) dan **sebelum** `sfService` (`:536`) — dependensinya (`db`, `billingExclusionRepo`, `ayRepo`, `invoiceGenService`) sudah tersedia di titik itu. Handler `billingExclusionHandler` bisa tetap dibuat di tempat lama.
- `NewStudentFacilityService(...)` tambah argumen `invoiceService` (sudah dibuat di `:361`) dan `billingExclusionService`.
- Route baru, mengikuti pola `month-zone` (`:643-644`):

```go
students.PUT("/:id/facilities/:facilityId/month-days", facilityHandler.SetMonthDays, guard.RequireModule(middleware.ModuleAdministrasi))
```

### 5. `GetStudentsByFacility` & `GetCurrentMonthDays`

- `GetStudentsByFacility` (`:855-899`): per baris isi `item.MonthExcluded = exists(studentID, "facility", sf.FacilityID, curMonth, curYear)` memakai `s.exclRepo.Exists(...)`. Query per baris konsisten dengan pola yang sudah ada di fungsi ini (sudah query invoice + item per baris).
- `GetCurrentMonthDays` (`:630-708`): isi `Excluded` dengan cara yang sama; bila bulan ter-skip, `InvoiceItemID`/`InvoiceID` tetap dikembalikan (item mungkin tidak ada → nil) dan `CurrentDays` = 0.

### 6. Test (baru: `apps/api/service/facility_month_days_test.go`)

Pakai fixture existing (`setupBillingExclusionInvoiceTestDB`, `seedExclusionInvoiceFixture`, `addFacilityInvoiceItem`, `newTestInvoiceGen`).

- [ ] `days = 0` → item fasilitas bulan itu hilang (0 baris), `invoice.total_amount` turun, 1 baris `billing_month_exclusions` untuk bulan tsb
- [ ] `days = 0` dipanggil dua kali → idempotent (tetap 1 baris exclusion, tidak error)
- [ ] `days = 0` saat belum ada invoice bulan itu → exclusion tetap tercatat, tidak error
- [ ] `days = 20` pada bulan ter-skip → exclusion hilang, item kembali dengan `quantity 20` & nominal `unit_price × 20`, total invoice terhitung ulang
- [ ] `days = 0` pada item dengan `paid_amount > 0` → error, exclusion **tidak** tersimpan, item tidak berubah (jumlah & nominal & paid_amount)
- [ ] `days = 20` pada bulan yang tidak punya item & tidak ter-skip → error
- [ ] `req.Days == nil` → error
- [ ] `GenerateMonthly` untuk bulan ter-skip → tidak menambah item fasilitas (regression check epic skip)
- [ ] `GetStudentsByFacility(month, year)` → `month_excluded` true untuk bulan ter-skip, false untuk bulan lain
- [ ] `GetCurrentMonthDays` untuk bulan ter-skip → `Excluded true`, `CurrentDays 0`

## Success Criteria

- [ ] Seluruh test di §6 lulus (`go test ./...` di `apps/api/service`)
- [ ] `go build ./...` & `go vet ./...` di `apps/api` sukses
- [ ] Tidak ada migrasi/kolom/tabel baru; tidak ada perubahan pada logika status invoice, pembayaran, dan kategori non-fasilitas
- [ ] Tidak ada perubahan perilaku pada endpoint `quantity` generik (masih `min=1` — perubahan ada di Task 2)
- [ ] Pre-commit hooks passing
