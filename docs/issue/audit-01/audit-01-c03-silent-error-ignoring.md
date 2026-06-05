# A01-C03: Silent Error Ignoring — Zero-Value Masuk Database

## Problem (Masalah / Konteks)

Banyak pemanggilan fungsi yang mengembalikan `(value, error)` tetapi error-nya **diabaikan** dengan `_`. Akibatnya, zero-value (misal `time.Time{}`, `0.0`, `nil`) masuk ke database atau digunakan dalam kalkulasi tanpa ada yang menyadari ada masalah.

## Current Behavior (Kondisi Saat Ini)

### 1. `utility.ParseDate()` — error diabaikan, zero-value time disimpan

| File | Baris | Kode |
|------|-------|------|
| `service/payment_service.go` | 118 | `paymentDate, _ := utility.ParseDate(req.PaymentDate)` |
| `service/expense_service.go` | 102 | `expenseDate, _ := time.Parse("2006-01-02", req.ExpenseDate)` |
| `service/income_transaction_service.go` | 90 | `txnDate, _ := time.Parse("2006-01-02", req.TransactionDate)` |
| `service/daily_closing_service.go` | 62 | `closingDate, _ := utility.ParseDate(req.ClosingDate)` |

Jika format tanggal salah (bukan `YYYY-MM-DD`), `time.Time{}` (zero-value = `0001-01-01`) akan disimpan ke database. Tidak ada error yang muncul ke user — API mengembalikan 201/200 seolah berhasil.

### 2. `GetBalance()` — error diabaikan, 0.0 digunakan

| File | Baris | Kode |
|------|-------|------|
| `service/payment_service.go` | 99 | `balance, _ := s.savingsRepo.GetBalance(...)` |
| `service/cash_service.go` | 37 | `balance, _ := s.cashRepo.GetCurrentBalance(...)` |
| `service/cash_service.go` | 78 | `balance, _ := s.cashRepo.GetCurrentBalance(...)` |

Jika query gagal (DB down mid-query), `balance = 0` digunakan. Untuk payment dari savings: cek `totalItems > 0` akan gagal (tapi dengan pesan yang salah). Untuk cash: semua cek `amount > balance` akan lolos (karena 0).

### 3. Repository reads — error diabaikan

| File | Baris | Kode |
|------|-------|------|
| `service/payment_service.go` | 201 | `savings, err := s.savingsRepo.FindByStudentAndType(...)` — `err` dipakai, tapi di kasus savings source, ini seharusnya fatal |
| `service/student_service.go` | 284 | `successCount, dbResults, _ := s.studentRepo.BulkCreate(students)` |

### Steps to Reproduce

1. Kirim `POST /api/v1/payments` dengan `"payment_date": "invalid-date"`
2. API mengembalikan `201 Created` — sukses
3. Cek database: `payment_date = 0001-01-01`

## Expected Behavior (Kondisi yang Diharapkan)

Setiap error harus diperiksa dan dipropagasi. Untuk parse date:

```go
paymentDate, err := utility.ParseDate(req.PaymentDate)
if err != nil {
    return nil, fmt.Errorf("Format payment_date tidak valid (YYYY-MM-DD): %w", err)
}
```

Untuk balance query:

```go
balance, err := s.savingsRepo.GetBalance(req.StudentID, "general")
if err != nil {
    return nil, fmt.Errorf("Gagal membaca saldo tabungan: %w", err)
}
```

## Relevant Files / Area

- **Seluruh service yang memanggil parse/query dengan `_`** — lihat tabel di atas
- `apps/api/utility/date.go` — `ParseDate()` sudah benar, tapi pemanggilnya yang salah

## Task (Daftar Pekerjaan)

- [ ] Audit seluruh codebase: cari semua `_, _ :={` dan `_ = ` yang mengabaikan error (gunakan `grep -rn ",_ :=" apps/api/` atau `staticcheck`)
- [ ] Fix setiap lokasi: periksa error, return dengan pesan yang jelas
- [ ] Untuk parse date: return `400 Bad Request` dengan format error yang informatif
- [ ] Untuk balance query: return `500 Internal Server Error`
- [ ] Tambahkan linter rule: `errcheck` atau `staticcheck` di CI untuk menolak ignored errors
- [ ] Tulis test yang kirim input invalid dan pastikan return error, bukan sukses
