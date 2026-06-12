package barang

import "gorm.io/gorm"

type Repository interface {
	FindAll(search string, activeOnly bool) ([]Product, error)
	FindByID(id uint) (*Product, error)
	Create(p *Product) error
	Update(p *Product) error
	Delete(id uint) error
}

type repository struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) Repository { return &repository{db: db} }

func (r *repository) FindAll(search string, activeOnly bool) ([]Product, error) {
	var products []Product
	q := r.db.Order("name ASC")
	if search != "" {
		q = q.Where("name ILIKE ?", "%"+search+"%")
	}
	if activeOnly {
		q = q.Where("is_active = ?", true)
	}
	err := q.Find(&products).Error
	return products, err
}

func (r *repository) FindByID(id uint) (*Product, error) {
	var p Product
	err := r.db.First(&p, id).Error
	return &p, err
}

func (r *repository) Create(p *Product) error { return r.db.Create(p).Error }

func (r *repository) Update(p *Product) error { return r.db.Save(p).Error }

func (r *repository) Delete(id uint) error { return r.db.Delete(&Product{}, id).Error }
