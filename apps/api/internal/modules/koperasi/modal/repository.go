package modal

import "gorm.io/gorm"

type Repository interface {
	CreateWithTx(ci *CapitalInjection, tx *gorm.DB) error
	FindAll(academicYearID uint) ([]CapitalInjection, error)
	FindByID(id uint) (*CapitalInjection, error)
}

type repo struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) Repository { return &repo{db: db} }

func (r *repo) CreateWithTx(ci *CapitalInjection, tx *gorm.DB) error {
	return tx.Create(ci).Error
}

func (r *repo) FindAll(academicYearID uint) ([]CapitalInjection, error) {
	var items []CapitalInjection
	q := r.db.Preload("Creator").Order("injection_date DESC, id DESC")
	if academicYearID != 0 {
		q = q.Where("academic_year_id = ?", academicYearID)
	}
	err := q.Find(&items).Error
	return items, err
}

func (r *repo) FindByID(id uint) (*CapitalInjection, error) {
	var ci CapitalInjection
	err := r.db.Preload("Creator").First(&ci, id).Error
	return &ci, err
}
