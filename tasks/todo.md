# Task List: Daycare Kalkulasi Bulanan

## Phase 1: Foundation (Backend Model + Repository)

### Task 1: Model DaycareMonthlyAttendance + AutoMigrate
- [ ] Buat file `model/daycare_monthly_attendance.go`
- [ ] Tambah struct `DaycareMonthlyAttendance` dengan field: ID, StudentID, AcademicYearID, Month, Year, SPDDays, MealDays, CreatedBy, timestamps
- [ ] Unique constraint: `(student_id, month, year)`
- [ ] Register di `main.go` AutoMigrate: `&model.DaycareMonthlyAttendance{}`

**Verification:**
- [ ] `go build ./...` success
- [ ] Model terdaftar di AutoMigrate

**Files:** `model/daycare_monthly_attendance.go`, `cmd/api/main.go`

### Task 2: Repository DaycareMonthlyAttendanceRepository
- [ ] Buat file `repository/daycare_monthly_attendance_repository.go`
- [ ] Interface: `FindByStudentMonthYear`, `Upsert`
- [ ] Implementasi: Find pakai `WHERE student_id = ? AND month = ? AND year = ?`, Upsert pakai GORM `FirstOrCreate` + `Save`

**Verification:**
- [ ] `go build ./...` success

**Files:** `repository/daycare_monthly_attendance_repository.go`

---

## Phase 2: Service + Handler (API Layer)

### Task 3: Service method untuk monthly attendance
- [ ] Tambah DTO: `UpsertDaycareMonthlyAttendanceRequest`, `DaycareMonthlyAttendanceResponse` di `dto/daycare_enrollment.go`
- [ ] Tambah interface method: `UpsertMonthlyAttendance`, `GetMonthlyAttendance` di `DaycareEnrollmentService`
- [ ] Implementasi di `daycare_enrollment_service.go`
- [ ] Validasi: `spd_days` max 30, `meal_days` max 30

**Verification:**
- [ ] `go build ./...` success
- [ ] Validasi max 30 hari: input 31 → error

**Files:** `dto/daycare_enrollment.go`, `service/daycare_enrollment_service.go`

### Task 4: Handler endpoint + route registration
- [ ] Tambah method `UpsertMonthlyAttendance` dan `GetMonthlyAttendance` di handler
- [ ] Register routes di `main.go`: `GET /v1/daycare-enrollments/monthly-attendance`, `PUT /v1/daycare-enrollments/monthly-attendance`
- [ ] Inject `DaycareMonthlyAttendanceRepository` ke service & handler di `main.go`

**Verification:**
- [ ] `go build ./...` success
- [ ] Test dengan curl: PUT monthly attendance, GET kembali data

**Files:** `handler/daycare_enrollment_handler.go`, `cmd/api/main.go`

---

## Phase 3: Invoice Generation Changes

### Task 5: Modifikasi GenerateDaycareMonthlyInvoices
- [ ] Sebelum hitung dari absensi harian, cek dulu `DaycareMonthlyAttendance`
- [ ] Jika ada: gunakan `spd_days` dan `meal_days` untuk kalkulasi
- [ ] Jika tidak ada: fallback ke absensi harian (perilaku lama)
- [ ] **Hapus TPQ** dari kalkulasi (hapus section tpqDays)
- [ ] **Premium meal**: gunakan `daycare_regular_meal` (20k/hari) × meal_days (bukan `daycare_premium_meal` flat)
- [ ] Inject `DaycareMonthlyAttendanceRepository` ke `InvoiceGenerateService`

**Verification:**
- [ ] Generate dengan data bulanan: SPD = spd_days × rate, Meal = meal_days × 20000
- [ ] Generate tanpa data bulanan: masih berfungsi via absensi harian
- [ ] TPQ tidak muncul di invoice item
- [ ] `go build ./...` success

**Files:** `service/invoice_generate_service.go`, `cmd/api/main.go`

---

## Phase 4: Seeders

### Task 6: Nonaktifkan TPQ & premium meal flat di seeder
- [ ] Di `buildFeeConfigItems`: set `is_active: false` untuk:
  - `daycare_premium_tpq`
  - `daycare_regular_tpq`
  - `daycare_premium_meal`

**Verification:**
- [ ] Seed data: TPQ items tidak muncul di fee config items

**Files:** `seeders/fee_config_seeder.go`

---

## Phase 5: Frontend

### Task 7: Ubah UI absensi harian → input kehadiran bulanan
- [ ] Ganti `AttendanceTab` di `index.tsx`
  - Date picker: month/year selector (bukan date)
  - Load `GET /v1/daycare-enrollments/monthly-attendance` untuk setiap siswa
  - Tampilkan input number `spd_days` (0-30) dan `meal_days` (0-30) per siswa
  - Hapus checkbox TPQ, checkbox konsumsi harian, dropdown time slot per siswa
  - Tombol "Simpan Kehadiran Bulanan" → `PUT /v1/daycare-enrollments/monthly-attendance`
- [ ] Optional: beri label warning jika hari > 26 (hari efektif normal)

**Verification:**
- [ ] Bisa input dan simpan jumlah hari SPD & konsumsi
- [ ] Data tersimpan dan bisa dibaca kembali
- [ ] Validasi max 30 di frontend (prevent input > 30)

**Files:** `dashboard/src/routes/_authenticated/administrasi/daycare/index.tsx`

### Task 8: Regenerate Orval API client (jika perlu)
- [ ] Jalankan `orval` untuk generate client API baru
- [ ] Atau tulis manual fetch call jika Orval tidak digunakan untuk endpoint baru

**Verification:**
- [ ] TypeScript type-check: `npx tsc --noEmit`
- [ ] Build frontend: `npm run build`

**Files:** `dashboard/src/api/endpoints/daycare-enrollments/daycare-enrollments.ts`
