package master

import (
	"strings"

	"gorm.io/gorm"
)

// Ref model ringan untuk tabel milik package lain (guru). Dipakai hanya untuk
// menghitung jumlah referensi saat master akan dihapus — menghindari import
// cycle (guru mengimpor master, master tidak boleh mengimpor guru).

type employeeRef struct {
	ID         uint `gorm:"primaryKey"`
	GolonganID *uint
	DeletedAt  gorm.DeletedAt
}

func (employeeRef) TableName() string { return "sdm_employees" }

// DeletedAt disertakan agar GORM menerapkan scope soft delete saat menghitung
// referensi: lampiran yang sudah di-detach tidak boleh memblokir hapus master.
type fungsionalDetailRef struct {
	ID           uint `gorm:"primaryKey"`
	FungsionalID uint
	EmployeeID   uint
	DeletedAt    gorm.DeletedAt
}

func (fungsionalDetailRef) TableName() string { return "sdm_fungsional_detail" }

type tugasTambahanDetailRef struct {
	ID              uint `gorm:"primaryKey"`
	TugasTambahanID uint
	EmployeeID      uint
	DeletedAt       gorm.DeletedAt
}

func (tugasTambahanDetailRef) TableName() string { return "sdm_tugas_tambahan_detail" }

type penanggungJawabDetailRef struct {
	ID                uint `gorm:"primaryKey"`
	PenanggungJawabID uint
	EmployeeID        uint
	DeletedAt         gorm.DeletedAt
}

func (penanggungJawabDetailRef) TableName() string { return "sdm_penanggung_jawab_detail" }

// isDuplicateErr mendeteksi error unique constraint PostgreSQL/GORM.
func isDuplicateErr(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return strings.Contains(msg, "duplicate key") ||
		strings.Contains(msg, "UNIQUE constraint failed") ||
		strings.Contains(msg, "Error 1062")
}

var _ = gorm.ErrRecordNotFound
