# A02-L02: Loading Spinner Tidak Konsisten

## Problem (Masalah / Konteks)

Beberapa halaman menggunakan full-page loading spinner (`_authenticated.tsx`), sementara list page lain tidak punya loading state yang jelas — data kosong dan loading state tidak bisa dibedakan.

## Current Behavior (Kondisi Saat Ini)

- `_authenticated.tsx`: full-page spinner dengan teks "Loading..."
- List page (pembayaran, tagihan, dll): tidak ada loading indicator — tabel langsung muncul kosong lalu terisi

User experience tidak konsisten.

## Expected Behavior (Kondisi yang Diharapkan)

Gunakan komponen loading yang konsisten di semua page:

```tsx
// components/molecules/PageLoading.tsx
export function PageLoading() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent" />
      <span className="ml-3 text-sm text-gray-500">Memuat data...</span>
    </div>
  );
}
```

## Relevant Files / Area

- `apps/dashboard/src/routes/_authenticated.tsx`
- Semua list page di `routes/_authenticated/`

## Task (Daftar Pekerjaan)

- [ ] Buat komponen `PageLoading`
- [ ] Ganti semua loading state di page dengan komponen tersebut
- [ ] Bedakan antara "loading" dan "data kosong" — tampilkan EmptyState jika sudah loaded tapi kosong
