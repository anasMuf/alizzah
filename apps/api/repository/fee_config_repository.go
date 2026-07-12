package repository

import (
	"api/model"

	"gorm.io/gorm"
)

type FeeConfigRepository interface {
	FindAll() ([]model.FeeConfig, error)
	FindByID(id uint) (*model.FeeConfig, error)
	FindByAcademicYearID(academicYearID uint) (*model.FeeConfig, error)
	FindActive() (*model.FeeConfig, error)
	Create(fc *model.FeeConfig) error
	Update(fc *model.FeeConfig) error
}

type feeConfigRepository struct {
	db *gorm.DB
}

func NewFeeConfigRepository(db *gorm.DB) FeeConfigRepository {
	return &feeConfigRepository{db: db}
}

func (r *feeConfigRepository) FindAll() ([]model.FeeConfig, error) {
	var fcs []model.FeeConfig
	err := r.db.Preload("AcademicYear").Preload("Items").Order("created_at DESC").Find(&fcs).Error
	return fcs, err
}

func (r *feeConfigRepository) FindByID(id uint) (*model.FeeConfig, error) {
	var fc model.FeeConfig
	err := r.db.Preload("AcademicYear").Preload("Items").First(&fc, id).Error
	return &fc, err
}

func (r *feeConfigRepository) FindByAcademicYearID(academicYearID uint) (*model.FeeConfig, error) {
	var fc model.FeeConfig
	err := r.db.Preload("AcademicYear").Preload("Items").Where("academic_year_id = ?", academicYearID).First(&fc).Error
	return &fc, err
}

func (r *feeConfigRepository) Create(fc *model.FeeConfig) error {
	return r.db.Create(fc).Error
}

func (r *feeConfigRepository) Update(fc *model.FeeConfig) error {
	return r.db.Save(fc).Error
}

func (r *feeConfigRepository) FindActive() (*model.FeeConfig, error) {
	var fc model.FeeConfig
	err := r.db.Preload("AcademicYear").Preload("Items").
		Joins("JOIN academic_years ON academic_years.id = fee_configs.academic_year_id").
		Where("academic_years.is_active = ?", true).
		First(&fc).Error
	return &fc, err
}
