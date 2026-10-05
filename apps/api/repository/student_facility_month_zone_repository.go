package repository

import (
	"api/model"

	"gorm.io/gorm"
)

type StudentFacilityMonthZoneRepository interface {
	// UpsertMonth menyimpan/update override zona utk (sfID, month, year).
	// Update hanya menyentuh kolom data (FeeConfigItemID) — bukan asosiasi.
	UpsertMonth(zone *model.StudentFacilityMonthZone) error
	// DeleteMonth menghapus override (hard delete) → bulan kembali ke default.
	DeleteMonth(sfID, month, year uint) error
	// FindBySFIDsAndMonth mengambil override utk sekumpulan pendaftaran pada
	// satu bulan — lookup batch untuk daftar siswa per bulan (hindari N+1).
	FindBySFIDsAndMonth(sfIDs []uint, month, year uint) ([]model.StudentFacilityMonthZone, error)
	// FindByStudentFacilityID mengambil semua override satu pendaftaran
	// (utk validasi/sinkronisasi lintas bulan).
	FindByStudentFacilityID(sfID uint) ([]model.StudentFacilityMonthZone, error)
	// DeleteByStudentFacilityID menghapus semua override pendaftaran —
	// dipanggil saat Unenroll/hapus enrollment (epic R.9).
	DeleteByStudentFacilityID(sfID uint) error
	WithTx(tx *gorm.DB) StudentFacilityMonthZoneRepository
}

type studentFacilityMonthZoneRepository struct {
	db *gorm.DB
}

func NewStudentFacilityMonthZoneRepository(db *gorm.DB) StudentFacilityMonthZoneRepository {
	return &studentFacilityMonthZoneRepository{db: db}
}

func (r *studentFacilityMonthZoneRepository) WithTx(tx *gorm.DB) StudentFacilityMonthZoneRepository {
	return &studentFacilityMonthZoneRepository{db: tx}
}

func (r *studentFacilityMonthZoneRepository) UpsertMonth(zone *model.StudentFacilityMonthZone) error {
	var existing model.StudentFacilityMonthZone
	err := r.db.Where(
		"student_facility_id = ? AND month = ? AND year = ?",
		zone.StudentFacilityID, zone.Month, zone.Year,
	).First(&existing).Error
	if err == gorm.ErrRecordNotFound {
		// Sisipkan; Omit associations karena StudentFacility ter-preload
		// (pola sama dgn StudentFacilityRepository.Update).
		return r.db.Omit("StudentFacility", "FeeConfigItem").Create(zone).Error
	}
	if err != nil {
		return err
	}
	// Update hanya kolom zona — hindari menimpa id/created_at.
	return r.db.Model(&model.StudentFacilityMonthZone{}).
		Where("id = ?", existing.ID).
		Update("fee_config_item_id", zone.FeeConfigItemID).Error
}

func (r *studentFacilityMonthZoneRepository) DeleteMonth(sfID, month, year uint) error {
	// Hard delete (Unscoped): absence baris = ikut default; soft delete akan
	// membuat unique index bentrok saat override di-set ulang.
	return r.db.Unscoped().Where(
		"student_facility_id = ? AND month = ? AND year = ?",
		sfID, month, year,
	).Delete(&model.StudentFacilityMonthZone{}).Error
}

func (r *studentFacilityMonthZoneRepository) FindBySFIDsAndMonth(sfIDs []uint, month, year uint) ([]model.StudentFacilityMonthZone, error) {
	var zones []model.StudentFacilityMonthZone
	if len(sfIDs) == 0 {
		return zones, nil
	}
	err := r.db.
		Where("student_facility_id IN ? AND month = ? AND year = ?", sfIDs, month, year).
		Order("student_facility_id ASC").
		Find(&zones).Error
	return zones, err
}

func (r *studentFacilityMonthZoneRepository) FindByStudentFacilityID(sfID uint) ([]model.StudentFacilityMonthZone, error) {
	var zones []model.StudentFacilityMonthZone
	err := r.db.Where("student_facility_id = ?", sfID).
		Order("year ASC, month ASC").
		Find(&zones).Error
	return zones, err
}

func (r *studentFacilityMonthZoneRepository) DeleteByStudentFacilityID(sfID uint) error {
	return r.db.Unscoped().Where("student_facility_id = ?", sfID).
		Delete(&model.StudentFacilityMonthZone{}).Error
}
