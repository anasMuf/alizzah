# A01-L07: Type Assertion `c.Get("user_id").(uint)` Tanpa Comma-OK

## Problem (Masalah / Konteks)

Seluruh handler menggunakan type assertion tanpa comma-ok pattern:

```go
createdBy := c.Get("user_id").(uint)
```

Jika key `"user_id"` tidak ada di context (misal middleware `JWTAuth` tidak terpasang), ini akan **panic** dan crash server (atau goroutine handler tersebut).

## Current Behavior (Kondisi Saat Ini)

Tersebar di seluruh handler. Contoh:

**File:** `apps/api/handler/payment_handler.go:95`
```go
createdBy := c.Get("user_id").(uint)
```

**File:** `apps/api/handler/savings_handler.go:127`
```go
createdBy := c.Get("user_id").(uint)
```

Dan semua handler `Create`, `Update`, `Delete`.

## Expected Behavior (Kondisi yang Diharapkan)

Gunakan comma-ok pattern:

```go
userID, ok := c.Get("user_id").(uint)
if !ok {
    return c.JSON(http.StatusUnauthorized, dto.ErrorResponse{
        Status: http.StatusUnauthorized, 
        Code: "UNAUTHORIZED", 
        Message: "User ID tidak ditemukan di context",
    })
}
```

Atau buat helper:

```go
func GetUserID(c echo.Context) (uint, error) {
    id, ok := c.Get("user_id").(uint)
    if !ok {
        return 0, echo.NewHTTPError(http.StatusUnauthorized, "Unauthorized")
    }
    return id, nil
}
```

## Relevant Files / Area

- Seluruh handler di `apps/api/handler/` — cari `c.Get("user_id").(uint)`
- `apps/api/handler/payment_handler.go:95`
- `apps/api/handler/savings_handler.go:127`
- Dan 10+ file lainnya

## Task (Daftar Pekerjaan)

- [ ] Audit semua `c.Get(...).(type)` tanpa comma-ok
- [ ] Buat helper `GetUserID(c)` dan `GetCurrentUser(c)` dengan error handling
- [ ] Ganti semua direct type assertion dengan helper
