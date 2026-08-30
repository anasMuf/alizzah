# Task 1: Model + Repository + DTO + AutoMigrate

> **Epic:** [Skip Tagihan Bulanan PASTA & Fasilitas](./skip-tagihan-bulanan-pasta-fasilitas.md)
> **Status:** Ready
> **Priority:** P1 (foundation — semua task lain bergantung pada ini)

---

## Goal

Tabel `billing_month_exclusions` siap dipakai: model Go, repository dengan method yang dibutuhkan (termasuk `Exists` untuk lookup cepat di jalur generate), DTO request/response, dan registrasi AutoMigrate + unique index. **Setelah task ini selesai, tabel ada di DB dan bisa diakses via repository — belum ada service/handler/UI (task berikutnya).**

## Dependencies

- Epic requirements R.1–R.7 (terutama R.5 — struktur tabel & unique index)

## Files to Modify

| File | Operasi |
|------|---------|
| `apps/api/model/billing_month_exclusion.go` | **Baru** — struct model |
| `apps/api/repository/billing_month_exclusion_repository.go` | **Baru** — repository + interface |
| `apps/api/dto/billing_exclusion.go` | **Baru** — DTO request/response |
| `apps/api/cmd/api/main.go` | + AutoMigrate & unique index |

## Step 1: Study Existing Code

- `apps/api/model/invoice_item.go:3-13` — pola struct model (`PrimaryKey`, gorm tags)
- `apps/api/model/extracurricular.go:1-10` — pola model kecil + `BaseModelTimeAt`
- `apps/api/repository/student_exceptionality_repository.go` — pola repository kecil + interface + constructor
- `apps/api/repository/student_exceptionality_repository.go:41-45` — pola method dengan `r.db.Model(...)`
- `apps/api/cmd/api/main.go:53-69` — daftar AutoMigrate (tambahkan di batch yang sesuai)
- `apps/api/cmd/api/main.go:126-131` — pola `db.Exec(CREATE UNIQUE INDEX IF NOT EXISTS ...)` untuk index partial/komposit

## Step 2: Implementation Checklist

### 2a. Model (`model/billing_month_exclusion.go`)
- [ ] Struct `BillingMonthExclusion` dengan `PrimaryKey` di posisi pertama, `BaseModelTimeAt` di akhir
- [ ] Field:
  - `StudentID uint` — `gorm:"not null;index"`
  - `EntityType string` — `gorm:"size:20;not null"` (nilai: `"extracurricular"` | `"facility"`)
  - `EntityRefID uint` — `gorm:"not null"` (extracurricular_id / facility_id)
  - `Month uint` — `gorm:"not null"` (1–12)
  - `Year uint` — `gorm:"not null"`
  - `AcademicYearID uint` — `gorm:"not null"`
- [ ] Unique index komposit di 5 kolom: `StudentID`, `EntityType`, `EntityRefID`, `Month`, `Year` — pakai tag `gorm:"uniqueIndex:uq_billing_exclusion"` pada kelima field (mengikuti pola GORM; AutoMigrate akan membuatkan)

### 2b. DTO (`dto/billing_exclusion.go`)
- [ ] `BillingExclusionMonth struct { Month uint json:"month"; Year uint json:"year" }`
- [ ] `SetBillingExclusionsRequest struct { Months []BillingExclusionMonth json:"months" validate:"required,dive,required" }`
- [ ] `BillingExclusionsResponse struct { Months []BillingExclusionMonth json:"months" }`

### 2c. Repository (`repository/billing_month_exclusion_repository.go`)
Interface `BillingMonthExclusionRepository`:
- [ ] `FindByStudentAndEntity(studentID uint, entityType string, entityRefID uint) ([]model.BillingMonthExclusion, error)`
- [ ] `Exists(studentID uint, entityType string, entityRefID, month, year uint) (bool, error)` — dipakai helper `isMonthExcluded` di task berikutnya; implementasi pakai `SELECT 1 ... LIMIT 1` atau `First` + `errors.Is(err, gorm.ErrRecordNotFound)`
- [ ] `Replace(tx *gorm.DB, studentID uint, entityType string, entityRefID uint, exclusions []model.BillingMonthExclusion) error` — hapus semua baris lama untuk (student, entity_type, entity_ref) lalu insert baris baru, dalam tx yang sama
- [ ] `DeleteByStudentAndEntity(studentID uint, entityType string, entityRefID uint) error` — hapus SEMUA baris exclusion untuk (student, entity_type, entity_ref); dipakai saat `Unenroll` (R.8 epic)
- [ ] `WithTx(tx *gorm.DB) BillingMonthExclusionRepository` — pola sama dengan repository lain (contoh: `invoice_repository.go`)
- [ ] Constructor `NewBillingMonthExclusionRepository(db *gorm.DB)`

Catatan: validasi bulan (1–12) dan tahun ajaran aktif dilakukan di **service** (Task 2), bukan di repository.

### 2d. Wiring (`cmd/api/main.go`)
- [ ] Tambahkan `&model.BillingMonthExclusion{}` ke daftar `AutoMigrate` (batch yang sesuai, mis. batch 3 dekat `StudentFacility`)
- [ ] (Opsional bila GORM uniqueIndex tidak cukup) `db.Exec(CREATE UNIQUE INDEX IF NOT EXISTS uq_billing_exclusion ...)` di dekat index partial lain — hanya jika `go build` + migrasi membuktikan tag belum memadai

## Step 3: Verification

- [ ] `go build ./...` di `apps/api` sukses
- [ ] Jalankan API → tabel `billing_month_exclusions` terbuat dengan 5 kolom key
- [ ] Insert 2 baris identik (student, entity_type, entity_ref, month, year) → baris kedua gagal (unique constraint)
- [ ] `Exists` mengembalikan `true` untuk baris yang ada, `false` untuk yang tidak ada
- [ ] `Replace` menghapus daftar lama & menyisipkan daftar baru dalam satu transaksi (uji rollback: buat salah satu insert gagal → tidak ada perubahan parsial)
- [ ] `DeleteByStudentAndEntity` menghapus semua baris untuk (student, entity_type, entity_ref) dan tidak menyentuh baris entity lain

## Success Criteria

- [ ] Model `BillingMonthExclusion` + DTO + repository ter-compile (`go build ./...` sukses)
- [ ] Tabel `billing_month_exclusions` ada setelah AutoMigrate, unique index `(student_id, entity_type, entity_ref_id, month, year)` aktif
- [ ] Repository method `FindByStudentAndEntity`, `Exists`, `Replace` (transaksional), `DeleteByStudentAndEntity` berfungsi
- [ ] Pre-commit hooks passing
