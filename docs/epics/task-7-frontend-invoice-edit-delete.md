# Task 7: UI Hapus & Edit Keterangan Tagihan Manual

> **Epic:** [Tagihan Tunggakan (Backfill) + CRUD Tagihan Manual](./tagihan-tunggakan-backfill.md)
> **Status:** Done (frontend)
> **Priority:** P2 (melengkapi CRUD yang backend-nya sudah siap sejak Task 2)

---

## Goal

Aksi di level tagihan akhirnya punya UI. Sebelum task ini, backend `PUT`/`DELETE /v1/invoices/:id` (Task 2) tidak punya konsumen sama sekali — admin yang salah input tunggakan tidak bisa memperbaiki atau membatalkannya dari UI.

## Dependencies

- **Task 2 selesai** — endpoint `PUT` & `DELETE` sudah ada dan teruji.
- **Task 3 selesai** — hook `usePutV1InvoicesId` & `useDeleteV1InvoicesId` sudah tersedia di client.
- Epic requirements **R.5, R.6**.

## Files to Modify

| File | Operasi |
|------|---------|
| `apps/dashboard/src/features/keuangan/manual-invoice.ts` | **Ubah** — `isManualInvoiceType`, `canDeleteManualInvoice` |
| `apps/dashboard/src/features/keuangan/manual-invoice.test.ts` | **Ubah** — +7 test |
| `apps/dashboard/src/routes/_authenticated/keuangan/tagihan/$id.tsx` | **Ubah** — tombol + `SlideOver` edit + `ConfirmDialog` hapus |

**Tidak ada perubahan backend.**

## Perilaku

| Aksi | Kondisi tampil | Hasil |
|---|---|---|
| **Edit Keterangan** | `type` ∈ {`arrears`, `manual`} | `SlideOver` berisi `notes` + `due_date` → `PUT /v1/invoices/:id`. Untuk `arrears`, keterangan bertanda wajib (ditandai `*` + hint) agar tidak memicu 422 |
| **Hapus Tagihan** | `type` ∈ {`arrears`, `manual`} **dan** `paid_amount == 0` | `ConfirmDialog` → `DELETE /v1/invoices/:id` → toast + kembali ke daftar tagihan |

Catatan penting:

- **Guard di UI mencerminkan guard backend, bukan mengulanginya.** Kasus `payment_item` yang masih ada meski `paid_amount == 0` tidak dapat diketahui dari data di klien, sehingga tombol tetap tampil dan **pesan 409 dari API ditampilkan apa adanya**. Preseden ini sudah ada di fitur lain; polanya konsisten.
- **Aksi sengaja hanya untuk tagihan manual.** Backend `PUT` sebenarnya menerima semua tipe (R.6 hanya membatasi field), tetapi memunculkan tombol edit di invoice hasil generate memperluas permukaan UI tanpa kebutuhan. Dibatasi ke tagihan manual dan dicatat jika nanti dibutuhkan.
- **Invalidasi:** `["/v1/invoices/${id}"]` + `["/v1/students"]`. Yang terakhir wajib karena `notes` ditampilkan pada section "Tunggakan Tahun Ajaran Lain" di daftar tagihan siswa (Task 4) melalui `invoiceDescription`.
- **Setelah hapus, navigasi ke `/keuangan/tagihan`.** Tetap berada di halaman invoice yang sudah tiada akan berakhir dengan tampilan "Tagihan tidak ditemukan".

## Step 3: Tests

Tambahan pada `manual-invoice.test.ts` (**7 test baru**, total file 35):

| Kelompok | Cakupan |
|---|---|
| `isManualInvoiceType` | menerima `arrears`/`manual`; menolak 6 tipe hasil generate; menolak tipe kosong/tak dikenal |
| `canDeleteManualInvoice` | mengizinkan tagihan manual belum dibayar; menolak yang sudah ada pembayaran; menolak hasil generate meski belum dibayar; `paid_amount` hilang diperlakukan 0 |

## Step 4: Verification

- [x] `pnpm test` hijau — **58 test** total di repo
- [x] `npx tsc --noEmit` bersih
- [x] `npx biome check src` — 71 warning (tidak berubah), 2 di antaranya di file ini dan **keduanya pre-existing** (`useExhaustiveDependencies` pada `invoiceTypeCategories`, `noArrayIndexKey` pada daftar cicilan)
- [x] `pnpm build` sukses
- [ ] Verifikasi browser: edit keterangan lalu simpan; hapus tunggakan belum dibayar; coba hapus tagihan yang sudah dibayar dan pastikan pesan 409 muncul — **belum dijalankan**

## Success Criteria

- [x] Tombol "Edit Keterangan" tampil hanya untuk tagihan manual dan menyimpan `notes`/`due_date`
- [x] Tombol "Hapus Tagihan" tampil hanya untuk tagihan manual yang belum dibayar
- [x] Hapus memakai `ConfirmDialog` dan menyebut nominal + konsekuensinya
- [x] Pesan 409 dari API ditampilkan apa adanya bila penghapusan ditolak server
- [x] Daftar tagihan & data siswa ter-invalidasi setelah aksi
- [x] 7 test penjaga (guard) baru lulus, typecheck bersih, build sukses
- [ ] Verifikasi browser end-to-end — belum dijalankan

## Catatan Implementasi

### 1. Dua kesalahan edit saya sendiri tertangkap oleh verifikasi

Saat menyunting test dan file route, saya dua kali salah memotong teks dengan tool edit: satu test yang sudah ada terhapus, dan dua baris pembuka `mutation` ikut terbuang. Keduanya langsung terdeteksi — yang pertama oleh `vitest` (parse error), yang kedua oleh `tsc` (`Cannot find name`). Keduanya diperbaiki saat itu juga, dan test yang terhapus sudah dipulihkan (jumlah test kembali sesuai).

Ini justru alasan kenapa tiap increment diverifikasi sebelum lanjut: tanpa `vitest`/`tsc` dijalankan di titik itu, kerusakan akan terbawa ke irisan berikutnya.

### 2. Edit & Hapus dikerjakan dalam satu increment

Berbeda dari irisan-irisan sebelumnya, kedua aksi ini diimplementasikan bersamaan lalu diverifikasi sekali. Keduanya berbagi scaffolding yang sama (state, guard ref, area aksi, invalidasi) sehingga memisahkannya akan menghasilkan dua kali penyuntingan pada baris yang sama. Logic guard-nya sendiri tetap diuji terpisah di increment sebelumnya.

### 3. Satu warning `noArrayIndexKey` di daftar cicilan sengaja dibiarkan

`key={idx}` pada daftar cicilan (`tagihan/$id.tsx`) adalah kode yang **tidak** terkait Task 7 (Task 5 memperbaikinya di struk karena baris itu memang sedang diubah untuk keperluan lain). Tidak disentuh agar scope tetap fokus.

### Verifikasi yang BELUM dijalankan

- Verifikasi browser untuk keempat jalur: edit berhasil, edit `arrears` dengan keterangan kosong (harus 422 + pesan), hapus berhasil, dan hapus ditolak (409). Butuh server + PostgreSQL.
