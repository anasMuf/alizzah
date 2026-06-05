# A01-C06: Expense Update Tidak Sinkron dengan CashTransaction

## Problem (Masalah / Konteks)

Saat expense di-update (nominal berubah), record `CashTransaction` yang terkait **tidak ikut diupdate**. Akibatnya saldo kas tidak mencerminkan nilai expense terbaru — terjadi inkonsistensi antara laporan expense dan laporan kas.

## Current Behavior (Kondisi Saat Ini)

**File:** `apps/api/service/expense_service.go:93-146`

### Create — menulis CashTransaction (benar):
```go
func (s *expenseService) Create(createdBy uint, req dto.CreateExpenseRequest) (*dto.ExpenseResponse, error) {
    // ...
    err = s.db.Transaction(func(tx *gorm.DB) error {
        expense = model.Expense{...}
        if err := s.expenseRepo.WithTx(tx).Create(&expense); err != nil {
            return err
        }
        // ✅ Menulis CashTransaction dengan amount yang sama
        return s.txnWriter.WriteCashDebit(req.AcademicYearID, expenseDate, req.Amount,
            "expense", &expense.ID, ..., createdBy, tx)
    })
}
```

### Update — TIDAK mengupdate CashTransaction:
```go
func (s *expenseService) Update(id uint, req dto.CreateExpenseRequest) (*dto.ExpenseResponse, error) {
    // ...
    expense.Amount = req.Amount  // nominal berubah
    // ...
    // ❌ Hanya update Expense, CashTransaction tetap dengan nominal lama
    if err := s.expenseRepo.Update(expense); err != nil {
        return nil, err
    }
    // ❌ Tidak ada update ke CashTransaction
}
```

### Steps to Reproduce

1. Buat expense Rp 1.000.000 → CashTransaction debit -1.000.000 (saldo kas: -1.000.000)
2. Update expense jadi Rp 2.000.000 → Expense record jadi 2.000.000, tapi CashTransaction tetap -1.000.000
3. Laporan expense: total 2.000.000, laporan kas: total debit 1.000.000 → tidak cocok

## Expected Behavior (Kondisi yang Diharapkan)

`Update()` harus dalam transaksi yang:
1. Menghapus/mengupdate CashTransaction lama, ATAU
2. Menulis adjustment entry

Pendekatan paling bersih: **delete old + create new** dalam satu transaksi:

```go
func (s *expenseService) Update(id uint, req dto.CreateExpenseRequest) (*dto.ExpenseResponse, error) {
    // ...
    err = s.db.Transaction(func(tx *gorm.DB) error {
        // 1. Delete old CashTransaction
        if err := s.cashTxnRepo.DeleteBySource("expense", expense.ID, tx); err != nil {
            return err
        }
        // 2. Update expense
        expense.Amount = req.Amount
        if err := s.expenseRepo.WithTx(tx).Update(expense); err != nil {
            return err
        }
        // 3. Write new CashTransaction
        return s.txnWriter.WriteCashDebit(req.AcademicYearID, expenseDate, req.Amount,
            "expense", &expense.ID, ..., createdBy, tx)
    })
}
```

## Relevant Files / Area

- `apps/api/service/expense_service.go:129-145` — `Update()` tanpa sync CashTransaction
- `apps/api/service/income_transaction_service.go:125-137` — masalah sama untuk IncomeTransaction
- `apps/api/repository/cash_transaction_repository.go` — perlu method `DeleteBySource`

## Task (Daftar Pekerjaan)

- [ ] Tambah method `DeleteBySource(sourceType string, sourceID uint, tx *gorm.DB)` di CashTransactionRepository
- [ ] Refactor `ExpenseService.Update()` — bungkus dalam transaksi dengan delete+recreate CashTransaction
- [ ] Refactor `IncomeTransactionService.Update()` — masalah yang sama
- [ ] Tulis test: buat → update → verifikasi CashTransaction juga terupdate
