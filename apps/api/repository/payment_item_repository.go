package repository

import (
	"api/model"

	"gorm.io/gorm"
)

type PaymentItemRepository interface {
	BulkCreate(items []model.PaymentItem) error
	FindByPaymentID(paymentID uint) ([]model.PaymentItem, error)
	WithTx(tx *gorm.DB) PaymentItemRepository
}

type paymentItemRepository struct {
	db *gorm.DB
}

func NewPaymentItemRepository(db *gorm.DB) PaymentItemRepository {
	return &paymentItemRepository{db: db}
}

func (r *paymentItemRepository) WithTx(tx *gorm.DB) PaymentItemRepository {
	return &paymentItemRepository{db: tx}
}

func (r *paymentItemRepository) BulkCreate(items []model.PaymentItem) error {
	if len(items) == 0 {
		return nil
	}
	return r.db.Create(&items).Error
}

func (r *paymentItemRepository) FindByPaymentID(paymentID uint) ([]model.PaymentItem, error) {
	var items []model.PaymentItem
	err := r.db.Preload("InvoiceItem").Where("payment_id = ?", paymentID).Find(&items).Error
	return items, err
}
