package anggota

import (
	"time"

	"api/model"

	"gorm.io/gorm"
)

// Employee adalah data referensi pegawai (dari tabel `guru` database lama).
// Tabel ini menjadi sumber untuk mendaftarkan anggota koperasi secara selektif,
// dan nantinya menjadi fondasi modul SDM.
type Employee struct {
	model.PrimaryKey
	LegacyID int        `gorm:"uniqueIndex;not null" json:"legacy_id"` // id_guru dari DB lama
	FullName string     `gorm:"size:100;not null" json:"full_name"`
	JoinDate *time.Time `gorm:"type:date" json:"join_date"`
	IsActive bool       `gorm:"not null;default:true" json:"is_active"`
	model.BaseModelTimeAt
}

func (Employee) TableName() string { return "koperasi_employees" }

// EmployeeResponse dipakai untuk response list/detail pegawai.
type EmployeeResponse struct {
	ID       uint    `json:"id"`
	LegacyID int     `json:"legacy_id"`
	FullName string  `json:"full_name"`
	JoinDate *string `json:"join_date,omitempty"`
	IsActive bool    `json:"is_active"`
}

func toEmployeeResponse(e Employee) EmployeeResponse {
	r := EmployeeResponse{
		ID:       e.ID,
		LegacyID: e.LegacyID,
		FullName: e.FullName,
		IsActive: e.IsActive,
	}
	if e.JoinDate != nil {
		s := e.JoinDate.Format("2006-01-02")
		r.JoinDate = &s
	}
	return r
}

// EmployeeRepository berisi operasi baca untuk tabel pegawai.
type EmployeeRepository interface {
	FindAll(search string) ([]Employee, error)
	FindByID(id uint) (*Employee, error)
	// FindAvailable mengembalikan pegawai yang belum terdaftar sebagai anggota koperasi.
	FindAvailable(search string) ([]Employee, error)
}

type employeeRepository struct{ db *gorm.DB }

func NewEmployeeRepository(db *gorm.DB) EmployeeRepository {
	return &employeeRepository{db: db}
}

func (r *employeeRepository) FindAll(search string) ([]Employee, error) {
	var employees []Employee
	q := r.db.Order("full_name ASC")
	if search != "" {
		q = q.Where("full_name ILIKE ?", "%"+search+"%")
	}
	err := q.Find(&employees).Error
	return employees, err
}

func (r *employeeRepository) FindByID(id uint) (*Employee, error) {
	var e Employee
	err := r.db.First(&e, id).Error
	return &e, err
}

func (r *employeeRepository) FindAvailable(search string) ([]Employee, error) {
	var employees []Employee
	q := r.db.Where("is_active = ?", true).
		Where("id NOT IN (?)",
			r.db.Model(&Member{}).Select("employee_id").Where("employee_id IS NOT NULL"),
		).
		Order("full_name ASC")
	if search != "" {
		q = q.Where("full_name ILIKE ?", "%"+search+"%")
	}
	err := q.Find(&employees).Error
	return employees, err
}
