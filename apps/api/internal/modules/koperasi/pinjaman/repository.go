package pinjaman

import "gorm.io/gorm"

type Repository interface {
	CreateWithTx(l *Loan, tx *gorm.DB) error
	FindByID(id uint) (*Loan, error)
	FindAll(p QueryParams) ([]Loan, int64, error)
	UpdatePaymentWithTx(tx *gorm.DB, id uint, paidAmount float64, status string) error
	FindInstallmentsWithTx(tx *gorm.DB, loanID uint) ([]LoanInstallment, error)
	UpdateInstallmentWithTx(tx *gorm.DB, inst *LoanInstallment) error
	Summary(academicYearID uint) ([]SummaryItem, error)
}

type repo struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) Repository { return &repo{db: db} }

func (r *repo) CreateWithTx(l *Loan, tx *gorm.DB) error {
	return tx.Create(l).Error // installments dibuat lewat asosiasi
}

func (r *repo) FindByID(id uint) (*Loan, error) {
	var l Loan
	err := r.db.Preload("Member").Preload("Creator").
		Preload("Installments", func(db *gorm.DB) *gorm.DB { return db.Order("sequence ASC") }).
		First(&l, id).Error
	return &l, err
}

func (r *repo) FindAll(p QueryParams) ([]Loan, int64, error) {
	var items []Loan
	var total int64
	q := r.db.Model(&Loan{}).Preload("Member")
	if p.AcademicYearID != 0 {
		q = q.Where("academic_year_id = ?", p.AcademicYearID)
	}
	if p.MemberID != 0 {
		q = q.Where("member_id = ?", p.MemberID)
	}
	if p.Status != "" {
		q = q.Where("status = ?", p.Status)
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
	err := q.Order("loan_date DESC, id DESC").Offset((page - 1) * limit).Limit(limit).Find(&items).Error
	return items, total, err
}

func (r *repo) UpdatePaymentWithTx(tx *gorm.DB, id uint, paidAmount float64, status string) error {
	return tx.Model(&Loan{}).Where("id = ?", id).
		Updates(map[string]any{"paid_amount": paidAmount, "status": status}).Error
}

func (r *repo) FindInstallmentsWithTx(tx *gorm.DB, loanID uint) ([]LoanInstallment, error) {
	var items []LoanInstallment
	err := tx.Where("loan_id = ?", loanID).Order("sequence ASC").Find(&items).Error
	return items, err
}

func (r *repo) UpdateInstallmentWithTx(tx *gorm.DB, inst *LoanInstallment) error {
	return tx.Model(&LoanInstallment{}).Where("id = ?", inst.ID).
		Updates(map[string]any{"amount_paid": inst.AmountPaid, "status": inst.Status}).Error
}

func (r *repo) Summary(academicYearID uint) ([]SummaryItem, error) {
	var items []SummaryItem
	q := r.db.Table("koperasi_loans l").
		Select("l.member_id as member_id, m.full_name as member_name, COUNT(*) as loan_count, COALESCE(SUM(l.principal),0) as total_principal, COALESCE(SUM(l.paid_amount),0) as total_paid").
		Joins("JOIN koperasi_members m ON m.id = l.member_id").
		Where("l.deleted_at IS NULL")
	if academicYearID != 0 {
		q = q.Where("l.academic_year_id = ?", academicYearID)
	}
	err := q.Group("l.member_id, m.full_name").Order("m.full_name ASC").Scan(&items).Error
	return items, err
}
