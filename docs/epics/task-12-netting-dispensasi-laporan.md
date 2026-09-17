# Task 12: Satukan Netting Dispensasi di Semua Laporan

> **Epic:** [Tagihan Tunggakan (Backfill) + CRUD Tagihan Manual](./tagihan-tunggakan-backfill.md)
> **Status:** Done
> **Priority:** P2 (konsistensi antar-laporan)
> **Melanjutkan:** [Task 11](./task-11-label-kategori-pos-laporan.md) — Task 11 memberi label kategori, Task 12 menyatukan perlakuan dispensation

---

## Goal

Semua laporan memperlakukan item dispensasi (potongan) dengan cara yang sama:
**mengurangi pos asalnya**, bukan berdiri sebagai bucket `dispensation` tersendiri.

## Konteks

Item dispensasi disimpan sebagai `invoice_item` berkategori `dispensation` dengan
`amount` negatif. Pos asalnya dipetakan lewat kolom `offset_category`, diisi oleh
backfill di `cmd/api/main.go`.

Masalahnya: pemetaan itu hanya dipakai di **sebagian** query laporan.

| Query | Laporan | Sebelum Task 12 |
|---|---|---|
| `SumPenerimaanByInvoiceCategory` | Posisi Kas, Saldo | ✅ sudah pakai `offset_category` |
| `SumByCategory` | Harian (`/keuangan`, laporan harian) | ❌ belum |
| `SumInvoiceByCategory` | Bulanan, Tahunan | ❌ belum |

DB dev: 218 item dispensasi, **semuanya** punya `offset_category` (`monthly_spp` 215,
`daycare` 3). Ada **18 payment_item** yang menunjuk item dispensasi (total −2.400.000)
tersebar di 4 tanggal (2026-08-03/04/05 dan 2026-09-02).

## Solusi

Ekspresi SQL diekstrak ke satu konstanta bersama agar tiga query tidak bisa lagi
menyimpang:

```go
// apps/api/repository/invoice_category_sql.go
const invoiceCategoryPosExpr = "CASE WHEN ii.category = 'dispensation' AND COALESCE(ii.offset_category,'') <> '' THEN ii.offset_category ELSE ii.category END"
```

Lalu dipakai di `SELECT` **dan** `GROUP BY` pada ketiga query (PostgreSQL menolak
alias di `GROUP BY` pada sebagian konteks, jadi ekspresinya dipakai langsung).

## Sifat penting: total tidak berubah

`invoiceCategoryPosExpr` hanya muncul di `SELECT`/`GROUP BY` — **tidak** di `WHERE`.
Artinya himpunan baris dan nilai yang dijumlahkan identik; yang berubah hanya
penempatan bucket. Karena itu `total_billed`, `total_paid`, dan total penerimaan
harian **tidak berubah** — perbaikan ini murni atribusi.

Diverifikasi empiris di DB dev: penjumlahan lintas pos = **379.798.000** baik dengan
maupun tanpa CASE.

## Files to Modify

| File | Operasi |
|------|---------|
| `apps/api/repository/invoice_category_sql.go` | **Baru** — konstanta bersama + dokumentasi |
| `apps/api/repository/report_repository.go` | **Ubah** — `SumInvoiceByCategory`, dan ganti `catExpr` lokal di `SumPenerimaanByInvoiceCategory` |
| `apps/api/repository/cash_transaction_repository.go` | **Ubah** — `SumByCategory` |
| `apps/api/repository/report_repository_dispensation_test.go` | **Baru** — 3 test |

## Step 4: Verification

- [x] `gofmt -l` bersih; `go build ./...` / `go vet ./...` — sukses
- [x] `go test ./...` — `api/repository` & `api/service` lulus, termasuk test lama
      `TestSumInvoiceByCategory_ExcludesSoftDeleted`
- [x] Test baru: netting pada jalur berbasis item, netting pada jalur berbasis
      pembayaran, total lintas pos tidak berubah oleh pemetaan, dan fallback
      (`offset_category` kosong tetap jadi bucket sendiri)
- [x] Verifikasi HTTP terhadap binary HEAD di atas salinan database — **7/7 asersi**:
  - Laporan harian 2026-09-02: bucket `dispensation` **hilang**; `monthly_spp` turun
    dari 7.350.000 → **7.125.000** (persis −225.000, nilai yang sebelumnya di bucket
    dispensation) — dikonfirmasi silang dengan SQL mentah
  - Laporan bulanan 8/2026: `by_category` tanpa `dispensation`
  - Laporan tahunan: 200, dan memang tanpa `by_category` (lihat DTO)
  - Regresi: Posisi Kas & Saldo tetap 200, pos `monthly_spp` masih berlabel "SPP"
- [x] `GROUP BY CASE` terbukti valid di PostgreSQL (unit test memakai sqlite, jadi ini
      memverifikasi SQL yang sebenarnya)

## Catatan Implementasi

### Laporan tahunan tidak mengekspos `by_category`

`dto.AnnualIncomeSummary` hanya punya `total_billed`/`total_paid`/`total_unpaid`/
`other_income`. Jadi untuk laporan tahunan perubahan ini **no-op by construction** —
`SumInvoiceByCategory` dipanggil untuk menghitung total, dan total tidak berubah.
Asersi awal saya di skrip verifikasi mengira ada `by_category` di sana; itu keliru
dan sudah dikoreksi.

### Residual: `offset_category` kosong

Bila suatu saat ada item dispensasi tanpa `offset_category` (saat ini **nol** di DB
dev), ia tetap jatuh ke bucket `dispensation` sebagai **sinyal data yang belum
di-backfill** — sengaja tidak diberi label ramah agar tidak menyembunyikan masalah
data. Task 11 sengaja tidak menambahkan label `dispensation` untuk alasan yang sama.
