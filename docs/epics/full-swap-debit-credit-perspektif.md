# Epic: Full Swap Perspektif Debit/Credit (Bank → Akuntansi)

> **Status:** Planning
> **Created:** 2026-07-14
> **Type:** Data Migration + Refactor

---

## Problem

Saat ini sistem menggunakan perspektif **bank statement** (nasabah/walimurid):

| Transaksi | DB `transaction_type` | Label UI |
|-----------|----------------------|----------|
| Uang masuk kas | `credit` | Pemasukan |
| Uang keluar kas | `debit` | Pengeluaran |

Seharusnya menggunakan perspektif **akuntansi sekolah** (entitas):

| Transaksi | Akuntansi | DB seharusnya |
|-----------|-----------|---------------|
| Kas bertambah | **Debit (Dr)** | `debit` |
| Kas berkurang | **Credit (Cr)** | `credit` |

---

## Requirements (IMMUTABLE)

- R.1: Semua nilai `transaction_type` di database di-swap: `credit` ↔ `debit` pada tabel `cash_transactions`, `vault_transactions`, `savings_transactions`
- R.2: Setelah swap, `debit` = uang masuk (kas bertambah), `credit` = uang keluar (kas berkurang)
- R.3: Semua perhitungan saldo menghasilkan nilai numerik yang **sama persis** dengan sebelum swap
- R.4: Semua kode yang menulis transaksi (`WriteCashCredit`, `WriteCashDebit`, dll) menulis `transaction_type` yang sesuai dengan perspektif baru
- R.5: Semua label UI mencerminkan perspektif baru: "Debit" = pemasukan/masuk, "Credit" = pengeluaran/keluar
- R.6: Ikon di UI mengikuti: masuk = ArrowDownRight (hijau), keluar = ArrowUpRight (merah)
- R.7: Filter `transaction_type` di API tetap menerima nilai `credit`/`debit` (tidak mengubah API contract)
- R.8: Halaman tabungan siswa menampilkan "Debit" untuk setoran masuk, "Credit" untuk penarikan keluar

## Success Criteria

- [ ] Migration SQL berjalan tanpa error di production
- [ ] `SUM(CASE WHEN debit THEN amount) - SUM(CASE WHEN credit THEN amount)` = saldo sebelum swap
- [ ] API `GET /v1/cash/balance` mengembalikan nilai sama
- [ ] API `GET /v1/vault/balance` mengembalikan nilai sama
- [ ] UI filter "Jenis" menampilkan: Debit (Masuk) / Credit (Keluar)
- [ ] UI transaksi: masuk berwarna hijau ArrowDownRight, keluar berwarna merah ArrowUpRight
- [ ] Tabungan: setoran = "Debit (Setoran Masuk)", penarikan = "Credit (Penarikan Keluar)"
- [ ] `go build ./...` sukses
- [ ] `npx tsc --noEmit` sukses
- [ ] Pre-commit hooks passing

## Anti-Patterns (FORBIDDEN)

- ❌ **NO perubahan API contract** (backward compat: filter param `transaction_type=credit/debit` tetap diterima, hanya artinya berubah)
- ❌ **NO perubahan nilai numerik saldo** (financial integrity: semua saldo kas, brangkas, tabungan harus identik)
- ❌ **NO hapus kolom/tabel** (data safety: hanya UPDATE, bukan DROP/ALTER)
- ❌ **NO partial swap** (consistency: harus swap di semua tabel sekaligus dalam 1 transaksi)

---

## Architecture

### Database (1 migration)

```sql
-- Dalam 1 transaksi
BEGIN;
UPDATE cash_transactions    SET transaction_type = CASE WHEN transaction_type = 'credit' THEN 'debit' ELSE 'credit' END;
UPDATE vault_transactions   SET transaction_type = CASE WHEN transaction_type = 'credit' THEN 'debit' ELSE 'credit' END;
UPDATE savings_transactions SET transaction_type = CASE WHEN transaction_type = 'credit' THEN 'debit' ELSE 'credit' END;
COMMIT;
```

### Backend SQL Formulas (8 tempat)

Semua formula `SUM(CASE WHEN credit THEN amount) - SUM(CASE WHEN debit THEN amount)` TETAP — karena setelah swap, hasil numeriknya sama:

```
Sebelum swap: SUM(credit_in) - SUM(debit_out) = saldo
Setelah swap: SUM(debit_in) - SUM(credit_out) = saldo (sama!)
```

Tapi field name di struct perlu disesuaikan agar self-documenting.

### Backend Writer (7 tempat)

| Writer Method | Sebelum | Sesudah |
|--------------|---------|---------|
| `WriteCashCredit(amount)` | tulis `transaction_type='credit'` | tulis `'debit'` (uang masuk = debit) |
| `WriteCashDebit(amount)` | tulis `transaction_type='debit'` | tulis `'credit'` (uang keluar = credit) |
| `WriteVaultCredit(amount)` | tulis `transaction_type='credit'` | tulis `'debit'` |
| `WriteVaultDebit(amount)` | tulis `transaction_type='debit'` | tulis `'credit'` |

### Backend Hardcoded Values (4 tempat)

| File | Sebelum | Sesudah |
|------|---------|---------|
| `koperasi/lainlain/service.go` | `TransactionType: "credit"` | `"debit"` |
| `koperasi/lainlain/service.go` | `TransactionType: "debit"` | `"credit"` |
| `koperasi/pembelian/service.go` | `TransactionType: "debit"` | `"credit"` |

### Frontend (6 file)

| File | Perubahan |
|------|-----------|
| `kas/transaksi.tsx` | Filter: `<option value="credit">Credit (Keluar)</option>`, swap ikon |
| `kas/berangkas/transaksi.tsx` | Sama |
| `kas/index.tsx` | Ikon: masuk=ArrowDownRight hijau, keluar=ArrowUpRight merah |
| `tabungan/siswa.$id.tsx` | Label: "Debit (Setoran Masuk)" / "Credit (Penarikan Keluar)" |
| `koperasi/kas.tsx` | Sama |
| `keuangan/index.tsx` | Ikon pemasukan/pengeluaran (sudah benar dari task sebelumnya) |

### DTO Struct Rename (2 file)

| File | Sebelum | Sesudah |
|------|---------|---------|
| `dto/report.go` | `Debit float64 // masuk (setoran)` | `Debit float64 // masuk (setoran)` — tetap |
| `dto/report.go` | `Credit float64 // keluar (penarikan)` | `Credit float64 // keluar (penarikan)` — tetap |

> TabunganSiswaRow sudah menggunakan perspektif akuntansi yang benar.

### Swagger Docs Update (3 file)

Update komentar di handler agar mencerminkan arti baru `credit`/`debit`.

---

## File Checklist

### Backend (Go)

| # | File | Perubahan |
|---|------|-----------|
| 1 | `seeders/swap_transaction_types.go` | **BARU** — migration SQL |
| 2 | `cmd/api/main.go` | Registrasi migration |
| 3 | `repository/cash_transaction_repository.go` | Swap CASE WHEN di 4 fungsi: `SumByDateRange`, `SumFiltered`, `GetCurrentBalance`, `GetCurrentBalanceWithTx` |
| 4 | `repository/vault_transaction_repository.go` | Swap CASE WHEN di `SumFiltered`, `GetCurrentBalance` |
| 5 | `service/transaction_writer_service.go` | `WriteCashCredit` → tulis `"debit"`, `WriteCashDebit` → tulis `"credit"`, same for vault |
| 6 | `service/payment_service.go` | Hardcoded `"credit"`/`"debit"` di savings transaction |
| 7 | `service/cash_service.go` | Hardcoded `"debit"` di transfer |
| 8 | `internal/modules/koperasi/kas/writer.go` | `WriteCredit` → tulis `"debit"`, `WriteDebit` → tulis `"credit"` |
| 9 | `internal/modules/koperasi/kas/repository.go` | Swap CASE WHEN di `GetBalance` |
| 10 | `internal/modules/koperasi/lainlain/service.go` | Hardcoded `"credit"`/`"debit"` |
| 11 | `internal/modules/koperasi/pembelian/service.go` | Hardcoded `"debit"` |
| 12 | `internal/modules/koperasi/laporan/repository.go` | Swap CASE WHEN di `MonthlyByCategory` |
| 13 | `handler/cash_handler.go` | Update Swagger comment |
| 14 | `handler/vault_handler.go` | Update Swagger comment |
| 15 | `dto/report.go` | TabunganSiswaRow comment (sudah benar, verify) |

### Frontend (TSX)

| # | File | Perubahan |
|---|------|-----------|
| 16 | `keuangan/kas/transaksi.tsx` | Filter label: credit=Keluar, debit=Masuk; swap ikon isCredit |
| 17 | `keuangan/kas/berangkas/transaksi.tsx` | Sama |
| 18 | `keuangan/kas/index.tsx` | Swap ikon pemasukan↔pengeluaran |
| 19 | `keuangan/tabungan/siswa.$id.tsx` | Label "Debit (Setoran)" / "Credit (Penarikan)" |
| 20 | `keuangan/index.tsx` | Ikon (sudah benar dari task sebelumnya) |
| 21 | `koperasi/kas.tsx` | Filter label + isCredit |

---

## Verification Checklist (Post-Deploy)

- [ ] Cek saldo kas tidak berubah: `GET /v1/cash/balance`
- [ ] Cek saldo brangkas tidak berubah: `GET /v1/vault/balance`
- [ ] Cek saldo tabungan siswa tidak berubah
- [ ] Filter `transaction_type=credit` di API return transaksi keluar
- [ ] Filter `transaction_type=debit` di API return transaksi masuk
- [ ] UI: nominal hijau untuk masuk, merah untuk keluar
- [ ] UI: filter dropdown label benar
- [ ] UI: tabungan siswa label benar
- [ ] Laporan keuangan: nilai total tidak berubah
- [ ] Koperasi: transaksi kas koperasi perspektif benar

---

## Rollback Plan

Jika terjadi masalah, rollback dengan:

```sql
BEGIN;
UPDATE cash_transactions    SET transaction_type = CASE WHEN transaction_type = 'debit' THEN 'credit' ELSE 'debit' END;
UPDATE vault_transactions   SET transaction_type = CASE WHEN transaction_type = 'debit' THEN 'credit' ELSE 'debit' END;
UPDATE savings_transactions SET transaction_type = CASE WHEN transaction_type = 'debit' THEN 'credit' ELSE 'debit' END;
COMMIT;
```

Lalu rollback kode ke commit sebelumnya.
