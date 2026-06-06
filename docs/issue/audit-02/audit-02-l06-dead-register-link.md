# A02-L06: Link Register Tidak Ada Fungsinya

## Problem (Masalah / Konteks)

Halaman login menampilkan link ke `/register`:

```tsx
<p className="mt-10 text-center text-sm/6 text-gray-500">
  Don't have an account?{' '}
  <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-500">
    Register here
  </Link>
</p>
```

Tapi fitur register tidak diimplementasikan — halaman register hanya form tanpa backend handler yang berfungsi. User akan bingung.

## Current Behavior (Kondisi Saat Ini)

- `login.tsx` — render link register
- `register.tsx` — halaman ada tapi tidak functional (tidak ada user creation endpoint yang public)

## Expected Behavior (Kondisi yang Diharapkan)

Hapus link register sampai fitur siap:

```tsx
// login.tsx — hapus paragraf register link
```

Atau jika ingin dipertahankan: implementasikan user creation dengan role terbatas (misal hanya role `wali` yang bisa self-register).

## Relevant Files / Area

- `apps/dashboard/src/routes/login.tsx:29-33`
- `apps/dashboard/src/routes/register.tsx`

## Task (Daftar Pekerjaan)

- [ ] Hapus link register dari halaman login
- [ ] Atau: buat halaman register kosong dengan pesan "Hubungi administrator"
