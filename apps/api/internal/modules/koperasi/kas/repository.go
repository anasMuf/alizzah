package kas

import (
	"time"

	"gorm.io/gorm"
)

type Repository interface {
	CreateWithTx(ct *CashTransaction, tx *gorm.DB) error
	GetBalance(academicYearID uint) (float64, error)
	FindAll(p QueryParams) ([]CashTransaction, int64, error)
}

type repository struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) Repository { return &repository{db: db} }

func (r *repository) CreateWithTx(ct *CashTransaction, tx *gorm.DB) error {
	return tx.Create(ct).Error
}

func (r *repository) GetBalance(academicYearID uint) (float64, error) {
	type result struct{ Credit, Debit float64 }
	var res result
	q := r.db.Model(&CashTransaction{}).
		Select("COALESCE(SUM(CASE WHEN transaction_type='debit' THEN amount ELSE 0 END),0) as credit, COALESCE(SUM(CASE WHEN transaction_type='credit' THEN amount ELSE 0 END),0) as debit")
	if academicYearID != 0 {
		q = q.Where("academic_year_id = ?", academicYearID)
	}
	if err := q.Scan(&res).Error; err != nil {
		return 0, err
	}
	return res.Credit - res.Debit, nil
}

func (r *repository) FindAll(p QueryParams) ([]CashTransaction, int64, error) {
	var txns []CashTransaction
	var total int64

	q := r.db.Model(&CashTransaction{}).Preload("Creator")
	if p.AcademicYearID != 0 {
		q = q.Where("academic_year_id = ?", p.AcademicYearID)
	}
	if p.TransactionType != "" {
		q = q.Where("transaction_type = ?", p.TransactionType)
	}
	if p.SourceType != "" {
		q = q.Where("source_type = ?", p.SourceType)
	}
	if p.StartDate != "" {
		if d, err := time.Parse("2006-01-02", p.StartDate); err == nil {
			q = q.Where("transaction_date >= ?", d)
		}
	}
	if p.EndDate != "" {
		if d, err := time.Parse("2006-01-02", p.EndDate); err == nil {
			q = q.Where("transaction_date <= ?", d)
		}
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	page, limit := p.Page, p.Limit
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	err := q.Order("transaction_date DESC, id DESC").Offset((page - 1) * limit).Limit(limit).Find(&txns).Error
	return txns, total, err
}
