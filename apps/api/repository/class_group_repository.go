package repository

import (
	"api/dto"
	"api/model"

	"gorm.io/gorm"
)

type ClassGroupRepository interface {
	FindAll(params dto.ClassGroupQueryParams) ([]model.ClassGroup, error)
	FindByID(id uint) (*model.ClassGroup, error)
	Create(cg *model.ClassGroup) error
	Update(cg *model.ClassGroup) error
	Delete(id uint) error
	WithTx(tx *gorm.DB) ClassGroupRepository
	HasActiveStudents(id uint) (bool, error)
	CountStudents(id uint) (int, error)
}

type classGroupRepository struct {
	db *gorm.DB
}

func NewClassGroupRepository(db *gorm.DB) ClassGroupRepository {
	return &classGroupRepository{db: db}
}

func (r *classGroupRepository) FindAll(params dto.ClassGroupQueryParams) ([]model.ClassGroup, error) {
	var cgs []model.ClassGroup
	query := r.db.Model(&model.ClassGroup{})

	if params.AcademicYearID != 0 {
		query = query.Where("academic_year_id = ?", params.AcademicYearID)
	}
	if params.Level != "" {
		query = query.Where("level = ?", params.Level)
	}

	err := query.Order("name ASC").Find(&cgs).Error
	return cgs, err
}

func (r *classGroupRepository) FindByID(id uint) (*model.ClassGroup, error) {
	var cg model.ClassGroup
	err := r.db.First(&cg, id).Error
	return &cg, err
}

func (r *classGroupRepository) Create(cg *model.ClassGroup) error {
	return r.db.Create(cg).Error
}

func (r *classGroupRepository) Update(cg *model.ClassGroup) error {
	return r.db.Save(cg).Error
}

func (r *classGroupRepository) Delete(id uint) error {
	return r.db.Delete(&model.ClassGroup{}, id).Error
}

func (r *classGroupRepository) WithTx(tx *gorm.DB) ClassGroupRepository {
	return &classGroupRepository{db: tx}
}


func (r *classGroupRepository) HasActiveStudents(id uint) (bool, error) {
	var count int64
	err := r.db.Model(&model.StudentEnrollment{}).
		Where("class_group_id = ? AND status = ?", id, "active").
		Count(&count).Error
	return count > 0, err
}

func (r *classGroupRepository) CountStudents(id uint) (int, error) {
	var count int64
	err := r.db.Model(&model.StudentEnrollment{}).
		Where("class_group_id = ? AND status = ?", id, "active").
		Count(&count).Error
	return int(count), err
}
