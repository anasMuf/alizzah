# A02-M05: Tidak Ada Form Validation Library

## Problem (Masalah / Konteks)

Semua halaman form melakukan validasi manual dengan `if` statement + toast error. Tidak ada library validasi terstruktur (Zod, Yup) atau form state management (React Hook Form, Formik). Akibatnya validasi inkonsisten antar halaman dan edge case mudah terlewat.

## Current Behavior (Kondisi Saat Ini)

```ts
// LoginForm.tsx — validasi minimal, tidak ada sama sekali di form ini
// (hanya mengandalkan HTML `required` attribute)

// pembayaran/baru.tsx — validasi manual inline
const handlePay = () => {
  if (selectedStudent === null) {
    addToast({ variant: 'error', title: 'Error', message: 'Pilih siswa' });
    return;
  }
  if (selectedInvoices.length === 0 && totalIncidentalAmount === 0) {
    addToast({ variant: 'error', title: 'Error', message: 'Pilih minimal satu item' });
    return;
  }
  // ... banyak if lain
};
```

Masalah:
- Tidak ada validasi angka (bisa input negatif, NaN)
- Tidak ada validasi format tanggal
- Tidak ada validasi string length
- Error message tidak terstruktur — manual string

## Expected Behavior (Kondisi yang Diharapkan)

Gunakan Zod + React Hook Form:

```ts
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const paymentSchema = z.object({
  student_id: z.number().positive(),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source: z.enum(['cash', 'savings']),
  items: z.array(z.object({
    invoice_item_id: z.number().positive(),
    amount: z.number().positive('Jumlah harus > 0'),
  })).min(1, 'Minimal satu item pembayaran'),
});

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(paymentSchema),
});
```

## Relevant Files / Area

- Semua halaman form di `routes/`
- `apps/dashboard/package.json` — perlu tambah dependency

## Task (Daftar Pekerjaan)

- [ ] Install `zod`, `react-hook-form`, `@hookform/resolvers`
- [ ] Buat Zod schema untuk setiap form (minimal: login, pembayaran, siswa, tarif)
- [ ] Migrasi halaman form ke React Hook Form secara bertahap
- [ ] Mulai dari form paling kritis: pembayaran
