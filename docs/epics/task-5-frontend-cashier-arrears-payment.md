# Task 5: Frontend — Section "Tunggakan Tahun Ajaran Lain" di Kasir + Label TA Asal

> **Epic:** [Tagihan Tunggakan (Backfill) + CRUD Tagihan Manual](./tagihan-tunggakan-backfill.md)
> **Status:** Done (frontend)
> **Priority:** P1 (inti dari keputusan Q2=A — membuat tunggakan benar-benar bisa dibayar)

---

## Goal

Kasir dapat **membayar tunggakan dari tahun ajaran lampau** dalam satu transaksi bersama tagihan tahun ajaran aktif, dengan uang masuk ke **periode berjalan**. Ditutup dengan label tahun ajaran asal di ringkasan pembayaran dan struk, agar jejaknya jelas.

## Dependencies

- **Task 4 selesai** — logika murni `outstanding-invoices.ts` sudah ada dan dipakai ulang di sini.
- Epic requirements **R.8, R.9**.

## Files to Modify

| File | Operasi |
|------|---------|
| `apps/dashboard/src/routes/_authenticated/keuangan/pembayaran/components/-InvoiceSelector.tsx` | **Ubah** — query lintas-TA, section tunggakan, label `arrears`/`manual`, auto-select |
| `apps/dashboard/src/routes/_authenticated/keuangan/pembayaran/components/-PaymentSummary.tsx` | **Ubah** — label TA asal per baris |
| `apps/dashboard/src/routes/_authenticated/keuangan/pembayaran/$id.tsx` | **Ubah** — label TA asal di struk (tampilan + cetak) |

**Tidak ada perubahan backend.**

## Mengapa tidak butuh perubahan backend

Sudah diverifikasi di Task 1 dan dikonfirmasi ulang di sini:

- `Repository.Invoice.FindByStudentID` melewati filter TA bila `academic_year_id` dikosongkan → daftar tunggakan TA lain didapat dari endpoint yang sama, tanpa param TA.
- `Repository.Invoice.FindByIDs` (dipakai `invoices/batch`) **tidak** punya filter TA → memilih invoice dari TA lampau otomatis memuat itemnya untuk dialokasikan.
- `payment_service` **tidak** memvalidasi kesamaan TA antara invoice dan pembayaran.
- `baru.tsx:438` mengirim `academic_year_id: activeAy?.id || 1` — **TA aktif**, terlepas dari TA invoice yang dipilih. Jadi R.9 berlaku apa adanya: kas dan brangkas tercatat di periode berjalan.

## Perilaku

| Aspek | Perilaku |
|---|---|
| Section | Muncul di bawah daftar tagihan TA aktif, hanya bila ada tunggakan TA lain |
| Isi | Semua tagihan belum lunas dari TA selain TA aktif, termasuk `monthly` lama (Q8=A) |
| Penanda | Nama item/keterangan + **"TA \<nama\>"** dalam blok beraksen amber |
| Interaksi | Checkbox yang mengalir ke `selectedInvoices` yang sama → item dimuat via `invoices/batch` → alokasi per item seperti biasa |
| Alokasi | Tidak ada jalur baru — memakai mekanisme `payAmounts`/`excludedItems` yang sudah ada |
| Ringkasan | Baris item yang berasal dari TA lain diberi keterangan "Tunggakan TA \<nama\>" |
| Struk | Baris rincian menampilkan "TA \<nama\>" untuk item dari TA lain, di tampilan **dan** versi cetak |
| Auto-select | `invoice_id` awal dicari di **kedua** daftar, sehingga tautan "Catat Pembayaran" dari detail tagihan TA lampau tetap berfungsi |

## Step 1: Study Existing Code

- `-InvoiceSelector.tsx:60-117` — query AY-scoped + `unpaidInvoices`/`paidInvoices` + auto-select + batch
- `-InvoiceSelector.tsx:119-163` — derivasi `invoiceItems` (titik penyuntikan `origin_academic_year_name`)
- `-InvoiceSelector.tsx:370-403` — render checkbox tagihan
- `-PaymentSummary.tsx:71-87` — baris item ringkasan
- `pembayaran/$id.tsx:71-185` — builder HTML cetak; `:355-366` — rincian di layar
- `#/features/keuangan/outstanding-invoices.ts` — logika murni dari Task 4

## Step 2: Implementation Checklist

- [x] Query kedua tanpa `academic_year_id` + `otherYearOutstandingInvoices(...)` (reuse Task 4)
- [x] Section checkbox ber-aksen amber dengan label TA asal dan sisa tagihan
- [x] Label `arrears` → "Tunggakan", `manual` → "Manual" pada ternary tipe di baris tagihan TA aktif (R.11)
- [x] Auto-select mencari di kedua daftar
- [x] `origin_academic_year_name` disuntikkan ke `invoiceItems` **hanya** bila TA invoice ≠ TA aktif
- [x] `-PaymentSummary.tsx` menampilkan "Tunggakan TA \<nama\>" bila field itu ada
- [x] `$id.tsx` mengambil TA asal via `useGetV1InvoicesBatch(invoiceIds)` lalu menampilkannya di rincian layar + cetak
- [x] `key={idx}` → `key={item.id}` pada rincian struk (menghilangkan warning `noArrayIndexKey`)

## Step 3: Verification

- [x] `pnpm test` hijau — 43 test (Task 3 + Task 4; tidak ada test baru karena task ini murni integrasi UI)
- [x] `npx tsc --noEmit` bersih
- [x] `npx biome check src` — total warning turun dari 72 → **71**; tidak ada diagnostik baru
- [x] `pnpm build` sukses
- [ ] Verifikasi browser: mencentang tunggakan TA lampau, submit, lalu cek struk & kas periode berjalan — **belum dijalankan**

## Success Criteria

- [x] Tunggakan TA lain tampil di kasir dengan penanda TA asal
- [x] Dapat dicentang dan dialokasikan bersama tagihan TA aktif, termasuk dalam satu transaksi
- [x] Pembayaran tetap dicatat dengan `academic_year_id` = TA aktif (R.9), **tanpa** perubahan kode di `baru.tsx`
- [x] Ringkasan & struk menandai baris yang berasal dari TA lain
- [x] Tidak ada perubahan backend
- [ ] Verifikasi browser end-to-end — belum dijalankan

## Catatan Implementasi

### 1. `PaymentItemResponse` tidak membawa tahun ajaran

`dto.PaymentItemResponse` (`apps/api/dto/payment.go:80-89`) hanya punya `invoice_id`, `invoice_month`, `invoice_year` — **tidak ada** tahun ajaran. Karena itu struk mendapatkan TA asal lewat satu request tambahan di frontend: `useGetV1InvoicesBatch(invoiceIds)` lalu memetakan `invoice_id → academic_year.name`.

**Alternatif yang dipertimbangkan:** menambah `invoice_academic_year_name` di `PaymentItemResponse` (backend) + regenerasi Swagger + client. Lebih benar secara arsitektur (data tersedia di kontrak API, tanpa request tambahan), tetapi menambah perubahan backend + regenerasi client yang sensitif (lihat Catatan Implementasi Task 3 #1).

> **Follow-up (Task 8 di epik):** saat client Orval di-regenerate penuh, pindahkan label ini ke field API.

### 2. Warning `useExhaustiveDependencies` di `-InvoiceSelector.tsx` sengaja dibiarkan

Biome mengingatkan `payAmounts` belum masuk dependency `useMemo` derivasi `invoiceItems`. **Terverifikasi pre-existing**: versi `HEAD` sudah memakai `payAmounts` di dalam memo dengan deps `[invoiceDetails]` saja. Menambahkannya mengubah semantik recomputasi kode yang sudah berjalan dan tidak bisa saya verifikasi di browser — jadi tidak disentuh (scope discipline).

### 3. Label TA asal hanya untuk item dari TA lain

`origin_academic_year_name` diisi **hanya** bila `detail.academic_year.id !== academicYearId`. Baris tagihan tahun berjalan tidak diberi label yang tidak perlu, sehingga penandanya otomatis berarti "ini dari tahun ajaran lain".

### Verifikasi yang BELUM dijalankan

- Verifikasi browser end-to-end: mencentang tunggakan TA lampau → total ikut terhitung → submit → struk menampilkan TA asal → kas periode berjalan bertambah. Butuh server + PostgreSQL + data tunggakan TA lampau.
