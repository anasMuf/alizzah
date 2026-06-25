package kas

import (
	"api/model"
	"time"
)

// CashTransaction adalah jurnal arus kas sekolah.
type CashTransaction struct {
	model.PrimaryKey
	AcademicYearID  uint      `gorm:"not null;index"`
	TransactionDate time.Time `gorm:"type:date;not null;index"`
	TransactionType string    `gorm:"size:10;not null"` // credit | debit
	Amount          float64   `gorm:"type:decimal(15,2);not null"`
	SourceType      string    `gorm:"size:30;not null"`
	SourceID        *uint
	Description     string    `gorm:"size:255;not null"`
	CreatedBy       uint      `gorm:"not null"`
	CreatedAt       time.Time
	UpdatedAt       time.Time

	AcademicYear model.AcademicYear `gorm:"foreignKey:AcademicYearID"`
	Creator      model.User         `gorm:"foreignKey:CreatedBy"`
}

func (CashTransaction) TableName() string { return "cash_transactions" }

func Models() []any { return []any{&CashTransaction{}} }
