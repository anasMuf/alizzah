# A02-M04: Tidak Ada Retry / Offline Handling

## Problem (Masalah / Konteks)

`custom-instance.ts` tidak punya retry logic. Jika network gagal (koneksi putus, server restart), request gagal dan user hanya dapat toast error. Tidak ada:
- Automatic retry
- Exponential backoff
- Offline queue untuk mutation

TanStack Query sudah support retry built-in, tapi tidak dikonfigurasi.

## Current Behavior (Kondisi Saat Ini)

```ts
// custom-instance.ts — tidak ada retry config
const response = await fetch(url.toString(), { ... });
if (!response.ok) {
  throw new ApiError({ ... });
}
```

Dan di query client setup — tidak ada default retry:

```ts
// main.tsx atau router.tsx — tidak ada QueryClient default options
const queryClient = new QueryClient();  // default: retry 3x, tapi tidak ada konfigurasi
```

## Expected Behavior (Kondisi yang Diharapkan)

Konfigurasi retry di QueryClient:

```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      staleTime: 30 * 1000,  // 30 detik sebelum refetch
    },
    mutations: {
      retry: 1,
    },
  },
});
```

## Relevant Files / Area

- `apps/dashboard/src/main.tsx` — QueryClient setup
- `apps/dashboard/src/api/mutator/custom-instance.ts` — fetch wrapper

## Task (Daftar Pekerjaan)

- [ ] Tambah `retry` dan `retryDelay` di QueryClient default options
- [ ] Set `staleTime` default 30 detik untuk mengurangi refetch berlebihan
- [ ] Tambah `retry: 1` untuk mutations (idempotent mutation bisa retry)
- [ ] Tampilkan indikator "Reconnecting..." saat network error berturut-turut
