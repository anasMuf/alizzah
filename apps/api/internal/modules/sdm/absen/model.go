// Package absen mengelola absensi bulanan karyawan per periode (format `mmYYYY`).
// Tidak ada delete massal `pinjam_detail` (perbaikan F1): absen di-upsert per
// (periode, karyawan) secara idempotent.
package absen

import (
	"time"

	"api/internal/modules/sdm/guru"
	"api/model"
)

// Absen — satu baris absensi per karyawan per periode.
// Periode disimpan sebagai DATE dengan day = tanggal payday (5) — lihat package periode.
type Absen struct {
	model.PrimaryKey
	Periode        time.Time `gorm:"type:date;not null;index;uniqueIndex:uq_absen_periode_guru" json:"periode"` // YYYY-MM-05
	EmployeeID     uint      `gorm:"not null;index;uniqueIndex:uq_absen_periode_guru" json:"employee_id"`
	Hadir          int       `gorm:"not null;default:0" json:"hadir"`
	HadirSiaga     int       `gorm:"not null;default:0" json:"hadir_siaga"`
	HadirTerlambat int       `gorm:"not null;default:0" json:"hadir_terlambat"`
	HadirPiket     int       `gorm:"not null;default:0" json:"hadir_piket"`
	PulangAwal     int       `gorm:"not null;default:0" json:"pulang_awal"`
	model.BaseModelTimeAt

	Employee *guru.Employee `gorm:"foreignKey:EmployeeID" json:"employee,omitempty"`
}

func (Absen) TableName() string { return "sdm_absen" }
