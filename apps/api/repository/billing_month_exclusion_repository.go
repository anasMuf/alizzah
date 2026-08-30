package repository

import (
	"api/model"

	"gorm.io/gorm"
)

type BillingMonthExclusionRepository interface {
	FindByStudentAndEntity(studentID uint, entityType string, entityRefID uint) ([]model.BillingMonthExclusion, error)
	Exists(studentID uint, entityType string, entityRefID, month, year uint) (bool, error)
	Replace(tx *gorm.DB, studentID uint, entityType string, entityRefID uint, exclusions []model.BillingMonthExclusion) error
	DeleteByStudentAndEntity(studentID uint, entityType string, entityRefID uint) error
	WithTx(tx *gorm.DB) BillingMonthExclusionRepository
}

type billingMonthExclusionRepository struct {
	db *gorm.DB
}

func NewBillingMonthExclusionRepository(db *gorm.DB) BillingMonthExclusionRepository {
	return &billingMonthExclusionRepository{db: db}
}

func (r *billingMonthExclusionRepository) FindByStudentAndEntity(studentID uint, entityType string, entityRefID uint) ([]model.BillingMonthExclusion, error) {
	var exclusions []model.BillingMonthExclusion
	err := r.db.Where(
		"student_id = ? AND entity_type = ? AND entity_ref_id = ?",
		studentID, entityType, entityRefID,
	).Order("year ASC, month ASC").Find(&exclusions).Error
	return exclusions, err
}

func (r *billingMonthExclusionRepository) Exists(studentID uint, entityType string, entityRefID, month, year uint) (bool, error) {
	var count int64
	err := r.db.Model(&model.BillingMonthExclusion{}).
		Where(
			"student_id = ? AND entity_type = ? AND entity_ref_id = ? AND month = ? AND year = ?",
			studentID, entityType, entityRefID, month, year,
		).
		Count(&count).Error
	return count > 0, err
}

// Replace menghapus semua exclusion lama untuk (student, entity_type, entity_ref)
// lalu menyisipkan daftar baru — semuanya dalam tx yang sama (transaksional).
// Hard delete (Unscoped) karena daftar exclusion adalah konfigurasi sementara;
// soft delete akan membuat unique index bentrok saat insert ulang.
func (r *billingMonthExclusionRepository) Replace(tx *gorm.DB, studentID uint, entityType string, entityRefID uint, exclusions []model.BillingMonthExclusion) error {
	db := tx
	if db == nil {
		db = r.db
	}
	if err := db.Unscoped().Where(
		"student_id = ? AND entity_type = ? AND entity_ref_id = ?",
		studentID, entityType, entityRefID,
	).Delete(&model.BillingMonthExclusion{}).Error; err != nil {
		return err
	}
	if len(exclusions) == 0 {
		return nil
	}
	return db.Create(&exclusions).Error
}

// DeleteByStudentAndEntity menghapus SEMUA exclusion untuk (student, entity_type,
// entity_ref) — dipanggil saat Unenroll (Berhenti) sesuai epic R.8.
func (r *billingMonthExclusionRepository) DeleteByStudentAndEntity(studentID uint, entityType string, entityRefID uint) error {
	return r.db.Unscoped().Where(
		"student_id = ? AND entity_type = ? AND entity_ref_id = ?",
		studentID, entityType, entityRefID,
	).Delete(&model.BillingMonthExclusion{}).Error
}

func (r *billingMonthExclusionRepository) WithTx(tx *gorm.DB) BillingMonthExclusionRepository {
	return &billingMonthExclusionRepository{db: tx}
}
