package anggota

import "api/model"

// Member adalah anggota simpan-pinjam koperasi (independen dari modul SDM).
// Tipe: pegawai | pengurus_yayasan | pihak_luar.
type Member struct {
	model.PrimaryKey
	FullName   string `gorm:"size:100;not null" json:"full_name"`
	MemberType string `gorm:"size:20;not null" json:"member_type"`
	Phone      string `gorm:"size:20" json:"phone"`
	Address    string `gorm:"type:text" json:"address"`
	IsActive   bool   `gorm:"not null;default:true" json:"is_active"`
	EmployeeID *uint  `gorm:"index" json:"employee_id"`
	// EmployeeName diisi repository dari `koperasi_employees` (view atas
	// sdm_employees — sumber kanonik karyawan adalah modul SDM). Field non-gorm
	// agar AutoMigrate tidak memigrasi tabel karyawan dari sisi koperasi.
	EmployeeName string `gorm:"-" json:"employee_name,omitempty"`
	model.BaseModelTimeAt
}

func (Member) TableName() string { return "koperasi_members" }
