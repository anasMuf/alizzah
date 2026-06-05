# A01-C04: TOCTOU Race Condition — Penarikan Tabungan Wali

## Problem (Masalah / Konteks)

Endpoint penarikan tabungan oleh wali (`POST /students/:id/savings/withdrawals`) membaca saldo di luar transaksi, lalu mengupdate saldo dengan nilai yang dibaca sebelum transaksi. Dua penarikan concurrent bisa menyebabkan saldo negatif.

Selain itu, `UpdateBalance` menggunakan `UPDATE SET balance = ? WHERE id = ?` tanpa cek `balance >= amount` — tidak ada proteksi di level database.

## Current Behavior (Kondisi Saat Ini)

**File:** `apps/api/service/savings_service.go:121-185`

```go
func (s *savingsService) GuardianWithdrawal(studentID, createdBy uint, req dto.SavingsWithdrawalRequest) (*dto.WithdrawalResponse, error) {
    // ❌ Savings dibaca DI LUAR transaksi
    savings, err := s.savingsRepo.FindByStudentAndType(studentID, "general")  // baris 122
    if err != nil {
        return nil, errors.New("Tabungan umum siswa tidak ditemukan")
    }
    
    if req.Amount > savings.Balance {  // baris 127 — cek di luar tx
        return nil, fmt.Errorf("Saldo tidak mencukupi...")
    }
    
    // ... baca academicYear, feeConfig, hitung adminFee ... 
    // (ini juga di luar tx, nilainya bisa berubah)
    
    var remainingBalance float64
    err = s.db.Transaction(func(tx *gorm.DB) error {
        // ... buat SavingsTransaction record ...
        
        // ❌ savings.Balance adalah nilai STALE dari luar transaksi
        remainingBalance = savings.Balance - req.Amount  // baris 154
        if err := s.savingsRepo.UpdateBalance(savings.ID, remainingBalance, tx); err != nil {
            return err
        }
        // ...
    })
```

**Repository:** `apps/api/repository/student_savings_repository.go:56-61`

```go
func (r *studentSavingsRepository) UpdateBalance(id uint, balance float64, tx *gorm.DB) error {
    db := r.db
    if tx != nil {
        db = tx
    }
    // ❌ Tidak ada WHERE balance >= oldBalance — tidak ada optimistic locking
    return db.Model(&model.StudentSavings{}).Where("id = ?", id).Update("balance", balance).Error
}
```

### Steps to Reproduce

1. Siswa punya saldo tabungan Rp 500.000
2. Dua wali (atau admin) melakukan penarikan concurrent masing-masing Rp 400.000
3. Keduanya baca `savings.Balance = 500.000` di luar transaksi → lolos cek
4. Kedua transaksi commit: saldo akhir = `500.000 - 400.000 - 400.000 = -300.000`

## Expected Behavior (Kondisi yang Diharapkan)

**Dua lapis proteksi:**

### Layer 1: Cek di dalam transaksi
```go
err = s.db.Transaction(func(tx *gorm.DB) error {
    savings, err := s.savingsRepo.FindByStudentAndTypeForUpdate(tx, studentID, "general")
    if req.Amount > savings.Balance {
        return fmt.Errorf("Saldo tidak mencukupi")
    }
    // ... lanjutkan
})
```

### Layer 2: Optimistic locking di repository
```go
func (r *studentSavingsRepository) DebitBalance(id uint, amount float64, tx *gorm.DB) error {
    result := tx.Model(&model.StudentSavings{}).
        Where("id = ? AND balance >= ?", id, amount).
        Update("balance", gorm.Expr("balance - ?", amount))
    if result.RowsAffected == 0 {
        return errors.New("Saldo tidak mencukupi atau concurrent update")
    }
    return result.Error
}
```

## Relevant Files / Area

- `apps/api/service/savings_service.go:121-185` — GuardianWithdrawal
- `apps/api/service/savings_service.go:198-216` — DebitMandatory (pola sama)
- `apps/api/repository/student_savings_repository.go:56-61` — UpdateBalance tanpa optimistic lock
- `apps/api/repository/student_savings_repository.go:33-37` — FindByStudentAndType tanpa lock

## Task (Daftar Pekerjaan)

- [ ] Tambah method `FindByStudentAndTypeForUpdate(tx, studentID, type)` dengan `SELECT ... FOR UPDATE`
- [ ] Ubah `UpdateBalance` jadi `DebitBalance(id, amount, tx)` dengan cek `WHERE balance >= ?`
- [ ] Pindahkan cek saldo + fee config read ke dalam transaksi
- [ ] Tulis test concurrent untuk penarikan
