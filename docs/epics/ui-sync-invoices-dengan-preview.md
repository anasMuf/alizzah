# Epic: UI Sync-Invoices dengan Preview (Ekstrakurikuler & Daycare)

> **Status:** Ready
> **Priority:** P2

---

## 1. Ringkasan Masalah

Prinsip proyek (keputusan user): **tidak boleh ada API tanpa UI**. Dua endpoint recovery yang sudah ada tidak punya UI sama sekali:

- `POST /v1/extracurriculars/sync-invoices` — backfill item PASTA ke invoice bulanan semua enrollment aktif
- `POST /v1/daycare-enrollments/sync-invoices` — sinkronisasi invoice daycare

Selain itu, aksi sync bersifat **global dan menulis data** — admin sebaiknya bisa melihat **preview** ("apa yang akan terjadi") sebelum menjalankan, bukan hanya menebak hasilnya. Fitur ini: UI untuk kedua endpoint sync + dialog preview dry-run sebelum eksekusi.

Bonus: dengan kode PR #161, sync ekstrakurikuler menghormati billing exclusions (bulan yang di-skip tidak disentuh) — preview sekaligus menjadi alat verifikasi fitur skip tagihan bulanan.

## 2. Temuan Codebase (State Saat Ini)

| File | Kondisi |
|------|---------|
| `apps/api/service/invoice_generate_service.go:900-932` | `SyncExtracurricularMonthlyInvoices` — loop SE aktif → `AddExtracurricularToMonthlyRange` (menulis) |
| `apps/api/service/invoice_generate_service.go:1846-1875` | `SyncDaycareMonthlyInvoices` — loop daycare aktif; premium → `InjectPremiumDaycareToMonthlyInvoices`; regular → skip |
| `apps/api/service/invoice_generate_service.go:794-838` | `addExtracurricularItemToMonthly` — berisi logika filter (existing, level, startMonth) + CREATE + recalc; **sumber duplikasi** bila preview ditulis terpisah |
| `apps/api/repository/daycare_enrollment_repository.go:84-88` | `FindAllActive` — `Preload("Student")` → nama siswa tersedia |
| `apps/api/repository/student_extracurricular_repository.go` | `FindAllActiveByAcademicYear` — preload Student (dipakai `ExportByAcademicYear`) |
| `apps/api/cmd/api/main.go:648-664` | Route sync existing: `extracurriculars.POST("/sync-invoices")`, `daycare.POST("/sync-invoices")` |
| `apps/dashboard/src/routes/_authenticated/administrasi/ekskul/index.tsx` | Halaman daftar PASTA — header tempat tombol sync |
| `apps/dashboard/src/routes/_authenticated/administrasi/daycare/index.tsx:284-295` | Tab Pendaftaran — header sudah punya tombol "Generate SPD Bulanan" (tempat tombol "Sync Invoice") |
| `apps/dashboard/src/api/endpoints/...` | Hook Orval `usePostV1ExtracurricularsSyncInvoices` & `usePostV1DaycareEnrollmentsSyncInvoices` sudah ada |

## 3. Desain Solusi

### 3a. Backend — Refactor Anti-Duplikasi

Ekstrak inti logika dari `addExtracurricularItemToMonthly` menjadi helper read-only:

```go
// feeItemsToAddForMonth — memfilter feeItems yang AKAN dibuat untuk bulan ini
// (existing key, level, startMonth) TANPA menulis. Dipakai oleh
// addExtracurricularItemToMonthly (apply) DAN preview (dry-run).
func (s *invoiceGenerateService) feeItemsToAddForMonth(
	invoiceID, month, year uint, level string, feeItems []model.FeeConfigItem,
) []model.FeeConfigItem
```

`addExtracurricularItemToMonthly` → panggil helper, buat item hasil filter, recalc. Perilaku identik.

### 3b. Backend — Dry-Run (Preview)

**`PlanExtracurricularSync() (*dto.ExtracurricularPreviewResponse, error)`** — iterasi SE aktif (seperti sync), per enrollment klasifikasi tiap bulan dalam rentang `startDate..ay.EndDate`:

| Status | Kondisi |
|--------|---------|
| `months_to_add` | `feeItemsToAddForMonth` mengembalikan ≥1 item |
| `skipped_excluded` | bulan di-skip (billing exclusions) |
| `skipped_exists` | item sudah ada di invoice |
| `skipped_no_invoice` | invoice bulan belum ada |

Response per item: `student_name`, `extracurricular_name`, `months_to_add: [{month, year}]`, jumlah tiap skip.

**`PlanDaycareSync() (*dto.DaycarePreviewResponse, error)`** — loop daycare aktif, per enrollment: `premium` → `will_sync=true, reason="item bulanan akan disinkronkan"`; `regular` → `will_sync=false, reason="kategori regular dilewati"`. Detail item-level tidak diperlukan.

**Keduanya MURNI read-only — tidak boleh menulis DB.**

### 3c. Backend — Endpoint & DTO

```
POST /v1/extracurriculars/preview-sync-invoices
POST /v1/daycare-enrollments/preview-sync-invoices
```

- DTO: `ExtracurricularPreviewResponse` (`total_enrollments`, `items[]`), `DaycarePreviewResponse` (`total_enrollments`, `items[]`)
- Handler + route mengikuti pola sync existing (POST, `ModuleAdministrasi`)
- Swagger di-regenerate

### 3d. Frontend — Dialog "Preview Sinkronisasi"

Tombol di header halaman yang sudah ada:
- **"Sinkronkan Tagihan"** — `administrasi/ekskul/index.tsx`
- **"Sync Invoice"** — `administrasi/daycare/index.tsx` (tab Pendaftaran, sebelah "Generate SPD Bulanan")

Alur dialog (komponen bersama `SyncPreviewDialog`):

1. Buka dialog → panggil `preview-sync-invoices` → loading
2. Tampilkan: ringkasan (X enrollment, Y bulan akan ditambah, Z dilewati) + tabel per siswa (nama, daftar/jumlah bulan yang akan ditambah, alasan skip)
3. **"Jalankan Sinkronisasi"** (disabled bila tidak ada perubahan) → panggil sync endpoint → toast hasil (`X dari Y diproses, Z dilewati`; tampilkan error pertama bila ada) → invalidate query invoice
4. **"Batal"** — tidak terjadi apa-apa

Hook preview ditulis manual mengikuti pola `invoice-quantity.ts` (atau via `generate:api` bila Orval di-regenerate).

## 4. Edge Cases

- Preview dipanggil saat tidak ada enrollment aktif → `items` kosong, tombol "Jalankan" disabled
- Preview TIDAK mengubah DB (verifikasi via test: snapshot invoice sebelum/ sesudah preview identik)
- Error pada sebagian enrollment → `errors[]` di respons preview/sync; UI menampilkan pesan pertama
- Sync masih bisa error walau preview sukses (data berubah di antara keduanya) → toast error dari sync
- Daycare regular → dilewati (perilaku sync existing dipertahankan, hanya sekarang terlihat di preview)
- Bulan yang di-skip (billing exclusions) muncul sebagai `skipped_excluded` di preview — transparan untuk fitur skip

## 5. Requirements (IMMUTABLE)

- R.1: Endpoint preview ekstrakurikuler (dry-run, read-only) mengembalikan per-enrollment: bulan yang akan ditambah + rincian skip (excluded / sudah ada / invoice belum ada).
- R.2: Endpoint preview daycare (dry-run, read-only) mengembalikan per-enrollment: premium = akan diproses, regular = dilewati, dengan nama siswa.
- R.3: Logika "item yang akan ditambah" dihitung via helper bersama `feeItemsToAddForMonth` yang dipakai oleh `addExtracurricularItemToMonthly` (apply) DAN preview — TANPA duplikasi.
- R.4: Preview tidak boleh menulis DB.
- R.5: UI: tombol sync (ekstrakurikuler & daycare) membuka dialog preview → ringkasan + tabel detail → "Jalankan" (disabled bila tidak ada perubahan) → panggil sync → toast hasil + invalidate.
- R.6: Semua endpoint (sync lama + preview baru) punya UI — prinsip "tidak ada API tanpa UI".
- R.7: Handler/route mengikuti pola sync existing (POST, `ModuleAdministrasi`); swagger di-regenerate.

## 6. Success Criteria (MUST ALL BE TRUE)

- [ ] Unit test: `feeItemsToAddForMonth` memfilter dengan benar (existing key, level, startMonth)
- [ ] Unit test: `PlanExtracurricularSync` mengklasifikasikan bulan (add/excluded/exists/no_invoice) dan **tidak mengubah invoice** (snapshot identik)
- [ ] Unit test: `PlanDaycareSync` premium → will_sync, regular → dilewati
- [ ] `go build ./...`, `go vet ./...`, `go test ./...` sukses
- [ ] `tsc --noEmit`, `biome check`, `vite build` sukses
- [ ] UI: dialog menampilkan preview (ringkasan + tabel); "Jalankan" → toast hasil; tidak ada perubahan → tombol disabled
- [ ] Pre-commit hooks passing

## 7. Anti-Patterns (FORBIDDEN)

- ❌ NO preview yang menulis DB (R.4 — dry-run wajib read-only; uji snapshot di test)
- ❌ NO duplikasi logika filter item (R.3 — wajib `feeItemsToAddForMonth`)
- ❌ NO endpoint baru tanpa UI (R.6 — prinsip user)
- ❌ NO menambahkan detail item-level pada preview daycare (cukup per-enrollment; YAGNI)
- ❌ NO mengubah perilaku sync existing (hanya menambah preview; sync tetap seperti sekarang)

## 8. Scope Boundaries

**In scope:**
- Backend: refactor `feeItemsToAddForMonth`, `PlanExtracurricularSync`, `PlanDaycareSync`, DTO, handler, routes, swagger
- Frontend: dialog preview + tombol sync di halaman ekskul & daycare

**Out of scope (deferred/never):**
- Audit menyeluruh "endpoint vs UI" untuk seluruh API — task terpisah bila diminta
- `POST /v1/daycare-enrollments/generate-monthly` (per siswa) — perlu dicek UI-nya di task terpisah
- Facility sync (tidak ada endpoint sync fasilitas saat ini)
- Perbaikan `is_mandatory` hardcoded — epic terpisah

## 9. Design Discovery

### Key Decisions Made

| Pertanyaan | Jawaban | Implikasi |
|------------|---------|-----------|
| Prinsip "API tanpa UI" | Berlaku untuk semua endpoint | UI untuk sync-invoices ekstrakurikuler & daycare |
| Preview sebelum aksi | Ya, dry-run | Endpoint preview read-only + dialog preview |
| Granularitas preview ekstrakurikuler | Per-bulan per enrollment | Detail months_to_add + alasan skip |
| Granularitas preview daycare | Per-enrollment | premium/regular, tanpa detail item |
| Anti-duplikasi | Helper bersama `feeItemsToAddForMonth` | Refactor `addExtracurricularItemToMonthly` tanpa ubah perilaku |

### Open Concerns Raised

- "Bagaimana implementasinya?" → Ekstraksi helper + dry-run compute + dialog 2-tahap (preview → jalankan)
- Preview vs eksekusi bisa tidak sinkron (data berubah di antara) → toast error dari sync tetap ditampilkan
