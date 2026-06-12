package pemasok

import "gorm.io/gorm"

type Repository interface {
	FindAll(search string) ([]Supplier, error)
	FindByID(id uint) (*Supplier, error)
	Create(s *Supplier) error
	Update(s *Supplier) error
	Delete(id uint) error
}

type repository struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) Repository { return &repository{db: db} }

func (r *repository) FindAll(search string) ([]Supplier, error) {
	var suppliers []Supplier
	q := r.db.Order("name ASC")
	if search != "" {
		q = q.Where("name ILIKE ?", "%"+search+"%")
	}
	err := q.Find(&suppliers).Error
	return suppliers, err
}

func (r *repository) FindByID(id uint) (*Supplier, error) {
	var s Supplier
	err := r.db.First(&s, id).Error
	return &s, err
}

func (r *repository) Create(s *Supplier) error { return r.db.Create(s).Error }

func (r *repository) Update(s *Supplier) error { return r.db.Save(s).Error }

func (r *repository) Delete(id uint) error { return r.db.Delete(&Supplier{}, id).Error }
