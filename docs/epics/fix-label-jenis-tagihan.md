# Perbaikan: Label Jenis Tagihan Tidak Terbaca

> **Epic:** [Tagihan Tunggakan (Backfill) + CRUD Tagihan Manual](./tagihan-tunggakan-backfill.md)
> **Status:** Done
> **Jenis:** Bug fix (temuan review setelah Task 7)

---

## Gejala

Kolom **Keterangan** pada section "Tunggakan Tahun Ajaran Lain" menampilkan nilai mentah — `monthly`, `initial`, `manual`, `arrears` — bukan label yang bisa dibaca admin.

## Akar Masalah

`invoiceDescription()` (dipakai section tunggakan di Task 4 dan Task 5) mengembalikan `invoice.type` **apa adanya** bila `notes` kosong:

```ts
return notes || invoice.type || "-";   // ← nilai mentah bocor ke UI
```

Ini terjadi karena **peta label jenis tagihan terduplikasi**: 3 salinan `translateType` di route tagihan, 2 ternary inline di `-InvoiceSelector.tsx`, dan 1 render mentah di `keuangan/index.tsx` serta `laporan/old/siswa.tsx`. `invoiceDescription` bukan salah satunya — ia tidak pernah memakai peta itu. Karena tagihan dari tahun ajaran lain sering tidak punya catatan (mis. invoice `monthly` lama), fallback mentah itulah yang paling sering tampil.

Isi salinan-salinannya pun sudah berbeda: dua ternary inline di kasir tidak mengenal `arrears`/`manual` sehingga menampilkan "Lainnya".

## Mengapa Lolos Sejauh Ini

Test yang saya tulis di Task 4 **mengunci perilaku salah** sebagai ekspektasi:

```ts
expect(invoiceDescription({ notes: "", type: "arrears" })).toBe("arrears");
expect(invoiceDescription({ notes: null, type: "monthly" })).toBe("monthly");
```

Test itu lolos, jadi bug dianggap benar. Pelajarannya: test yang meng-assert nilai mentah sebaiknya mencurigakan — dan memang seharusnya ada assertion "tidak pernah menampilkan nilai mentah".

## Perbaikan

**Satu sumber kebenaran:** `apps/dashboard/src/features/keuangan/invoice-labels.ts`

- `invoiceTypeLabel(type)` — peta lengkap 8 jenis (termasuk `arrears` → "Tunggakan", `manual` → "Manual"); jenis tak dikenal dikembalikan apa adanya agar data tidak disembunyikan.
- `invoicePeriodOrTypeLabel(invoice)` — "Bulanan 8/2026" untuk bulanan, selain itu label jenisnya.

**`invoiceDescription` memakai label tersebut**, bukan `type` mentah.

**Pemakaian disatukan** (6 lokasi + 1 legacy):

| Lokasi | Perubahan |
|---|---|
| `tagihan/index.tsx`, `tagihan/siswa.$id.tsx`, `tagihan/$id.tsx` | `translateType` → delegasi ke `invoiceTypeLabel` (peta lokal dihapus) |
| `-InvoiceSelector.tsx` | 2 ternary inline (daftar tagihan + riwayat terbayar) → `invoicePeriodOrTypeLabel`. Sekaligus menghilangkan "Lainnya" untuk `arrears`/`manual` di riwayat terbayar |
| `keuangan/index.tsx` | render `inv.type` mentah → `invoiceTypeLabel(inv.type)` |
| `laporan/old/siswa.tsx` | `Tagihan ${inv.type}` → `invoiceTypeLabel(...)` |

## Tests

`invoice-labels.test.ts` (**baru, 7 test**):

- menerjemahkan kedelapan jenis
- **tidak pernah** mengembalikan nilai snake_case mentah untuk jenis yang dikenal
- jenis tak dikenal dikembalikan apa adanya
- `-` untuk jenis kosong
- `invoicePeriodOrTypeLabel`: periode untuk bulanan, label untuk selainnya, fallback label bila bulanan tanpa periode

`outstanding-invoices.test.ts` (**diperbarui**):

- test yang mengunci bug diubah menjadi mengharapkan label terbaca
- assertion baru: **tidak pernah** menampilkan jenis mentah, untuk `arrears`/`manual`/`monthly`/`daycare_initial`

## Dampak Perubahan Teks

Satu perubahan kata yang disengaja: di kasir, `registration` sebelumnya "Registrasi", sekarang **"Registrasi Tahunan"** — agar konsisten dengan halaman daftar tagihan dan detail tagihan yang sudah memakai istilah itu.

## Verifikasi

- [x] `pnpm test` — **66 test** lulus (7 label + 24 outstanding + 35 manual)
- [x] `npx tsc --noEmit` bersih
- [x] `npx biome check src` — 71 warning (tidak bertambah), tidak ada diagnostik baru
- [x] `pnpm build` sukses
- [x] `grep` memastikan **tidak ada lagi** render `inv.type` / `invoice.type` mentah di modul keuangan
- [ ] Verifikasi browser — belum dijalankan

## Catatan

Folder `laporan/old/*` ternyata **masih terjangkau** (terdaftar di `routeTree.gen.ts` dan saling bertaut), sehingga bug yang sama ikut diperbaiki di sana. Folder ini kandidat penghapusan pada perubahan tersendiri — bukan scope perbaikan ini.
