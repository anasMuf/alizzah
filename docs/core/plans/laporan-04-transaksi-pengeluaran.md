# Plan: Laporan Transaksi Pengeluaran Per Transaksi

**Referensi**: `docs/core/src/laporan/WhatsApp Image 2025-09-03 at 12.52.09.jpeg`
**Status**: Draft

---

## 1. Deskripsi

Laporan yang menampilkan **daftar semua transaksi pengeluaran** dalam satu bulan, ditampilkan per transaksi dalam format **blok/kartu**. Setiap blok menampilkan detail transaksi beserta rincian item-itemnya.

## 2. Struktur Per Blok Transaksi

Setiap transaksi pengeluaran ditampilkan sebagai blok terpisah:

### Header Blok

| Field | Deskripsi | Sumber Data |
|---|---|---|
| Cara Transaksi | TUNAI / TRANSFER | `expenses` (saat ini semua tunai) |
| Keterangan | Kategori expense (parent) | `expense_categories.name` (parent) |
| Terbilang | Nominal dalam huruf | Konversi dari `expenses.amount` |
| Tgl. Transaksi | Tanggal expense | `expenses.expense_date` |
| Nomor Bukti | Auto-generate | Belum ada — fitur baru |
| Petugas | User yang input | `users.name` via `expenses.created_by` |

### Rincian Item

| Field | Deskripsi | Sumber Data |
|---|---|---|
| No | Nomor urut item | — |
| Pos | Kategori expense (parent/child) | `expense_categories.name` |
| Deskripsi | Detail pengeluaran | `expenses.description` |
| Nominal (Rp.) | Jumlah | `expenses.amount` |

### Footer Blok

| Field | Deskripsi |
|---|---|
| Jumlah Rp. | Total semua item dalam transaksi |
| Waktu Komputer | `expenses.created_at` |

### Contoh Output

```
┌────────────────────────────────────────────────────────────────────────┐
│ Cara Transaksi : TUNAI                                                │
│ Keterangan     : pengeluaran HKC QURBAN      Tgl. Transaksi: 05-06-2025│
│ Terbilang      : Dua Puluh Enam Juta...       Nomor Bukti   : KLR...   │
│                                               Petugas       : ADMIN    │
│                                                                        │
│ Dengan rincian transaksi sebagai berikut :                              │
│  1. CKS    bu izzah: membayar kambing idul adha           Rp. xxx.xxx │
│  2. CKS    BU IIN: properti pohon kurma dkk idul adha     Rp. xxx.xxx │
│  3. CKS    bu ika: bunga dll                               Rp. xxx.xxx │
│ ...                                                                    │
│ Waktu Komputer Saat Transaksi : 24-05-2025 09:34:22                    │
│                                                 Jumlah Rp.  26.xxx.xxx│
└────────────────────────────────────────────────────────────────────────┘
```

## 3. Mapping Data ke Struktur Saat Ini

### Problem: Satu Expense = Satu Transaksi?

Di sistem lama (contoh gambar), satu transaksi bisa memiliki **banyak item** dari **berbagai pos/kategori**. Di sistem baru, setiap `Expense` record adalah satu baris tunggal:
- 1 expense = 1 amount + 1 category + 1 description

### Solusi

**Opsi A — Group by tanggal + created_at**: Expense yang di-input pada waktu bersamaan (batch) dikelompokkan sebagai satu "transaksi". Ini fragile dan tidak reliable.

**Opsi B — Tambah model `ExpenseBatch`**: Model baru untuk mengelompokkan beberapa expense dalam satu transaksi.

```go
type ExpenseBatch struct {
    PrimaryKey
    AcademicYearID  uint      `gorm:"not null;index"`
    TransactionDate time.Time `gorm:"type:date;not null"`
    TotalAmount     float64   `gorm:"type:decimal(15,2);not null"`
    Description     string    `gorm:"size:255"`
    Source          string    `gorm:"size:20;not null;default:cash"` // cash | transfer
    CreatedBy       uint      `gorm:"not null"`
    BaseModelTimeAt
}

// Expense tetap, tambah relasi:
type Expense struct {
    ...
    ExpenseBatchID *uint `gorm:"index"` // nullable, backward-compatible
    ...
    ExpenseBatch *ExpenseBatch `gorm:"foreignKey:ExpenseBatchID"`
}
```

**Opsi C — Tampilkan setiap expense sebagai blok sendiri**: Jika expense tidak di-batch, maka setiap expense = satu blok transaksi. Paling simpel dan backward-compatible.

**Rekomendasi**: **Opsi C** untuk MVP, lalu iterasi ke **Opsi B** jika user butuh batch input.

## 4. Filter

| Parameter | Tipe | Wajib | Default |
|---|---|---|---|
| `month` | uint | Ya | Bulan berjalan |
| `year` | uint | Ya | Tahun berjalan |

## 5. Backend

### 5.1 API Endpoint

```
GET /v1/reports/transaksi-pengeluaran?month=6&year=2025
```

**Response:**

```json
{
  "data": {
    "month": 6,
    "year": 2025,
    "transactions": [
      {
        "id": 1,
        "transaction_date": "2025-06-05",
        "source": "cash",
        "total_amount": 26459400,
        "total_terbilang": "Dua Puluh Enam Juta Empat Ratus Lima Puluh Sembilan Ribu Empat Ratus Rupiah",
        "description": "pengeluaran HKC Qurban",
        "created_by_name": "ADMIN",
        "created_at": "2025-06-05T09:34:22Z",
        "items": [
          {
            "no": 1,
            "category_name": "CKS",
            "description": "bu izzah: membayar kambing idul adha",
            "amount": 5000000
          }
        ]
      }
    ],
    "grand_total": 83196000
  }
}
```

### 5.2 Query Logic

Dengan **Opsi C** (setiap expense = 1 transaksi):

```sql
SELECT e.*, ec.name as category_name, 
       pec.name as parent_category_name,
       u.name as created_by_name
FROM expenses e
JOIN expense_categories ec ON e.expense_category_id = ec.id
LEFT JOIN expense_categories pec ON ec.parent_id = pec.id
JOIN users u ON e.created_by = u.id
WHERE e.academic_year_id = ?
  AND e.expense_date BETWEEN ? AND ?
ORDER BY e.expense_date ASC, e.created_at ASC
```

### 5.3 Terbilang (Angka ke Huruf)

Buat utility function `utility.Terbilang(amount float64) string`:

```go
func Terbilang(n float64) string {
    // Konversi angka ke bahasa Indonesia
    // 26459400 → "Dua Puluh Enam Juta Empat Ratus Lima Puluh Sembilan Ribu Empat Ratus Rupiah"
}
```

## 6. Frontend

### 6.1 Route

`/keuangan/laporan/pengeluaran`

### 6.2 Komponen

- **Filter bar**: Dropdown bulan + tahun
- **List blok transaksi**: Setiap expense ditampilkan dalam card/bordered box
  - Header: metadata transaksi (cara, keterangan, tanggal, petugas)
  - Body: tabel rincian item
  - Footer: jumlah + waktu input
- **Grand Total**: Di akhir halaman

### 6.3 Print & PDF

- **Browser print**: CSS `@media print` — setiap blok transaksi tidak terpotong halaman (`page-break-inside: avoid`)
- **Server PDF**: `GET /v1/reports/transaksi-pengeluaran/pdf?month=6&year=2025`

## 7. Urutan Implementasi

1. Utility: fungsi `Terbilang` (angka ke huruf Indonesia)
2. Report API endpoint
3. Frontend: halaman laporan pengeluaran (list blok + filter + print)
4. PDF export endpoint

## 8. Estimasi

| Komponen | Estimasi |
|---|---|
| Utility Terbilang | 0.5 sesi |
| Report API endpoint | 1 sesi |
| Frontend halaman | 1-2 sesi |
| Print CSS + PDF server | 1 sesi |
| **Total** | **3-4 sesi** |

## 9. Catatan

- **Nomor Bukti**: Saat ini belum ada di sistem. Jika dibutuhkan nanti, bisa ditambahkan sebagai kolom `receipt_number` di model `Expense` dengan format auto-generate (contoh: `KLR202506000071`).
- **Batch input**: Jika nanti user membutuhkan input beberapa item pengeluaran sekaligus dalam satu transaksi (seperti contoh gambar), implementasikan model `ExpenseBatch` (Opsi B di atas).
