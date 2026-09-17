# Task 10: Penegakan Mode-vs-Tahun Ajaran di Backend

> **Epic:** [Tagihan Tunggakan (Backfill) + CRUD Tagihan Manual](./tagihan-tunggakan-backfill.md)
> **Status:** Done
> **Priority:** P2 (menutup celah integritas yang terbuka bagi pemanggil API langsung)
> **Amendemen:** melengkapi **Task 9**; mengubah edge case §4 epik dan menambah **R.13**

---

## Goal

Aturan "mode tagihan ditentukan mutlak oleh tahun ajaran" yang sebelumnya hanya
ditegakkan di klien (Task 9) kini juga ditegakkan di server, sehingga pemanggil API
langsung tidak dapat membuat kombinasi yang tidak sah.

## Dependencies

- **Task 9 selesai** — aturan UI + `modeAvailability` di `manual-invoice.ts`.
- **Task 1 selesai** — `POST /v1/invoices` menerima kedua type.

## Masalah yang Diselesaikan

Task 9 secara sadar hanya menegakkan aturan di UI (baris 54 dokumennya: *"Tidak ada
perubahan backend... server tetap menerima kedua type"*). Verifikasi e2e
[T1](./verifikasi-e2e-tagihan-tunggakan.md) membuktikan konsekuensinya: `arrears`
untuk TA aktif dan `manual` untuk TA lampau keduanya diterima dengan **HTTP 201**.

Dampaknya nyata untuk integritas data keuangan: skrip, migrasi, atau klien lain
dapat menyisipkan tunggakan ke TA aktif (mengaburkan laporan TA berjalan) atau
tagihan rinci ke TA lampau (itemnya tidak berasal dari tarif TA itu). Validasi klien
adalah kenyamanan, bukan jaminan.

## Aturan Final

Cermin dari `modeAvailability` di klien — tabelnya sama persis:

| `type` | Syarat | Pesan penolakan (422) |
|---|---|---|
| `manual` (rinci) | TA = TA aktif **dan** punya ≥1 item tarif aktif | `"Mode rinci hanya untuk tahun ajaran aktif."` / `"Tahun ajaran ini belum punya item tarif aktif."` |
| `arrears` (total) | TA **bukan** TA aktif | `"Tahun ajaran aktif memakai mode rinci sesuai tarif."` |

Redaksi pesan sengaja **disamakan persis** dengan string di `manual-invoice.ts`
supaya UI dan API tidak pernah memberi penjelasan berbeda untuk kombinasi yang sama.

## Files to Modify

| File | Operasi |
|------|---------|
| `apps/api/repository/fee_config_item_repository.go` | **Ubah** — `CountActiveItemsByAcademicYear` |
| `apps/api/service/invoice_mode.go` | **Baru** — helper murni `invoiceModeViolation` |
| `apps/api/service/invoice_service.go` | **Ubah** — `feeItemRepo` + penegakan di `CreateManual` |
| `apps/api/cmd/api/main.go` | **Ubah** — teruskan `fcItemRepo` |
| `apps/api/service/manual_invoice_service_test.go` | **Ubah** — fixture 2 TA + 5 test baru |
| `apps/api/service/facility_month_days_test.go` | **Ubah** — penyesuaian konstruktor |

## Detail Implementasi

### 1. Definisi "punya tarif" harus identik klien-server

`FeeConfigRepository.FindByAcademicYearID` meng-`Preload("Items")` **tanpa** filter
`is_active`, sedangkan klien membaca `FindAll` yang hanya memuat item aktif. Memakai
method itu apa adanya akan membuat server melihat tarif yang tidak dilihat klien —
persis ketidakcocokan yang ingin dihilangkan. Karena itu ditambah method khusus:

```go
CountActiveItemsByAcademicYear(academicYearID uint) (int64, error)
```

Join eksplisit ke `fee_configs` (AY tidak tersimpan di item), mengecualikan
`fee_configs.deleted_at IS NOT NULL` secara manual (GORM hanya menerapkan filter
soft-delete pada tabel utama query), dan menyaring `is_active = true`.

### 2. Pemeriksaan TA aktif tanpa query tambahan

`CreateManual` sudah memuat `s.ayRepo.FindByID(req.AcademicYearID)` tetapi membuang
hasilnya. Nilai itu kini ditangkap dan `ay.IsActive` dipakai langsung — nol query
tambahan untuk bagian TA. Query tarif hanya dijalankan untuk `type=manual`.

### 3. Urutan validasi

Penegakan diletakkan **setelah** pemeriksaan siswa & keberadaan TA, tetapi
**sebelum** validasi isian item. Konsekuensinya 404 (siswa/TA tidak ada) tetap
menang, sementara state basi dengan mode tidak sah dilaporkan sebagai masalah mode —
bukan masalah nominal. Ini mengikuti R.4c di klien.

### 4. Klien tidak berubah

`ManualInvoiceForm` sudah menampilkan `ApiError.message` lewat toast, jadi 422 dari
server tampil dengan redaksi yang sama tanpa perubahan frontend.

## Step 3: Tests

Fixture `seedManualInvoiceFixture` dirombak: semula menyeed **satu** TA dengan
`IsActive: true` lalu membuat `arrears` di atasnya — di bawah penegakan baru itu
tidak sah. Sekarang fixture menyeed **dua** TA:

- `ActiveAcademicYear` — `is_active=true`, dengan `FeeConfig` + 1 item tarif aktif →
  satu-satunya TA yang sah untuk `manual`.
- `PastAcademicYear` — `is_active=false`, tanpa tarif → rumah `arrears`.

`AutoMigrate` test ditambah `FeeConfig` + `FeeConfigItem`. Seluruh pemakaian
`fx.AcademicYear` dipindah menjadi eksplisit (`fx.PastAcademicYear` /
`fx.ActiveAcademicYear`) agar pembaca test tidak perlu menebak TA mana yang sah.

Test baru:

| Test | Cakupan |
|---|---|
| `TestInvoiceModeViolation` | tabel 5 kombinasi (manual×{aktif/tidak}×{tarif/tidak}, arrears×{aktif/tidak}); penolakan selalu punya alasan; sebab menyebut "item tarif" / "aktif" |
| `TestCreateManual_Arrears_OnActiveYear_Rejected` | 422 + tidak ada invoice tersimpan |
| `TestCreateManual_Manual_OnPastYear_Rejected` | 422 |
| `TestCreateManual_Manual_ActiveYearWithoutTariff_Rejected` | 422 (TA aktif tanpa item tarif aktif) |
| `TestCreateManual_ModeCheckedBeforeItemContent` | mode diperiksa sebelum isian item |

## Step 4: Verification

- [x] `go build ./...` — sukses
- [x] `go vet ./...` — bersih
- [x] `go test ./...` — `api/repository` & `api/service` lulus
- [x] Verifikasi HTTP nyata terhadap binary HEAD di atas salinan database
      (`alizzah_e2e`) — 8/8 asersi:
  - `manual` di TA aktif bertarif → **201** (alur sah tetap jalan)
  - `arrears` di TA lampau → **201** (alur sah tetap jalan)
  - `arrears` di TA aktif → **422**, pesan *"Tahun ajaran aktif memakai mode rinci sesuai tarif."*
  - `manual` di TA lampau → **422**, pesan *"Mode rinci hanya untuk tahun ajaran aktif."*
- [x] Query agregat diverifikasi langsung di PostgreSQL: `CountActiveItemsByAcademicYear(3)`
      = 66 (unit test memakai sqlite, jadi SQL-nya dipastikan benar di Postgres)
- [x] Data dev diperiksa: TA aktif (id 3) punya 66 item tarif aktif; TA 1–2 tanpa fee
      config → alur sah pengguna tidak terblokir oleh perubahan ini
- [x] Swagger tidak berubah (tidak ada endpoint/DTO baru)

## Success Criteria

- [x] `arrears` untuk TA aktif ditolak server dengan 422
- [x] `manual` untuk TA non-aktif ditolak server dengan 422
- [x] `manual` untuk TA aktif **tanpa** item tarif aktif ditolak server dengan 422
- [x] `manual` untuk TA aktif bertarif dan `arrears` untuk TA lampau tetap 201
- [x] Pesan penolakan identik dengan redaksi klien
- [x] Semua test backend lulus; tidak ada test lama yang cakupannya hilang
- [x] Tidak ada perubahan frontend

## Catatan Implementasi

### 1. Ini pengetatan kontrak, dicatat sebagai amendemen

Baris 54 Task 9 (*"Tidak ada perubahan backend... server tetap menerima kedua type"*)
kini tidak lagi benar. Amendemennya dicatat eksplisit di epik (§4 edge case, §5 R.13,
§7 anti-pattern, §9 Q10) dan di dokumen Task 9 — bukan diedit diam-diam.

### 2. Risiko operasional yang diterima

Saat TA baru diaktifkan tetapi tarifnya belum dibuat, **seluruh** pencatatan tagihan
terblokir di level API — `arrears` ditolak karena TA aktif, `manual` ditolak karena
tanpa tarif. Sebelumnya ini hanya kondisi UI; sekarang menjadi keras di server.
Urutan operasional **"aktifkan TA → buat tarif"** jadi wajib. Ini konsekuensi yang
sudah diterima pada Q10/3C (TA tanpa tarif diblokir total), kini ditegakkan di server.

### 3. Tidak ada feature flag

Sengaja tanpa flag: klien sudah mencegah kombinasi tidak sah, dan seeder menulis
langsung via GORM (bukan lewat service), sehingga risiko regresi rendah sementara
flag menambah jalur yang harus diuji. Bila perlu dibalik tanpa deploy, perubahan ini
terlokalisasi pada satu blok di `CreateManual` + satu helper murni.

## Yang Tidak Dikerjakan (Backlog)

- **Validasi bahwa item rinci benar-benar berasal dari tarif.** `CreateInvoiceItemRequest`
  tidak punya `fee_config_item_id`, sehingga server belum bisa memverifikasi asal item
  maupun level/gender-nya. Ini gap integritas yang lebih besar dari mode-vs-TA dan
  butuh perubahan DTO (mungkin skema) tersendiri.
- ~~**`POST /v1/invoices/:id/items`** belum menjaga aturan "`arrears` harus tepat 1 item"~~ —
  **DIKERJAKAN di [Task 15](./task-15-tindak-lanjut-review.md).** Semua endpoint mutasi
  item (`AddItem`, `UpdateItem`, `UpdateItemQuantity`, `DeleteItem`) kini menolak
  tagihan tunggakan dengan 409, jadi invarian satu item tidak lagi bocor lewat
  jalur itu.
