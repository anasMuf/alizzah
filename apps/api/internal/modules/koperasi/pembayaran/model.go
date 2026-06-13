package pembayaran

import (
	"time"

	"api/model"
)

// Payment adalah pembayaran/cicilan terhadap penjualan, pembelian, atau pinjaman
// koperasi. Memakai referensi polimorfik (ref_type/ref_id) konsisten dengan idiom
// ledger. Setiap baris pembayaran berpasangan dengan satu baris jurnal kas koperasi.
type Payment struct {
	model.PrimaryKey
	AcademicYearID uint      `gorm:"not null;index" json:"academic_year_id"`
	RefType        string    `gorm:"size:20;not null;index" json:"ref_type"` // sale | purchase | loan
	RefID          uint      `gorm:"not null;index" json:"ref_id"`
	Direction      string    `gorm:"size:3;not null" json:"direction"` // in | out
	Amount         float64   `gorm:"type:decimal(15,2);not null" json:"amount"`
	PaymentDate    time.Time `gorm:"type:date;not null" json:"payment_date"`
	Method         string    `gorm:"size:20;not null" json:"method"` // cash | potong_gaji
	Notes          string    `gorm:"type:text" json:"notes"`
	CashTxnID      *uint     `json:"cash_txn_id"`
	CreatedBy      uint      `gorm:"not null" json:"created_by"`
	model.BaseModelTimeAt
}

func (Payment) TableName() string { return "koperasi_payments" }
