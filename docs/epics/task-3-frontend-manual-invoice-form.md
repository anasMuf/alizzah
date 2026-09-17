# Task 3: Frontend — Form Adaptif "Tambah Tagihan" di 2 Entry Point

> **Epic:** [Tagihan Tunggakan (Backfill) + CRUD Tagihan Manual](./tagihan-tunggakan-backfill.md)
> **Status:** Done (frontend)
> **Priority:** P1

---

## Goal

Admin dapat mencatat tagihan manual / tunggakan langsung dari UI: **satu form adaptif** yang otomatis berubah bentuk sesuai kecocokan tahun ajaran, dapat dibuka dari **daftar Tagihan** dan dari **detail siswa**. Serta client API untuk 3 endpoint backend (Task 1 & 2) dan label `arrears`/`manual` di seluruh tampilan tagihan.

## Dependencies

- **Task 1 & 2 selesai** — `POST`/`PUT`/`DELETE /v1/invoices` sudah ada dan spec Swagger sudah diperbarui.

## Files to Modify

| File | Operasi |
|------|---------|
| `apps/dashboard/src/api/endpoints/invoices/invoices.ts` | **Ubah** — 3 hook baru (hasil generate Orval) |
| `apps/dashboard/src/api/model/dtoCreate*Invoice*.ts`, `dtoUpdateInvoiceRequest.ts`, `postV1Invoices201.ts`, `putV1InvoicesId200.ts` | **Baru** — tipe hasil generate |
| `apps/dashboard/src/api/model/index.ts` | **Ubah** — 6 export barrel |
| `apps/dashboard/src/features/keuangan/manual-invoice.ts` | **Baru** — logika murni (mode, filter tarif, validasi, payload) |
| `apps/dashboard/src/features/keuangan/manual-invoice.test.ts` | **Baru** — 28 unit test (vitest) |
| `apps/dashboard/src/features/keuangan/components/ManualInvoiceForm.tsx` | **Baru** — komponen form |
| `apps/dashboard/src/routes/_authenticated/keuangan/tagihan/index.tsx` | **Ubah** — tombol "+ Tambah Tagihan", opsi filter `manual`/`arrears`, render form |
| `apps/dashboard/src/routes/_authenticated/keuangan/tagihan/siswa.$id.tsx`, `tagihan/$id.tsx` | **Ubah** — label `arrears`/`manual` pada `translateType` |
| `apps/dashboard/src/routes/_authenticated/administrasi/siswa/$id/keuangan.tsx` | **Ubah** — tombol "Catat Tunggakan" + render form (siswa terkunci) |

## Perilaku Form

| Aspek | Perilaku |
|---|---|
| Mode | `itemized` (type `manual`) dan `total` (type `arrears`) |
| Mode default | TA terpilih = TA aktif → `itemized`; TA lain → `total` |
| Escape hatch | Mode dapat diubah admin kapan saja; pilihan manual bertahan sampai TA diubah |
| Mode total | Banner penjelasan + `CurrencyInput` nominal + `Keterangan` **wajib** |
| Mode rinci | Dropdown item tarif (difilter level/gender siswa, dikelompokkan per kategori) + kuantitas untuk unit `per_day`/`per_monday` + daftar item + total otomatis |
| Jatuh tempo | Opsional, kedua mode |
| Total | **Tidak pernah dikirim** — dibuat dari item, dihitung server |
| Invalidasi | `["/v1/invoices"]` dan `["/v1/students"]` (agar kartu "Total Tunggakan" tidak basi) |

## Step 1: Study Existing Code

- `src/routes/_authenticated/keuangan/tagihan/$id.tsx:98-167` — pola fetch fee config + filter level/gender + hitung amount per unit
- `src/features/administrasi/components/AcademicYearForm.tsx` — pola `SlideOver` + `useState` + mutation + toast + invalidate
- `src/routes/_authenticated/keuangan/pembayaran/components/-StudentSearch.tsx` — pemilih siswa (dipakai ulang)
- `src/components/molecules/SlideOver.tsx`, `CurrencyFormField.tsx`, `FormField.tsx`
- `src/store/global.ts` — `academicYearAtom`

## Step 2: Implementation Checklist

### 2a. Client API (hasil Orval — **dipangkas, lihat Catatan Implementasi #1**)
- [x] `usePostV1Invoices`, `usePutV1InvoicesId`, `useDeleteV1InvoicesId` + tipe `DtoCreateInvoiceRequest`, `DtoCreateInvoiceItemRequest`, `DtoCreateInvoiceRequestType`, `DtoUpdateInvoiceRequest`
- [x] Export barrel `src/api/model/index.ts`

### 2b. Logika murni (`manual-invoice.ts`)
- [x] `defaultManualInvoiceMode(isActiveAcademicYear)`
- [x] `manualInvoiceType(mode)` — `itemized` → `manual`, `total` → `arrears`
- [x] `filterFeeItemsForStudent(items, level, gender)` — `all`/kosong selalu cocok
- [x] `isQuantityBasedUnit`, `feeItemUnitLabel`, `calculateFeeItemAmount`
- [x] `sumDraftAmounts`, `validateManualInvoice`, `arrearsItemName`
- [x] `buildCreateInvoicePayload` — **tidak pernah** mengirim `total_amount`

### 2c. Komponen (`ManualInvoiceForm.tsx`)
- [x] `SlideOver` ukuran `lg`, footer Batal/Simpan, guard double-submit (`useRef`)
- [x] Pemilih siswa (terkunci bila dibuka dari detail siswa) + pilihan tahun ajaran
- [x] Kontrol mode eksplisit (2 tombol) yang ter-set otomatis dari TA
- [x] Mode rinci: dropdown tarif ber-`optgroup`, kuantitas kondisional, daftar item (dengan `key` stabil, bukan index), total
- [x] Mode total: banner + `CurrencyInput` + keterangan wajib
- [x] Reset seluruh isian saat panel dibuka; item rinci di-reset saat siswa berganti

### 2d. Entry point & label
- [x] Tombol "+ Tambah Tagihan" di header daftar Tagihan
- [x] Opsi filter `manual` & `arrears` di "Jenis Tagihan"
- [x] Tombol "Catat Tunggakan" di kartu Total Tunggakan (detail siswa), form terkunci ke siswa tsb
- [x] Label `arrears` → "Tunggakan", `manual` → "Manual" di 3 `translateType`

## Step 3: Tests

- [x] `src/features/keuangan/manual-invoice.test.ts` — **28 test** (vitest, tanpa DOM)

| Kelompok | Cakupan |
|---|---|
| `defaultManualInvoiceMode` | TA aktif → rinci; TA lain → total |
| `manualInvoiceType` | pemetaan mode → type backend |
| `filterFeeItemsForStudent` | level/gender cocok; `all`/kosong selalu cocok |
| `calculateFeeItemAmount` | flat vs `per_day` vs `per_monday`; kuantitas 0 |
| `validateManualInvoice` | semua jalur penolakan + jalur valid |
| `buildCreateInvoicePayload` | type, 1 item `arrears`, nama item, `due_date` kondisional, trim, `quantity`/`unit_price` kondisional, **tidak ada `total_amount`** |

## Step 4: Verification

- [x] `pnpm test` hijau (28 test)
- [x] `npx tsc --noEmit` bersih
- [x] `npx biome check src` — tidak ada error; **tidak ada diagnostik dari file yang disentuh**
- [x] `pnpm build` (vite build) sukses
- [ ] Verifikasi manual di browser (buka form dari 2 entry point, submit sungguhan) — **belum dijalankan**

## Success Criteria

- [x] Form "Tambah Tagihan" dapat dibuka dari daftar Tagihan dan dari detail siswa
- [x] Mode berpindah otomatis saat TA diubah dan dapat diubah manual
- [x] Total pada mode rinci terhitung otomatis dari item
- [x] `total_amount` tidak pernah dikirim client
- [x] Label `arrears`/`manual` tampil konsisten di 3 lokasi
- [x] Seluruh test lulus, typecheck bersih, build sukses
- [ ] Verifikasi browser end-to-end — belum dijalankan

## Catatan Implementasi

### 1. Client Orval **tidak** di-regenerate menyeluruh — hanya bagian yang relevan

`pnpm generate:api` berjalan sukses, tetapi menghasilkan diff di **seluruh** client (648 file): ternyata client yang ter-commit sudah **stale** terhadap `swagger.json` (mis. rename model koperasi `LaporanMonthlyReport` → `InternalModulesKoperasiLaporanMonthlyReport`, penambahan `dtoPaymentIntegrityResponse`, `dtoFacilityMonthDaysResponse`, `getV1ReportsIntegrityPayments200`, field `skipped` pada `dtoInvoiceItemResponse`). Semua itu **tidak terkait** tugas ini.

Yang dilakukan: regenerasi dijalankan, lalu **hanya** yang relevan dipertahankan — `invoices.ts` (terbukti murni aditif: +436, −0 dan hanya berisi 3 endpoint baru) + 6 file model baru + 6 baris export barrel. Sisa churn dikembalikan.

> **Temuan untuk ditindaklanjuti (di luar scope):** client API di repo ini tertinggal dari spec. Perlu satu perubahan tersendiri untuk regenerate penuh.
> Catatan teknis: output Orval memakai indentasi 2 spasi, sedangkan repo memakai tab — diff **wajib** dinormalisasi dengan `npx biome check --write src/api` (sama seperti lefthook) sebelum dinilai. Tanpa langkah itu, diff terlihat seperti 648 file berubah padahal hanya indentasi.

### 2. `tagihan/$id.tsx` **tidak** diubah untuk memakai logika baru

Epik menyebut "ekstraksi pemilih item tarif" dari `tagihan/$id.tsx:99-155`. Logikanya memang diekstrak menjadi fungsi murni di `manual-invoice.ts`, tetapi `$id.tsx` **tidak** direfaktor untuk mengonsumsinya: memverifikasi refaktor itu butuh aplikasi berjalan (tidak ada harness test UI di repo), sedangkan `$id.tsx` adalah file 1483 baris dengan warning pre-existing. Menyentuhnya tanpa bisa memverifikasi flow "Tambah Item" yang sudah ada berisiko regresi.

> **Follow-up:** satukan `$id.tsx` dengan `manual-invoice.ts` (dan `CATEGORY_LABELS` yang kini terduplikasi di 6+ file) dalam satu perubahan tersendiri yang bisa diverifikasi di browser.

### 3. `StudentSearch` diimpor dari folder privat route pembayaran

`ManualInvoiceForm` mengimpor `#/routes/_authenticated/keuangan/pembayaran/components/-StudentSearch` (prefix `-` membuatnya bukan route). Ini menghindari duplikasi ~90 baris, tetapi menciptakan impor lintas batas `features/` → `routes/`.

> **Follow-up:** pindahkan ke `src/components/molecules/StudentSearch.tsx` lalu pakai dari kedua tempat. Belum dilakukan karena berarti menyentuh route pembayaran yang tidak bisa diverifikasi di sini.

### 4. Opsi filter `manual`/`arrears` ditambahkan meski Task 3 fokus pada form

Ditambahkan karena `manual` invoice dibuat **di TA aktif**, jadi akan muncul di halaman daftar Tagihan dan perlu bisa difilter (epik §3e). `arrears` secara desain tidak muncul di halaman ini (dimiliki TA lampau) — opsinya tetap ditambahkan agar konsisten dengan `translateType`.

### 5. Gap: backend `DELETE`/`PUT` dari Task 2 belum punya UI

`DELETE` dan `PUT /v1/invoices/:id` sudah ada di backend, tetapi belum ada tombol hapus/edit metadata di `tagihan/$id.tsx`. Epik §10 belum memuat task untuk itu.

> **Follow-up yang disarankan:** "Task 3.5: aksi Hapus & Edit keterangan pada detail tagihan manual" — termasuk `ConfirmDialog` dan penanganan 409.

### Verifikasi yang BELUM dijalankan

- **Verifikasi browser end-to-end**: membuka form dari kedua entry point, perpindahan mode saat TA berubah, submit sungguhan ke API. Butuh server + PostgreSQL + browser. Ini gap terbesar yang tersisa untuk task ini.
