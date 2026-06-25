package shared

import (
	"time"

	"gorm.io/gorm"
)

// Writer menulis baris ke jurnal kas & vault sekolah. Dipakai oleh fitur-fitur
// modul keuangan (pengeluaran, penerimaan, kas, dsb) sebagai pengganti
// TransactionWriterService dari flat package.
type Writer struct{}

func NewWriter() *Writer { return &Writer{} }

// --- Cash ---

func (w *Writer) WriteCashCredit(tx *gorm.DB, academicYearID uint, date time.Time, amount float64, sourceType string, sourceID *uint, description string, createdBy uint) error {
	return tx.Create(&cashRow{
		AcademicYearID:  academicYearID,
		TransactionDate: date,
		TransactionType: "credit",
		Amount:          amount,
		SourceType:      sourceType,
		SourceID:        sourceID,
		Description:     description,
		CreatedBy:       createdBy,
	}).Error
}

func (w *Writer) WriteCashDebit(tx *gorm.DB, academicYearID uint, date time.Time, amount float64, sourceType string, sourceID *uint, description string, createdBy uint) error {
	return tx.Create(&cashRow{
		AcademicYearID:  academicYearID,
		TransactionDate: date,
		TransactionType: "debit",
		Amount:          amount,
		SourceType:      sourceType,
		SourceID:        sourceID,
		Description:     description,
		CreatedBy:       createdBy,
	}).Error
}

func (w *Writer) DeleteCashBySource(tx *gorm.DB, sourceType string, sourceID uint) error {
	return tx.Where("source_type = ? AND source_id = ?", sourceType, sourceID).Delete(&cashRow{}).Error
}

// --- Vault ---

func (w *Writer) WriteVaultCredit(tx *gorm.DB, academicYearID uint, date time.Time, amount float64, sourceType string, sourceID *uint, description string, createdBy uint) error {
	return tx.Create(&vaultRow{
		AcademicYearID:  academicYearID,
		TransactionDate: date,
		TransactionType: "credit",
		Amount:          amount,
		SourceType:      sourceType,
		SourceID:        sourceID,
		Description:     description,
		CreatedBy:       createdBy,
	}).Error
}

func (w *Writer) WriteVaultDebit(tx *gorm.DB, academicYearID uint, date time.Time, amount float64, sourceType string, sourceID *uint, description string, createdBy uint) error {
	return tx.Create(&vaultRow{
		AcademicYearID:  academicYearID,
		TransactionDate: date,
		TransactionType: "debit",
		Amount:          amount,
		SourceType:      sourceType,
		SourceID:        sourceID,
		Description:     description,
		CreatedBy:       createdBy,
	}).Error
}

// --- Internal row types (mirip model.CashTransaction & model.VaultTransaction) ---

type cashRow struct {
	ID              uint      `gorm:"primaryKey"`
	AcademicYearID  uint      `gorm:"not null"`
	TransactionDate time.Time `gorm:"type:date;not null"`
	TransactionType string    `gorm:"size:10;not null"`
	Amount          float64   `gorm:"type:decimal(15,2);not null"`
	SourceType      string    `gorm:"size:30;not null"`
	SourceID        *uint
	Description     string `gorm:"size:255;not null"`
	CreatedBy       uint   `gorm:"not null"`
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

func (cashRow) TableName() string { return "cash_transactions" }

type vaultRow struct {
	ID              uint      `gorm:"primaryKey"`
	AcademicYearID  uint      `gorm:"not null"`
	TransactionDate time.Time `gorm:"type:date;not null"`
	TransactionType string    `gorm:"size:10;not null"`
	Amount          float64   `gorm:"type:decimal(15,2);not null"`
	SourceType      string    `gorm:"size:30;not null"`
	SourceID        *uint
	Description     string `gorm:"size:255;not null"`
	CreatedBy       uint   `gorm:"not null"`
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

func (vaultRow) TableName() string { return "vault_transactions" }
