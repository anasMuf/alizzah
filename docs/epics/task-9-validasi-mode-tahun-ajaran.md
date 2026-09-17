# Task 9: Validasi Mode Tagihan terhadap Tahun Ajaran

> **Epic:** [Tagihan Tunggakan (Backfill) + CRUD Tagihan Manual](./tagihan-tunggakan-backfill.md)
> **Status:** Done (frontend)
> **Priority:** P1 (menutup jalan buntu yang terbuka lewat escape hatch)
> **Amendemen:** menggantikan **R.4** dan mencabut keputusan **Q6**

---

## Goal

Mode tagihan pada form "Tambah Tagihan" **ditentukan mutlak oleh tahun ajaran yang dipilih**, dan kombinasi yang tidak sah tidak bisa dipilih maupun tersubmit. Sebelumnya mode hanya *di-set otomatis* dari TA tetapi tetap bisa diubah admin (escape hatch Q6), dan pilihan yang tidak sah gagal secara senyap.

## Dependencies

- **Task 1 selesai** — `POST /v1/invoices` menerima kedua type.
- **Task 3 selesai** — form adaptif & logika murni `manual-invoice.ts` sudah ada.
- Hasil brainstorming Q10: **1A + 2A + 3C + 4A**.

## Masalah yang Diselesaikan

Tiga dependensi nyata antara mode dan tahun ajaran, yang sebelumnya tidak divalidasi:

1. **Mode Rinci butuh konfigurasi tarif milik TA terpilih.** `feeConfigForAy` dicari berdasarkan `academicYearId`; kalau kosong, dropdown tarif kosong, tidak ada cara menambah item (mode rinci tidak punya baris bebas), dan submit gagal dengan pesan generik *"Tambahkan minimal satu item tagihan"* — menyesatkan.
2. **TA lampau umumnya memang belum punya tarif.** `seeders/fee_config_seeder.go:34-44` hanya membuat konfigurasi tarif untuk TA yang aktif saat server dijalankan, dan tidak ada pembuatan otomatis saat TA baru diaktifkan.
3. **Level siswa diambil dari enrollment TA aktif**, bukan TA terpilih (`active_enrollment`). Untuk TA non-aktif, filter tarif bisa memakai level yang salah.

## Aturan Final

| TA terpilih | Mode Rinci | Mode Total |
|---|---|---|
| TA aktif **yang punya** tarif | ✅ sah | ❌ ditolak |
| TA aktif **tanpa** tarif | ❌ | ❌ → **form diblokir total** |
| TA selain TA aktif | ❌ | ✅ sah |

Konsekuensi yang diterima secara sadar (Q10/3C mencabut escape hatch Q6):

| Kasus | Sebelum | Sesudah | Jalur pengganti |
|---|---|---|---|
| Beban non-tarif di TA aktif (denda, seragam) | bisa via mode Total | tidak bisa | `incidental_items` saat pembayaran di kasir |
| Tunggakan milik TA aktif | bisa via mode Total | tidak bisa | mode Rinci dengan memilih tarif SPP yang relevan |

**Efek samping yang menguntungkan:** karena mode Rinci kini hanya terjangkau pada TA aktif, `studentLevel` dari `active_enrollment` menjadi benar *by construction* — masalah #3 hilang tanpa perlu mengambil data enrolment per TA.

## Files to Modify

| File | Operasi |
|------|---------|
| `apps/dashboard/src/features/keuangan/manual-invoice.ts` | **Ubah** — `modeAvailability`, `hasUsableMode`, 2 field baru di `ManualInvoiceFormState`, validasi kesesuaian mode |
| `apps/dashboard/src/features/keuangan/manual-invoice.test.ts` | **Ubah** — +14 test |
| `apps/dashboard/src/features/keuangan/components/ManualInvoiceForm.tsx` | **Ubah** — tombol mode disabled + sebab, banner blokir + tautan, Simpan nonaktif |
| `apps/docs/epics/tagihan-tunggakan-backfill.md` | **Ubah** — amendemen R.4, R.4b, R.4c, anti-pattern, edge case, Q10 |

**Tidak ada perubahan backend.** Batasan ini murni aturan UI; server tetap menerima kedua type (R.5/R.6 tidak berubah).

## Step 2: Implementation Checklist

### 2a. Logika murni (`manual-invoice.ts`)

- [x] `modeAvailability({ mode, isActiveAcademicYear, hasTariffConfig })` → `{ allowed, reason? }`
- [x] `hasUsableMode({ isActiveAcademicYear, hasTariffConfig })` → `false` hanya untuk TA aktif tanpa tarif
- [x] `ManualInvoiceFormState` bertambah `isActiveAcademicYear` dan `hasTariffConfig`
- [x] `validateManualInvoice` memeriksa kesesuaian mode **sebelum** memeriksa isian (catatan: kesesuaian mode kini diperiksa **sebelum** validasi isian, berbeda dari urutan sebelumnya) — mencegah state basi tersubmit
- [x] Mode **default** tetap dari TA (`defaultManualInvoiceMode`), hanya *paksaan* admin yang dicabut

### 2b. UI (`ManualInvoiceForm.tsx`)

- [x] `isActiveAcademicYear` dan `hasTariffConfig` dihitung dari `academicYearId` vs `activeAy.id` dan `feeConfigForAy`
- [x] Tombol mode `disabled` bila tidak sah, dengan gaya `cursor-not-allowed opacity-50`
- [x] Teks penjelas aturan di bawah tombol saat ada mode yang sah
- [x] Banner amber + tautan `/pengaturan/tarif` saat tidak ada mode sah
- [x] `isModeBlocked` di-gate `isFeeConfigLoading` agar banner tidak muncul transien saat daftar tarif masih dimuat
- [x] Tombol Simpan nonaktif saat `noUsableMode` atau mode tidak sah

## Step 3: Tests

Tambahan pada `manual-invoice.test.ts` (**+14 test**, total file 49):

| Kelompok | Cakupan |
|---|---|
| `modeAvailability` | matriks 5 kombinasi (rinci×{aktif/tidak}×{tarif/tidak}, total×{aktif/tidak}); setiap penolakan punya `reason`; sebab menyebut "tarif" atau "aktif" |
| `hasUsableMode` | true untuk TA aktif bertarif; true untuk TA lain; **false hanya** untuk TA aktif tanpa tarif |
| `validateManualInvoice` | menolak total di TA aktif; menolak rinci di TA lain; menolak rinci di TA aktif tanpa tarif; kesesuaian mode diperiksa sebelum isian |

State test dirapikan: `baseState` kini menggambarkan TA lampau (mode total sah), dan helper `itemizedState()` menghasilkan state mode rinci yang sah agar test lama tetap menguji hal yang benar.

## Step 4: Verification

- [x] `pnpm test` — **80 test** lulus (7 label + 24 outstanding + 49 manual)
- [x] `npx tsc --noEmit` bersih
- [x] `npx biome check src` — 71 warning (tidak bertambah), tidak ada diagnostik baru
- [x] `pnpm build` sukses
- [ ] Verifikasi browser: memilih TA aktif bertarif → Rinci aktif & Total disabled; memilih TA lampau → Total aktif & Rinci disabled + sebab; TA aktif tanpa tarif → banner blokir + Simpan nonaktif — **belum dijalankan** (aturan UI-nya sendiri sudah lulus unit test)

## Success Criteria

- [x] Mode tidak dapat lagi dipaksa ke kombinasi yang tidak sah
- [x] Setiap mode yang tidak sah punya sebab tertulis di UI
- [x] TA aktif tanpa tarif menampilkan banner blokir + tautan Pengaturan Tarif, dan Simpan nonaktif
- [x] Kesesuaian mode divalidasi di submit sebagai pertahanan lapis kedua
- [x] Tidak ada perubahan backend
- [x] 14 test baru lulus, typecheck bersih, build sukses
- [ ] Verifikasi browser end-to-end — belum dijalankan. Verifikasi HTTP+DB atas seluruh alur invoice manual/tunggakan sudah dilakukan; lihat [Verifikasi E2E](./verifikasi-e2e-tagihan-tunggakan.md). Penegakan mode-vs-TA memang sengaja hanya di klien (baris 54 di atas), terkonfirmasi oleh e2e.

## Catatan Implementasi

### 1. Ini amendemen kontrak, bukan sekadar tambahan

R.4 di epik semula berbunyi *"mode ter-set otomatis dari TA namun dapat diubah admin"*. Q10/3C mencabutnya. Amendemen dicatat eksplisit di epik (§5 R.4/R.4b/R.4c, §7 anti-pattern, §4 edge case, §9 tabel keputusan Q6 + Q10) — tidak diedit diam-diam, karena epik ini berperan sebagai kontrak.

### 2. `isFeeConfigLoading` bukan hiasan

Tanpa gate itu, memilih TA aktif akan menampilkan banner "belum punya konfigurasi tarif" selama beberapa ratus milidetik sebelum daftar tarif selesai dimuat — alarm palsu. `noUsableMode` tetap menghitung kondisi sebenarnya; hanya *tampilan* bannernya yang ditahan sampai data tarif diketahui. Tombol Simpan tetap nonaktif selama itu (safe default: jangan izinkan submit sebelum kepastian).

### 3. Urutan validasi berubah

`validateManualInvoice` kini memeriksa kesesuaian mode lebih dulu, lalu isian. Efeknya terlihat di test: state mode rinci tanpa item pada TA non-aktif menghasilkan pesan soal **mode**, bukan soal item — dan itu diuji eksplisit.

### Verifikasi yang BELUM dijalankan

- Verifikasi browser untuk keempat kombinasi TA × mode. Butuh server + PostgreSQL + minimal satu TA lampau dan satu TA aktif tanpa tarif (yang terakhir perlu menyiapkan TA baru agar tidak punya tarif).
- Catatan: verifikasi HTTP+DB atas alur backend sudah selesai dan menegaskan baris 54 — server memang menerima kedua type tanpa memeriksa kecocokan TA. Lihat [Verifikasi E2E](./verifikasi-e2e-tagihan-tunggakan.md).
