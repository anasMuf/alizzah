package lainlain

import (
	"time"

	"api/model"
)

// MiscTransaction adalah pemasukan/pengeluaran lain-lain koperasi (di luar
// penjualan/pembelian/pinjaman/modal). Setiap baris menulis satu mutasi kas koperasi.
type MiscTransaction struct {
	model.PrimaryKey
	AcademicYearID  uint      `gorm:"not null;index" json:"academic_year_id"`
	Flow            string    `gorm:"size:10;not null" json:"flow"` // income | expense
	Category        string    `gorm:"size:50;not null" json:"category"`
	Amount          float64   `gorm:"type:decimal(15,2);not null" json:"amount"`
	TransactionDate time.Time `gorm:"type:date;not null" json:"transaction_date"`
	Description     string    `gorm:"type:text" json:"description"`
	CashTxnID       *uint     `json:"cash_txn_id"`
	CreatedBy       uint      `gorm:"not null" json:"created_by"`
	model.BaseModelTimeAt

	Creator model.User `gorm:"foreignKey:CreatedBy" json:"-"`
}

func (MiscTransaction) TableName() string { return "koperasi_misc_transactions" }
