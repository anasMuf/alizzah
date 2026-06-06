# A02-L05: `useQueries` N+1 untuk Invoice Detail

## Problem (Masalah / Konteks)

Saat user memilih banyak invoice, halaman kasir pembayaran menggunakan `useQueries` untuk fetch detail setiap invoice secara terpisah. Jika user pilih 10 invoice, akan ada 10 request terpisah ke `GET /v1/invoices/:id`.

## Current Behavior (Kondisi Saat Ini)

```ts
// pembayaran/baru.tsx
const invoiceDetailQueries = useQueries({
  queries: selectedInvoices.map((invId) => ({
    ...getGetV1InvoicesIdQueryOptions(invId),
    enabled: selectedInvoices.includes(invId),
  })),
});
```

Ini adalah N+1 query pattern — 1 request per invoice.

## Expected Behavior (Kondisi yang Diharapkan)

Opsi A: backend endpoint baru `GET /v1/invoices/batch?ids=1,2,3` — satu request untuk banyak invoice.

Opsi B: gunakan data dari list response `GET /v1/students/:id/invoices` yang sudah include items. Data invoice items mungkin sudah ada di list (tergantung backend).

Opsi C: minimal, jangan fetch detail kalau data yang dibutuhkan (items + paid_amount) sudah tersedia dari list response.

## Relevant Files / Area

- `apps/dashboard/src/routes/_authenticated/keuangan/pembayaran/baru.tsx`
- `apps/api/handler/invoice_handler.go` — backend (opsional batch endpoint)

## Task (Daftar Pekerjaan)

- [ ] Periksa: apakah `GET /v1/students/:id/invoices` sudah include `items`?
- [ ] Jika ya: gunakan data dari list, hapus `useQueries`
- [ ] Jika tidak: tambah backend batch endpoint atau perluas list response
