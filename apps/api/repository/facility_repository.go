package repository

import (
	"api/model"

	"gorm.io/gorm"
)

type FacilityRepository interface {
	FindAll() ([]model.Facility, error)
	FindActive() ([]model.Facility, error)
	FindByID(id uint) (*model.Facility, error)
	Create(f *model.Facility) error
	Update(f *model.Facility) error
	Delete(id uint) error
}

type facilityRepository struct {
	db *gorm.DB
}

func NewFacilityRepository(db *gorm.DB) FacilityRepository {
	return &facilityRepository{db: db}
}

func (r *facilityRepository) FindAll() ([]model.Facility, error) {
	var facilities []model.Facility
	err := r.db.Order("name ASC").Find(&facilities).Error
	return facilities, err
}

func (r *facilityRepository) FindActive() ([]model.Facility, error) {
	var facilities []model.Facility
	err := r.db.Where("is_active = ?", true).Order("name ASC").Find(&facilities).Error
	return facilities, err
}

func (r *facilityRepository) FindByID(id uint) (*model.Facility, error) {
	var f model.Facility
	err := r.db.First(&f, id).Error
	return &f, err
}

func (r *facilityRepository) Create(f *model.Facility) error {
	return r.db.Create(f).Error
}

func (r *facilityRepository) Update(f *model.Facility) error {
	return r.db.Save(f).Error
}

func (r *facilityRepository) Delete(id uint) error {
	return r.db.Delete(&model.Facility{}, id).Error
}
