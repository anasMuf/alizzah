package penjualan

import "gorm.io/gorm"

type Repository interface {
	CreateWithTx(s *Sale, tx *gorm.DB) error
	FindByID(id uint) (*Sale, error)
	FindAll(p QueryParams) ([]Sale, int64, error)
	UpdatePaymentWithTx(tx *gorm.DB, id uint, paidAmount float64, status string) error
}

type repo struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) Repository { return &repo{db: db} }

func (r *repo) CreateWithTx(s *Sale, tx *gorm.DB) error {
	return tx.Create(s).Error // item dibuat lewat asosiasi
}

func (r *repo) FindByID(id uint) (*Sale, error) {
	var s Sale
	err := r.db.Preload("Items").Preload("Student").Preload("Creator").First(&s, id).Error
	return &s, err
}

func (r *repo) FindAll(p QueryParams) ([]Sale, int64, error) {
	var items []Sale
	var total int64
	q := r.db.Model(&Sale{}).Preload("Student")
	if p.AcademicYearID != 0 {
		q = q.Where("academic_year_id = ?", p.AcademicYearID)
	}
	if p.StudentID != 0 {
		q = q.Where("student_id = ?", p.StudentID)
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
	err := q.Order("sale_date DESC, id DESC").Offset((page - 1) * limit).Limit(limit).Find(&items).Error
	return items, total, err
}

func (r *repo) UpdatePaymentWithTx(tx *gorm.DB, id uint, paidAmount float64, status string) error {
	return tx.Model(&Sale{}).Where("id = ?", id).
		Updates(map[string]any{"paid_amount": paidAmount, "status": status}).Error
}
