# Implementation Plan: Daycare Kalkulasi Bulanan (Attendance → Monthly Days)

## Overview

Mengubah sistem tagihan daycare dari berbasis absensi harian menjadi input jumlah hari per bulan.
Perubahan mencakup: model baru `DaycareMonthlyAttendance`, API baru untuk input kehadiran bulanan,
modifikasi invoice generation, dan update frontend. TPQ dihapus dari kalkulasi tagihan.

## Architecture Decisions

- **New table `daycare_monthly_attendances`** — menyimpan `spd_days` dan `meal_days` per siswa per bulan. Unique constraint pada `(student_id, month, year)`.
- **Backward compatible** — jika data bulanan tidak ada, fallback ke absensi harian (perilaku lama). Ini memastikan enrollment existing tidak break.
- **Premium meal pakai tarif harian regular** — `daycare_premium_meal` (flat 400k) dinonaktifkan, pakai `daycare_regular_meal` (20k/hari) untuk semua kategori.
- **TPQ items dinonaktifkan** — `daycare_premium_tpq` dan `daycare_regular_tpq` di-seeder diset `is_active: false`.
- **Validasi maksimal 30 hari** — `spd_days` dan `meal_days` divalidasi max 30.

## Task List

### Phase 1: Foundation (Backend Model + Repository)

- [ ] **Task 1:** Buat model `DaycareMonthlyAttendance` + register di AutoMigrate
- [ ] **Task 2:** Buat repository `DaycareMonthlyAttendanceRepository`

### Checkpoint: Foundation
- [ ] Model terdaftar di `main.go` AutoMigrate
- [ ] Repository bisa di-compile (method FindByStudentMonthYear, Upsert)

### Phase 2: Service + Handler (API Layer)

- [ ] **Task 3:** Tambah method `UpsertMonthlyAttendance` & `GetMonthlyAttendance` di service
- [ ] **Task 4:** Tambah endpoint GET & PUT `/v1/daycare-enrollments/monthly-attendance` di handler + register di `main.go`

### Checkpoint: API Layer
- [ ] API bisa disimpan dan dibaca via curl/Postman
- [ ] Validasi max 30 hari berfungsi

### Phase 3: Invoice Generation Changes

- [ ] **Task 5:** Modifikasi `GenerateDaycareMonthlyInvoices` — gunakan `DaycareMonthlyAttendance` jika ada, fallback ke absensi harian. Hapus TPQ dari kalkulasi. Premium meal pakai daily rate.

### Checkpoint: Invoice Logic
- [ ] Generate invoice dengan data bulanan menghasilkan tagihan yang benar
- [ ] Generate invoice tanpa data bulanan masih berfungsi (fallback)
- [ ] TPQ tidak muncul di invoice item

### Phase 4: Seeders

- [ ] **Task 6:** Nonaktifkan TPQ items dan premium meal flat di `fee_config_seeder.go`

### Phase 5: Frontend

- [ ] **Task 7:** Ubah UI absensi harian menjadi input kehadiran bulanan di `index.tsx`
- [ ] **Task 8:** Regenerate Orval API client (jika perlu)

### Checkpoint: Complete
- [ ] End-to-end: input kehadiran bulanan → generate invoice → lihat hasil
- [ ] Enrollment existing masih bisa generate invoice (fallback)
- [ ] Build dan test passing

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Enrollment existing break setelah perubahan invoice logic | High | Backward compatible: fallback ke absensi harian jika data bulanan tidak ada |
| Premium meal rate berubah (flat 400k → 20k/hari) | Med | Komunikasikan ke user, nonaktifkan fee item lama di seeder |
| Orval regeneration meng-overwrite custom code | Low | Back-up file sebelum regenerate, atau tulis manual endpoint call |

## Open Questions

- [x] Apakah jumlah hari berbeda per bulan? → YES, input per bulan
- [x] Apakah TPQ masih dihitung? → NO, dihapus
- [x] Apakah premium meal tetap flat? → NO, pakai daily rate (20k/hari)
- [x] Apakah Biaya Awal premium tetap? → YES, tidak berubah
- [x] Batas maksimal hari? → 30
