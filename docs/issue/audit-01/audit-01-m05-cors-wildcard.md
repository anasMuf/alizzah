# A01-M05: CORS AllowOrigins Wildcard untuk Production

## Problem (Masalah / Konteks)

CORS middleware dikonfigurasi dengan `AllowOrigins: ["*"]` (wildcard). Ini tidak aman untuk production karena membuka API ke request dari origin mana pun. Harusnya dibatasi ke domain frontend yang spesifik.

## Current Behavior (Kondisi Saat Ini)

**File:** `apps/api/main.go:120-124`

```go
e.Use(echoMiddleware.CORSWithConfig(echoMiddleware.CORSConfig{
    AllowOrigins: []string{"*"},
    AllowMethods: []string{echo.GET, echo.POST, echo.PUT, echo.PATCH, echo.DELETE},
    AllowHeaders: []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization},
}))
```

### Dampak
- Any website dapat membuat request ke API ini dari browser user
- Jika user sedang login, cookie/token bisa tereksploitasi oleh malicious site (meskipun pakai JWT header, `*` tetap memperbolehkan semua origin)
- Tidak bisa pakai `Access-Control-Allow-Credentials: true` karena kombinasi `*` + credentials dilarang browser — tapi token-based auth via header masih bisa

## Expected Behavior (Kondisi yang Diharapkan)

Origin harus configurable via environment:

```go
allowedOrigins := strings.Split(os.Getenv("CORS_ALLOWED_ORIGINS"), ",")
if len(allowedOrigins) == 1 && allowedOrigins[0] == "" {
    allowedOrigins = []string{"http://localhost:5173"} // default dev
}

e.Use(echoMiddleware.CORSWithConfig(echoMiddleware.CORSConfig{
    AllowOrigins: allowedOrigins,
    // ...
}))
```

`.env.example`:
```
CORS_ALLOWED_ORIGINS=http://localhost:5173,https://dashboard.alizzah.sch.id
```

## Relevant Files / Area

- `apps/api/main.go:120-124` — CORS config
- `.env.example` — perlu tambah variabel

## Task (Daftar Pekerjaan)

- [ ] Baca origin dari environment variable `CORS_ALLOWED_ORIGINS`
- [ ] Default ke `http://localhost:5173` untuk development
- [ ] Tambahkan `CORS_ALLOWED_ORIGINS` ke `.env.example`
- [ ] Dokumentasikan di README deployment
