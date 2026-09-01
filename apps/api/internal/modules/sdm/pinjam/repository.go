package pinjam

import (
	"errors"

	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository { return &Repository{db: db} }

func (r *Repository) FindAll(search string, lunasOnly, belumLunasOnly bool) ([]Pinjam, error) {
	var rows []Pinjam
	q := r.db.Preload("Employee").Order("is_lunas ASC, id DESC")
	if search != "" {
		q = q.Where("employee_id IN (?)",
			r.db.Table("sdm_employees").Select("id").Where("nama ILIKE ?", "%"+search+"%"),
		)
	}
	if lunasOnly {
		q = q.Where("is_lunas = ?", true)
	}
	if belumLunasOnly {
		q = q.Where("is_lunas = ?", false)
	}
	err := q.Find(&rows).Error
	return rows, err
}

func (r *Repository) FindByID(id uint) (*Pinjam, error) {
	var p Pinjam
	err := r.db.Preload("Employee").First(&p, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, errors.New("Pinjaman tidak ditemukan")
	}
	return &p, err
}

// FindByEmployee mengambil baris pinjaman milik karyawan (maksimal satu baris).
func (r *Repository) FindByEmployee(employeeID uint) (*Pinjam, error) {
	var p Pinjam
	err := r.db.Where("employee_id = ?", employeeID).First(&p).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &p, err
}

func (r *Repository) Create(p *Pinjam) error { return r.db.Create(p).Error }

func (r *Repository) Update(p *Pinjam) error { return r.db.Save(p).Error }

func (r *Repository) Delete(id uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("pinjam_id = ?", id).Delete(&PinjamDetail{}).Error; err != nil {
			return err
		}
		return tx.Delete(&Pinjam{}, id).Error
	})
}

func (r *Repository) CreateDetail(d *PinjamDetail) error { return r.db.Create(d).Error }

func (r *Repository) FindDetails(pinjamID uint) ([]PinjamDetail, error) {
	var rows []PinjamDetail
	err := r.db.Where("pinjam_id = ?", pinjamID).Order("periode ASC, id ASC").Find(&rows).Error
	return rows, err
}

func (r *Repository) EmployeeExists(employeeID uint) (bool, error) {
	var count int64
	if err := r.db.Table("sdm_employees").Where("id = ?", employeeID).Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}
