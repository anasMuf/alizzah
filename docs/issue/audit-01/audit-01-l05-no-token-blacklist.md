# A01-L05: JWT Logout Tidak Invalidasi Token

## Problem (Masalah / Konteks)

Endpoint `POST /auth/logout` tidak melakukan apa pun selain mengembalikan response sukses. Token JWT yang sudah ada **tetap valid** sampai expired. Tidak ada blacklist/revocation mechanism.

## Current Behavior (Kondisi Saat Ini)

**File:** `apps/api/handler/auth_handler.go` — `Logout` handler

Tidak ada logic untuk menginvalidasi token. `Login` menghasilkan JWT dengan expiry 24 jam, dan tidak ada cara untuk membatalkan token sebelum 24 jam.

### Dampak
- User logout → token masih bisa dipakai 24 jam
- Jika token dicuri, tidak bisa direvoke
- Session management tidak aman

## Expected Behavior (Kondisi yang Diharapkan)

Beberapa opsi:

### Opsi A: Token Blacklist (Redis/DB)
Simpan token yang di-logout di Redis/DB dengan TTL = sisa waktu expiry token. Middleware `JWTAuth` cek blacklist.

### Opsi B: Short-lived Token + Refresh
Token access 15 menit, refresh token 24 jam. Logout = hapus refresh token.

### Opsi C: Versi Sederhana (acceptable untuk internal app)
Jika ini aplikasi internal, dokumentasikan bahwa logout tidak menginvalidasi token, dan andalkan short expiry + HTTPS.

## Relevant Files / Area

- `apps/api/handler/auth_handler.go` — Logout handler
- `apps/api/middleware/auth.go` — JWT validation
- `apps/api/service/auth_service.go` — Login (set 24h expiry)

## Task (Daftar Pekerjaan)

- [ ] Evaluasi kebutuhan: apakah butuh token revocation?
- [ ] Jika ya: implementasi blacklist dengan Redis/in-memory
- [ ] Jika tidak untuk sekarang: kurangi token expiry ke 1-2 jam
- [ ] Dokumentasikan keputusan di issue ini
