package berangkas

import (
	"time"

	"gorm.io/gorm"
)

type Repository interface {
	FindAll(params QueryParams) ([]VaultTransaction, int64, error)
	GetCurrentBalance(academicYearID uint) (float64, error)
}

func NewRepository(db *gorm.DB) Repository { return &repo{db: db} }

type repo struct{ db *gorm.DB }

func (r *repo) FindAll(params QueryParams) ([]VaultTransaction, int64, error) {
	var txns []VaultTransaction
	var total int64
	q := r.db.Model(&VaultTransaction{}).Preload("Creator")
	if params.AcademicYearID != 0 {
		q = q.Where("academic_year_id = ?", params.AcademicYearID)
	}
	if params.TransactionType != "" {
		q = q.Where("transaction_type = ?", params.TransactionType)
	}
	if params.SourceType != "" {
		q = q.Where("source_type = ?", params.SourceType)
	}
	if params.StartDate != "" {
		if d, err := time.Parse("2006-01-02", params.StartDate); err == nil {
			q = q.Where("transaction_date >= ?", d)
		}
	}
	if params.EndDate != "" {
		if d, err := time.Parse("2006-01-02", params.EndDate); err == nil {
			q = q.Where("transaction_date <= ?", d)
		}
	}
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	page, limit := params.Page, params.Limit
	if page < 1 { page = 1 }
	if limit < 1 { limit = 20 }
	err := q.Order("transaction_date DESC, id DESC").Offset((page-1)*limit).Limit(limit).Find(&txns).Error
	return txns, total, err
}

func (r *repo) GetCurrentBalance(academicYearID uint) (float64, error) {
	var res struct{ Credit, Debit float64 }
	q := r.db.Model(&VaultTransaction{}).
		Select("COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END), 0) as credit, COALESCE(SUM(CASE WHEN transaction_type = 'debit' THEN amount ELSE 0 END), 0) as debit")
	if academicYearID != 0 {
		q = q.Where("academic_year_id = ?", academicYearID)
	}
	err := q.Scan(&res).Error
	return res.Credit - res.Debit, err
}
