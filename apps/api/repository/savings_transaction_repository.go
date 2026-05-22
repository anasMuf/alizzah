package repository

import (
	"api/dto"
	"api/model"
	"time"

	"gorm.io/gorm"
)

type SavingsTransactionRepository interface {
	FindByStudentSavingsID(savingsID uint, params dto.SavingsTransactionQueryParams) ([]model.SavingsTransaction, int64, error)
	Create(st *model.SavingsTransaction) error
	CreateWithTx(st *model.SavingsTransaction, db *gorm.DB) error
}

type savingsTransactionRepository struct {
	db *gorm.DB
}

func NewSavingsTransactionRepository(db *gorm.DB) SavingsTransactionRepository {
	return &savingsTransactionRepository{db: db}
}

func (r *savingsTransactionRepository) FindByStudentSavingsID(savingsID uint, params dto.SavingsTransactionQueryParams) ([]model.SavingsTransaction, int64, error) {
	var txns []model.SavingsTransaction
	var total int64
	query := r.db.Model(&model.SavingsTransaction{}).Where("student_savings_id = ?", savingsID)

	if params.StartDate != "" {
		if d, err := time.Parse("2006-01-02", params.StartDate); err == nil {
			query = query.Where("created_at >= ?", d)
		}
	}
	if params.EndDate != "" {
		if d, err := time.Parse("2006-01-02", params.EndDate); err == nil {
			query = query.Where("created_at <= ?", d.Add(24*time.Hour))
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

	err := query.Order("created_at DESC").Offset((page - 1) * limit).Limit(limit).Find(&txns).Error
	return txns, total, err
}

func (r *savingsTransactionRepository) Create(st *model.SavingsTransaction) error {
	return r.db.Create(st).Error
}

func (r *savingsTransactionRepository) CreateWithTx(st *model.SavingsTransaction, db *gorm.DB) error {
	return db.Create(st).Error
}
