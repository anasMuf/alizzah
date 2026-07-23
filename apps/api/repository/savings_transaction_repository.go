package repository

import (
	"api/dto"
	"api/model"
	"time"

	"gorm.io/gorm"
)

type SavingsTransactionRepository interface {
	FindByStudentSavingsID(savingsID uint, params dto.SavingsTransactionQueryParams) ([]model.SavingsTransaction, int64, error)
	// FindBySavingsIDs batch version — single query for multiple savings accounts.
	FindBySavingsIDs(savingsIDs []uint, params dto.SavingsTransactionQueryParams) ([]model.SavingsTransaction, error)
	FindAllByStudentID(studentID uint, startDate, endDate time.Time) ([]model.SavingsTransaction, error)
	SumCreditByStudentBefore(studentID uint, before time.Time) (float64, error)
	SumDebitByStudentBefore(studentID uint, before time.Time) (float64, error)
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

// FindBySavingsIDs batch-fetches transactions for multiple savings accounts.
func (r *savingsTransactionRepository) FindBySavingsIDs(savingsIDs []uint, params dto.SavingsTransactionQueryParams) ([]model.SavingsTransaction, error) {
	if len(savingsIDs) == 0 {
		return nil, nil
	}
	var txns []model.SavingsTransaction
	query := r.db.Model(&model.SavingsTransaction{}).Where("student_savings_id IN ?", savingsIDs)

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

	err := query.Order("created_at DESC").Find(&txns).Error
	return txns, err
}

func (r *savingsTransactionRepository) FindAllByStudentID(studentID uint, startDate, endDate time.Time) ([]model.SavingsTransaction, error) {
	var txns []model.SavingsTransaction
	err := r.db.
		Joins("JOIN student_savings ss ON ss.id = savings_transactions.student_savings_id").
		Where("ss.student_id = ? AND ss.type = ?", studentID, "general").
		Where("savings_transactions.created_at >= ? AND savings_transactions.created_at <= ?", startDate, endDate.Add(24*time.Hour)).
		Preload("Creator").
		Order("savings_transactions.created_at ASC").
		Find(&txns).Error
	return txns, err
}

func (r *savingsTransactionRepository) SumCreditByStudentBefore(studentID uint, before time.Time) (float64, error) {
	var total float64
	err := r.db.Model(&model.SavingsTransaction{}).
		Select("COALESCE(SUM(savings_transactions.net_amount), 0)").
		Joins("JOIN student_savings ss ON ss.id = savings_transactions.student_savings_id").
		Where("ss.student_id = ? AND ss.type = ? AND savings_transactions.transaction_type = ? AND savings_transactions.created_at < ?",
			studentID, "general", "credit", before).
		Scan(&total).Error
	return total, err
}

func (r *savingsTransactionRepository) SumDebitByStudentBefore(studentID uint, before time.Time) (float64, error) {
	var total float64
	err := r.db.Model(&model.SavingsTransaction{}).
		Select("COALESCE(SUM(savings_transactions.net_amount), 0)").
		Joins("JOIN student_savings ss ON ss.id = savings_transactions.student_savings_id").
		Where("ss.student_id = ? AND ss.type = ? AND savings_transactions.transaction_type = ? AND savings_transactions.created_at < ?",
			studentID, "general", "debit", before).
		Scan(&total).Error
	return total, err
}

func (r *savingsTransactionRepository) Create(st *model.SavingsTransaction) error {
	return r.db.Create(st).Error
}

func (r *savingsTransactionRepository) CreateWithTx(st *model.SavingsTransaction, db *gorm.DB) error {
	return db.Create(st).Error
}
