package repository

import (
	"api/model"

	"gorm.io/gorm"
)

type InvoiceItemRepository interface {
	FindByInvoiceID(invoiceID uint) ([]model.InvoiceItem, error)
	FindByID(id uint) (*model.InvoiceItem, error)
	FindUnpaidByInvoiceID(invoiceID uint) ([]model.InvoiceItem, error)
	FindByInvoiceAndCategory(invoiceID uint, category string) (*model.InvoiceItem, error)
	Create(item *model.InvoiceItem) error
	BulkCreate(items []model.InvoiceItem) error
	Update(item *model.InvoiceItem) error
	UpdatePaidAmount(id uint, paidAmount float64, status string) error
	Delete(id uint) error
	HasPayments(id uint) (bool, error)
	WithTx(tx *gorm.DB) InvoiceItemRepository
}

type invoiceItemRepository struct {
	db *gorm.DB
}

func NewInvoiceItemRepository(db *gorm.DB) InvoiceItemRepository {
	return &invoiceItemRepository{db: db}
}

func (r *invoiceItemRepository) WithTx(tx *gorm.DB) InvoiceItemRepository {
	return &invoiceItemRepository{db: tx}
}

func (r *invoiceItemRepository) FindByInvoiceID(invoiceID uint) ([]model.InvoiceItem, error) {
	var items []model.InvoiceItem
	err := r.db.Where("invoice_id = ?", invoiceID).Order("category ASC, name ASC").Find(&items).Error
	return items, err
}

func (r *invoiceItemRepository) FindByID(id uint) (*model.InvoiceItem, error) {
	var item model.InvoiceItem
	err := r.db.First(&item, id).Error
	return &item, err
}

func (r *invoiceItemRepository) FindUnpaidByInvoiceID(invoiceID uint) ([]model.InvoiceItem, error) {
	var items []model.InvoiceItem
	err := r.db.Where("invoice_id = ? AND status != ?", invoiceID, "paid").Find(&items).Error
	return items, err
}

func (r *invoiceItemRepository) FindByInvoiceAndCategory(invoiceID uint, category string) (*model.InvoiceItem, error) {
	var item model.InvoiceItem
	err := r.db.Where("invoice_id = ? AND category = ?", invoiceID, category).First(&item).Error
	return &item, err
}

func (r *invoiceItemRepository) Create(item *model.InvoiceItem) error {
	return r.db.Create(item).Error
}

func (r *invoiceItemRepository) BulkCreate(items []model.InvoiceItem) error {
	if len(items) == 0 {
		return nil
	}
	return r.db.Create(&items).Error
}

func (r *invoiceItemRepository) Update(item *model.InvoiceItem) error {
	return r.db.Save(item).Error
}

func (r *invoiceItemRepository) UpdatePaidAmount(id uint, paidAmount float64, status string) error {
	return r.db.Model(&model.InvoiceItem{}).Where("id = ?", id).Updates(map[string]interface{}{
		"paid_amount": paidAmount,
		"status":      status,
	}).Error
}

func (r *invoiceItemRepository) Delete(id uint) error {
	return r.db.Delete(&model.InvoiceItem{}, id).Error
}

func (r *invoiceItemRepository) HasPayments(id uint) (bool, error) {
	var count int64
	err := r.db.Model(&model.PaymentItem{}).Where("invoice_item_id = ?", id).Count(&count).Error
	return count > 0, err
}
