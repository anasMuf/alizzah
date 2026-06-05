# A01-L04: `SavingsTransaction` Tidak Embed `BaseModelTimeAt`

## Problem (Masalah / Konteks)

`SavingsTransaction` mendefinisikan `CreatedAt` dan `UpdatedAt` secara manual, tidak menggunakan `BaseModelTimeAt` seperti model lainnya. Akibatnya:
- Tidak ada soft delete (`DeletedAt`)
- Inkonsisten dengan konvensi model lainnya

## Current Behavior (Kondisi Saat Ini)

**File:** `apps/api/model/savings_transaction.go:11-12`

```go
type SavingsTransaction struct {
    PrimaryKey
    StudentSavingsID uint    `gorm:"not null;index"`
    // ...
    CreatedAt time.Time     // ← manual, bukan dari BaseModelTimeAt
    UpdatedAt time.Time     // ← manual
    // ❌ Tidak ada DeletedAt
}
```

Bandingkan dengan model lain yang pakai `BaseModelTimeAt`:
```go
type BaseModelTimeAt struct {
    CreatedAt time.Time      `json:"created_at" gorm:"autoCreateTime"`
    UpdatedAt time.Time      `json:"updated_at" gorm:"autoUpdateTime"`
    DeletedAt gorm.DeletedAt `json:"deleted_at,omitempty" gorm:"index" swaggerignore:"true"`
}
```

## Expected Behavior (Kondisi yang Diharapkan)

Embed `BaseModelTimeAt` seperti model lainnya:

```go
type SavingsTransaction struct {
    PrimaryKey
    StudentSavingsID uint    `gorm:"not null;index"`
    // ...
    BaseModelTimeAt  // ← ganti CreatedAt/UpdatedAt manual
}
```

## Relevant Files / Area

- `apps/api/model/savings_transaction.go` — definisi model

## Task (Daftar Pekerjaan)

- [ ] Ganti `CreatedAt time.Time` + `UpdatedAt time.Time` manual dengan `BaseModelTimeAt`
- [ ] Pastikan tidak ada kode yang bergantung pada field manual
- [ ] Jalankan AutoMigrate — GORM akan menambah kolom `deleted_at`
