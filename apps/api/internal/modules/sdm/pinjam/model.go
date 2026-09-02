// Package pinjam mengelola pinjaman karyawan yang dipotong dari gaji.
// Model mengikuti aplikasi lama: satu baris `sdm_pinjam` per karyawan
// (akumulatif); setiap pembayaran angsuran dicatat di `sdm_pinjam_detail`
// per periode dan otomatis menjadi potongan slip gaji periode tsb.
package pinjam

import (
	"time"

	"api/internal/modules/sdm/guru"
	"api/model"
)

// Pinjam — pinjaman aktif/riwayat milik satu karyawan (akumulatif).
type Pinjam struct {
	model.PrimaryKey
	EmployeeID       uint       `gorm:"not null;index;uniqueIndex" json:"employee_id"`
	TglPinjam        time.Time  `gorm:"type:date;not null" json:"tgl_pinjam"`
	Jumlah           int        `gorm:"not null" json:"jumlah"` // akumulasi semua pinjaman
	AngsuranTerbayar int        `gorm:"not null;default:0" json:"angsuran_terbayar"`
	Sisa             int        `gorm:"not null;default:0" json:"sisa"`
	IsLunas          bool       `gorm:"not null;default:false" json:"is_lunas"`
	TglLunas         *time.Time `gorm:"type:date" json:"tgl_lunas"`
	model.BaseModelTimeAt

	Employee *guru.Employee `gorm:"foreignKey:EmployeeID" json:"employee,omitempty"`
}

func (Pinjam) TableName() string { return "sdm_pinjam" }

// PinjamDetail — angsuran yang dibayar per periode (potongan gaji).
// Periode disimpan sebagai DATE dengan day = tanggal payday (5).
type PinjamDetail struct {
	model.PrimaryKey
	Periode  time.Time `gorm:"type:date;not null;index" json:"periode"` // YYYY-MM-05
	PinjamID uint      `gorm:"not null;index" json:"pinjam_id"`
	Angsuran int       `gorm:"not null" json:"angsuran"`
	model.BaseModelTimeAt
}

func (PinjamDetail) TableName() string { return "sdm_pinjam_detail" }
