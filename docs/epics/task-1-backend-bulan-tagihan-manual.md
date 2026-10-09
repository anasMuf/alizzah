# Task 1: Backend — Bulan pada Invoice Manual (`type=manual`)

> **Epic:** [Bulan Tagihan pada Mode "Tagihan Berjalan"](./tagihan-berjalan-pilih-bulan.md)
> **Status:** Done (backend)
> **Priority:** P1 (fondasi — task frontend bergantung pada kontrak API ini)

---

## Goal

`POST /v1/invoices` menerima & memvalidasi `month`/`year` untuk `type=manual`, lalu
menyimpannya ke `invoices.month`/`invoices.year` dengan aturan **wajib + harus dalam
rentang tahun ajaran terpilih**. `type=arrears` tetap menyimpan NULL (tanpa perubahan).

**Setelah task ini selesai, bulan tagihan berjalan bisa dibuat & diverifikasi lewat
API/Swagger — belum ada UI (task frontend menyusul).**

## Dependencies

- Epic requirements **R.2, R.3, R.4, R.5, R.6**
- Tidak ada task prasyarat (task pertama; mengubah lingkup `CreateManual` yang sudah ada).

## Files to Modify

| File | Operasi |
|------|---------|
| `apps/api/dto/invoice.go` | **Ubah** — tambah `Month`/`Year` di `CreateInvoiceRequest` |
| `apps/api/service/invoice_mode.go` | **Ubah** — helper validasi rentang bulan TA |
| `apps/api/service/invoice_service.go` | **Ubah** — validasi + isi `Month`/`Year` di `CreateManual` |
| `apps/api/service/manual_invoice_service_test.go` | **Ubah** — tambah/harmonkan test |
| `apps/api/docs/**` | **Regenerasi** — `swag init` (lihat catatan) |

Tidak perlu model baru, tabel baru, atau migrasi.

## Step 1: Study Existing Code

- `apps/api/dto/invoice.go:99-122` — `CreateInvoiceItemRequest` & `CreateInvoiceRequest`.
- `apps/api/service/invoice_service.go:168-260` — `CreateManual` (titik penyisipan validasi & pengisian).
- `apps/api/service/invoice_mode.go:20-31` — pola `invoiceModeViolation` (helper + pesan 422).
- `apps/api/model/academic_year.go:7-13` — `StartDate`/`EndDate` (`time.Time`).
- `apps/api/utility/error.go` — `NewUnprocessableError` (422), `NewNotFoundError` (404).
- `apps/api/service/manual_invoice_service_test.go` — pola test service (sqlite in-memory,
  `SetMaxOpenConns(1)`, `AutoMigrate`, testify).

## Step 2: Implementation Checklist

### 2a. DTO (`dto/invoice.go`)

- [ ] Tambah pada `CreateInvoiceRequest` (opsional di DTO; wajib secara bisnis untuk `manual`):
  ```go
  Month *uint `json:"month" validate:"omitempty,min=1,max=12"`
  Year  *uint `json:"year"  validate:"omitempty"`
  ```
- [ ] **Jangan** ubah `CreateInvoiceItemRequest` (bulan tidak per item — anti-pattern §7).

### 2b. Helper rentang (`service/invoice_mode.go`)

- [ ] Tambah helper murni (diuji langsung, tanpa DB):
  ```go
  // monthInAcademicYearRange mengembalikan true bila (month, year) jatuh di antara
  // start & end (pembanding berbasis bulan, inklusif).
  func monthInAcademicYearRange(month, year uint, start, end time.Time) bool
  ```
  Implementasi: bandingkan `year*12 + (month-1)` dengan `start.Year()*12+int(start.Month())-1`
  dan `end.Year()*12+int(end.Month())-1` (inklusif). Tidak bergantung zona hari.
- [ ] Pesan penolakan disamakan dengan redaksi klien (pola yang sama dengan `invoiceModeViolation`).

### 2c. Service (`service/invoice_service.go` — `CreateManual`)

- [ ] Setelah `ay, err := s.ayRepo.FindByID(...)` (L192) & validasi mode, tambah blok untuk `type == "manual"`:
  - `req.Month == nil || req.Year == nil` → `utility.NewUnprocessableError("Bulan tagihan wajib diisi")`
  - `!monthInAcademicYearRange(*req.Month, *req.Year, ay.StartDate, ay.EndDate)` →
    `utility.NewUnprocessableError("Bulan tagihan di luar rentang tahun ajaran")`
- [ ] Isi `model.Invoice` (L251) dengan periode **hanya** untuk `manual`:
  ```go
  var month, year *uint
  if req.Type == "manual" {
      month, year = req.Month, req.Year
  }
  // ... invoice := &model.Invoice{ ..., Month: month, Year: year, ... }
  ```
- [ ] Pastikan `arrears` **selalu** menyimpan NULL (R.5) — mengabaikan `req.Month`/`req.Year`.
- [ ] `InvoiceDetailResponse` sudah memuat `Month`/`Year` — tidak ada perubahan respons.

### 2d. Dokumentasi API

- [ ] Regenerasi Swagger dengan perintah yang **benar** (lihat catatan Task 1 lama):
  ```
  swag init -g cmd/api/main.go -o docs --parseInternal --parseDependency
  ```
- [ ] Verifikasi diff murni aditif & `dto.CreateInvoiceRequest` memuat `month`/`year`.

## Step 3: Tests (TDD)

Ada di `apps/api/service/manual_invoice_service_test.go` (package `service`). ⚠️ Nama helper
harus unik di package.

**Harmonkan test lama:**
- [ ] `TestCreateManual_Manual_MultipleItems_Success` — tambahkan `Month`/`Year` valid
  pada request agar tetap lulus (jika tidak, kini ditolak 422).

**Test case baru:**

| Test | Yang diverifikasi |
|---|---|
| `TestCreateManual_Manual_WithoutMonth_Rejected` | `type=manual` tanpa `month`/`year` → 422 |
| `TestCreateManual_Manual_MonthOutsideAcademicYear_Rejected` | bulan di luar rentang TA → 422 |
| `TestCreateManual_Manual_StoresMonthYear` | bulan valid → `invoice.Month`/`Month`/`Year` tersimpan sesuai |
| `TestCreateManual_Arrears_IgnoresMonthYear` | `type=arrears` yang mengirim `month`/`year` → tetap NULL di DB |
| `TestMonthInAcademicYearRange` | matriks kasus batas: dalam, sebelum, sesudah, batas start/end (table-driven, tanpa DB) |

- [ ] Batas rentang yang diuji termasuk **bulan start** dan **bulan end TA** (inklusif).
- [ ] Gunakan fixture AY yang ada (`setupManualInvoiceTestDB`) — jangan bangun dari nol bila bisa diadaptasi.

## Step 4: Verification

- [ ] `go test ./service/... -run 'CreateManual|MonthInAcademicYearRange' -v` lulus.
- [ ] `go test ./...` di `apps/api` tidak ada regresi.
- [ ] `go build ./...` di `apps/api` sukses.
- [ ] `POST /v1/invoices` `type=manual` + `month`/`year` valid → **201**; respons & baris DB memuat `month`/`year`.
- [ ] `POST /v1/invoices` `type=manual` tanpa bulan → **422** ("Bulan tagihan wajib diisi").
- [ ] `POST /v1/invoices` `type=manual` bulan di luar rentang TA → **422**.
- [ ] `POST /v1/invoices` `type=arrears` (mengirim `month`/`year`) → **201**, `month`/`year` NULL.
- [ ] `GET /v1/invoices/:id` menampilkan `month`/`year` untuk invoice manual baru.
- [ ] Diff Swagger murni aditif & memuat `month`/`year`.

## Success Criteria

- [x] `month`/`year` tersimpan di `invoices` untuk `type=manual`; NULL untuk `arrears`.
- [x] Server menolak `manual` tanpa bulan & bulan di luar rentang TA (422).
- [x] Unit test (happy path + seluruh jalur penolakan + helper rentang) lulus.
- [x] `go build ./...` sukses; `go vet`/`gofmt` bersih untuk file yang disentuh.
- [x] Spec Swagger memuat `month`/`year` (patch manual — lihat Catatan Implementasi).

## Catatan Implementasi

### Temuan yang wajib diketahui task berikutnya

1. **`swag init` sedang GAGAL total di repo ini (pre-existing, di luar scope).**
   Perintah yang dianjurkan (`swag init -g cmd/api/main.go -o docs --parseInternal --parseDependency`)
   keluar dengan `exit 1`:
   ```
   ParseComment error in file .../internal/modules/sdm/publik/handler.go ...
   cannot find type definition: penggajian.SlipResponse
   ```
   Karena error ini, swag **tidak menulis** file output (mtime `docs/swagger.json` tidak berubah).
   Spec di repo memang sudah stale sebelum perubahan ini — `/v1/public/slip/detail` tidak ada
   di `docs/swagger.json`, padahal endpoint-nya ada di kode.
   **Konsekuensi:** `month`/`year` ditambahkan **manual** ke `docs/swagger.json`,
   `docs/swagger.yaml`, dan `docs/docs.go`, persis format yang akan dihasilkan swag
   (`type: integer`), sehingga Orval bisa membaca `dtoCreateInvoiceRequest` yang baru.
   Patch ini **tidak berbahaya** — bila swag diperbaiki nanti, regenerasi akan
   mereproduksi field yang sama.
   **Tindak lanjut di luar epic ini:** perbaiki komentar `@Success` di
   `internal/modules/sdm/publik/handler.go` (rujukan `penggajian.SlipResponse`) agar swag
   bisa jalan lagi.
2. **Urutan validasi: mode dulu, baru bulan.** Bulan diperiksa setelah `invoiceModeViolation`
   supaya kombinasi mode-vs-TA yang tidak sah tetap melaporkan masalah mode
   (test `TestCreateManual_ModeCheckedBeforeItemContent` tetap hijau, dan test penolakan
   mode lama tidak perlu diubah).
3. **`arrears` mengabaikan bulan di server.** Meski klien mengirim `month`/`year`, `arrears`
   tetap disimpan NULL (test `TestCreateManual_Arrears_IgnoresMonthYear`). Tag DTO memakai
   `omitempty` sehingga `arrears` tanpa bulan tetap valid.

### Verifikasi yang sudah dijalankan

- `go build ./...` — OK
- `go vet ./...` — bersih; `gofmt -l` pada file yang disentuh — bersih
- `go test ./...` (apps/api) — hijau (termasuk 5 test baru bulan + 2 subtest tag validasi)
- `python3 -m json.tool docs/swagger.json` — JSON valid
- Definisi `dto.CreateInvoiceRequest` di ketiga artefak docs memuat `month` & `year` (integer)

### Verifikasi yang BELUM dijalankan

- **`swag init` nyata** — diblokir error pre-existing modul SDM (lihat temuan #1).
- **HTTP end-to-end** (`201/404/422` nyata via server + PostgreSQL) — butuh server berjalan; belum dijalankan.
- **Regenerasi Orval** (`pnpm generate:api`) — bagian task frontend (Task 2).

## Catatan

- **Perintah Swagger yang benar** (dari Temuan Task 1 sebelumnya) — **saat ini gagal, lihat Catatan Implementasi #1**:
  `swag init -g cmd/api/main.go -o docs --parseInternal --parseDependency`
  (tanpa flag `--parseInternal --parseDependency`, nama definisi `internal/modules/koperasi/*`
  berubah dan menghasilkan diff besar tak relevan).
- Orval client (`apps/dashboard/src/api/**`) akan **regenerasi setelah Swagger**, tetapi
  itu bagian task frontend — task ini cukup sampai Swagger.
