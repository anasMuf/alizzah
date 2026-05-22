package repository

import (
	"api/model"

	"gorm.io/gorm"
)

type AcademicYearRepository interface {
	FindAll() ([]model.AcademicYear, error)
	FindByID(id uint) (*model.AcademicYear, error)
	FindActive() (*model.AcademicYear, error)
	FindByName(name string) (*model.AcademicYear, error)
	Create(ay *model.AcademicYear) error
	Update(ay *model.AcademicYear) error
	SetActive(id uint) error
}

type academicYearRepository struct {
	db *gorm.DB
}

func NewAcademicYearRepository(db *gorm.DB) AcademicYearRepository {
	return &academicYearRepository{db: db}
}

func (r *academicYearRepository) FindAll() ([]model.AcademicYear, error) {
	var years []model.AcademicYear
	err := r.db.Order("start_date DESC").Find(&years).Error
	return years, err
}

func (r *academicYearRepository) FindByID(id uint) (*model.AcademicYear, error) {
	var ay model.AcademicYear
	err := r.db.First(&ay, id).Error
	return &ay, err
}

func (r *academicYearRepository) FindActive() (*model.AcademicYear, error) {
	var ay model.AcademicYear
	err := r.db.Where("is_active = ?", true).First(&ay).Error
	return &ay, err
}

func (r *academicYearRepository) FindByName(name string) (*model.AcademicYear, error) {
	var ay model.AcademicYear
	err := r.db.Where("name = ?", name).First(&ay).Error
	return &ay, err
}

func (r *academicYearRepository) Create(ay *model.AcademicYear) error {
	return r.db.Create(ay).Error
}

func (r *academicYearRepository) Update(ay *model.AcademicYear) error {
	return r.db.Save(ay).Error
}

// SetActive deactivates all academic years, then activates the given one.
// Runs in a single transaction for consistency.
func (r *academicYearRepository) SetActive(id uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Deactivate all
		if err := tx.Model(&model.AcademicYear{}).
			Where("is_active = ?", true).
			Update("is_active", false).Error; err != nil {
			return err
		}
		// Activate target
		if err := tx.Model(&model.AcademicYear{}).
			Where("id = ?", id).
			Update("is_active", true).Error; err != nil {
			return err
		}
		return nil
	})
}
