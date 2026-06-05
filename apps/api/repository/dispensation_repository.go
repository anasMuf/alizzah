package repository

import (
	"api/dto"
	"api/model"

	"gorm.io/gorm"
)

type DispensationRepository interface {
	FindByStudentID(studentID uint, params dto.DispensationQueryParams) ([]model.Dispensation, error)
	FindByID(id uint) (*model.Dispensation, error)
	FindActiveForStudentMonth(studentID, academicYearID, month, year uint, feeCategory string) ([]model.Dispensation, error)
	FindPermanentActive(studentID, academicYearID uint) ([]model.Dispensation, error)
	Create(d *model.Dispensation) error
	Update(d *model.Dispensation) error
	Delete(id uint) error
}

type dispensationRepository struct {
	db *gorm.DB
}

func NewDispensationRepository(db *gorm.DB) DispensationRepository {
	return &dispensationRepository{db: db}
}

func (r *dispensationRepository) FindByStudentID(studentID uint, params dto.DispensationQueryParams) ([]model.Dispensation, error) {
	var items []model.Dispensation
	query := r.db.Preload("AcademicYear").Preload("Creator").
		Where("student_id = ?", studentID)

	if params.AcademicYearID != 0 {
		query = query.Where("academic_year_id = ?", params.AcademicYearID)
	}
	if params.IsActive != nil {
		query = query.Where("is_active = ?", *params.IsActive)
	}

	err := query.Order("created_at DESC").Find(&items).Error
	return items, err
}

func (r *dispensationRepository) FindByID(id uint) (*model.Dispensation, error) {
	var d model.Dispensation
	err := r.db.Preload("AcademicYear").Preload("Creator").Preload("Student").First(&d, id).Error
	return &d, err
}

func (r *dispensationRepository) FindActiveForStudentMonth(studentID, academicYearID, month, year uint, feeCategory string) ([]model.Dispensation, error) {
	var results []model.Dispensation
	query := r.db.Where(
		"student_id = ? AND academic_year_id = ? AND fee_category = ? AND is_active = true",
		studentID, academicYearID, feeCategory,
	).Where(
		// Start date <= target month
		"(start_year < ? OR (start_year = ? AND start_month <= ?))",
		year, year, month,
	).Where(
		// End date >= target month OR permanent
		"is_permanent = true OR (end_year > ? OR (end_year = ? AND end_month >= ?))",
		year, year, month,
	)
	err := query.Find(&results).Error
	return results, err
}

func (r *dispensationRepository) FindPermanentActive(studentID, academicYearID uint) ([]model.Dispensation, error) {
	var items []model.Dispensation
	err := r.db.Where(
		"student_id = ? AND academic_year_id = ? AND is_permanent = true AND is_active = true",
		studentID, academicYearID,
	).Find(&items).Error
	return items, err
}

func (r *dispensationRepository) Create(d *model.Dispensation) error {
	return r.db.Create(d).Error
}

func (r *dispensationRepository) Update(d *model.Dispensation) error {
	return r.db.Save(d).Error
}

func (r *dispensationRepository) Delete(id uint) error {
	return r.db.Delete(&model.Dispensation{}, id).Error
}
