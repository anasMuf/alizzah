# A02-M01: TypeScript `any` Casting Masif di Response API

## Problem (Masalah / Konteks)

Semua halaman menggunakan `as any` untuk mengakses data dari response API. Orval sudah meng-generate typed response types (misal `postV1AuthLoginResponse200`), tapi tidak dipakai. Akibatnya TypeScript tidak bisa mendeteksi typo field name, missing property, atau restructure yang salah.

## Current Behavior (Kondisi Saat Ini)

Hampir setiap halaman:

```ts
// pembayaran/index.tsx
const payments = (paymentsData?.data as any)?.data || [];

// pembayaran/baru.tsx
const students = (studentsResp?.data as any)?.data || [];
const allInvoices = (invoicesResp?.data as any)?.data || [];
const savings = (savingsResp?.data as any)?.data;
```

Generated types dari Orval yang **sudah ada** di `api/model/`:

```ts
// api/model/dtoPaymentListResponse.ts
export interface DtoPaymentListResponse {
  id: number;
  student: DtoStudentBriefResponse;
  payment_date: string;
  total_amount: number;
  source: string;
  // ...
}
```

## Expected Behavior (Kondisi yang Diharapkan)

Gunakan type assertion ke generated type:

```ts
import type { DtoPaymentListResponse } from '../../api/model/dtoPaymentListResponse';

const payments: DtoPaymentListResponse[] = (paymentsData?.data as any)?.data || [];
```

Atau lebih baik: buat generic helper:

```ts
// utils/api-helpers.ts
export function extractData<T>(response: { data?: { data?: T } } | undefined): T[] {
  return (response as any)?.data?.data || [];
}

// penggunaan:
const payments = extractData<DtoPaymentListResponse>(paymentsData);
```

## Relevant Files / Area

- **Semua file di `routes/`** — `as any` untuk access response data
- `apps/dashboard/src/api/model/` — generated types sudah tersedia

## Task (Daftar Pekerjaan)

- [ ] Audit semua pemakaian `as any` di folder `routes/`
- [ ] Buat helper `extractData<T>()` di `utils/`
- [ ] Ganti semua `as any` cast dengan typed access
- [ ] Setup ESLint rule `@typescript-eslint/no-explicit-any` (warn)
