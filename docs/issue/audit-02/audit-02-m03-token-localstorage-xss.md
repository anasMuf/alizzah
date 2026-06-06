# A02-M03: JWT Token di localStorage — XSS Risk

## Problem (Masalah / Konteks)

Token JWT disimpan di `localStorage` yang bisa diakses oleh JavaScript apa pun yang berjalan di origin yang sama. Jika ada XSS (cross-site scripting) — misal dari dependency npm yang compromised — attacker bisa membaca token dan mengirimnya ke server eksternal.

## Current Behavior (Kondisi Saat Ini)

```ts
// AuthContext.tsx
localStorage.setItem('alizzah_token', newToken);

// custom-instance.ts
const token = localStorage.getItem('alizzah_token');
```

Tidak ada proteksi — token bisa dibaca dari DevTools, browser extensions, atau injected script.

## Expected Behavior (Kondisi yang Diharapkan)

### Opsi A: httpOnly cookie (paling aman)
Backend set cookie `Set-Cookie: token=xxx; HttpOnly; Secure; SameSite=Strict` saat login. Frontend tidak perlu menyentuh token — browser otomatis mengirim cookie di setiap request.

### Opsi B: Memory-only token (middle ground)
Simpan token di variable JavaScript (bukan localStorage). Token hilang saat page refresh — user harus login ulang. Bisa dikombinasikan dengan refresh token.

### Opsi C: Content Security Policy (minimal)
Pasang CSP header ketat untuk mencegah inline script execution.

## Relevant Files / Area

- `apps/dashboard/src/features/auth/AuthContext.tsx` — simpan token
- `apps/dashboard/src/api/mutator/custom-instance.ts` — baca token
- `apps/api/handler/auth_handler.go` — backend login endpoint

## Task (Daftar Pekerjaan)

- [ ] Evaluasi pendekatan: httpOnly cookie vs memory-only
- [ ] Jika httpOnly cookie: update backend Login handler untuk set cookie, update frontend untuk tidak simpan token
- [ ] Jika memory-only: ganti localStorage → variable, tambah refresh token flow
- [ ] Minimal: tambah CSP header di backend untuk mitigasi XSS
