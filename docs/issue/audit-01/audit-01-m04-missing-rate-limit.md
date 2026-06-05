# A01-M04: Tidak Ada Rate Limiting

## Problem (Masalah / Konteks)

Tidak ada mekanisme rate limiting di level API. Endpoint login (`POST /api/v1/auth/login`) rentan terhadap **brute-force attack** — attacker bisa mencoba ribuan kombinasi email/password tanpa batasan.

Endpoint lain yang sensitif terhadap abuse: `POST /payments`, `POST /expenses`, `POST /students/import`.

## Current Behavior (Kondisi Saat Ini)

**File:** `apps/api/main.go:279`

```go
e.Logger.Fatal(e.Start(":" + port))
```

Tidak ada middleware rate limiter yang terpasang. Tidak ada library rate limiting di `go.mod`.

## Expected Behavior (Kondisi yang Diharapkan)

Pasang rate limiter dengan tier berbeda:

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /auth/login` | 5 req | per menit per IP |
| `POST /auth/login` | 20 req | per menit per IP (setelah cooldown) |
| API umum (authenticated) | 100 req | per menit per user |
| `POST /students/import` | 3 req | per menit per user |

Library rekomendasi:
- `github.com/ulule/limiter/v3` — simple, support Redis/in-memory
- `golang.org/x/time/rate` — built-in Go, tapi perlu wrapper untuk Echo middleware

## Relevant Files / Area

- `apps/api/main.go` — tempat pasang middleware
- `apps/api/go.mod` — perlu tambah dependency

## Task (Daftar Pekerjaan)

- [ ] Pilih library rate limiting (`ulule/limiter` atau custom dengan `x/time/rate`)
- [ ] Buat middleware rate limiter untuk Echo
- [ ] Pasang di endpoint login dengan limit ketat
- [ ] Pasang di endpoint API umum dengan limit standar
- [ ] Buat limit configurable via environment variable
- [ ] Return 429 dengan header `Retry-After`
