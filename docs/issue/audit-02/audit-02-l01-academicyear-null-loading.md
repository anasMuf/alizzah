# A02-L01: `academicYearAtom` Null Saat Page Load Pertama

## Problem (Masalah / Konteks)

`academicYearAtom` dari Jotai diinisialisasi `null`. Saat halaman pertama kali di-load, atom belum terisi → `activeAy?.id` return `undefined` → request API dengan `academic_year_id: undefined` gagal atau return data kosong.

User harus menunggu `AcademicYearSelector` selesai fetch baru data muncul — UX buruk.

## Current Behavior (Kondisi Saat Ini)

```ts
// store/global.ts
export const academicYearAtom = atom<AcademicYear | null>(null);

// halaman pembayaran/index.tsx
const [activeAy] = useAtom(academicYearAtom);
const { data: paymentsData, isLoading } = useGetV1Payments(
  { page, limit: 20, academic_year_id: activeAy?.id },  // ← undefined saat awal
);
```

Semua halaman yang tergantung `academicYearAtom` mengalami masalah yang sama.

## Expected Behavior (Kondisi yang Diharapkan)

Gunakan TanStack Query untuk fetch tahun ajaran aktif, lalu set atom:

```ts
// Di DashboardLayout atau __root.tsx — prefetch academic year
const { data: activeAY } = useGetV1AcademicYearsActive();
useEffect(() => {
  if (activeAY) setAcademicYear(activeAY);
}, [activeAY]);
```

Atau: disable query sampai atom tersedia:

```ts
const { data } = useGetV1Payments(
  { ...params, academic_year_id: activeAy!.id },
  { query: { enabled: !!activeAy } }  // ← tunda sampai ada
);
```

## Relevant Files / Area

- Semua page di `routes/_authenticated/`
- `apps/dashboard/src/store/global.ts`

## Task (Daftar Pekerjaan)

- [ ] Tambah `enabled: !!activeAy` di semua query yang pakai `academic_year_id`
- [ ] Atau: prefetch active academic year di root layout
- [ ] Tampilkan loading state yang proper saat atom belum siap
