package penerimaan

import (
	"time"

	"gorm.io/gorm"
)

// --- Repository ---

type Repository interface {
	FindAll(params QueryParams) ([]IncomeTransaction, int64, error)
	FindByID(id uint) (*IncomeTransaction, error)
	Create(it *IncomeTransaction) error
	CreateWithTx(it *IncomeTransaction, tx *gorm.DB) error
	Update(it *IncomeTransaction) error
	Delete(id uint) error
	WithTx(tx *gorm.DB) Repository
	IsDateLocked(date time.Time) (bool, error)
}

func NewRepository(db *gorm.DB) Repository { return &repo{db: db} }

type repo struct{ db *gorm.DB }

func (r *repo) WithTx(tx *gorm.DB) Repository { return &repo{db: tx} }

func (r *repo) FindAll(params QueryParams) ([]IncomeTransaction, int64, error) {
	var txns []IncomeTransaction
	var total int64
	query := r.db.Model(&IncomeTransaction{}).Preload("AcademicYear").Preload("Creator")

	if params.AcademicYearID != 0 {
		query = query.Where("academic_year_id = ?", params.AcademicYearID)
	}
	if params.Category != "" {
		query = query.Where("category = ?", params.Category)
	}
	if params.StartDate != "" {
		if d, err := time.Parse("2006-01-02", params.StartDate); err == nil {
			query = query.Where("transaction_date >= ?", d)
		}
	}
	if params.EndDate != "" {
		if d, err := time.Parse("2006-01-02", params.EndDate); err == nil {
			query = query.Where("transaction_date <= ?", d)
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

func (r *repo) FindByID(id uint) (*IncomeTransaction, error) {
	var it IncomeTransaction
	err := r.db.Preload("AcademicYear").Preload("Creator").First(&it, id).Error
	return &it, err
}

func (r *repo) Create(it *IncomeTransaction) error     { return r.db.Create(it).Error }
func (r *repo) CreateWithTx(it *IncomeTransaction, tx *gorm.DB) error { return tx.Create(it).Error }
func (r *repo) Update(it *IncomeTransaction) error      { return r.db.Save(it).Error }
func (r *repo) Delete(id uint) error                     { return r.db.Delete(&IncomeTransaction{}, id).Error }

func (r *repo) IsDateLocked(date time.Time) (bool, error) {
	var count int64
	err := r.db.Table("daily_closings").Where("closing_date = ? AND is_confirmed = true", date).Count(&count).Error
	return count > 0, err
}
