# Plan: Laporan Posisi Kas

**Referensi**: `docs/core/src/laporan/WhatsApp Image 2025-09-03 at 12.51.12.jpeg`
**Status**: Draft

---

## 1. Deskripsi

Laporan yang menampilkan **posisi kas (saldo) semua pos pemasukan** beserta **sub-item pengeluaran** yang berasal dari pos tersebut. Laporan ini menunjukkan akumulasi saldo dari awal sampai bulan yang dipilih.

## 2. Struktur Tabel

| Kolom | Deskripsi | Sumber Data |
|---|---|---|
| **Nama Pos** | Nama pos pemasukan (parent) + sub-item pengeluaran (child, indented) | Parent `expense_categories` sebagai pos, child sebagai sub-item |
| **Saldo Sebelum Bulan X** | Akumulasi saldo dari awal TA sampai akhir bulan sebelumnya | Kalkulasi historis |
| **Penerimaan (bulan ini)** | Total pemasukan bulan yang dipilih | `payment_items` → `invoice_items.category` |
| **Pengeluaran (bulan ini)** | Total pengeluaran bulan yang dipilih yang di-assign ke pos ini | `expenses` → `expense_categories` (parent → child) |
| **Saldo (bulan ini)** | Penerimaan - Pengeluaran bulan ini | Kalkulasi |
| **Saldo Sampai Bulan X** | Saldo Sebelum + Saldo bulan ini | Kalkulasi (kolom 2 + kolom 5) |

### Contoh Output

```
Nama Pos                    | Saldo Sebelum | Penerimaan | Pengeluaran | Saldo    | Saldo Sampai
----------------------------|---------------|------------|-------------|----------|-------------
SPP                         | (3.458.000)   | 79.465.000 |     410.000 |79.055.000| 75.597.000
  · Gaji Guru               |               |            |     410.000 |          |
Biaya Awal Masuk            | (105.213.000) | 17.629.000 |  15.134.000 |2.495.000 |(102.718.000)
  · Infaq Sarpras            |               |            |   3.108.000 |          |
  · Infaq APE                |               |            |     736.000 |          |
  · Koperasi                 |               |            |  10.890.000 |          |
Biaya Registrasi            | 0             | 16.735.000 |           0 |16.735.000| 16.735.000
  · (belum ada pengeluaran)  |               |            |             |          |
...
Grand Total                 | 403.565.000   |295.305.000 | 542.700.000 |(247.395.000)| 156.170.000
```

## 3. Mapping Data — Menggunakan Entitas yang Sudah Ada

### 3.1 Pos Pemasukan = `invoice_items.category`

Kategori invoice yang sudah ada di sistem menjadi "pos pemasukan":

| Pos Pemasukan (label) | `invoice_items.category` |
|---|---|
| SPP | `monthly_spp` |
| Infaq Harian | `monthly_infaq` |
| Biaya Awal | `initial` |
| Biaya Registrasi | `registration` |
| PASTA | `pasta` |
| Calisan | `calisan` |
| Ekskul | `ekskul` |
| Tabungan Wajib Berlian | `savings_mandatory` |
| Daycare | `daycare` |
| Wisuda | `graduation` |

Label display bisa menggunakan mapping statis di backend (category → label).

### 3.2 Mapping Pengeluaran = `expense_categories` (parent → child)

Expense categories sudah memiliki struktur parent-child:
```
Parent "Biaya Awal"       → child: Infaq Sarpras, Infaq APE, Biaya Psikotes IQ, Koperasi
Parent "Biaya Registrasi" → child: Biaya MPLS, Buku PK Karakter, Alat Belajar, ...
Parent "SPP"              → child: Gaji Guru
```

Yang dibutuhkan: **menghubungkan parent expense_category ke invoice_items.category** agar laporan tahu pos pemasukan mana yang membiayai pengeluaran tersebut.

### 3.3 Perubahan Model: Tambah Field di `ExpenseCategory`

```go
type ExpenseCategory struct {
    PrimaryKey
    ParentID        *uint  `gorm:"index"`
    Name            string `gorm:"size:100;not null"`
    InvoiceCategory string `gorm:"size:30"` // BARU: hanya diisi untuk parent, mapping ke invoice_items.category
    BaseModelTimeAt

    Parent   *ExpenseCategory  `gorm:"foreignKey:ParentID"`
    Children []ExpenseCategory `gorm:"foreignKey:ParentID"`
}
```

Hanya **parent** expense category yang perlu field `InvoiceCategory`:
- Parent "Biaya Awal" → `invoice_category = "initial"`
- Parent "SPP" → `invoice_category = "monthly_spp"`
- Parent "Biaya Registrasi" → `invoice_category = "registration"`

Admin bisa mengubah mapping ini via UI Pengaturan (edit expense category parent).

### 3.4 Update Seeder

```go
var defaultExpenseCategories = []struct {
    Name            string
    InvoiceCategory string   // mapping ke invoice_items.category
    Children        []string
}{
    {"Biaya Awal", "initial", []string{"Infaq Sarpras", "Infaq APE", "Biaya Psikotes IQ", "Koperasi"}},
    {"Biaya Registrasi", "registration", []string{"Biaya MPLS", "Buku PK Karakter", "Alat Belajar", ...}},
    {"SPP", "monthly_spp", []string{"Gaji Guru"}},
}
```

Pos pemasukan yang belum punya parent expense category (seperti `pasta`, `calisan`, `daycare`, dll.) akan tampil di laporan **tanpa sub-item pengeluaran** — sampai admin membuat parent expense category baru dan mapping-nya.

## 4. Backend

### 4.1 API Endpoint

```
GET /v1/reports/posisi-kas?month=6&year=2025
```

**Response:**

```json
{
  "data": {
    "month": 6,
    "year": 2025,
    "academic_year": "2025/2026",
    "posts": [
      {
        "name": "SPP",
        "category": "monthly_spp",
        "saldo_sebelum": -3458000,
        "penerimaan": 79465000,
        "pengeluaran": 410000,
        "saldo_bulan": 79055000,
        "saldo_sampai": 75597000,
        "expense_details": [
          { "name": "Gaji Guru", "amount": 410000 }
        ]
      },
      {
        "name": "Biaya Awal",
        "category": "initial",
        "saldo_sebelum": -105213000,
        "penerimaan": 17629000,
        "pengeluaran": 15134000,
        "saldo_bulan": 2495000,
        "saldo_sampai": -102718000,
        "expense_details": [
          { "name": "Infaq Sarpras", "amount": 3108000 },
          { "name": "Infaq APE", "amount": 736000 },
          { "name": "Koperasi", "amount": 10890000 }
        ]
      }
    ],
    "grand_total": {
      "saldo_sebelum": 403565000,
      "penerimaan": 295305000,
      "pengeluaran": 542700000,
      "saldo_bulan": -247395000,
      "saldo_sampai": 156170000
    }
  }
}
```

### 4.2 Query Logic

1. **Penerimaan bulan ini** per pos:
   ```sql
   SELECT ii.category, SUM(pi.amount)
   FROM payment_items pi
   JOIN invoice_items ii ON pi.invoice_item_id = ii.id
   JOIN payments p ON pi.payment_id = p.id
   WHERE p.academic_year_id = ? AND p.payment_date BETWEEN ? AND ?
   GROUP BY ii.category
   ```

2. **Pengeluaran bulan ini** per pos (via expense_categories parent):
   ```sql
   SELECT pec.invoice_category, ec.name AS child_name, SUM(e.amount)
   FROM expenses e
   JOIN expense_categories ec ON e.expense_category_id = ec.id
   LEFT JOIN expense_categories pec ON ec.parent_id = pec.id
   WHERE e.academic_year_id = ? AND e.expense_date BETWEEN ? AND ?
     AND pec.invoice_category IS NOT NULL
   GROUP BY pec.invoice_category, ec.name
   ```

3. **Saldo sebelum** per pos: query yang sama tapi dari awal TA sampai akhir bulan sebelumnya, lalu `saldo = penerimaan - pengeluaran`.

## 5. Frontend

### 5.1 Route

`/keuangan/laporan/posisi-kas`

### 5.2 Komponen

- **Filter bar**: Dropdown bulan + tahun (default: bulan berjalan)
- **Tabel**: Sesuai struktur di atas, pos pemasukan bold, sub-item pengeluaran indented dengan prefix `·`
- **Grand Total**: Baris terakhir bold, border atas ganda
- **Angka negatif**: Ditampilkan dalam kurung `(1.650.000)` sesuai contoh
- **Tombol aksi**: Print / Download PDF

### 5.3 Print & PDF

- **Browser print**: CSS `@media print` — hide filter, sidebar; format A4 landscape
- **Server PDF**: `GET /v1/reports/posisi-kas/pdf?month=6&year=2025` — generate PDF dengan header PAUD AL-IZZAH, return file download

## 6. Urutan Implementasi

1. Migrasi DB: tambah field `invoice_category` di `expense_categories`
2. Update seeder: isi `invoice_category` untuk parent expense categories
3. Update DTO & handler expense category: expose `invoice_category`
4. Report API: `GET /v1/reports/posisi-kas`
5. Frontend: halaman laporan posisi kas (tabel + filter + print)
6. PDF export endpoint

## 7. Estimasi

| Komponen | Estimasi |
|---|---|
| Migrasi + seeder update | 0.5 sesi |
| Update DTO expense category | 0.5 sesi |
| Report API endpoint | 1-2 sesi |
| Frontend laporan | 1-2 sesi |
| Print CSS + PDF server | 1 sesi |
| **Total** | **4-6 sesi** |
