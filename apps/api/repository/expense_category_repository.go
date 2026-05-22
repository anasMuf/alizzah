package repository

import (
	"api/model"

	"gorm.io/gorm"
)

type ExpenseCategoryRepository interface {
	FindAll() ([]model.ExpenseCategory, error)
	FindByID(id uint) (*model.ExpenseCategory, error)
	FindRootCategories() ([]model.ExpenseCategory, error)
	IsLeafNode(id uint) (bool, error)
	HasExpenses(id uint) (bool, error)
	HasChildren(id uint) (bool, error)
	Create(ec *model.ExpenseCategory) error
	Update(ec *model.ExpenseCategory) error
	Delete(id uint) error
}

type expenseCategoryRepository struct {
	db *gorm.DB
}

func NewExpenseCategoryRepository(db *gorm.DB) ExpenseCategoryRepository {
	return &expenseCategoryRepository{db: db}
}

func (r *expenseCategoryRepository) FindAll() ([]model.ExpenseCategory, error) {
	var categories []model.ExpenseCategory
	err := r.db.Preload("Children").Where("parent_id IS NULL").Order("name ASC").Find(&categories).Error
	return categories, err
}

func (r *expenseCategoryRepository) FindByID(id uint) (*model.ExpenseCategory, error) {
	var cat model.ExpenseCategory
	err := r.db.Preload("Parent").First(&cat, id).Error
	return &cat, err
}

func (r *expenseCategoryRepository) FindRootCategories() ([]model.ExpenseCategory, error) {
	var categories []model.ExpenseCategory
	err := r.db.Where("parent_id IS NULL").Find(&categories).Error
	return categories, err
}

func (r *expenseCategoryRepository) IsLeafNode(id uint) (bool, error) {
	var count int64
	err := r.db.Model(&model.ExpenseCategory{}).Where("parent_id = ?", id).Count(&count).Error
	return count == 0, err
}

func (r *expenseCategoryRepository) HasExpenses(id uint) (bool, error) {
	var count int64
	err := r.db.Model(&model.Expense{}).Where("expense_category_id = ?", id).Count(&count).Error
	return count > 0, err
}

func (r *expenseCategoryRepository) HasChildren(id uint) (bool, error) {
	var count int64
	err := r.db.Model(&model.ExpenseCategory{}).Where("parent_id = ?", id).Count(&count).Error
	return count > 0, err
}

func (r *expenseCategoryRepository) Create(ec *model.ExpenseCategory) error {
	return r.db.Create(ec).Error
}

func (r *expenseCategoryRepository) Update(ec *model.ExpenseCategory) error {
	return r.db.Save(ec).Error
}

func (r *expenseCategoryRepository) Delete(id uint) error {
	return r.db.Delete(&model.ExpenseCategory{}, id).Error
}
