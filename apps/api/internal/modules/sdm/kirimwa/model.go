// Package kirimwa mengelola pengiriman slip gaji ke WhatsApp karyawan lewat
// Wablas. Isi pesan = teks berisi tautan publik slip (bukan file PDF), tautan
// dibuat on-demand dengan token stateless. Lihat docs/sdm/kirim-wa-plan.md.
package kirimwa

import (
	"time"

	"api/model"
)

// Status pengiriman.
const (
	StatusPending    = "pending"    // menunggu diproses worker
	StatusProcessing = "processing" // sedang dikirim (diklaim worker)
	StatusSent       = "sent"       // terkirim
	StatusFailed     = "failed"     // gagal (lihat PesanError)
)

// KirimWA — satu baris status pengiriman slip untuk (karyawan, periode).
// Tabel ini menjadi sumber status; unik per (employee_id, periode).
type KirimWA struct {
	model.PrimaryKey
	EmployeeID uint       `gorm:"not null;index;uniqueIndex:uq_kirim_wa" json:"employee_id"`
	Periode    time.Time  `gorm:"type:date;not null;uniqueIndex:uq_kirim_wa" json:"periode"` // YYYY-MM-05
	NoTelp     string     `gorm:"size:20;not null;default:''" json:"no_telp"`
	Status     string     `gorm:"size:10;not null;default:pending" json:"status"`
	PesanError string     `gorm:"size:255;not null;default:''" json:"pesan_error"`
	Attempts   int        `gorm:"not null;default:0" json:"attempts"`
	WaktuKirim *time.Time `gorm:"type:timestamptz" json:"waktu_kirim"`
	model.BaseModelTimeAt
}

func (KirimWA) TableName() string { return "sdm_kirim_wa" }
