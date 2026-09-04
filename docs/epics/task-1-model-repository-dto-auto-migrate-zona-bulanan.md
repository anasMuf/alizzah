# Task 1: Model + Repository + DTO + AutoMigrate — Zona Bulanan Fasilitas

> **Epic:** [zona-default-dan-override-per-bulan-fasilitas.md](./zona-default-dan-override-per-bulan-fasilitas.md)
> **Status:** Ready

## Goal

Fondasi data untuk override zona per bulan: model `StudentFacilityMonthZone`, migrasi (AutoMigrate + unique index), repository CRUD batch/monthly, dan DTO (request/response month-zone + field zona efektif pada `FacilityStudentItemResponse`). Belum ada perubahan perilaku — cukup kompilasi tetap hijau.

## Implementation

1. Pelajari pola existing:
   - Model kecil keyed per entity: `apps/api/model/billing_month_exclusion.go` & `apps/api/model/student_facility.go` (tag `uniqueIndex`, `PrimaryKey`, `BaseModelTimeAt`)
   - Repo: `apps/api/repository/billing_month_exclusion_repository.go` (interface + struct `{db *gorm.DB}` + `WithTx`)
   - DTO: `apps/api/dto/facility.go` (struktur request/response + `FacilityStudentItemResponse`)
   - AutoMigrate: `apps/api/cmd/api/main.go:99-103` (daftar model; masukkan setelah `&model.StudentFacility{}`)

2. Tulis model + repository + DTO.

3. Checklist file:
   - [ ] `apps/api/model/student_facility_month_zone.go` (baru) — tabel `student_facility_month_zones`
   - [ ] `apps/api/repository/student_facility_month_zone_repository.go` (baru) — interface + impl
   - [ ] `apps/api/dto/facility.go` — tambah DTO month-zone & field zona efektif
   - [ ] `apps/api/cmd/api/main.go` — daftarkan model di AutoMigrate

## Detail

### Model (`student_facility_month_zones`)

```go
type StudentFacilityMonthZone struct {
    PrimaryKey
    StudentFacilityID uint  `gorm:"not null;index;uniqueIndex:uq_sf_month_zone,priority:1"`
    Month             uint  `gorm:"not null;uniqueIndex:uq_sf_month_zone,priority:2"`
    Year              uint  `gorm:"not null;uniqueIndex:uq_sf_month_zone,priority:3"`
    FeeConfigItemID   *uint `gorm:"index"`
    BaseModelTimeAt
    StudentFacility StudentFacility `gorm:"foreignKey:StudentFacilityID"`
    FeeConfigItem   *FeeConfigItem  `gorm:"foreignKey:FeeConfigItemID"`
}
```

Semantik: baris ada = override eksplisit (`FeeConfigItemID` NULL = tanpa zona); baris tidak ada = ikut zona default enrollment.

### Repository

Interface `StudentFacilityMonthZoneRepository`:
- `UpsertMonth(z *model.StudentFacilityMonthZone) error` — update-by-key `(student_facility_id, month, year)`; insert bila belum ada (tanpa menimpa kolom lain)
- `DeleteMonth(sfID, month, year uint) error`
- `FindBySFIDsAndMonth(sfIDs []uint, month, year uint) ([]model.StudentFacilityMonthZone, error)` — lookup batch utk satu halaman daftar siswa
- `FindByStudentFacilityID(sfID uint) ([]model.StudentFacilityMonthZone, error)`
- `DeleteByStudentFacilityID(sfID uint) error`
- `WithTx(tx *gorm.DB) StudentFacilityMonthZoneRepository`

### DTO (`dto/facility.go`)

- `UpdateStudentFacilityMonthZoneRequest{Month uint; Year uint; FeeConfigItemID *uint; Force bool}` (JSON: month, year, fee_config_item_id, force)
- `FacilityMonthZoneResponse{Month, Year, FeeConfigItemID *uint, Source string, InvoiceItemUpdated bool, ItemPaidAmount float64, RemainingOrExcess float64}`
- `FacilityMonthZoneSummary{Reconciled, SkippedPaid, SkippedOverride int}` (untuk response ubah default)
- Perluas `FacilityStudentItemResponse`:
  - `MonthZoneFeeConfigItemID *uint json:"month_zone_fee_config_item_id,omitempty"`
  - `MonthZoneOverridden bool json:"month_zone_overridden"`
  - `MonthItemPaid bool json:"month_item_paid"`

## Success Criteria

- [ ] `go build ./...` di `apps/api` sukses (model + repo + DTO terkompilasi, tidak ada import/type error)
- [ ] Tidak ada perubahan perilaku (Task 1 murni fondasi; service belum memakai repo/DTO baru)
- [ ] Naming konsisten dgn pola existing (`student_facility_month_zones`, `uq_sf_month_zone`)
