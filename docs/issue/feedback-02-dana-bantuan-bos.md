# Feedback 02: Transaksi Penerimaan Dana Bantuan (BOS / Donatur)

## Konteks

Sekolah menerima dana bantuan dari pemerintah (BOS) atau donatur. Saat ini sistem hanya mencatat pemasukan dari pembayaran siswa. Dana bantuan ini perlu dicatat sebagai transaksi penerimaan terpisah yang langsung masuk ke kas sekolah.

## Tujuan

Admin keuangan bisa mencatat transaksi penerimaan non-siswa (BOS, donasi, hibah, dll) yang masuk langsung ke kas tanpa terkait tagihan siswa.

## Status Saat Ini

- Pemasukan kas hanya dari: pembayaran siswa (`payments`) dan transfer ke berangkas (`cash_transactions`)
- Tidak ada entitas atau alur untuk penerimaan dana eksternal
- Pengeluaran sudah ada sistem kategori (`expense_categories`)

## Rencana Implementasi

### 1. Database — Tabel baru `income_transactions`

```sql
CREATE TABLE income_transactions (
    id SERIAL PRIMARY KEY,
    academic_year_id INT NOT NULL REFERENCES academic_years(id),
    category VARCHAR(30) NOT NULL,      -- 'bos' | 'donasi' | 'hibah' | 'lainnya'
    source_name VARCHAR(100) NOT NULL,  -- nama pengirim: "BOS Semester 1 2025", "Donatur Bpk. Ahmad"
    amount DECIMAL(15,2) NOT NULL,
    transaction_date DATE NOT NULL,
    reference_number VARCHAR(50),       -- nomor referensi/dokumen (opsional)
    notes TEXT,
    receipt_url VARCHAR(255),           -- bukti transfer/dokumen (opsional)
    created_by INT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);
```

### 2. Backend

**Model `income_transaction.go`:**
```go
type IncomeTransaction struct {
    PrimaryKey
    AcademicYearID  uint      `gorm:"not null;index"`
    Category        string    `gorm:"size:30;not null"`
    SourceName      string    `gorm:"size:100;not null"`
    Amount          float64   `gorm:"type:decimal(15,2);not null"`
    TransactionDate time.Time `gorm:"type:date;not null"`
    ReferenceNumber string    `gorm:"size:50"`
    Notes           string    `gorm:"type:text"`
    ReceiptURL      string    `gorm:"size:255"`
    CreatedBy       uint      `gorm:"not null"`
    BaseModelTimeAt
}
```

**Endpoints:**
| Method | Path | Fungsi |
|--------|------|--------|
| `GET` | `/v1/income-transactions` | List dengan filter (category, periode, academic_year) |
| `POST` | `/v1/income-transactions` | Catat penerimaan baru → otomatis masuk ke kas |
| `GET` | `/v1/income-transactions/:id` | Detail transaksi |
| `PUT` | `/v1/income-transactions/:id` | Update (selama belum di-tutup buku) |
| `DELETE` | `/v1/income-transactions/:id` | Soft delete (selama belum di-tutup buku) |

**Integrasi dengan Kas:**
- Saat POST income transaction, otomatis buat `cash_transaction` dengan type `income` dan reference ke `income_transaction`
- Saldo kas bertambah sejumlah amount
- Transaksi tercatat di tutup buku harian

**Integrasi dengan Laporan:**
- Laporan harian: tambah section "Penerimaan Dana Bantuan"
- Laporan bulanan: tambah pos penerimaan non-siswa
- Laporan tahunan: akumulasi penerimaan bantuan per kategori

### 3. Frontend

**Halaman baru: `/keuangan/penerimaan/`**
- List transaksi penerimaan dengan filter
- Tombol "Catat Penerimaan Baru"

**Form input penerimaan:**
- Pilih kategori (BOS, Donasi, Hibah, Lainnya)
- Nama sumber/pengirim
- Nominal
- Tanggal transaksi
- Nomor referensi (opsional)
- Catatan (opsional)
- Upload bukti (opsional)

**Sidebar:** Tambah menu "Penerimaan" di bawah section Keuangan

### File yang Perlu Dibuat/Diubah

| Layer | File | Perubahan |
|-------|------|-----------|
| Model | `apps/api/model/income_transaction.go` | **Baru** |
| DTO | `apps/api/dto/income_transaction.go` | **Baru** |
| Repository | `apps/api/repository/income_transaction_repository.go` | **Baru** |
| Service | `apps/api/service/income_transaction_service.go` | **Baru** |
| Handler | `apps/api/handler/income_transaction_handler.go` | **Baru** |
| Route | `apps/api/route/routes.go` | Register endpoint baru |
| Kas Service | `apps/api/service/cash_service.go` | Integrasi pemasukan |
| Report Service | `apps/api/service/report_service.go` | Tambah data penerimaan di laporan |
| Frontend Route | `apps/dashboard/src/routes/_authenticated/keuangan/penerimaan/` | **Baru** (index + baru + $id) |
| Sidebar | `apps/dashboard/src/components/layout/Sidebar.tsx` | Tambah menu |
| API Client | Auto-generate via Orval | — |
