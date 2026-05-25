package repository

import (
	"api/dto"
	"api/model"
	"fmt"
	"strings"

	"gorm.io/gorm"
)

type FeeConfigItemRepository interface {
	FindByFeeConfigID(feeConfigID uint, params dto.FeeConfigItemQueryParams) ([]model.FeeConfigItem, error)
	FindByID(id uint) (*model.FeeConfigItem, error)
	FindByItemKey(feeConfigID uint, itemKey, level, gender string) (*model.FeeConfigItem, error)
	FindByCategory(feeConfigID uint, category string) ([]model.FeeConfigItem, error)
	FindForStudent(feeConfigID uint, level, gender string) ([]model.FeeConfigItem, error)
	Create(item *model.FeeConfigItem) error
	Update(item *model.FeeConfigItem) error
	Delete(id uint) error
	IsUsedByInvoices(id uint) (bool, error)
	// Batch 5 additions
	FindByStudentForCategory(feeConfigID uint, category, level, gender string) ([]model.FeeConfigItem, error)
	FindByExtracurricular(feeConfigID uint, exType, exName string) ([]model.FeeConfigItem, error)
}

type feeConfigItemRepository struct {
	db *gorm.DB
}

func NewFeeConfigItemRepository(db *gorm.DB) FeeConfigItemRepository {
	return &feeConfigItemRepository{db: db}
}

func (r *feeConfigItemRepository) FindByFeeConfigID(feeConfigID uint, params dto.FeeConfigItemQueryParams) ([]model.FeeConfigItem, error) {
	var items []model.FeeConfigItem
	query := r.db.Where("fee_config_id = ?", feeConfigID)

	if params.Category != "" {
		query = query.Where("category = ?", params.Category)
	}
	if params.Level != "" {
		query = query.Where("level = ?", params.Level)
	}
	if params.Gender != "" {
		query = query.Where("gender = ?", params.Gender)
	}

	err := query.Order("category ASC, name ASC").Find(&items).Error
	return items, err
}

func (r *feeConfigItemRepository) FindByID(id uint) (*model.FeeConfigItem, error) {
	var item model.FeeConfigItem
	err := r.db.First(&item, id).Error
	return &item, err
}

func (r *feeConfigItemRepository) FindByItemKey(feeConfigID uint, itemKey, level, gender string) (*model.FeeConfigItem, error) {
	var item model.FeeConfigItem
	err := r.db.Where("fee_config_id = ? AND item_key = ? AND level = ? AND gender = ?", feeConfigID, itemKey, level, gender).First(&item).Error
	return &item, err
}

func (r *feeConfigItemRepository) FindByCategory(feeConfigID uint, category string) ([]model.FeeConfigItem, error) {
	var items []model.FeeConfigItem
	err := r.db.Where("fee_config_id = ? AND category = ?", feeConfigID, category).Find(&items).Error
	return items, err
}

func (r *feeConfigItemRepository) FindForStudent(feeConfigID uint, level, gender string) ([]model.FeeConfigItem, error) {
	var items []model.FeeConfigItem
	err := r.db.Where(
		"fee_config_id = ? AND (level = 'all' OR level = ?) AND (gender = 'all' OR gender = ?)",
		feeConfigID, level, gender,
	).Find(&items).Error
	return items, err
}

func (r *feeConfigItemRepository) Create(item *model.FeeConfigItem) error {
	return r.db.Create(item).Error
}

func (r *feeConfigItemRepository) Update(item *model.FeeConfigItem) error {
	return r.db.Save(item).Error
}

func (r *feeConfigItemRepository) Delete(id uint) error {
	return r.db.Delete(&model.FeeConfigItem{}, id).Error
}

func (r *feeConfigItemRepository) IsUsedByInvoices(id uint) (bool, error) {
	var item model.FeeConfigItem
	if err := r.db.First(&item, id).Error; err != nil {
		return false, err
	}

	var count int64
	err := r.db.Model(&model.InvoiceItem{}).
		Where("name = ? AND category = ?", item.Name, item.Category).
		Count(&count).Error
	return count > 0, err
}

func (r *feeConfigItemRepository) FindByStudentForCategory(feeConfigID uint, category, level, gender string) ([]model.FeeConfigItem, error) {
	var items []model.FeeConfigItem
	err := r.db.Where(
		"fee_config_id = ? AND category = ? AND (level = 'all' OR level = ?) AND (gender = 'all' OR gender = ?)",
		feeConfigID, category, level, gender,
	).Find(&items).Error
	return items, err
}

func (r *feeConfigItemRepository) FindByExtracurricular(feeConfigID uint, exType, exName string) ([]model.FeeConfigItem, error) {
	slug := strings.ToLower(strings.ReplaceAll(exName, " ", "_"))
	itemKey := fmt.Sprintf("%s_%s", exType, slug)
	var items []model.FeeConfigItem
	err := r.db.Where("fee_config_id = ? AND item_key = ?", feeConfigID, itemKey).Find(&items).Error
	return items, err
}
