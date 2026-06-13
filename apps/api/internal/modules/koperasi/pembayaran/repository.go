package pembayaran

import "gorm.io/gorm"

type Repository interface {
	CreateWithTx(p *Payment, tx *gorm.DB) error
	FindByRef(refType string, refID uint) ([]Payment, error)
}

type repository struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) Repository { return &repository{db: db} }

func (r *repository) CreateWithTx(p *Payment, tx *gorm.DB) error { return tx.Create(p).Error }

func (r *repository) FindByRef(refType string, refID uint) ([]Payment, error) {
	var items []Payment
	err := r.db.Where("ref_type = ? AND ref_id = ?", refType, refID).
		Order("payment_date ASC, id ASC").Find(&items).Error
	return items, err
}
