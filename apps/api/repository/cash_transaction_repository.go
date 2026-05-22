package repository

import (
	"api/model"

	"gorm.io/gorm"
)

type CashTransactionRepository interface {
	Create(ct *model.CashTransaction) error
	CreateWithTx(ct *model.CashTransaction, db *gorm.DB) error
}

type cashTransactionRepository struct {
	db *gorm.DB
}

func NewCashTransactionRepository(db *gorm.DB) CashTransactionRepository {
	return &cashTransactionRepository{db: db}
}

func (r *cashTransactionRepository) Create(ct *model.CashTransaction) error {
	return r.db.Create(ct).Error
}

func (r *cashTransactionRepository) CreateWithTx(ct *model.CashTransaction, db *gorm.DB) error {
	return db.Create(ct).Error
}
