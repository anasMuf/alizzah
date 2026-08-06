package repository

import (
	"api/dto"
	"api/model"
	"time"

	"gorm.io/gorm"
)

type IncomeTransactionRepository interface {
	FindAll(params dto.IncomeTransactionQueryParams) ([]model.IncomeTransaction, int64, error)
	FindByID(id uint) (*model.IncomeTransaction, error)
	Create(it *model.IncomeTransaction) error
	CreateWithTx(it *model.IncomeTransaction, tx *gorm.DB) error
	Update(it *model.IncomeTransaction) error
	Delete(id uint) error
	WithTx(tx *gorm.DB) IncomeTransactionRepository
	IsDateLocked(date time.Time) (bool, error)
	SumByDateRange(academicYearID uint, start, end time.Time) (float64, error)
}

type incomeTransactionRepository struct {
	db *gorm.DB
}

func NewIncomeTransactionRepository(db *gorm.DB) IncomeTransactionRepository {
	return &incomeTransactionRepository{db: db}
}

func (r *incomeTransactionRepository) WithTx(tx *gorm.DB) IncomeTransactionRepository {
	return &incomeTransactionRepository{db: tx}
}

func (r *incomeTransactionRepository) FindAll(params dto.IncomeTransactionQueryParams) ([]model.IncomeTransaction, int64, error) {
	var txns []model.IncomeTransaction
	var total int64

	query := r.db.Model(&model.IncomeTransaction{}).Preload("AcademicYear").Preload("Creator").Preload("IncomeCategory")

	if params.AcademicYearID != 0 {
		query = query.Where("academic_year_id = ?", params.AcademicYearID)
	}
	if params.IncomeCategoryID != 0 {
		query = query.Where("income_category_id = ?", params.IncomeCategoryID)
	}
	if params.StartDate != "" {
		if d, err := time.Parse("2006-01-02", params.StartDate); err == nil {
			query = query.Where("transaction_date >= ?", d)
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

func (r *incomeTransactionRepository) FindByID(id uint) (*model.IncomeTransaction, error) {
	var it model.IncomeTransaction
	err := r.db.Preload("AcademicYear").Preload("Creator").Preload("IncomeCategory").First(&it, id).Error
	return &it, err
}

func (r *incomeTransactionRepository) Create(it *model.IncomeTransaction) error {
	return r.db.Create(it).Error
}

func (r *incomeTransactionRepository) CreateWithTx(it *model.IncomeTransaction, tx *gorm.DB) error {
	return tx.Create(it).Error
}

func (r *incomeTransactionRepository) Update(it *model.IncomeTransaction) error {
	return r.db.Save(it).Error
}

func (r *incomeTransactionRepository) Delete(id uint) error {
	return r.db.Delete(&model.IncomeTransaction{}, id).Error
}

func (r *incomeTransactionRepository) IsDateLocked(date time.Time) (bool, error) {
	var count int64
	err := r.db.Model(&model.DailyClosing{}).
		Where("closing_date = ? AND is_confirmed = true", date).
		Count(&count).Error
	return count > 0, err
}

func (r *incomeTransactionRepository) SumByDateRange(academicYearID uint, start, end time.Time) (float64, error) {
	var total float64
	err := r.db.Model(&model.IncomeTransaction{}).
		Select("COALESCE(SUM(amount), 0)").
		Where("academic_year_id = ? AND transaction_date BETWEEN ? AND ?", academicYearID, start, end).
		Scan(&total).Error
	return total, err
}
