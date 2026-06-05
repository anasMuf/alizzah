# A01-L02: Error Mapping Pakai `strings.Contains` — Brittle

## Problem (Masalah / Konteks)

`GetErrorStatusAndCode` menggunakan `strings.Contains` untuk memetakan error message ke HTTP status code. Pendekatan ini brittle — perubahan kecil di wording error bisa mengubah behavior.

## Current Behavior (Kondisi Saat Ini)

**File:** `apps/api/utility/error.go`

```go
func GetErrorStatusAndCode(err error) (int, string) {
    msg := err.Error()
    if strings.Contains(msg, "tidak ditemukan") {
        return http.StatusNotFound, "NOT_FOUND"
    }
    if strings.Contains(msg, "sudah") || strings.Contains(msg, "aktif") {
        return http.StatusConflict, "CONFLICT"
    }
    return http.StatusBadRequest, "BAD_REQUEST"
}
```

### Masalah:
- Kata "sudah" bisa match di konteks apa pun: `"Jumlah sudah...`, `"Sudah termasuk..."`
- Kata "aktif" bisa match: `"Siswa tidak aktif"` (harusnya 400/422, bukan 409)
- Tidak bisa membedakan 422 (Unprocessable Entity) dari 400 (Bad Request)

## Expected Behavior (Kondisi yang Diharapkan)

Gunakan **custom error types**:

```go
type AppError struct {
    Code    int
    Message string
}

func (e *AppError) Error() string { return e.Message }

func NewNotFoundError(msg string) *AppError {
    return &AppError{Code: http.StatusNotFound, Message: msg}
}

func NewConflictError(msg string) *AppError {
    return &AppError{Code: http.StatusConflict, Message: msg}
}

// Di handler:
func GetErrorStatusAndCode(err error) (int, string) {
    var appErr *AppError
    if errors.As(err, &appErr) {
        return appErr.Code, "..." 
    }
    // ...
}
```

## Relevant Files / Area

- `apps/api/utility/error.go` — GetErrorStatusAndCode
- Seluruh service — perlu ganti `errors.New(...)` dengan custom error type
- Seluruh handler — pemanggil utility

## Task (Daftar Pekerjaan)

- [ ] Buat custom error types (`NotFoundError`, `ConflictError`, `ValidationError`, dll)
- [ ] Update seluruh service untuk menggunakan custom error types
- [ ] Update `GetErrorStatusAndCode` untuk menangani custom error types via `errors.As`
- [ ] Fallback ke `strings.Contains` hanya untuk backward compatibility sementara
