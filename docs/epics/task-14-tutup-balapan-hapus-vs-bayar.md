# Task 14: Tutup Balapan Hapus Tagihan vs Pembayaran

> **Konteks:** temuan review PR #180 pada CRUD tagihan manual (Task 2)
> **Status:** Done
> **Priority:** P2 (integritas data; butuh konkurensi untuk terpicu)

---

## Masalah

`invoiceService.Delete` memvalidasi bahwa tagihan belum dibayar **di luar transaksi**
dan tanpa kunci:

1. `FindByID` + cek `PaidAmount != 0`
2. `paymentRepo.FindByInvoiceID` (cek `payment_item` yatim)

baru kemudian membuka transaksi untuk menghapus item + invoice. Di sisi lain,
`paymentService.createInTx` membaca item dan menulis `paid_amount` juga tanpa kunci.

Interleaving yang merusak: Delete membaca "belum ada pembayaran" → kasir mencatat
pembayaran → Delete menghapus. Hasilnya `payment_items` dan kas tetap ada, tetapi
invoice/item-nya ter-soft-delete — **kas tercatat tanpa tagihan yang terlihat**, dan
`reversePayment`/laporan ikut rusak.

## Solusi

Kedua jalur mengunci **baris `invoices` yang sama**, dengan urutan id menaik:

- **Delete** — kunci baris invoice (`SELECT ... FOR UPDATE`) sebagai langkah pertama
  transaksi, lalu validasi ulang **di dalam** transaksi (tipe, `paid_amount`,
  keberadaan `payment_item`) sebelum menghapus.
- **Pembayaran** — sebelum membaca item, kunci baris invoice dari item yang akan
  dibayar (`ORDER BY id`).

Sifatnya:

| Urutan | Hasil |
|---|---|
| Pembayaran commit lebih dulu | Delete menunggu kunci, lalu validasi ulang melihat `paid_amount > 0` → **409** |
| Delete lebih dulu | Pembayaran menunggu; item sudah ter-soft-delete → item tidak ditemukan → **pembayaran ditolak** |

**Mengapa baris invoice, bukan baris item?** Satu target kunci, dan urutan id menaik
di kedua jalur menghilangkan risiko deadlock. Pembayaran bisa menyentuh item dari
beberapa invoice sekaligus; mengunci set invoice secara terurut tetap konsisten.

**Jebakan yang dihindari:** PostgreSQL menolak `DISTINCT` bersamaan dengan
`FOR UPDATE` (`FOR UPDATE is not allowed with DISTINCT clause`). Karena itu
penentuan invoice dilakukan **dua langkah**: baca `DISTINCT invoice_id` (tanpa kunci),
lalu kunci berdasarkan daftar id itu.

**Efek samping menguntungkan:** dua pembayaran bersamaan atas item yang sama kini ikut
terserialisasi — pembayaran kedua melihat `paid_amount` yang sudah diperbarui,
sehingga guard "melebihi sisa tagihan" bekerja (sebelumnya bisa lolos).

## Files to Modify

| File | Operasi |
|------|---------|
| `apps/api/service/invoice_service.go` | **Ubah** — `Delete` memakai transaksi + kunci; tambah `lockInvoiceRow` |
| `apps/api/service/payment_service.go` | **Ubah** — kunci invoice di awal `createInTx` |

`createInTx` juga dipakai `Update` (setelah membalik pembayaran lama), jadi jalur itu
ikut terlindungi.

## Verification

- [x] `gofmt -l` bersih; `go build ./...` / `go vet ./...` — sukses
- [x] `go test ./...` — `api/repository` & `api/service` lulus, termasuk seluruh test
      pembayaran dan `TestDeleteInvoice_*` (404 untuk tidak ada, 409 untuk tagihan
      hasil generate / sudah dibayar / punya `payment_item`) → refactor tidak
      mengubah semantik error
- [x] SQL yang dihasilkan diverifikasi lewat `ToSQL` pada dialector postgres (tanpa
      eksekusi) — klausa kuncinya benar-benar muncul:
  ```sql
  -- Delete
  SELECT "id" FROM "invoices" WHERE id = 1 AND "invoices"."deleted_at" IS NULL FOR UPDATE
  -- Pembayaran (urut id menaik)
  SELECT "id" FROM "invoices" WHERE id IN (1,2) AND "invoices"."deleted_at" IS NULL ORDER BY id FOR UPDATE
  -- Penentuan invoice (DISTINCT, tanpa kunci)
  SELECT DISTINCT "invoice_id" FROM "invoice_items" WHERE id IN (1,2) AND "invoice_items"."deleted_at" IS NULL
  ```

## Batasan Verifikasi (jujur)

Sifat saling-kunci ini **tidak dapat diuji** pada suite saat ini: test memakai sqlite
in-memory dengan `SetMaxOpenConns(1)`, sehingga seluruh akses terserialisasi dan
balapan tidak mungkin direproduksi. Yang terbukti di sini adalah **(a)** SQL kunci
benar-benar dihasilkan untuk PostgreSQL, dan **(b)** semantik 404/409 tidak berubah.
Pembuktian end-to-end sifat mutual exclusion memerlukan test konkurensi berbasis
PostgreSQL — belum ada harness untuk itu, dan tidak ditambahkan di sini.
