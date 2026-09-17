# Task 11: Label Kategori Pos "Tunggakan" di Laporan

> **Epic:** [Tagihan Tunggakan (Backfill) + CRUD Tagihan Manual](./tagihan-tunggakan-backfill.md)
> **Status:** Done
> **Priority:** P2 (keterbacaan laporan; tidak mengubah angka)
> **Melanjutkan:** perbaikan label jenis tagihan (`invoice-labels.ts`) ke permukaan **kategori pos** yang belum tersentuh

---

## Goal

Pembayaran tunggakan tampil sebagai pos berlabel **"Tunggakan"**, bukan kode mentah
`arrears`, di seluruh permukaan laporan yang menampilkannya.

## Konteks: ke mana pembayaran tunggakan masuk

Laporan mengelompokkan pembayaran berdasarkan `invoice_items.category`. Untuk
`type=arrears`, server **memaksa** kategorinya menjadi `arrears`
(`invoice_service.go`), sehingga kategori tarif asal (mis. SPP) tidak tersimpan.
Untuk `type=manual`, kategori mengikuti pilihan admin dari tarif.

Akibatnya pembayaran tunggakan muncul sebagai bucket `arrears` pada:

| Laporan | Sumber | Sebelum |
|---|---|---|
| Posisi Kas | `SumPenerimaanByInvoiceCategory` → `post.name` | kode mentah `arrears`, di urutan paling bawah |
| Saldo | idem | idem |
| Harian & ringkasan `/keuangan` | `cashRepo.SumByCategory` → `by_category` | kode mentah `arrears` |
| Tahunan | `SumInvoiceByCategory` → `by_category` | kode mentah `arrears` |
| Bulanan | `SumInvoiceByCategory` difilter `i.month` | **tidak muncul** (tunggakan `month` NULL) |

## Masalah

`arrears` tidak ada di `invoiceCategoryLabels` maupun `invoiceCategoryOrder`
(backend), dan tidak ada di `CATEGORY_LABELS` frontend. Posisi Kas punya blok
"kategori di luar urutan" sehingga `arrears` **tetap tampil** — tetapi dengan kode
mentah dan posisi paling bawah di dokumen cetak.

Ini kelas bug yang sama dengan label jenis tagihan yang sudah diperbaiki
(`INVOICE_TYPE_LABELS`), hanya pada permukaan berbeda: label **kategori pos**, bukan
label **jenis** tagihan.

## Files to Modify

| File | Operasi |
|------|---------|
| `apps/api/service/report_service.go` | **Ubah** — `arrears` di `invoiceCategoryLabels` + `invoiceCategoryOrder` |
| `apps/api/service/report_labels_test.go` | **Baru** — test invarian label↔urutan |
| `apps/dashboard/src/features/keuangan/invoice-labels.ts` | **Ubah** — `invoiceCategoryLabel()` |
| `apps/dashboard/src/features/keuangan/invoice-labels.test.ts` | **Ubah** — +4 test |
| `apps/dashboard/src/routes/_authenticated/keuangan/index.tsx` | **Ubah** — tooltip pemasukan |
| `apps/dashboard/src/routes/_authenticated/keuangan/laporan/old/harian.tsx` | **Ubah** — tabel + cetak pemasukan |

## Keputusan: tetap pos sendiri, hanya diberi label

Tunggakan **tidak** digabungkan ke pos SPP. Bucket `arrears` dipertahankan karena
memisahkan tunggakan dari SPP tahun berjalan adalah informasi yang berguna; yang
diperbaiki hanya keterbacaannya. Menggabungkannya berarti membuang paksaan
`category = 'arrears'` (mengubah kontrak Task 1) plus backfill data lama — keputusan
akuntansi tersendiri yang belum diambil.

## Detail Implementasi

### 1. Invarian: setiap kategori berurutan wajib punya label

Akar masalahnya adalah dua daftar yang bisa berbeda: sebuah kategori bisa ada di
`invoiceCategoryOrder` (tampil di posisi kas) tetapi absen di `invoiceCategoryLabels`
(tampil mentah). `TestInvoiceCategoryLabelsCoverOrder` menegakkan bahwa keduanya
konsisten, sehingga kategori baru tidak bisa lagi muncul mentah tanpa disadari.

### 2. Permukaan yang menerima nama dari backend tidak disentuh

`posisi-kas.tsx` dan `saldo.tsx` menampilkan `post.name` yang dihitung backend —
cukup satu perbaikan di sisi server. `CATEGORY_LABELS` di halaman-halaman itu hanya
dipakai untuk daftar filter (dibangun dari item tarif), bukan untuk nama pos.

### 3. Sisi pengeluaran tidak disentuh

`expense_summary.by_category` sudah berisi nama kategori induk dari backend
(`COALESCE(ec_parent.name, ...)`), bukan kode. Hanya sisi pemasukan yang menerima
kode kategori mentah.

### 4. Redaksi disamakan lintas bahasa

`INVOICE_CATEGORY_LABELS` (frontend) menyalin redaksi `invoiceCategoryLabels`
(backend) agar satu kategori tidak punya dua nama berbeda antar halaman.

## Step 4: Verification

- [x] `go build ./...` / `go vet ./...` — bersih
- [x] `go test ./...` — `api/repository` & `api/service` lulus (termasuk 2 test label baru)
- [x] `pnpm test` — **86 test** lulus (11 label, +4 dari sebelumnya)
- [x] `npx tsc --noEmit` — bersih
- [x] `npx biome check src` — **71 warning**, tidak bertambah (2 di antaranya
      `noArrayIndexKey` pra-existing di `old/harian.tsx`)
- [x] `pnpm build` — sukses
- [ ] Verifikasi visual di browser — belum dijalankan

## Catatan Implementasi

### Data dev sebagai bukti

`invoice_items` di DB dev memuat 11 kategori; sepuluh di antaranya sudah punya label
backend, hanya `arrears` yang belum. Fee config memakai 9 kategori, semuanya sudah
berlabel — sehingga `type=manual` tidak berisiko muncul mentah selama item dipilih
dari tarif.

### `dispensation` — ditangani di Task 12, dan catatan awal di sini keliru

Draf pertama dokumen ini menulis "218 baris tanpa `offset_category`". Itu **salah**:
query-nya hanya menghitung total item dispensasi. Faktanya **semuanya** (218 dari 218)
sudah punya pemetaan `offset_category`.

Masalah sebenarnya ada di jalur query, bukan di data: empat definisi SQL (Posisi Kas,
Saldo, harian, bulanan/tahunan) menangani dispensasi secara berbeda. Disatukan di
[Task 12](./task-12-netting-dispensasi-laporan.md) lewat satu ekspresi bersama.

Label ramah untuk `dispensation` **sengaja tidak ditambahkan**: baris yang belum
terpetakan seharusnya tampil mentah sebagai sinyal masalah data, dan saat ini jumlahnya
nol.
