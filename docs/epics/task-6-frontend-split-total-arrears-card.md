# Task 6: Pecah Kartu "Total Tunggakan" menjadi TA Aktif vs TA Lain

> **Epic:** [Tagihan Tunggakan (Backfill) + CRUD Tagihan Manual](./tagihan-tunggakan-backfill.md)
> **Status:** Done (frontend)
> **Priority:** P2 (opsional — menyempurnakan keterbacaan)

---

## Goal

Kartu "Total Tunggakan" di tab Keuangan siswa tidak lagi berupa satu angka tunggal. Admin dapat melihat **komposisinya**: berapa yang berasal dari tahun ajaran yang sedang dilihat, dan berapa yang merupakan tunggakan tahun ajaran lain.

## Dependencies

- **Task 5 selesai** — logika `outstanding-invoices.ts` sudah lengkap dan dipakai ulang.
- Task ini **tidak** bergantung pada Task 4, tetapi keduanya memakai helper yang sama.

## Files to Modify

| File | Operasi |
|------|---------|
| `apps/dashboard/src/features/keuangan/outstanding-invoices.ts` | **Ubah** — `sumOutstanding`, `splitUnpaidByAcademicYear` |
| `apps/dashboard/src/features/keuangan/outstanding-invoices.test.ts` | **Ubah** — +8 test |
| `apps/dashboard/src/routes/_authenticated/administrasi/siswa/$id/keuangan.tsx` | **Ubah** — query lintas-TA + baris komposisi di kartu |

**Tidak ada perubahan backend** — menyimpang dari catatan awal di epik §10 ("butuh 1 field baru di `FinancialSummaryResponse`"). Alasannya di bawah.

## Mengapa tidak butuh field baru di `FinancialSummaryResponse`

Catatan awal epik mengasumsikan pemecahan harus dihitung server. Setelah ditelusuri, sisi klien justru merupakan tempat yang lebih tepat:

1. **`total_unpaid` tidak boleh dihitung ulang di klien.** `SumUnpaidByStudent` memakai `monthlyVisibilityCond` (`repository/invoice_visibility.go:20-26`) yang menyembunyikan tagihan bulanan untuk bulan yang belum berjalan, di-clamp ke rentang tahun ajaran. Menjumlahkan daftar invoice mentah di klien akan **memasukkan bulan depan** dan membuat angka "TA Aktif" terlalu besar.
2. **Tapi porsi "TA Lain" aman dihitung di klien.** Aturan clamp itu hanya menyembunyikan bulan yang belum berjalan; untuk tahun ajaran lampau semua bulan tampil (`date_trunc('month', LEAST(GREATEST(CURRENT_DATE, ay.start_date), ay.end_date))` menghasilkan akhir TA). Jadi jumlah tunggakan TA lampau tidak terpengaruh clamp.
3. **Karena itu porsi TA aktif diturunkan**, bukan dihitung ulang: `activeYear = max(0, totalUnpaid − otherYears)`. Kedua angka dijamin konsisten dengan total yang ditampilkan, tanpa menduplikasi logika SQL di JavaScript.
4. **"TA aktif" di sini = tahun ajaran yang dipilih di sidebar** (`academicYearAtom`), bukan `academic_years.is_active`. Ini konsisten dengan halaman lain pada tab keuangan siswa (mis. "Lihat Tagihan" → `tagihan/siswa/$id`). Bila dipakai `is_active`, angka pecahan bisa tidak cocok dengan apa yang admin lihat di halaman lain.

Konsekuensinya: nol perubahan DTO, service, Swagger, dan client Orval — sekaligus menghindari regenerasi client yang sensitif (lihat Catatan Implementasi Task 3 #1).

## Perilaku

- Baris komposisi **hanya ditampilkan bila `otherYears > 0`** — tanpa tunggakan TA lain, tidak ada komposisi yang perlu dijelaskan dan kartu tetap bersih.
- Label baris pertama memakai nama TA terpilih (mis. "Tunggakan 2025/2026"), bukan kata "Aktif", agar eksplisit TA mana yang dimaksud.
- Porsi TA lain diberi warna amber — konsisten dengan penanda tunggakan TA lain di Task 4 & 5.
- Angka total pada kartu tetap `financial_summary.total_unpaid` (tidak diubah).

## Step 3: Tests

Tambahan pada `outstanding-invoices.test.ts` (**8 test baru**, total file 23):

| Kelompok | Cakupan |
|---|---|
| `sumOutstanding` | menjumlahkan sisa; daftar kosong = 0 |
| `splitUnpaidByAcademicYear` | memisah porsi TA lain & menurunkan porsi TA aktif; porsi TA aktif tidak pernah negatif; seluruh total jadi TA aktif bila tidak ada TA lain; tanpa TA pembanding seluruh total dianggap TA aktif; tagihan lunas tidak dihitung; daftar kosong |

## Step 4: Verification

- [x] `pnpm test` hijau — **51 test** total di repo (28 manual-invoice + 23 outstanding-invoices)
- [x] `npx tsc --noEmit` bersih
- [x] `npx biome check src` — 71 warning (tidak berubah dari Task 5), tidak ada diagnostik dari file yang disentuh
- [x] `pnpm build` sukses
- [ ] Verifikasi browser (kartu menampilkan komposisi untuk siswa yang punya tunggakan TA lampau) — **belum dijalankan**

## Success Criteria

- [x] Kartu menampilkan porsi tunggakan TA berjalan dan TA lain
- [x] Kedua angka konsisten dengan `total_unpaid` yang ditampilkan
- [x] Tidak ada perubahan backend / Swagger / client Orval
- [x] Baris komposisi disembunyikan bila tidak ada tunggakan TA lain
- [x] Seluruh test lulus, typecheck bersih, build sukses
- [ ] Verifikasi browser end-to-end — belum dijalankan

## Catatan Implementasi

### 1. Satu request tambahan di tab Keuangan siswa

Tab ini sebelumnya hanya memanggil `GET /v1/students/:id`. Sekarang ditambah `GET /v1/students/:id/invoices` **tanpa** param TA untuk memperoleh daftar lintas tahun ajaran. Query di-`enabled` hanya bila tahun ajaran sudah terpilih, sehingga tidak ada request sia-sia sebelum `academicYearAtom` terisi.

### 2. Semua hook tetap di atas early return

`useAtom(academicYearAtom)` dan query invoice ditempatkan **sebelum** early return `if (isLoading)` / `if (isError || !student)` pada komponen, mengikuti aturan hooks. Perhitungan `splitUnpaidByAcademicYear` (fungsi murni) boleh berada setelahnya.

### Verifikasi yang BELUM dijalankan

- Verifikasi browser: membuka siswa yang punya tunggakan TA lampau dan memastikan komposisi tampil dengan angka yang cocok dengan kartu total. Butuh server + PostgreSQL + data tunggakan.
