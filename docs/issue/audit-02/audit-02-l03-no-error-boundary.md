# A02-L03: Tidak Ada Error Boundary

## Problem (Masalah / Konteks)

Tidak ada React Error Boundary di aplikasi. Jika terjadi error saat render (misal `undefined.map()`, atau akses property dari `null`), seluruh aplikasi crash — layar putih tanpa pesan apa pun.

## Current Behavior (Kondisi Saat Ini)

Tidak ada `<ErrorBoundary>` di manapun di component tree. TanStack Router support `errorComponent` per-route, tapi tidak dipakai.

## Expected Behavior (Kondisi yang Diharapkan)

Pasang ErrorBoundary global di root:

```tsx
// main.tsx
import { ErrorBoundary } from './components/molecules/ErrorBoundary';

<ErrorBoundary>
  <AuthProvider>
    <RouterProvider router={router} />
  </AuthProvider>
</ErrorBoundary>
```

Komponent ErrorBoundary:

```tsx
function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
        <h2 className="mt-4 text-lg font-semibold">Terjadi kesalahan</h2>
        <p className="mt-2 text-sm text-gray-500">{error.message}</p>
        <button onClick={() => window.location.reload()} className="mt-4 ...">
          Muat ulang
        </button>
      </div>
    </div>
  );
}
```

## Relevant Files / Area

- `apps/dashboard/src/main.tsx`
- `apps/dashboard/src/routes/__root.tsx`

## Task (Daftar Pekerjaan)

- [ ] Buat komponen `ErrorBoundary` (class component dengan `componentDidCatch`)
- [ ] Pasang di root layout
- [ ] Tambah `errorComponent` per-route untuk error spesifik
