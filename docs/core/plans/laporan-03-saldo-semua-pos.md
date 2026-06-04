# Plan: Laporan Saldo Semua Pos

**Referensi**: `docs/core/src/laporan/WhatsApp Image 2025-09-03 at 12.51.13.jpeg`
**Status**: Draft

---

## 1. Deskripsi

Laporan yang menampilkan **rincian transaksi harian gabungan dari semua pos pemasukan** pada **satu bulan** tertentu. Sama seperti Laporan Saldo Per Pos, tapi menampilkan total aggregat dari seluruh pos tanpa filter per pos.

## 2. Struktur Tabel

Identik dengan Laporan Saldo Per Pos, tetapi data yang ditampilkan adalah total dari semua pos.

| Kolom | Deskripsi |
|---|---|
| **No** | Nomor urut |
| **Tanggal** | Tanggal transaksi |
| **Jumlah Penerimaan** | Total **semua** pemasukan hari itu (semua kategori invoice) |
| **Jumlah Pengeluaran** | Total **semua** pengeluaran hari itu |
| **Selisih** | Penerimaan - Pengeluaran |
| **Saldo** | Running balance kumulatif |

### Contoh Output (Semua Pos, Juni 2025)

```
                                 Jumlah         Jumlah
No.  Tanggal        Penerimaan      Pengeluaran    Selisih          Saldo
     Saldo Sebelum Juni 2025                                       23.549.000
 1.  02-06-2025                     
 2.  03-06-2025        46.775.000              0   46.775.000      70.324.000
 3.  04-06-2025        29.793.000      10.230.000  19.563.000      89.887.000
 4.  05-06-2025         7.955.000       1.190.000   6.765.000      96.652.000
...
     30-06-2025        14.330.000      12.930.000   1.400.000     156.010.000

Jumlah Bulan Juni 2025  215.657.000   83.196.000  132.461.000
Saldo Akhir Juni 2025                                            156.010.000
```

### Header Info

Berbeda dengan laporan per pos:
- **Bulan**: Juni 2025
- **Pos**: Semua pos (list nama pos di sub-header, seperti di contoh gambar)
- **Tahun Pos**: Semua Tahun

## 3. Filter

| Parameter | Tipe | Wajib | Default |
|---|---|---|---|
| `month` | uint | Ya | Bulan berjalan |
| `year` | uint | Ya | Tahun berjalan |

Tidak ada filter `category` — ini versi "semua pos".

## 4. Backend

### 4.1 API Endpoint

Reuse endpoint yang sama dengan Laporan 02 tetapi tanpa parameter `category`:

```
GET /v1/reports/saldo?month=6&year=2025
```

Jika `category` tidak diberikan → return data semua pos digabung.

**Response:** Struktur sama dengan Laporan 02, kecuali:
- `post_name` = "Semua Pos"
- `post_list` = ["SPP", "Infaq Harian", "Biaya Awal Masuk", ...] (untuk sub-header)
- Data = aggregate dari semua kategori

### 4.2 Query Logic

1. **Saldo sebelum**: Sum total penerimaan - total pengeluaran dari awal TA sampai akhir bulan sebelumnya (semua kategori).

2. **Transaksi harian**:
   ```sql
   -- Penerimaan per hari (semua kategori)
   SELECT p.payment_date AS date, SUM(pi.amount) AS penerimaan
   FROM payment_items pi
   JOIN payments p ON pi.payment_id = p.id
   WHERE p.academic_year_id = ?
     AND p.payment_date BETWEEN ? AND ?
   GROUP BY p.payment_date

   -- Pengeluaran per hari (semua)
   SELECT e.expense_date AS date, SUM(e.amount) AS pengeluaran
   FROM expenses e
   WHERE e.academic_year_id = ?
     AND e.expense_date BETWEEN ? AND ?
   GROUP BY e.expense_date
   ```

3. Merge per tanggal, hitung selisih & running balance.

## 5. Frontend

### 5.1 Route

Sama dengan Laporan 02: `/keuangan/laporan/saldo`

UI-nya **satu halaman** dengan dropdown filter pos:
- Pilih **"Semua Pos"** → tampilkan laporan ini (Laporan 03)
- Pilih **pos tertentu** → tampilkan Laporan 02 (Saldo Per Pos)

### 5.2 Komponen

Identik dengan Laporan 02, perbedaan hanya:
- Header sub-title menampilkan list semua pos (jika "Semua Pos" dipilih)
- Tidak ada filter individual pos

### 5.3 Print & PDF

Sama dengan Laporan 02 — reuse komponen print dan endpoint PDF:
```
GET /v1/reports/saldo/pdf?month=6&year=2025
```

## 6. Urutan Implementasi

Diimplementasikan **bersamaan** dengan Laporan 02 karena share endpoint dan UI yang sama. Hanya perlu branching logic di backend berdasarkan ada/tidaknya `category` parameter.

## 7. Estimasi

Sudah termasuk dalam estimasi Laporan 02 (tidak ada effort tambahan yang signifikan).

| Komponen | Estimasi |
|---|---|
| Backend branching logic | 0.5 sesi (sudah termasuk di Laporan 02) |
| Frontend conditional rendering | 0.5 sesi (sudah termasuk di Laporan 02) |
| **Total tambahan** | **~0 sesi** (built-in di Laporan 02) |
