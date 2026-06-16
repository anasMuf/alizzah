package master

import "gorm.io/gorm"

type Repository interface {
	FindAll(kind, search string) ([]MasterData, error)
	FindByID(kind string, id uint) (*MasterData, error)
	ExistsName(kind, name string, excludeID uint) (bool, error)
	Create(m *MasterData) error
	Update(m *MasterData) error
	Delete(kind string, id uint) error
}

type repo struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) Repository { return &repo{db: db} }

func (r *repo) FindAll(kind, search string) ([]MasterData, error) {
	var rows []MasterData
	q := r.db.Where("kind = ?", kind).Order("name ASC")
	if search != "" {
		q = q.Where("name ILIKE ?", "%"+search+"%")
	}
	err := q.Find(&rows).Error
	return rows, err
}

func (r *repo) FindByID(kind string, id uint) (*MasterData, error) {
	var m MasterData
	err := r.db.Where("kind = ?", kind).First(&m, id).Error
	return &m, err
}

func (r *repo) ExistsName(kind, name string, excludeID uint) (bool, error) {
	var count int64
	q := r.db.Model(&MasterData{}).Where("kind = ? AND name = ?", kind, name)
	if excludeID > 0 {
		q = q.Where("id <> ?", excludeID)
	}
	err := q.Count(&count).Error
	return count > 0, err
}

func (r *repo) Create(m *MasterData) error { return r.db.Create(m).Error }

func (r *repo) Update(m *MasterData) error { return r.db.Save(m).Error }

func (r *repo) Delete(kind string, id uint) error {
	return r.db.Where("kind = ?", kind).Delete(&MasterData{}, id).Error
}
