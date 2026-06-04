# Plan: Laporan Saldo Per Pos

**Referensi**: `docs/core/src/laporan/WhatsApp Image 2025-09-03 at 12.51.12 (1).jpeg`
**Status**: Draft

---

## 1. Deskripsi

Laporan yang menampilkan **rincian transaksi harian** untuk **satu pos pemasukan** pada **satu bulan** tertentu. Menampilkan running balance (saldo berjalan) per tanggal dari saldo awal bulan sampai saldo akhir bulan.

## 2. Struktur Tabel

| Kolom | Deskripsi | Sumber Data |
|---|---|---|
| **No** | Nomor urut | — |
| **Tanggal** | Tanggal transaksi | `payments.payment_date` / `expenses.expense_date` |
| **Jumlah Penerimaan** | Total pemasukan hari itu untuk pos ini | `payment_items` → `invoice_items.category` |
| **Jumlah Pengeluaran** | Total pengeluaran hari itu dari expense yg di-mapping ke pos ini | `expenses` → mapping |
| **Selisih** | Penerimaan - Pengeluaran hari itu | Kalkulasi |
| **Saldo** | Running balance (saldo kemarin + selisih hari ini) | Kalkulasi kumulatif |

### Contoh Output (Pos: TABUNGAN SISWA, Juni 2025)

```
                                 Jumlah         Jumlah
No.  Tanggal        Penerimaan      Pengeluaran    Selisih          Saldo
     Saldo Sebelum Juni 2025                                      380.016.000
 1.  02-06-2025                     
 2.  03-06-2025     7.871.606.000   7.491.590.000                 355.755.000
 3.  04-06-2025        28.730.000                  (24.261.000)   348.831.000
 4.  05-06-2025        11.236.000      52.991.000   (6.924.000)   340.668.000
...
11.  24-06-2025            37.000     100.000         (100.000)       160.000

Jumlah Bulan Juni 2025  64.648.000   444.504.000  (329.353.000)
Saldo Akhir Juni 2025  7.936.254.000 7.936.094.000                    160.000
```

### Footer

- **Jumlah Bulan**: Total penerimaan & pengeluaran bulan itu
- **Saldo Akhir**: Grand total dari awal + akumulasi bulan ini

## 3. Filter

| Parameter | Tipe | Wajib | Default |
|---|---|---|---|
| `month` | uint | Ya | Bulan berjalan |
| `year` | uint | Ya | Tahun berjalan |
| `category` | string | Ya | — (user harus pilih) |

`category` = nilai `invoice_items.category` (contoh: `monthly_spp`, `initial`, `registration`, dll). Lihat mapping lengkap di Laporan 01.

## 4. Backend

### 4.1 API Endpoint

```
GET /v1/reports/saldo?month=6&year=2025&category=monthly_spp
```

**Response:**

```json
{
  "data": {
    "month": 6,
    "year": 2025,
    "post_name": "SPP",
    "category": "monthly_spp",
    "saldo_sebelum": 380016000,
    "rows": [
      {
        "date": "2025-06-02",
        "penerimaan": 0,
        "pengeluaran": 0,
        "selisih": 0,
        "saldo": 380016000
      },
      {
        "date": "2025-06-03",
        "penerimaan": 7871606000,
        "pengeluaran": 7491590000,
        "selisih": 380016000,
        "saldo": 355755000
      }
    ],
    "total_bulan": {
      "penerimaan": 64648000,
      "pengeluaran": 444504000,
      "selisih": -329353000
    },
    "saldo_akhir": 160000
  }
}
```

### 4.2 Query Logic

1. **Saldo sebelum**: Sum semua penerimaan - pengeluaran untuk pos ini dari awal TA sampai akhir bulan sebelumnya (reuse logic dari Laporan Posisi Kas).

2. **Transaksi harian**: Aggregate per tanggal:
   ```sql
   -- Penerimaan per hari untuk category tertentu
   SELECT p.payment_date AS date, SUM(pi.amount) AS penerimaan
   FROM payment_items pi
   JOIN invoice_items ii ON pi.invoice_item_id = ii.id
   JOIN payments p ON pi.payment_id = p.id
   WHERE p.academic_year_id = ?
     AND ii.category = ?  -- e.g. 'monthly_spp'
     AND p.payment_date BETWEEN ? AND ?
   GROUP BY p.payment_date

   -- Pengeluaran per hari (via expense_categories parent yg punya invoice_category)
   SELECT e.expense_date AS date, SUM(e.amount) AS pengeluaran
   FROM expenses e
   JOIN expense_categories ec ON e.expense_category_id = ec.id
   LEFT JOIN expense_categories pec ON ec.parent_id = pec.id
   WHERE e.academic_year_id = ?
     AND pec.invoice_category = ?  -- e.g. 'monthly_spp'
     AND e.expense_date BETWEEN ? AND ?
   GROUP BY e.expense_date
   ```

3. **Merge**: Gabungkan per tanggal, hitung selisih & running balance.

### 4.3 Dependency

- Membutuhkan field `invoice_category` di `expense_categories` (parent) dari Laporan 01 (Posisi Kas).
- Endpoint ini sebaiknya dibangun **setelah** migrasi + seeder Laporan 01 selesai.

## 5. Frontend

### 5.1 Route

`/keuangan/laporan/saldo`

### 5.2 Komponen

- **Filter bar**: Dropdown pos pemasukan (dari daftar `invoice_items.category`) + bulan + tahun
- **Header info**: Periode Transaksi, Pos Penerimaan, Tahun Pos
- **Tabel**: Sesuai struktur di atas
- **Baris Saldo Sebelum**: Baris pertama, italic, hanya kolom Saldo yang terisi
- **Footer**: Jumlah Bulan + Saldo Akhir, dengan garis ganda
- **Angka negatif**: Dalam kurung `(24.261.000)`
- **Format angka**: Titik sebagai pemisah ribuan (Indonesia)
- **Tombol aksi**: Print / Download PDF

### 5.3 Print & PDF

- **Browser print**: CSS `@media print` — header sekolah, format A4 portrait
- **Server PDF**: `GET /v1/reports/saldo/pdf?month=6&year=2025&category=monthly_spp`

## 6. Urutan Implementasi

1. Report API endpoint (depends on model dari Laporan 01)
2. Frontend: halaman laporan saldo (filter + tabel + print)
3. PDF export endpoint

## 7. Estimasi

| Komponen | Estimasi |
|---|---|
| Report API endpoint | 1 sesi |
| Frontend halaman | 1 sesi |
| Print CSS + PDF server | 0.5 sesi |
| **Total** | **2-3 sesi** |
