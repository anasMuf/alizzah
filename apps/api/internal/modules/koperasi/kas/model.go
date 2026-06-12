package kas

import (
	"time"

	"api/model"
)

// CashTransaction adalah jurnal arus kas koperasi (ledger). Mengikuti pola
// cash_transactions sekolah: tanpa soft delete (immutable; pembatalan via mutasi balik).
// Setiap mutasi kas koperasi menulis satu baris di sini dengan referensi (source_type/source_id).
type CashTransaction struct {
	model.PrimaryKey
	AcademicYearID  uint      `gorm:"not null;index" json:"academic_year_id"`
	TransactionDate time.Time `gorm:"type:date;not null;index" json:"transaction_date"`
	TransactionType string    `gorm:"size:10;not null" json:"transaction_type"` // credit | debit
	Amount          float64   `gorm:"type:decimal(15,2);not null" json:"amount"`
	SourceType      string    `gorm:"size:30;not null" json:"source_type"`
	SourceID        *uint     `json:"source_id"`
	Category        string    `gorm:"size:50" json:"category"`
	Description     string    `gorm:"size:255;not null" json:"description"`
	CreatedBy       uint      `gorm:"not null" json:"created_by"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`

	AcademicYear model.AcademicYear `gorm:"foreignKey:AcademicYearID" json:"-"`
	Creator      model.User         `gorm:"foreignKey:CreatedBy" json:"-"`
}

func (CashTransaction) TableName() string { return "koperasi_cash_transactions" }
