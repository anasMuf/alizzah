package repository

import (
	"api/model"

	"gorm.io/gorm"
)

type InvoiceInstallmentRepository interface {
	FindByInvoiceID(invoiceID uint) ([]model.InvoiceInstallment, error)
	FindByID(id uint) (*model.InvoiceInstallment, error)
	BulkCreate(installments []model.InvoiceInstallment) error
	Update(inst *model.InvoiceInstallment) error
	Delete(id uint) error
	DeleteByInvoiceID(invoiceID uint) error
}

type invoiceInstallmentRepository struct {
	db *gorm.DB
}

func NewInvoiceInstallmentRepository(db *gorm.DB) InvoiceInstallmentRepository {
	return &invoiceInstallmentRepository{db: db}
}

func (r *invoiceInstallmentRepository) FindByInvoiceID(invoiceID uint) ([]model.InvoiceInstallment, error) {
	var installments []model.InvoiceInstallment
	err := r.db.Where("invoice_id = ?", invoiceID).Order("installment_number ASC").Find(&installments).Error
	return installments, err
}

func (r *invoiceInstallmentRepository) FindByID(id uint) (*model.InvoiceInstallment, error) {
	var inst model.InvoiceInstallment
	err := r.db.First(&inst, id).Error
	return &inst, err
}

func (r *invoiceInstallmentRepository) BulkCreate(installments []model.InvoiceInstallment) error {
	if len(installments) == 0 {
		return nil
	}
	return r.db.Create(&installments).Error
}

func (r *invoiceInstallmentRepository) Update(inst *model.InvoiceInstallment) error {
	return r.db.Save(inst).Error
}

func (r *invoiceInstallmentRepository) Delete(id uint) error {
	return r.db.Delete(&model.InvoiceInstallment{}, id).Error
}

func (r *invoiceInstallmentRepository) DeleteByInvoiceID(invoiceID uint) error {
	return r.db.Where("invoice_id = ?", invoiceID).Delete(&model.InvoiceInstallment{}).Error
}
