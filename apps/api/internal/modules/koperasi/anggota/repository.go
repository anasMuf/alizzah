package anggota

import "gorm.io/gorm"

type Repository interface {
	FindAll(search string, activeOnly bool) ([]Member, error)
	FindByID(id uint) (*Member, error)
	Create(m *Member) error
	BulkCreate(members []Member) error
	Update(m *Member) error
	Delete(id uint) error
	GetLoanSummary(memberID uint) (LoanSummary, error)
}

type repository struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) Repository { return &repository{db: db} }

func (r *repository) FindAll(search string, activeOnly bool) ([]Member, error) {
	var members []Member
	q := r.db.Preload("Employee").Order("full_name ASC")
	if search != "" {
		q = q.Where("full_name ILIKE ?", "%"+search+"%")
	}
	if activeOnly {
		q = q.Where("is_active = ?", true)
	}
	err := q.Find(&members).Error
	return members, err
}

func (r *repository) FindByID(id uint) (*Member, error) {
	var m Member
	err := r.db.Preload("Employee").First(&m, id).Error
	return &m, err
}

func (r *repository) Create(m *Member) error { return r.db.Create(m).Error }

func (r *repository) BulkCreate(members []Member) error { return r.db.Create(&members).Error }

func (r *repository) Update(m *Member) error { return r.db.Save(m).Error }

func (r *repository) Delete(id uint) error { return r.db.Delete(&Member{}, id).Error }

func (r *repository) GetLoanSummary(memberID uint) (LoanSummary, error) {
	var summary LoanSummary
	// Aggregate from koperasi_loans where member_id = ? and status != 'paid'
	err := r.db.Table("koperasi_loans").
		Select("COUNT(*) as active_loan_count, COALESCE(SUM(principal), 0) as total_principal, COALESCE(SUM(paid_amount), 0) as total_paid").
		Where("member_id = ? AND status != 'paid' AND deleted_at IS NULL", memberID).
		Scan(&summary).Error

	if err == nil {
		summary.TotalRemaining = summary.TotalPrincipal - summary.TotalPaid
	}

	return summary, err
}
