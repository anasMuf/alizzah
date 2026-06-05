# Audit 01 — Audit Menyeluruh Backend API

**Tanggal:** 2025-07-11
**Lingkup:** `apps/api/` — seluruh layer (model, repository, service, handler, middleware, config)
**Metode:** Static code review, trace data flow, concurrency analysis

## Ringkasan Temuan

| Severity | Jumlah | Area Terdampak |
|----------|--------|----------------|
| 🔴 Kritis | 8 | Payment, Savings, Cash, Expense, Income, Report, Graduation |
| 🟡 Menengah | 7 | Invoice, Auth, Config, Middleware, Import |
| 🟢 Rendah | 9 | Umum — kualitas kode, konsistensi, logging |

## Daftar Issue

### 🔴 Kritis

| ID | Issue | File Utama | Dampak |
|----|-------|------------|--------|
| [A01-C01](audit-01-c01-toctou-payment-savings.md) | TOCTOU Race Condition — Cek Saldo Tabungan di Payment | `service/payment_service.go:97-110` | Saldo tabungan bisa negatif |
| [A01-C02](audit-01-c02-toctou-cash-transfer.md) | TOCTOU Race Condition — Transfer Kas ke Vault | `service/cash_service.go:77-81` | Saldo kas bisa negatif |
| [A01-C03](audit-01-c03-silent-error-ignoring.md) | Silent Error Ignoring — Zero-Value Masuk Database | 6 file service | Data rusak diam-diam (tanggal `0001-01-01`, saldo 0) |
| [A01-C04](audit-01-c04-toctou-guardian-withdrawal.md) | TOCTOU Race Condition — Penarikan Tabungan Wali | `service/savings_service.go:121-135` | Saldo tabungan bisa negatif |
| [A01-C05](audit-01-c05-global-cache-race.md) | Data Race — Global Cache Tanpa Mutex | `service/report_service.go:152-153` | Fatal data race, crash/panic |
| [A01-C06](audit-01-c06-expense-update-no-cash-sync.md) | Expense Update Tidak Sinkron dengan CashTransaction | `service/expense_service.go:129-145` | Saldo kas tidak akurat |
| [A01-C07](audit-01-c07-expense-delete-no-cash-reverse.md) | Expense/Income Delete Tidak Reverse CashTransaction | `service/expense_service.go:148-158` | Saldo kas overstate |
| [A01-C08](audit-01-c08-promotion-ignore-invoice-error.md) | GenerateRegistration Error Diabaikan di Promotion | `service/academic_event_service.go:294-299` | Siswa naik kelas tanpa invoice registrasi |

### 🟡 Menengah

| ID | Issue | File Utama | Dampak |
|----|-------|------------|--------|
| [A01-M01](audit-01-m01-recalculate-no-transaction.md) | RecalculateInfaqHarian — Update Partial Tanpa Transaksi | `service/invoice_generate_service.go:340-370` | Invoice setengah ter-update jika crash |
| [A01-M02](audit-01-m02-jwt-secret-per-request.md) | JWT Secret Dibaca dari Env Setiap Request | `middleware/auth.go:30` | Overhead syscall, potensi race |
| [A01-M03](audit-01-m03-bubble-sort.md) | Bubble Sort O(n²) Manual | `service/report_service.go:430-435` | Performa buruk pada dataset besar |
| [A01-M04](audit-01-m04-missing-rate-limit.md) | Tidak Ada Rate Limiting | `main.go` (routing) | Rentan brute-force login |
| [A01-M05](audit-01-m05-cors-wildcard.md) | CORS AllowOrigins Wildcard untuk Production | `main.go:120` | Celah keamanan CORS |
| [A01-M06](audit-01-m06-no-graceful-shutdown.md) | Tidak Ada Graceful Shutdown | `main.go:279` | Request terputus saat deploy |
| [A01-M07](audit-01-m07-bulk-create-error-ignored.md) | BulkCreate Error Diabaikan di Import Siswa | `service/student_service.go:284` | Data hilang diam-diam |

### 🟢 Rendah

| ID | Issue | File Utama |
|----|-------|------------|
| [A01-L01](audit-01-l01-page-limit-duplication.md) | Duplikasi Normalisasi Page/Limit di 10+ Service | Semua service `GetAll` |
| [A01-L02](audit-01-l02-brittle-error-mapping.md) | Error Mapping Pakai `strings.Contains` — Brittle | `utility/error.go` |
| [A01-L03](audit-01-l03-hardcoded-date.md) | Hardcoded `beginningOfTime` 2020-01-01 | `service/report_service.go` |
| [A01-L04](audit-01-l04-inconsistent-soft-delete.md) | `SavingsTransaction` Tidak Embed `BaseModelTimeAt` | `model/savings_transaction.go` |
| [A01-L05](audit-01-l05-no-token-blacklist.md) | JWT Logout Tidak Invalidasi Token | `service/auth_service.go` |
| [A01-L06](audit-01-l06-logger-no-response.md) | Logger Hanya Log Request, Tidak Response | `middleware/logrus_logger.go` |
| [A01-L07](audit-01-l07-type-assertion-panic.md) | Type Assertion `c.Get("user_id").(uint)` Tanpa Comma-OK | Seluruh handler |
| [A01-L08](audit-01-l08-daily-closing-create-race.md) | DailyClosing Create Tanpa Transaksi | `service/daily_closing_service.go` |
| [A01-L09](audit-01-l09-duplicate-mapping-silent.md) | Duplicate ExplicitMapping Key — Silent Overwrite | `service/academic_event_service.go` |

## Prioritas Perbaikan

1. **Segera (P0):** A01-C01, A01-C02, A01-C04 — Race condition transaksi keuangan
2. **Segera (P0):** A01-C03 — Silent error causing data corruption
3. **Minggu ini (P1):** A01-C05 — Data race bisa crash server
4. **Minggu ini (P1):** A01-C06, A01-C07 — Inkonsistensi saldo kas
5. **Sprint ini (P2):** A01-C08, A01-M01 s/d A01-M07
6. **Backlog (P3):** A01-L01 s/d A01-L09
