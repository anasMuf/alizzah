package kas

import (
	"api/model"
	"time"

	"gorm.io/gorm"
)

type Repository interface {
	FindAll(params QueryParams) ([]CashTransaction, int64, error)
	SumByDateRange(academicYearID uint, start, end time.Time) (credit, debit float64, err error)
	GetCurrentBalance(academicYearID uint) (float64, error)
	GetCurrentBalanceWithTx(academicYearID uint, tx *gorm.DB) (float64, error)
	GetBalanceUpToDate(academicYearID uint, date time.Time) (float64, error)
	GetLastClosingDate(academicYearID uint) (*time.Time, error)
	GetTodaySummary(academicYearID uint) (credit, debit float64, err error)
	DeleteBySource(tx *gorm.DB, sourceType string, sourceID uint) error
}

func NewRepository(db *gorm.DB) Repository { return &repo{db: db} }

type repo struct{ db *gorm.DB }

func (r *repo) FindAll(params QueryParams) ([]CashTransaction, int64, error) {
	var txns []CashTransaction
	var total int64
	q := r.db.Model(&CashTransaction{}).Preload("Creator")
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
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	err := q.Order("transaction_date DESC, id DESC").Offset((page-1)*limit).Limit(limit).Find(&txns).Error
	return txns, total, err
}

func (r *repo) sum(academicYearID uint, cond func(*gorm.DB) *gorm.DB) (credit, debit float64, err error) {
	var res struct {
		Credit float64
		Debit  float64
	}
	q := r.db.Model(&CashTransaction{}).
		Select("COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END), 0) as credit, COALESCE(SUM(CASE WHEN transaction_type = 'debit' THEN amount ELSE 0 END), 0) as debit")
	if academicYearID != 0 {
		q = q.Where("academic_year_id = ?", academicYearID)
	}
	err = cond(q).Scan(&res).Error
	return res.Credit, res.Debit, err
}

func (r *repo) SumByDateRange(academicYearID uint, start, end time.Time) (credit, debit float64, err error) {
	return r.sum(academicYearID, func(q *gorm.DB) *gorm.DB {
		return q.Where("transaction_date BETWEEN ? AND ?", start, end)
	})
}

func (r *repo) GetCurrentBalance(academicYearID uint) (float64, error) {
	credit, debit, err := r.sum(academicYearID, func(q *gorm.DB) *gorm.DB { return q })
	return credit - debit, err
}

func (r *repo) GetCurrentBalanceWithTx(academicYearID uint, tx *gorm.DB) (float64, error) {
	var res struct{ Credit, Debit float64 }
	q := tx.Model(&CashTransaction{}).
		Select("COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END), 0) as credit, COALESCE(SUM(CASE WHEN transaction_type = 'debit' THEN amount ELSE 0 END), 0) as debit")
	if academicYearID != 0 {
		q = q.Where("academic_year_id = ?", academicYearID)
	}
	err := q.Scan(&res).Error
	return res.Credit - res.Debit, err
}

func (r *repo) GetBalanceUpToDate(academicYearID uint, date time.Time) (float64, error) {
	credit, debit, err := r.sum(academicYearID, func(q *gorm.DB) *gorm.DB {
		end := time.Date(date.Year(), date.Month(), date.Day(), 23, 59, 59, 0, time.UTC)
		return q.Where("transaction_date <= ?", end)
	})
	return credit - debit, err
}

func (r *repo) GetLastClosingDate(academicYearID uint) (*time.Time, error) {
	var closing model.DailyClosing
	err := r.db.Where("academic_year_id = ? AND is_confirmed = true", academicYearID).
		Order("closing_date desc").First(&closing).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &closing.ClosingDate, nil
}

func (r *repo) GetTodaySummary(academicYearID uint) (credit, debit float64, err error) {
	now := time.Now()
	start := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	end := start.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
	return r.SumByDateRange(academicYearID, start, end)
}

func (r *repo) DeleteBySource(tx *gorm.DB, sourceType string, sourceID uint) error {
	return tx.Where("source_type = ? AND source_id = ?", sourceType, sourceID).Delete(&CashTransaction{}).Error
}
