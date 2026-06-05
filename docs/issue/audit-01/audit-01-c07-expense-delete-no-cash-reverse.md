# A01-C07: Expense/Income Delete Tidak Reverse CashTransaction

## Problem (Masalah / Konteks)

Saat expense atau income transaction dihapus, record `CashTransaction` yang ditulis saat `Create()` **tidak ikut dihapus**. Saldo kas akan salah: tetap terdebit (expense) atau terkredit (income) meskipun transaksi sumbernya sudah dihapus.

## Current Behavior (Kondisi Saat Ini)

### Expense Delete

**File:** `apps/api/service/expense_service.go:148-158`

```go
func (s *expenseService) Delete(id uint) error {
    expense, err := s.expenseRepo.FindByID(id)
    if err != nil {
        return errors.New("Pengeluaran tidak ditemukan")
    }
    
    locked, _ := s.expenseRepo.IsDateLocked(expense.ExpenseDate)
    if locked {
        return errors.New("Tanggal sudah dikunci oleh tutup buku")
    }
    
    // ❌ Hanya hapus Expense — CashTransaction dengan source "expense" tetap ada
    return s.expenseRepo.Delete(id)
}
```

### Income Delete

**File:** `apps/api/service/income_transaction_service.go:139-150`

```go
func (s *incomeTransactionService) Delete(id uint) error {
    it, err := s.repo.FindByID(id)
    // ...
    // ❌ Hanya hapus IncomeTransaction — CashTransaction dengan source "income" tetap ada
    return s.repo.Delete(id)
}
```

### Steps to Reproduce

1. Buat expense Rp 500.000 → CashTransaction debit -500.000
2. Hapus expense tersebut
3. CashTransaction debit -500.000 tetap ada di tabel → saldo kas tetap lebih rendah 500.000
4. Expense sudah tidak ada di laporan expense tapi saldo kas tidak balik

## Expected Behavior (Kondisi yang Diharapkan)

Delete harus dalam transaksi yang juga menghapus CashTransaction terkait:

```go
func (s *expenseService) Delete(id uint) error {
    expense, err := s.expenseRepo.FindByID(id)
    // ...
    
    return s.db.Transaction(func(tx *gorm.DB) error {
        // 1. Hapus CashTransaction terkait
        if err := s.cashTxnRepo.DeleteBySource("expense", expense.ID, tx); err != nil {
            return err
        }
        // 2. Hapus Expense
        return s.expenseRepo.WithTx(tx).Delete(id)
    })
}
```

## Relevant Files / Area

- `apps/api/service/expense_service.go:148-158` — Expense Delete
- `apps/api/service/income_transaction_service.go:139-150` — Income Delete
- `apps/api/repository/cash_transaction_repository.go` — perlu method `DeleteBySource`
- `apps/api/repository/vault_transaction_repository.go` — perlu method serupa untuk vault (kalau ada)

## Task (Daftar Pekerjaan)

- [ ] Tambah method `DeleteBySource(sourceType string, sourceID uint, tx *gorm.DB)` di `CashTransactionRepository`
- [ ] Refactor `ExpenseService.Delete()` — bungkus dalam transaksi, hapus CashTransaction dulu
- [ ] Refactor `IncomeTransactionService.Delete()` — sama
- [ ] Verifikasi: tidak ada service lain yang delete tanpa reverse cash/vault transaction
- [ ] Tulis test: buat → hapus → verifikasi CashTransaction juga terhapus
