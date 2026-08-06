package repository

import (
	"api/model"

	"gorm.io/gorm"
)

type IncomeCategoryRepository interface {
	FindAll() ([]model.IncomeCategory, error)
	FindByID(id uint) (*model.IncomeCategory, error)
	HasTransactions(id uint) (bool, error)
	Create(ic *model.IncomeCategory) error
	Update(ic *model.IncomeCategory) error
	Delete(id uint) error
}

type incomeCategoryRepository struct {
	db *gorm.DB
}

func NewIncomeCategoryRepository(db *gorm.DB) IncomeCategoryRepository {
	return &incomeCategoryRepository{db: db}
}

func (r *incomeCategoryRepository) FindAll() ([]model.IncomeCategory, error) {
	var categories []model.IncomeCategory
	err := r.db.Order("name ASC").Find(&categories).Error
	return categories, err
}

func (r *incomeCategoryRepository) FindByID(id uint) (*model.IncomeCategory, error) {
	var cat model.IncomeCategory
	err := r.db.First(&cat, id).Error
	return &cat, err
}

func (r *incomeCategoryRepository) HasTransactions(id uint) (bool, error) {
	var count int64
	err := r.db.Model(&model.IncomeTransaction{}).Where("income_category_id = ?", id).Count(&count).Error
	return count > 0, err
}

func (r *incomeCategoryRepository) Create(ic *model.IncomeCategory) error {
	return r.db.Create(ic).Error
}

func (r *incomeCategoryRepository) Update(ic *model.IncomeCategory) error {
	return r.db.Save(ic).Error
}

func (r *incomeCategoryRepository) Delete(id uint) error {
	return r.db.Delete(&model.IncomeCategory{}, id).Error
}
