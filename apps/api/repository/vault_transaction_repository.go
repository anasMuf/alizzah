package repository

import (
	"api/model"

	"gorm.io/gorm"
)

type VaultTransactionRepository interface {
	Create(vt *model.VaultTransaction) error
	CreateWithTx(vt *model.VaultTransaction, db *gorm.DB) error
}

type vaultTransactionRepository struct {
	db *gorm.DB
}

func NewVaultTransactionRepository(db *gorm.DB) VaultTransactionRepository {
	return &vaultTransactionRepository{db: db}
}

func (r *vaultTransactionRepository) Create(vt *model.VaultTransaction) error {
	return r.db.Create(vt).Error
}

func (r *vaultTransactionRepository) CreateWithTx(vt *model.VaultTransaction, db *gorm.DB) error {
	return db.Create(vt).Error
}
