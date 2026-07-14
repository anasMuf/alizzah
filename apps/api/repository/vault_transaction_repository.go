package repository

import (
	"api/dto"
	"api/model"
	"time"

	"gorm.io/gorm"
)

type VaultTransactionRepository interface {
	FindAll(params dto.VaultTransactionQueryParams) ([]model.VaultTransaction, int64, error)
	Create(vt *model.VaultTransaction) error
	CreateWithTx(vt *model.VaultTransaction, db *gorm.DB) error
	SumFiltered(params dto.VaultTransactionQueryParams) (credit, debit float64, err error)
	GetCurrentBalance(academicYearID uint) (float64, error)
	DeleteBySource(tx *gorm.DB, sourceType string, sourceID uint) error
}

type vaultTransactionRepository struct {
	db *gorm.DB
}

func NewVaultTransactionRepository(db *gorm.DB) VaultTransactionRepository {
	return &vaultTransactionRepository{db: db}
}

func (r *vaultTransactionRepository) DeleteBySource(tx *gorm.DB, sourceType string, sourceID uint) error {
	return tx.Where("source_type = ? AND source_id = ?", sourceType, sourceID).
		Delete(&model.VaultTransaction{}).Error
}

func (r *vaultTransactionRepository) FindAll(params dto.VaultTransactionQueryParams) ([]model.VaultTransaction, int64, error) {
	var txns []model.VaultTransaction
	var total int64

	query := r.db.Model(&model.VaultTransaction{}).Preload("Creator")

	if params.AcademicYearID != 0 {
		query = query.Where("academic_year_id = ?", params.AcademicYearID)
	}
	if params.TransactionType != "" {
		query = query.Where("transaction_type = ?", params.TransactionType)
	}
	if params.SourceType != "" {
		query = query.Where("source_type = ?", params.SourceType)
	}
	if params.StartDate != "" {
		if d, err := time.Parse("2006-01-02", params.StartDate); err == nil {
			start := time.Date(d.Year(), d.Month(), d.Day(), 0, 0, 0, 0, time.UTC)
			query = query.Where("transaction_date >= ?", start)
		}
	}
	if params.EndDate != "" {
		if d, err := time.Parse("2006-01-02", params.EndDate); err == nil {
			end := time.Date(d.Year(), d.Month(), d.Day(), 23, 59, 59, 0, time.UTC)
			query = query.Where("transaction_date <= ?", end)
		}
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	page := params.Page
	if page < 1 {
		page = 1
	}
	limit := params.Limit
	if limit < 1 {
		limit = 20
	}

	err := query.Order("transaction_date DESC, id DESC").Offset((page - 1) * limit).Limit(limit).Find(&txns).Error
	return txns, total, err
}

func (r *vaultTransactionRepository) Create(vt *model.VaultTransaction) error {
	return r.db.Create(vt).Error
}

func (r *vaultTransactionRepository) CreateWithTx(vt *model.VaultTransaction, db *gorm.DB) error {
	return db.Create(vt).Error
}

func (r *vaultTransactionRepository) SumFiltered(params dto.VaultTransactionQueryParams) (credit, debit float64, err error) {
	type Result struct {
		Credit float64
		Debit  float64
	}
	var res Result

	query := r.db.Model(&model.VaultTransaction{}).
		Select("COALESCE(SUM(CASE WHEN transaction_type = 'debit' THEN amount ELSE 0 END), 0) as credit, COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END), 0) as debit")

	if params.AcademicYearID != 0 {
		query = query.Where("academic_year_id = ?", params.AcademicYearID)
	}
	if params.TransactionType != "" {
		query = query.Where("transaction_type = ?", params.TransactionType)
	}
	if params.SourceType != "" {
		query = query.Where("source_type = ?", params.SourceType)
	}
	if params.StartDate != "" {
		if d, err := time.Parse("2006-01-02", params.StartDate); err == nil {
			start := time.Date(d.Year(), d.Month(), d.Day(), 0, 0, 0, 0, time.UTC)
			query = query.Where("transaction_date >= ?", start)
		}
	}
	if params.EndDate != "" {
		if d, err := time.Parse("2006-01-02", params.EndDate); err == nil {
			end := time.Date(d.Year(), d.Month(), d.Day(), 23, 59, 59, 0, time.UTC)
			query = query.Where("transaction_date <= ?", end)
		}
	}

	err = query.Scan(&res).Error
	return res.Credit, res.Debit, err
}

func (r *vaultTransactionRepository) GetCurrentBalance(academicYearID uint) (float64, error) {
	type Result struct {
		Credit float64
		Debit  float64
	}
	var res Result

	query := r.db.Model(&model.VaultTransaction{}).
		Select("COALESCE(SUM(CASE WHEN transaction_type = 'debit' THEN amount ELSE 0 END), 0) as credit, COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END), 0) as debit")

	if academicYearID != 0 {
		query = query.Where("academic_year_id = ?", academicYearID)
	}

	err := query.Scan(&res).Error
	if err != nil {
		return 0, err
	}
	return res.Credit - res.Debit, nil
}
