# A01-L01: Duplikasi Normalisasi Page/Limit di 10+ Service

## Problem (Masalah / Konteks)

Hampir setiap service memiliki kode normalisasi page/limit yang identik:

```go
page := params.Page
if page < 1 {
    page = 1
}
limit := params.Limit
if limit < 1 {
    limit = 20
}
meta := &dto.Meta{Page: page, Limit: limit, Total: total}
```

Kode ini diduplikasi di **10+ file** — melanggar DRY.

## Relevant Files / Area

- `apps/api/service/payment_service.go`
- `apps/api/service/savings_service.go`
- `apps/api/service/invoice_service.go`
- `apps/api/service/expense_service.go`
- `apps/api/service/income_transaction_service.go`
- `apps/api/service/student_service.go`
- Dan lain-lain (cek `grep -rn "if page < 1" apps/api/`)

## Task (Daftar Pekerjaan)

- [ ] Buat utility function: `utility.NormalizePagination(page, limit int) (int, int)`
- [ ] Buat utility function: `utility.NewMeta(page, limit int, total int64) *dto.Meta`
- [ ] Ganti semua duplikasi dengan pemanggilan utility
