package repository

import (
	"api/dto"
	"api/model"

	"gorm.io/gorm"
)

type ExtracurricularRepository interface {
	FindAll(params dto.ExtracurricularQueryParams) ([]model.Extracurricular, error)
	FindByID(id uint) (*model.Extracurricular, error)
	Create(ex *model.Extracurricular) error
	Update(ex *model.Extracurricular) error
	Delete(id uint) error
	IsUsedByStudents(id uint) (bool, error)
}

type extracurricularRepository struct {
	db *gorm.DB
}

func NewExtracurricularRepository(db *gorm.DB) ExtracurricularRepository {
	return &extracurricularRepository{db: db}
}

func (r *extracurricularRepository) FindAll(params dto.ExtracurricularQueryParams) ([]model.Extracurricular, error) {
	var exs []model.Extracurricular
	query := r.db.Model(&model.Extracurricular{})

	if params.Type != "" {
		query = query.Where("type = ?", params.Type)
	}
	if params.Level != "" {
		// Tampilkan pasta yg levels kosong (all) ATAU mengandung level siswa
		query = query.Where("levels = '' OR levels LIKE ?", "%"+params.Level+"%")
	}

	err := query.Order("name ASC").Find(&exs).Error
	return exs, err
}

func (r *extracurricularRepository) FindByID(id uint) (*model.Extracurricular, error) {
	var ex model.Extracurricular
	err := r.db.First(&ex, id).Error
	return &ex, err
}

func (r *extracurricularRepository) Create(ex *model.Extracurricular) error {
	return r.db.Create(ex).Error
}

func (r *extracurricularRepository) Update(ex *model.Extracurricular) error {
	return r.db.Save(ex).Error
}

func (r *extracurricularRepository) Delete(id uint) error {
	return r.db.Delete(&model.Extracurricular{}, id).Error
}

func (r *extracurricularRepository) IsUsedByStudents(id uint) (bool, error) {
	var count int64
	err := r.db.Model(&model.StudentExtracurricular{}).Where("extracurricular_id = ? AND end_date IS NULL", id).Count(&count).Error
	return count > 0, err
}
