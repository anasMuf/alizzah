# A01-C02: TOCTOU Race Condition — Transfer Kas ke Vault

## Problem (Masalah / Konteks)

Saat admin melakukan transfer dari kas ke vault, sistem mengecek saldo kas **di luar transaksi database**, lalu baru masuk ke transaksi untuk mendebit. Dua transfer concurrent bisa menyebabkan saldo kas negatif.

## Current Behavior (Kondisi Saat Ini)

**File:** `apps/api/service/cash_service.go:77-90`

```go
func (s *cashService) TransferToVault(createdBy uint, req dto.TransferToCashRequest, academicYearID uint) error {
    // ❌ Balance dibaca DI LUAR transaksi
    balance, _ := s.cashRepo.GetCurrentBalance(academicYearID)  // baris 78
    if req.Amount > balance {  // baris 79 — cek di luar tx
        return echo.NewHTTPError(422, fmt.Sprintf(
            "Saldo kas tidak mencukupi. Saldo: %.0f, Transfer: %.0f",
            balance, req.Amount,
        ))
    }

    // ... baru masuk transaksi
    return s.db.Transaction(func(tx *gorm.DB) error {
        now := time.Now()
        if err := s.txWriter.WriteCashDebit(
            academicYearID, now, req.Amount,
            "transfer_to_vault", nil, req.Description, createdBy, tx,
        ); err != nil {
            return err
        }
        return s.txWriter.WriteVaultCredit(
            academicYearID, now, req.Amount,
            "transfer_from_cash", nil, req.Description, createdBy, tx,
        )
    })
}
```

### Steps to Reproduce

1. Saldo kas saat ini: Rp 1.000.000
2. Buat 2 request transfer ke vault concurrent, masing-masing Rp 800.000
3. Kedua request baca `balance = 1.000.000` sebelum masuk transaksi
4. Kedua request lolos cek (`800.000 <= 1.000.000`)
5. Kas terdebit 2×, vault ter-credit 2× → saldo kas = `1.000.000 - 1.600.000 = -600.000`

## Expected Behavior (Kondisi yang Diharapkan)

Cek saldo harus di **dalam transaksi**. Karena `GetCurrentBalance` adalah agregat (`SUM(credit) - SUM(debit)`), alternatifnya:

- Gunakan **advisory lock** PG sebelum baca + tulis, atau
- Gunakan **unique constraint** + check di application layer, atau
- Baca ulang balance di dalam transaksi setelah debit (walau ini tidak mencegah race sepenuhnya untuk agregat)

Pendekatan paling praktis: gunakan **PostgreSQL advisory lock** per `academic_year_id`:

```go
func (s *cashService) TransferToVault(createdBy uint, req dto.TransferToCashRequest, academicYearID uint) error {
    return s.db.Transaction(func(tx *gorm.DB) error {
        // Acquire advisory lock untuk academic year ini
        if err := tx.Exec("SELECT pg_advisory_xact_lock(?)", academicYearID).Error; err != nil {
            return err
        }
        
        // Baca balance dalam transaksi (setelah lock)
        balance, _ := s.cashRepo.GetCurrentBalanceWithTx(tx, academicYearID)
        if req.Amount > balance {
            return fmt.Errorf("Saldo tidak mencukupi. Saldo: %.0f", balance)
        }
        
        // Proceed with debit + credit
        now := time.Now()
        // ...
    })
}
```

## Relevant Files / Area

- `apps/api/service/cash_service.go:77-90` — cek saldo di luar transaksi
- `apps/api/repository/cash_transaction_repository.go` — `GetCurrentBalance` tidak support tx parameter

## Task (Daftar Pekerjaan)

- [ ] Tambah parameter `tx *gorm.DB` di `GetCurrentBalance` (atau buat versi withTx)
- [ ] Pindahkan cek saldo ke dalam transaksi
- [ ] Gunakan `pg_advisory_xact_lock(academicYearID)` untuk serialisasi
- [ ] Tulis test concurrent
