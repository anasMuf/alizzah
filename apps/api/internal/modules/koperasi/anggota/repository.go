package anggota

import "gorm.io/gorm"

type Repository interface {
	FindAll(search string, activeOnly bool) ([]Member, error)
	FindByID(id uint) (*Member, error)
	Create(m *Member) error
	Update(m *Member) error
	Delete(id uint) error
}

type repository struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) Repository { return &repository{db: db} }

func (r *repository) FindAll(search string, activeOnly bool) ([]Member, error) {
	var members []Member
	q := r.db.Order("full_name ASC")
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
	err := r.db.First(&m, id).Error
	return &m, err
}

func (r *repository) Create(m *Member) error { return r.db.Create(m).Error }

func (r *repository) Update(m *Member) error { return r.db.Save(m).Error }

func (r *repository) Delete(id uint) error { return r.db.Delete(&Member{}, id).Error }
