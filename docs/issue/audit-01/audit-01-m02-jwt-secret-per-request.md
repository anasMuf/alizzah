# A01-M02: JWT Secret Dibaca dari Env Setiap Request

## Problem (Masalah / Konteks)

Middleware `JWTAuth` memanggil `os.Getenv("JWT_SECRET")` pada **setiap request** yang masuk. Ini tidak perlu — secret bisa dibaca sekali saat startup.

## Current Behavior (Kondisi Saat Ini)

**File:** `apps/api/middleware/auth.go:30`

```go
func JWTAuth(next echo.HandlerFunc) echo.HandlerFunc {
    return func(c echo.Context) error {
        authHeader := c.Request().Header.Get("Authorization")
        // ...
        tokenString := strings.TrimPrefix(authHeader, "Bearer ")
        
        // ❌ Dibaca setiap request
        secret := os.Getenv("JWT_SECRET")  // baris 30
        
        token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
            // ...
            return []byte(secret), nil
        })
        // ...
    }
}
```

### Dampak
- Overhead syscall `getenv` per request (minor, tapi unnecessary)
- Potensi race condition dengan `os.Setenv` (jika ada kode yang mengubah env di runtime — tidak ada saat ini, tapi best practice)

## Expected Behavior (Kondisi yang Diharapkan)

Baca secret sekali saat startup:

```go
var jwtSecret []byte

func init() {
    jwtSecret = []byte(os.Getenv("JWT_SECRET"))
}

func JWTAuth(next echo.HandlerFunc) echo.HandlerFunc {
    return func(c echo.Context) error {
        // ...
        token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
            return jwtSecret, nil
        })
        // ...
    }
}
```

Atau injeksi via constructor/dependency injection:

```go
func NewJWTAuthMiddleware(secret string) echo.MiddlewareFunc { ... }
```

## Relevant Files / Area

- `apps/api/middleware/auth.go:30` — `os.Getenv("JWT_SECRET")` per request

## Task (Daftar Pekerjaan)

- [ ] Baca `JWT_SECRET` sekali (di `init()` atau via constructor)
- [ ] Simpan sebagai package-level variable atau field struct
- [ ] Verifikasi behavior tidak berubah
