# Task 2: Frontend — Field "Bulan Tagihan" pada Mode Tagihan Berjalan

> **Epic:** [Bulan Tagihan pada Mode "Tagihan Berjalan"](./tagihan-berjalan-pilih-bulan.md)
> **Status:** Done
> **Priority:** P1 (melengkapi Task 1 — mengisi bulan di UI)

---

## Goal

Form **Tambah Tagihan** mode **"Tagihan Berjalan (rinci)"** punya pemilih **Bulan Tagihan**
yang wajib, berisi bulan-bulan dalam rentang TA terpilih, default bulan berjalan. Nilai
bulan ikut terkirim ke `POST /v1/invoices` (`month`/`year`) sehingga tagihan punya periode.

## Dependencies

- Epic requirements **R.1, R.2, R.3, R.4, R.7**
- **Task 1 (backend)** — kontrak API (`month`/`year` + validasi) sudah ada.

## Files to Modify

| File | Operasi |
|------|---------|
| `apps/dashboard/src/api/model/dtoCreateInvoiceRequest.ts` | **Ubah** — `month?`/`year?` |
| `apps/dashboard/src/components/molecules/BillingMonthsDialog.tsx` | **Ubah** — ekspor `MONTH_NAMES` |
| `apps/dashboard/src/features/keuangan/manual-invoice.ts` | **Ubah** — state, validasi, payload, helper default bulan |
| `apps/dashboard/src/features/keuangan/manual-invoice.test.ts` | **Ubah** — test baru |
| `apps/dashboard/src/features/keuangan/components/ManualInvoiceForm.tsx` | **Ubah** — state, efek default, UI select |

## Step 1: Study Existing Code

- `apps/dashboard/src/features/keuangan/manual-invoice.ts` — `ManualInvoiceFormState`,
  `validateManualInvoice`, `buildCreateInvoicePayload`.
- `apps/dashboard/src/features/keuangan/components/ManualInvoiceForm.tsx` — efek reset &
  mode, `selectedAy`, blok render `mode === "itemized"`.
- `apps/dashboard/src/components/molecules/BillingMonthsDialog.tsx` — `buildAcademicYearMonths`
  (sudah diekspor) & `MONTH_NAMES`.
- `DtoAcademicYearResponse` — punya `start_date`/`end_date`.

## Step 2: Implementation Checklist

### 2a. Orval client

- [ ] Tambah `month?: number;` & `year?: number;` pada `DtoCreateInvoiceRequest`
  **secara manual** (lihat Catatan Implementasi #1 — jangan jalankan `pnpm generate:api`
  penuh, karena client di repo stale terhadap `swagger.json`).

### 2b. Logika murni (`manual-invoice.ts`)

- [ ] `ManualInvoiceFormState` + `month?`/`year?`.
- [ ] Interface `YearMonth { month, year }` + helper murni `pickDefaultBillingMonth(months, now?)`:
  bulan berjalan bila ada di daftar, selain itu bulan pertama, `undefined` bila daftar kosong.
- [ ] `validateManualInvoice`: mode `itemized` wajib `month` & `year` →
  `"Bulan tagihan wajib dipilih"` (diperiksa setelah kesesuaian mode).
- [ ] `buildCreateInvoicePayload`: sertakan `month`/`year` **hanya** untuk mode `itemized`.

### 2c. Komponen (`ManualInvoiceForm.tsx`)

- [ ] State `month`/`year`; dikosongkan pada efek reset.
- [ ] `ayMonths = useMemo(() => buildAcademicYearMonths(selectedAy?.start_date, selectedAy?.end_date), [selectedAy])`.
- [ ] Efek default: `pickDefaultBillingMonth(ayMonths)` saat TA/mode berubah.
- [ ] `select` **Bulan Tagihan** hanya pada blok `mode === "itemized"`, opsi dari `ayMonths`
  dengan label `MONTH_NAMES[m-1]` + tahun.
- [ ] Sertakan `month`/`year` pada `formState` yang di-`validate` & di-payload.
- [ ] Ekspor `MONTH_NAMES` dari `BillingMonthsDialog.tsx` (reuse, jangan duplikasi).

## Step 3: Tests

- [ ] `itemizedState` diberi `month`/`year` valid.
- [ ] `validateManualInvoice` menolak mode rinci tanpa bulan.
- [ ] `buildCreateInvoicePayload`: rinci menyertakan bulan; total tidak mengirim bulan.
- [ ] `pickDefaultBillingMonth`: bulan berjalan di daftar, di luar rentang, daftar kosong.

## Step 4: Verification

- [x] `pnpm exec vitest run` (dashboard) — 95 test lulus.
- [x] `pnpm exec tsc --noEmit` — bersih.
- [x] `pnpm exec biome check` pada file yang disentuh — bersih.

## Success Criteria

- [x] Field "Bulan Tagihan" muncul pada mode rinci & tersembunyi pada mode tunggakan.
- [x] Opsi bulan hanya dari rentang TA terpilih; default bulan berjalan (fallback bulan pertama).
- [x] Payload mode rinci menyertakan `month`/`year`; mode total tidak.
- [x] Validasi klien menolak mode rinci tanpa bulan.
- [x] Test, typecheck, & lint lulus.

## Catatan Implementasi

### Temuan yang wajib diketahui

1. **JANGAN jalankan `pnpm generate:api` penuh untuk perubahan ini.** Client di repo
   sudah **stale** terhadap `apps/api/docs/swagger.json` (mis. endpoint zona-bulanan
   fasilitas & integrity payments ada di spec tapi belum pernah diregenerasi ke
   `src/api`). Menjalankan Orval menghasilkan **~580 file** berubah (juga karena output
   orval belum diformat biome → tab/kutip). Karena itu `dtoCreateInvoiceRequest.ts`
   diedit **manual** agar diff minimal & fokus. Bila suatu saat spec + client disinkronkan
   ulang secara menyeluruh, itu pekerjaan terpisah.

### Verifikasi yang BELUM dijalankan

- **Verifikasi browser end-to-end** (buka form, ganti TA, pilih bulan, submit) — butuh
  server API + PostgreSQL berjalan. Logika murni & type sudah tercakup test/typecheck.

### Tindak lanjut presentasi (opsi 2)

Menanggapi pertanyaan "kenapa `type` = `manual`, bukan `monthly`?": `type` **tetap `manual`**
(bukan `monthly`) — karena `monthly` berarti "tagihan hasil generate" dan mengubahnya akan
memicu `RegenerateForStudent` menghapus tagihan admin, guard CRUD menolak hapus/edit, aturan
visibility menyembunyikan bulan depan, serta query bulanan lain (lihat pembahasan di chat).
Sebagai gantinya, **presentasi** diperbaiki tanpa mengubah perilaku:

- `invoicePeriodOrTypeLabel` (`invoice-labels.ts`) kini menampilkan **"Berjalan M/YYYY"**
  untuk tagihan `manual` yang punya `month`/`year` (sebelumnya selalu "Manual").
- Kolom **Jenis** pada daftar tagihan tetap `invoiceTypeLabel` ("Manual") karena daftar
  sudah punya kolom **Bulan** terpisah (`Bulan M / YYYY`) — tidak diduplikasi.
- Filter **Bulan** pada daftar tagihan sudah mengenali tagihan manual berperiode sejak
  Task 1 (kolom `month`/`year` terisi).
