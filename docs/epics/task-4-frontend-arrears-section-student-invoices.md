# Task 4: Frontend — Section "Tunggakan Tahun Ajaran Lain" di Daftar Tagihan Siswa

> **Epic:** [Tagihan Tunggakan (Backfill) + CRUD Tagihan Manual](./tagihan-tunggakan-backfill.md)
> **Status:** Done (frontend)
> **Priority:** P1

---

## Goal

Tunggakan dari tahun ajaran sebelumnya **terlihat** saat admin membuka tagihan seorang siswa pada tahun ajaran aktif. Sebelumnya daftar tagihan difilter ke TA aktif saja, sehingga tunggakan TA lampau tidak pernah muncul meski sudah tercatat.

## Dependencies

- **Task 1 selesai** — invoice `arrears`/`manual` bisa dibuat.
- Epic requirement **R.8** (bagian daftar tagihan siswa).

## Files to Modify

| File | Operasi |
|------|---------|
| `apps/dashboard/src/features/keuangan/outstanding-invoices.ts` | **Baru** — logika murni (filter lintas-TA, sisa, keterangan) |
| `apps/dashboard/src/features/keuangan/outstanding-invoices.test.ts` | **Baru** — 15 unit test (vitest) |
| `apps/dashboard/src/routes/_authenticated/keuangan/tagihan/siswa.$id.tsx` | **Ubah** — query lintas-TA + section baru (aditif: +117, −0) |

## Desain

- **Tanpa perubahan backend.** `FindByStudentID` sudah melewati filter TA bila `academic_year_id` dikosongkan, jadi section ini cukup memanggil `GET /v1/students/:id/invoices` **tanpa** param tersebut.
- **Query kedua, bukan mengganti yang ada.** Daftar utama tetap memakai query ber-`academic_year_id` yang tidak disentuh sama sekali; section ini memakai query tambahan tanpa param TA. Satu request ekstra per halaman, ditukar dengan nol risiko mengubah perilaku daftar yang sudah jalan.
- **Kriteria (Q8=A):** semua tagihan **belum lunas** dari TA selain TA aktif — termasuk tagihan `monthly` lama yang memang belum dibayar, bukan hanya `type=arrears`.
- **Kolom:** TA Asal, Keterangan, Total, Sisa, Status, Detail (Detail → halaman tagihan yang sama).
- Section hanya dirender bila ada isinya; header menampilkan jumlah tagihan + total sisa.

## Logika Murni (`outstanding-invoices.ts`)

| Fungsi | Perilaku |
|---|---|
| `invoiceRemaining(invoice)` | `max(0, total − paid)`; aman terhadap nilai hilang |
| `isInvoiceOutstanding(invoice)` | `status !== "paid"` (unpaid & partial = belum lunas) |
| `otherYearOutstandingInvoices(invoices, activeAyId)` | Filter + urut TA terbaru |
| `invoiceDescription(invoice)` | `notes` di-trim; fallback ke `type`; fallback terakhir `"-"` |

Dua keputusan safe-default yang disengaja:

1. `activeAcademicYearId` belum diketahui → **daftar kosong**. Tanpa TA pembanding kita tidak bisa memisahkan "tahun lain" dari tahun berjalan, dan menampilkan semuanya hanya menduplikasi daftar utama.
2. Tagihan **tanpa informasi TA** ikut disertakan — lebih baik menampilkan kemungkinan tunggakan daripada menyembunyikan tagihan yang belum dibayar.

## Step 3: Tests

`src/features/keuangan/outstanding-invoices.test.ts` — **15 test**:

| Kelompok | Cakupan |
|---|---|
| `invoiceRemaining` | total − dibayar; tidak negatif saat dispensasi; nilai hilang = 0 |
| `isInvoiceOutstanding` | unpaid/partial/undefined = belum lunas; paid = lunas |
| `otherYearOutstandingInvoices` | hanya TA lain & belum lunas; semua jenis disertakan; partial disertakan; urut TA terbaru; **kosong bila TA aktif belum diketahui**; tanpa info TA disertakan; kosong bila semua lunas |
| `invoiceDescription` | notes di-trim; fallback ke type; fallback `-` |

## Step 4: Verification

- [x] `pnpm test` hijau (**43 test** total di repo: 28 dari Task 3 + 15 dari task ini)
- [x] `npx tsc --noEmit` bersih
- [x] `npx biome check src` — tidak ada error; tidak ada diagnostik dari file yang disentuh
- [x] `pnpm build` sukses
- [ ] Verifikasi browser (membuka siswa yang punya tunggakan TA lampau) — **belum dijalankan**

## Success Criteria

- [x] Section "Tunggakan Tahun Ajaran Lain" tampil hanya bila ada tagihan belum lunas dari TA selain TA aktif
- [x] Menampilkan TA asal, keterangan, total, sisa, status, dan tautan Detail
- [x] Daftar tagihan TA aktif yang sudah ada **tidak berubah** (diff aditif +117, −0)
- [x] Tidak ada perubahan backend
- [x] Seluruh test lulus, typecheck bersih, build sukses
- [ ] Verifikasi browser end-to-end — belum dijalankan

## Catatan Implementasi

### 1. Typecheck menangkap satu celah null

`getStatusBadge(status: string, ...)` tidak menerima `undefined`, sementara `invoice.status` opsional pada tipe logika. Diperbaiki dengan `invoice.status ?? ""` — status tak dikenal memang sudah diperlakukan sebagai "Belum" oleh helper tersebut, jadi perilakunya benar.

### 2. `getStatusBadge` kini dipakai di tempat kelima

Helper badge status tetap diduplikasi per halaman (pola yang sudah ada di `tagihan/index.tsx`, `tagihan/$id.tsx`, `tagihan/siswa.$id.tsx`). Task ini menambah penggunaan, bukan duplikat baru — membantu konsistensi visual, tetapi belum menyatukannya.

> **Follow-up (sudah tercatat sebagai Task 8 di epik):** bersama `translateType` dan `CATEGORY_LABELS`, satukan helper tampilan tagihan ke satu modul ketika client Orval di-regenerate penuh.

### 3. Belum ada aksi bayar dari section ini

Section ini murni informasional + tautan Detail. Membayar tunggakan TA lain dilakukan di kasir — itu **Task 5** (section serupa di `-InvoiceSelector.tsx`), yang merupakan inti dari keputusan Q2=A.

### Verifikasi yang BELUM dijalankan

- Verifikasi browser: perlu data siswa yang benar-benar punya tunggakan di TA lampau, sehingga butuh server + PostgreSQL + data seed. Sama seperti Task 1–3.
