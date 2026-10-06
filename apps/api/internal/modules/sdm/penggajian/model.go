package penggajian

import (
	"time"

	"api/model"
)

// Status periode penggajian.
const (
	StatusOpen      = "open"      // preview — dihitung dinamis
	StatusFinalized = "finalized" // snapshot tersimpan — stabil terhadap perubahan data
)

// Kode komponen snapshot (sdm_payroll_detail.kode_komponen). Komponen tunggal
// disimpan sebagai satu baris; rincian (fungsional, tugas tambahan, PJ,
// lain-lain) disimpan per item sehingga slip/rekap historis penuh.
const (
	KodeHRPokok         = "hr_pokok"
	KodeJumlahHadir     = "jumlah_hadir"
	KodeKehadiran       = "kehadiran"
	KodeJumlahSiaga     = "jumlah_siaga"
	KodeSiaga           = "siaga"
	KodeJumlahPiket     = "jumlah_piket"
	KodePiket           = "piket"
	KodeJumlahTelat     = "jumlah_telat"
	KodeBonusTerlambat  = "bonus_terlambat"
	KodeJumlahPulang    = "jumlah_pulang"
	KodeBonusPulang     = "bonus_pulang_awal"
	KodeSubtotalAbsen   = "subtotal_absen"
	KodeSubtotalF       = "subtotal_f"
	KodeSubtotalT       = "subtotal_t"
	KodeSubtotalP       = "subtotal_p"
	KodeSubtotalL       = "subtotal_l"
	KodeFungsional      = "fungsional"
	KodeTugasTambahan   = "tugas_tambahan"
	KodePenanggungJawab = "penanggung_jawab"
	KodeLainlain        = "lainlain"
	KodeAngsuran        = "angsuran"
	KodeTotal           = "total_gaji"
)

// PayrollPeriode — header snapshot gaji satu periode. Status `finalized`
// menandakan slip/rekap dibaca dari snapshot (bukan hitung dinamis).
type PayrollPeriode struct {
	model.PrimaryKey
	Periode     time.Time  `gorm:"type:date;not null;uniqueIndex" json:"periode"` // YYYY-MM-05
	Status      string     `gorm:"size:10;not null;default:open" json:"status"`
	UserID      *uint      `gorm:"index" json:"user_id"`
	TotalGaji   int        `gorm:"not null;default:0" json:"total_gaji"`
	FinalizedAt *time.Time `gorm:"type:timestamptz" json:"finalized_at"`
	model.BaseModelTimeAt
}

func (PayrollPeriode) TableName() string { return "sdm_payroll_periode" }

// PayrollDetail — baris komponen snapshot per karyawan. Urutan mengikuti
// tampilan slip (urutan=1 → HR Pokok, dst).
type PayrollDetail struct {
	model.PrimaryKey
	PayrollPeriodeID uint   `gorm:"not null;index" json:"payroll_periode_id"`
	EmployeeID       uint   `gorm:"not null;index" json:"employee_id"`
	KodeKomponen     string `gorm:"size:30;not null" json:"kode_komponen"`
	NamaKomponen     string `gorm:"size:120;not null" json:"nama_komponen"`
	Nominal          int    `gorm:"not null" json:"nominal"`
	Urutan           int    `gorm:"not null;default:0" json:"urutan"`
	model.BaseModelTimeAt
}

func (PayrollDetail) TableName() string { return "sdm_payroll_detail" }
