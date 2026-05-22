# Backend Implementation Plan: Alizzah Manajemen

> Berdasarkan: `api-contract.md` dan `erd.md`

---

## Overview

Total endpoint: **99 endpoint** yang dibagi menjadi **7 batch** implementasi.
Setiap batch dapat di-develop dan di-test secara mandiri sebelum melanjutkan ke batch berikutnya.

---

## Konvensi Implementasi

Setiap domain baru mengikuti urutan layer berikut:

```
model/ → dto/ → repository/ → service/ → handler/ → route registration
```

### Struktur File per Domain

```
apps/api/
├── model/
│   └── {domain}.go           ← GORM struct + constraint tags
├── dto/
│   └── {domain}.go           ← Request / Response struct + validate tags
├── repository/
│   └── {domain}_repository.go ← Interface + GORM implementation
├── service/
│   └── {domain}_service.go   ← Interface + business logic
├── handler/
│   └── {domain}_handler.go   ← Echo handler + Swagger annotation
└── main.go                   ← Route registration + DI wiring
```

### Template Layer

```go
// repository — contoh pattern
type StudentRepository interface {
    FindAll(params dto.StudentQueryParams) ([]model.Student, int64, error)
    FindByID(id uint) (*model.Student, error)
    Create(student *model.Student) error
    Update(student *model.Student) error
    Delete(id uint) error
}

// service — contoh pattern
type StudentService interface {
    GetAll(params dto.StudentQueryParams) ([]dto.StudentResponse, *dto.Meta, error)
    GetByID(id uint) (*dto.StudentDetailResponse, error)
    Create(req dto.CreateStudentRequest) (*dto.StudentResponse, error)
    Update(id uint, req dto.UpdateStudentRequest) (*dto.StudentResponse, error)
    Delete(id uint) error
}
```

### Middleware yang Digunakan

```go
// JWT auth — semua route kecuali /auth/login
e.Use(middleware.JWTAuth(jwtSecret))

// Role guard — per route group
middleware.RequireRoles("superadmin", "admin_keuangan")
```

---

## Ringkasan Batch

| Batch | Domain | Endpoint | Dependencies |
|-------|--------|----------|--------------|
| [Batch 1](./batch-01.md) | Foundation: Auth, Users, Academic Years | 13 | — |
| [Batch 2](./batch-02.md) | Administrasi: Master Data | 18 | Batch 1 |
| [Batch 3](./batch-03.md) | Administrasi: Relasi & Daycare | 18 | Batch 2 |
| [Batch 4](./batch-04.md) | Siklus Akademik & Konfigurasi Tarif | 13 | Batch 3 |
| [Batch 5](./batch-05.md) | Keuangan: Tagihan (Invoice) | 12 | Batch 4 |
| [Batch 6](./batch-06.md) | Keuangan: Pembayaran, Tabungan & Pengeluaran | 17 | Batch 5 |
| [Batch 7](./batch-07.md) | Keuangan: Kas, Tutup Buku & Laporan | 14 | Batch 6 |
| **Total** | | **99** | |

---

## Alur Dependensi Antar Batch

```
Batch 1 (Foundation)
    ↓
Batch 2 (Master Data Administrasi)
    ↓
Batch 3 (Relasi & Daycare)
    ↓
Batch 4 (Siklus Akademik + Fee Config)
    ↓
Batch 5 (Invoice)
    ↓
Batch 6 (Payment, Savings, Expense)
    ↓
Batch 7 (Kas, Daily Closing, Report)
```

> Batch 2 dan 5 paling berat dari sisi jumlah layer. Batch 4 paling kompleks dari sisi logika bisnis.

---

## Shared Utilities yang Harus Dibuat di Batch 1

Dibuat sekali dan dipakai semua batch berikutnya:

| Utility | File | Keterangan |
|---|---|---|
| Base model | `model/model.go` | `PrimaryKey`, `BaseModelTimeAt` |
| Success response | `dto/success_response.go` | wrapper `{message, data}` |
| Error response | `dto/error_response.go` | wrapper `{message}` |
| Paginated response | `dto/paginated_response.go` | wrapper `{message, data, meta}` |
| JWT middleware | `middleware/auth.go` | extract & validate token |
| Role guard | `middleware/role.go` | `RequireRoles(roles ...string)` |
| Validator | `utility/validator.go` | custom Echo validator |
| Error handler | `handler/error_handler.go` | custom Echo error handler |
| Pagination helper | `utility/pagination.go` | parse `page` & `limit` dari query |

---

## Acceptance Criteria Global

Setiap batch dinyatakan selesai jika:

- [ ] Semua endpoint di batch tersebut mengembalikan response sesuai `api-contract.md`
- [ ] JWT auth dan role guard berfungsi di setiap endpoint
- [ ] Validasi request body mengembalikan `400` dengan pesan yang jelas
- [ ] Swagger annotation lengkap di setiap handler
- [ ] Tidak ada unhandled panic / unhandled error
