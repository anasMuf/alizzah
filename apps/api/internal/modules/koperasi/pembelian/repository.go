package pembelian

import "gorm.io/gorm"

type Repository interface {
	CreateWithTx(p *Purchase, tx *gorm.DB) error
	FindByID(id uint) (*Purchase, error)
	FindAll(p QueryParams) ([]Purchase, int64, error)
	UpdatePaymentWithTx(tx *gorm.DB, id uint, paidAmount float64, status string) error
}

type repo struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) Repository { return &repo{db: db} }

func (r *repo) CreateWithTx(p *Purchase, tx *gorm.DB) error {
	return tx.Create(p).Error // item dibuat lewat asosiasi
}

func (r *repo) FindByID(id uint) (*Purchase, error) {
	var p Purchase
	err := r.db.Preload("Items").Preload("Supplier").Preload("Creator").First(&p, id).Error
	return &p, err
}

func (r *repo) FindAll(p QueryParams) ([]Purchase, int64, error) {
	var items []Purchase
	var total int64
	q := r.db.Model(&Purchase{}).Preload("Supplier")
	if p.AcademicYearID != 0 {
		q = q.Where("academic_year_id = ?", p.AcademicYearID)
	}
	if p.SupplierID != 0 {
		q = q.Where("supplier_id = ?", p.SupplierID)
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
	err := q.Order("purchase_date DESC, id DESC").Offset((page - 1) * limit).Limit(limit).Find(&items).Error
	return items, total, err
}

func (r *repo) UpdatePaymentWithTx(tx *gorm.DB, id uint, paidAmount float64, status string) error {
	return tx.Model(&Purchase{}).Where("id = ?", id).
		Updates(map[string]any{"paid_amount": paidAmount, "status": status}).Error
}
