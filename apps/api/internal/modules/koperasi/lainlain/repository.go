package lainlain

import "gorm.io/gorm"

type Repository interface {
	CreateWithTx(m *MiscTransaction, tx *gorm.DB) error
	FindByID(id uint) (*MiscTransaction, error)
	FindAll(p QueryParams) ([]MiscTransaction, int64, error)
}

type repo struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) Repository { return &repo{db: db} }

func (r *repo) CreateWithTx(m *MiscTransaction, tx *gorm.DB) error { return tx.Create(m).Error }

func (r *repo) FindByID(id uint) (*MiscTransaction, error) {
	var m MiscTransaction
	err := r.db.Preload("Creator").First(&m, id).Error
	return &m, err
}

func (r *repo) FindAll(p QueryParams) ([]MiscTransaction, int64, error) {
	var items []MiscTransaction
	var total int64
	q := r.db.Model(&MiscTransaction{}).Preload("Creator")
	if p.AcademicYearID != 0 {
		q = q.Where("academic_year_id = ?", p.AcademicYearID)
	}
	if p.Flow != "" {
		q = q.Where("flow = ?", p.Flow)
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
	err := q.Order("transaction_date DESC, id DESC").Offset((page - 1) * limit).Limit(limit).Find(&items).Error
	return items, total, err
}
