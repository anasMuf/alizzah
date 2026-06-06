# A02-L04: File Page Terlalu Besar — `baru.tsx` 550+ Baris

## Problem (Masalah / Konteks)

Halaman kasir pembayaran (`pembayaran/baru.tsx`) mencapai 550+ baris dalam satu file. Semua logic — student search, invoice selection, payment calculation, form, mutation — ada di satu komponen. Sangat sulit di-maintain dan di-test.

## Current Behavior (Kondisi Saat Ini)

```
apps/dashboard/src/routes/_authenticated/keuangan/pembayaran/baru.tsx — 554 baris
```

Berisi:
- Student search state + fetch
- Invoice list state + fetch + selection
- Invoice detail `useQueries` (N+1)
- Incidental items state
- Cash calculation
- Savings balance fetch
- Payment mutation
- UI rendering campur logic

## Expected Behavior (Kondisi yang Diharapkan)

Split menjadi beberapa file:

```
pembayaran/
├── index.tsx              # list
├── $id.tsx                # detail
├── baru.tsx               # page shell (minimal)
└── components/
    ├── StudentSearch.tsx  # pencarian siswa
    ├── InvoiceSelector.tsx # pilih tagihan
    ├── PaymentForm.tsx    # form input + kalkulasi
    └── PaymentSummary.tsx # ringkasan sebelum submit
```

## Relevant Files / Area

- `apps/dashboard/src/routes/_authenticated/keuangan/pembayaran/baru.tsx`

## Task (Daftar Pekerjaan)

- [ ] Extract `StudentSearch` component (~100 baris)
- [ ] Extract `InvoiceSelector` component (~150 baris)
- [ ] Extract `PaymentForm` component (~200 baris)
- [ ] Extract `PaymentSummary` component (~50 baris)
- [ ] Page shell hanya orchestration + layout (~100 baris)
