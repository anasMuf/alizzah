package repository

import (
	"api/dto"
	"api/model"
	"time"

	"gorm.io/gorm"
)

type CashTransactionRepository interface {
	FindAll(params dto.CashTransactionQueryParams) ([]model.CashTransaction, int64, error)
	Create(ct *model.CashTransaction) error
	CreateWithTx(ct *model.CashTransaction, db *gorm.DB) error
	SumByDate(academicYearID uint, date time.Time) (credit, debit float64, err error)
	SumByDateRange(academicYearID uint, start, end time.Time) (credit, debit float64, err error)
	SumByMonth(academicYearID uint, month, year uint) (credit, debit float64, err error)
	SumFiltered(params dto.CashTransactionQueryParams) (credit, debit float64, err error)
	GetCurrentBalance(academicYearID uint) (float64, error)
	GetCurrentBalanceWithTx(academicYearID uint, tx *gorm.DB) (float64, error)
	GetBalanceUpToDate(academicYearID uint, date time.Time) (float64, error)
	GetLastClosingDate(academicYearID uint) (*time.Time, error)
	GetTodaySummary(academicYearID uint) (credit, debit float64, err error)
	SumByCategory(academicYearID uint, start, end time.Time) ([]dto.CategoryAmount, error)
	DeleteBySource(tx *gorm.DB, sourceType string, sourceID uint) error
}

type cashTransactionRepository struct {
	db *gorm.DB
}

func NewCashTransactionRepository(db *gorm.DB) CashTransactionRepository {
	return &cashTransactionRepository{db: db}
}

func (r *cashTransactionRepository) FindAll(params dto.CashTransactionQueryParams) ([]model.CashTransaction, int64, error) {
	var txns []model.CashTransaction
	var total int64

	query := r.db.Model(&model.CashTransaction{}).Preload("Creator")

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

func (r *cashTransactionRepository) Create(ct *model.CashTransaction) error {
	return r.db.Create(ct).Error
}

func (r *cashTransactionRepository) CreateWithTx(ct *model.CashTransaction, db *gorm.DB) error {
	return db.Create(ct).Error
}

func (r *cashTransactionRepository) SumByDate(academicYearID uint, date time.Time) (credit, debit float64, err error) {
	start := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, time.UTC)
	end := start.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
	return r.SumByDateRange(academicYearID, start, end)
}

func (r *cashTransactionRepository) SumByDateRange(academicYearID uint, start, end time.Time) (credit, debit float64, err error) {
	type Result struct {
		Credit float64
		Debit  float64
	}
	var res Result

	query := r.db.Model(&model.CashTransaction{}).
		Select("COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END), 0) as credit, COALESCE(SUM(CASE WHEN transaction_type = 'debit' THEN amount ELSE 0 END), 0) as debit")

	if academicYearID != 0 {
		query = query.Where("academic_year_id = ?", academicYearID)
	}

	err = query.Where("transaction_date BETWEEN ? AND ?", start, end).Scan(&res).Error
	return res.Credit, res.Debit, err
}

func (r *cashTransactionRepository) SumByMonth(academicYearID uint, month, year uint) (credit, debit float64, err error) {
	start := time.Date(int(year), time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	end := start.AddDate(0, 1, -1).Add(23*time.Hour + 59*time.Minute + 59*time.Second)
	return r.SumByDateRange(academicYearID, start, end)
}

// SumFiltered returns total credit and debit for all transactions matching the given filters
// (not just the current page), using the same filter logic as FindAll.
func (r *cashTransactionRepository) SumFiltered(params dto.CashTransactionQueryParams) (credit, debit float64, err error) {
	type Result struct {
		Credit float64
		Debit  float64
	}
	var res Result

	query := r.db.Model(&model.CashTransaction{}).
		Select("COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END), 0) as credit, COALESCE(SUM(CASE WHEN transaction_type = 'debit' THEN amount ELSE 0 END), 0) as debit")

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

func (r *cashTransactionRepository) GetCurrentBalance(academicYearID uint) (float64, error) {
	type Result struct {
		Credit float64
		Debit  float64
	}
	var res Result

	query := r.db.Model(&model.CashTransaction{}).
		Select("COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END), 0) as credit, COALESCE(SUM(CASE WHEN transaction_type = 'debit' THEN amount ELSE 0 END), 0) as debit")

	if academicYearID != 0 {
		query = query.Where("academic_year_id = ?", academicYearID)
	}

	err := query.Scan(&res).Error
	if err != nil {
		return 0, err
	}
	return res.Credit - res.Debit, nil
}

func (r *cashTransactionRepository) GetCurrentBalanceWithTx(academicYearID uint, tx *gorm.DB) (float64, error) {
	type Result struct {
		Credit float64
		Debit  float64
	}
	var res Result

	query := tx.Model(&model.CashTransaction{}).
		Select("COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END), 0) as credit, COALESCE(SUM(CASE WHEN transaction_type = 'debit' THEN amount ELSE 0 END), 0) as debit")

	if academicYearID != 0 {
		query = query.Where("academic_year_id = ?", academicYearID)
	}

	err := query.Scan(&res).Error
	if err != nil {
		return 0, err
	}
	return res.Credit - res.Debit, nil
}

func (r *cashTransactionRepository) GetBalanceUpToDate(academicYearID uint, date time.Time) (float64, error) {
	type Result struct {
		Credit float64
		Debit  float64
	}
	var res Result

	query := r.db.Model(&model.CashTransaction{}).
		Select("COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END), 0) as credit, COALESCE(SUM(CASE WHEN transaction_type = 'debit' THEN amount ELSE 0 END), 0) as debit")

	if academicYearID != 0 {
		query = query.Where("academic_year_id = ?", academicYearID)
	}

	endOfDay := time.Date(date.Year(), date.Month(), date.Day(), 23, 59, 59, 0, time.UTC)
	err := query.Where("transaction_date <= ?", endOfDay).Scan(&res).Error
	if err != nil {
		return 0, err
	}
	return res.Credit - res.Debit, nil
}

func (r *cashTransactionRepository) GetLastClosingDate(academicYearID uint) (*time.Time, error) {
	var closing model.DailyClosing
	err := r.db.Where("academic_year_id = ? AND is_confirmed = true", academicYearID).Order("closing_date desc").First(&closing).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &closing.ClosingDate, nil
}

func (r *cashTransactionRepository) GetTodaySummary(academicYearID uint) (credit, debit float64, err error) {
	now := time.Now()
	start := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	end := start.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
	return r.SumByDateRange(academicYearID, start, end)
}

func (r *cashTransactionRepository) SumByCategory(academicYearID uint, start, end time.Time) ([]dto.CategoryAmount, error) {
	var results []dto.CategoryAmount
	err := r.db.
		Table("payment_items pi").
		Select("ii.category as category, SUM(pi.amount) as amount").
		Joins("JOIN invoice_items ii ON ii.id = pi.invoice_item_id").
		Joins("JOIN payments p ON p.id = pi.payment_id").
		Where("p.academic_year_id = ? AND p.payment_date BETWEEN ? AND ?",
			academicYearID, start, end).
		Group("ii.category").
		Scan(&results).Error
	return results, err
}

func (r *cashTransactionRepository) DeleteBySource(tx *gorm.DB, sourceType string, sourceID uint) error {
	return tx.Where("source_type = ? AND source_id = ?", sourceType, sourceID).
		Delete(&model.CashTransaction{}).Error
}
