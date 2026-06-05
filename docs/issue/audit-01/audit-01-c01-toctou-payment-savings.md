# A01-C01: TOCTOU Race Condition — Cek Saldo Tabungan di Payment

## Problem (Masalah / Konteks)

Saat user melakukan pembayaran dari sumber **tabungan** (`source: "savings"`), sistem mengecek saldo tabungan **di luar transaksi database**, lalu baru masuk ke transaksi untuk mendebit. Dua request concurrent bisa sama-sama lolos cek saldo dan mendebit tabungan yang sama, menyebabkan saldo negatif (overspend).

Ini adalah klasik **TOCTOU** (Time-of-check-time-of-use) race condition.

## Current Behavior (Kondisi Saat Ini)

**File:** `apps/api/service/payment_service.go:97-110`

```go
func (s *paymentService) Create(createdBy uint, req dto.CreatePaymentRequest) (*dto.PaymentDetailResponse, error) {
    // ... validasi awal ...

    // ❌ Saldo dibaca DI LUAR transaksi
    if req.Source == "savings" {
        balance, _ := s.savingsRepo.GetBalance(req.StudentID, "general")  // baris 99
        totalItems := float64(0)
        for _, item := range req.Items {
            totalItems += item.Amount
        }
        for _, item := range req.IncidentalItems {
            totalItems += item.Amount
        }
        if totalItems > balance {  // baris 108 — cek di luar tx
            return nil, fmt.Errorf("Saldo tabungan tidak mencukupi. Saldo: %.0f, Dibutuhkan: %.0f", balance, totalItems)
        }
    }

    // ... baru masuk transaksi (baris 118)
    err = s.db.Transaction(func(tx *gorm.DB) error {
        // ...
        // [G] Savings source → debit general savings (baris 198+)
        if req.Source == "savings" && totalAmount > 0 {
            savings, err := s.savingsRepo.FindByStudentAndType(req.StudentID, "general")
            // ...
            if err := s.savingsRepo.UpdateBalance(savings.ID, savings.Balance-totalAmount, tx); err != nil {
                return err
            }
            // ...
        }
        // ...
    })
```

### Steps to Reproduce

1. Student A punya saldo tabungan Rp 500.000
2. Buat 2 request pembayaran concurrent dengan `source: "savings"`, masing-masing Rp 400.000
3. Kedua request membaca `balance = 500.000` sebelum masuk transaksi
4. Kedua request lolos cek (`400.000 <= 500.000`)
5. Kedua transaksi mendebit saldo → saldo akhir = `500.000 - 400.000 - 400.000 = -300.000`

## Expected Behavior (Kondisi yang Diharapkan)

Cek saldo harus dilakukan di **dalam transaksi** dengan **row-level locking**, sehingga concurrent request diproses secara serial:

```go
err = s.db.Transaction(func(tx *gorm.DB) error {
    // Lock & baca saldo terkini
    savings, err := s.savingsRepo.FindByStudentAndTypeForUpdate(tx, req.StudentID, "general")
    if err != nil {
        return errors.New("Tabungan umum siswa tidak ditemukan")
    }
    if totalAmount > savings.Balance {
        return fmt.Errorf("Saldo tidak mencukupi. Saldo: %.0f", savings.Balance)
    }
    // ... lanjutkan debit ...
})
```

Repository perlu method baru:

```go
// SELECT ... FROM student_savings WHERE student_id = ? AND type = ? FOR UPDATE
func (r *studentSavingsRepository) FindByStudentAndTypeForUpdate(tx *gorm.DB, studentID uint, savingsType string) (*model.StudentSavings, error)
```

## Relevant Files / Area

- `apps/api/service/payment_service.go:97-110` — cek saldo di luar transaksi
- `apps/api/service/payment_service.go:198-215` — debit saldo di dalam transaksi tapi pakai nilai stale
- `apps/api/repository/student_savings_repository.go` — perlu tambah method `FindByStudentAndTypeForUpdate`
- `apps/api/repository/student_savings_repository.go:33-37` — `FindByStudentAndType` tidak lock row

## Task (Daftar Pekerjaan)

- [ ] Tambah method `FindByStudentAndTypeForUpdate(tx, studentID, savingsType)` di `StudentSavingsRepository`
- [ ] Pindahkan cek saldo dari luar transaksi ke dalam transaksi di `payment_service.go`
- [ ] Gunakan `FOR UPDATE` locking untuk mencegah concurrent read
- [ ] Tulis unit test dengan concurrent goroutine untuk verifikasi fix
- [ ] Terapkan pola yang sama ke `GuardianWithdrawal` (A01-C04) dan `TransferToVault` (A01-C02)
