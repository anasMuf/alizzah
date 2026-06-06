# A02-M02: AuthContext `useEffect` Dependency Loop Risk

## Problem (Masalah / Konteks)

`AuthContext` memiliki `useEffect` yang memanggil `logout()` saat `isError`. `logout` adalah `useCallback` dengan dep `[queryClient]`. Jika `queryClient` reference berubah, `logout` berubah → `useEffect` re-run → potensi infinite loop.

## Current Behavior (Kondisi Saat Ini)

```ts
// features/auth/AuthContext.tsx
const logout = useCallback(() => {
  localStorage.removeItem('alizzah_token');
  localStorage.removeItem('alizzah_role');
  setToken(null);
  queryClient.removeQueries({ queryKey: getGetV1AuthMeQueryKey() });
}, [queryClient]);                             // ← dep pada queryClient

useEffect(() => {
  if (isError) {
    logout();                                   // ← dipanggil di effect
  }
}, [isError, logout]);                         // ← logout sebagai dep
```

React 19 StrictMode di development double-invokes effect — ini bisa memicu chain re-render.

## Expected Behavior (Kondisi yang Diharapkan)

Pindahkan logout logic ke `onError` callback di query options:

```ts
const { data: userResponse, isLoading, isError } = useGetV1AuthMe(
  { 
    query: { 
      enabled: !!token, 
      retry: false, 
      staleTime: 5 * 60 * 1000,
      // Tangani expired token di sini, bukan di useEffect
    } 
  }
);

// Effect hanya untuk side-effect non-logout
useEffect(() => {
  if (isError) {
    // Hapus token saja — query sudah auto-disabled karena token null
    localStorage.removeItem('alizzah_token');
    localStorage.removeItem('alizzah_role');
    setToken(null);
  }
}, [isError]);  // ← tidak ada dep logout
```

## Relevant Files / Area

- `apps/dashboard/src/features/auth/AuthContext.tsx`

## Task (Daftar Pekerjaan)

- [ ] Pisahkan logout logic dari `useEffect` dependency
- [ ] Hapus `useCallback` dari `logout` atau stabilkan dependency-nya
- [ ] Test dengan React StrictMode — pastikan tidak ada warning
