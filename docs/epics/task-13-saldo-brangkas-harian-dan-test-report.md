# Task 13: Saldo Brangkas Laporan Harian + Test Pertama `reportService`

> **Konteks:** lanjutan review laporan harian; tidak menambah requirement pada epik tunggakan
> **Status:** Done (satu test ditahan — lihat §Test yang ditahan)
> **Priority:** P2 (kebenaran laporan tanggal lampau + menutup blind spot test)

---

## Latar

Berawal dari review atas perubahan **belum ter-commit** pada `GetDailyReport` yang
mengubah `closingBalance` dari `opening + totalIncome − totalExpense` menjadi basis
ledger (`SumByDate`). Review menemukan perubahan itu **benar** (lihat §Temuan), tetapi
memperlihatkan dua hal lain yang belum dikerjakan:

1. `reportService` **sama sekali tidak punya test** — invarian rekonsiliasi baru itu
   jenis yang rusak diam-diam.
2. Sisi **brangkas** di kartu "Ringkasan Kas" yang sama belum per-tanggal.

## Perubahan

### Saldo brangkas per tanggal laporan

`GetDailyReport` memakai `vaultRepo.GetCurrentBalance(ayID)` — saldo **sekarang**,
tanpa filter tanggal. Untuk laporan tanggal lampau itu menyesatkan, dan menjadi makin
timpang setelah sisi kas dibuat per-tanggal.

Ditambahkan `VaultTransactionRepository.GetBalanceUpToDate(academicYearID, date)`
(cermin `CashTransactionRepository.GetBalanceUpToDate`), lalu dipakai di
`GetDailyReport` dengan tanggal laporan.

## Files to Modify

| File | Operasi |
|------|---------|
| `apps/api/repository/vault_transaction_repository.go` | **Ubah** — `GetBalanceUpToDate` |
| `apps/api/service/report_service.go` | **Ubah** — 1 baris pada `GetDailyReport` |
| `apps/api/service/report_daily_test.go` | **Baru** — stub + test saldo brangkas |

## Test

Ini **test pertama** untuk `reportService`. Dipakai stub yang meng-embed interface
repository (hanya method yang dipakai `GetDailyReport` yang di-override), sehingga
tidak perlu menulis belasan method palsu; method yang tidak di-override akan panik
bila kelak terpakai — berguna sebagai alarm ketergantungan baru.

`TestGetDailyReport_SaldoBrangkasIkutTanggalLaporan` memastikan repo brangkas dipanggil
dengan **tanggal laporan** (2026-09-02), bukan "sekarang".

### Test yang ditahan: `report_daily_ledger_test.go`

`TestGetDailyReport_RingkasanKasPakaiBasisLedger` mengunci bahwa Ringkasan Kas memakai
ledger, bukan `IncomeSummary`/`ExpenseSummary` (sengaja berbeda karena arus kas juga
memuat transfer kas↔brangkas).

Test ini **belum di-commit** karena mengunci perilaku perubahan closing-balance yang
masih belum ter-commit. Dibuktikan di worktree terpisah (HEAD + hanya perubahan
Task 13, tanpa perubahan closing-balance):

```
--- FAIL: TestGetDailyReport_RingkasanKasPakaiBasisLedger
    expected: 900000    actual: 500000     (total_credit memakai income, bukan ledger)
    expected: 1.75e+06  actual: 1.38e+06   (closing ikut salah)
--- PASS: TestGetDailyReport_SaldoBrangkasIkutTanggalLaporan
```

Jadi bila test itu ikut di-commit sekarang, build di PR akan merah. Ia disimpan di
working tree dan harus di-commit **bersama** perubahan closing-balance tersebut
(atau dihapus bila keputusan itu batal).

## Temuan dari Review

**Perubahan closing-balance (belum ter-commit) dinilai benar.** Dua bukti:

1. `GetMonthlyReport` sudah memakai basis ledger (`GetBalanceUpToDate` +
   `SumByDateRange`) — jadi laporan harian yang menyimpang; perubahan itu
   menyelaraskannya.
2. Ia membuat `closing_balance` rekonsiliasi persis dengan Tutup Buku Harian:
   `GetBalanceUpToDate(D−1) + SumByDate(D) = GetBalanceUpToDate(D)`, dan
   `daily_closing_service.Create` menyimpan `SystemCashAmount =
   GetBalanceUpToDate(closingDate)`.

Diverifikasi numerik di DB dev (read-only, 2026-09-02):

```
opening (<= 2026-09-01)  = 109.255.000
credit/debit 2026-09-02  =  23.536.000 / 4.215.000
→ 128.576.000 == GetBalanceUpToDate(2026-09-02)   ✓
```

**Kecurigaan yang dibatalkan.** `SumByDate` membangun rentang dalam UTC sedangkan
`transaction_date` bertipe `date` dan sesi DB `Asia/Jakarta`. Simulasi SQL dengan
literal `+00` mengembalikan 0 baris (tampak seperti bug). Pengujian lewat jalur GORM
asli menunjukkan transaksinya **ditemukan benar** — tipe parameter dari driver berbeda
dari literal di simulasi. Tidak ada bug; pelajarannya: uji lewat jalur kode asli.

## Yang Sengaja Tidak Dikerjakan

- **`GetAnnualReport` memakai `GetCurrentBalance` untuk `CashBalance` dan
  `VaultBalance`** — sama-sama "sekarang", bukan akhir periode TA. Untuk TA lampau itu
  perlu ditinjau, tetapi **mengubah angkanya** untuk TA lampau, jadi perlu keputusan
  tersendiri (bukan ditempelkan diam-diam di sini).
- **Carry-over antar TA**: `GetBalanceUpToDate`/`GetCurrentBalance` menyaring
  `academic_year_id`, sehingga saldo awal TA baru = 0. Posisi Kas menangani carry-over
  eksplisit (`priorYearsCarryoverByCategory`), ringkasan kas harian/bulanan tidak.
  Pra-existing; menentukan arti "Saldo Kas Akhir". Perlu keputusan produk.
- **`gofmt` menyorot `service/expense_service.go`** — pra-existing, tidak terkait,
  tidak disentuh.

## Verification

- [x] `gofmt -l` bersih untuk file yang disentuh
- [x] `go build ./...` / `go vet ./...` — sukses
- [x] `go test ./...` — `api/repository` & `api/service` lulus
- [x] Isolasi commit diverifikasi lewat worktree: test brangkas lulus tanpa
      perubahan closing-balance; test ledger merah tanpa itu (lihat §Test yang ditahan)
- [ ] Verifikasi browser — diserahkan ke pemilik produk
