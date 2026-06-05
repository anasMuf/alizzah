package service

import (
	"api/model"
	"api/repository"
	"time"

	"gorm.io/gorm"
)

type TransactionWriterService interface {
	WriteCashCredit(academicYearID uint, date time.Time, amount float64, sourceType string, sourceID *uint, description string, createdBy uint, tx *gorm.DB) error
	WriteCashDebit(academicYearID uint, date time.Time, amount float64, sourceType string, sourceID *uint, description string, createdBy uint, tx *gorm.DB) error
	WriteVaultCredit(academicYearID uint, date time.Time, amount float64, sourceType string, sourceID *uint, description string, createdBy uint, tx *gorm.DB) error
	WriteVaultDebit(academicYearID uint, date time.Time, amount float64, sourceType string, sourceID *uint, description string, createdBy uint, tx *gorm.DB) error
	DeleteCashBySource(tx *gorm.DB, sourceType string, sourceID uint) error
}

type transactionWriterService struct {
	cashRepo  repository.CashTransactionRepository
	vaultRepo repository.VaultTransactionRepository
}

func NewTransactionWriterService(cashRepo repository.CashTransactionRepository, vaultRepo repository.VaultTransactionRepository) TransactionWriterService {
	return &transactionWriterService{cashRepo: cashRepo, vaultRepo: vaultRepo}
}

func (s *transactionWriterService) WriteCashCredit(academicYearID uint, date time.Time, amount float64, sourceType string, sourceID *uint, description string, createdBy uint, tx *gorm.DB) error {
	ct := &model.CashTransaction{
		AcademicYearID:  academicYearID,
		TransactionDate: date,
		TransactionType: "credit",
		Amount:          amount,
		SourceType:      sourceType,
		SourceID:        sourceID,
		Description:     description,
		CreatedBy:       createdBy,
	}
	if tx != nil {
		return s.cashRepo.CreateWithTx(ct, tx)
	}
	return s.cashRepo.Create(ct)
}

func (s *transactionWriterService) WriteCashDebit(academicYearID uint, date time.Time, amount float64, sourceType string, sourceID *uint, description string, createdBy uint, tx *gorm.DB) error {
	ct := &model.CashTransaction{
		AcademicYearID:  academicYearID,
		TransactionDate: date,
		TransactionType: "debit",
		Amount:          amount,
		SourceType:      sourceType,
		SourceID:        sourceID,
		Description:     description,
		CreatedBy:       createdBy,
	}
	if tx != nil {
		return s.cashRepo.CreateWithTx(ct, tx)
	}
	return s.cashRepo.Create(ct)
}

func (s *transactionWriterService) WriteVaultCredit(academicYearID uint, date time.Time, amount float64, sourceType string, sourceID *uint, description string, createdBy uint, tx *gorm.DB) error {
	vt := &model.VaultTransaction{
		AcademicYearID:  academicYearID,
		TransactionDate: date,
		TransactionType: "credit",
		Amount:          amount,
		SourceType:      sourceType,
		SourceID:        sourceID,
		Description:     description,
		CreatedBy:       createdBy,
	}
	if tx != nil {
		return s.vaultRepo.CreateWithTx(vt, tx)
	}
	return s.vaultRepo.Create(vt)
}

func (s *transactionWriterService) WriteVaultDebit(academicYearID uint, date time.Time, amount float64, sourceType string, sourceID *uint, description string, createdBy uint, tx *gorm.DB) error {
	vt := &model.VaultTransaction{
		AcademicYearID:  academicYearID,
		TransactionDate: date,
		TransactionType: "debit",
		Amount:          amount,
		SourceType:      sourceType,
		SourceID:        sourceID,
		Description:     description,
		CreatedBy:       createdBy,
	}
	if tx != nil {
		return s.vaultRepo.CreateWithTx(vt, tx)
	}
	return s.vaultRepo.Create(vt)
}

func (s *transactionWriterService) DeleteCashBySource(tx *gorm.DB, sourceType string, sourceID uint) error {
	return s.cashRepo.DeleteBySource(tx, sourceType, sourceID)
}
