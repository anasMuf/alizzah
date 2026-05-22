package model

import "time"

type CashTransaction struct {
	PrimaryKey
	AcademicYearID  uint      `gorm:"not null;index"`
	TransactionDate time.Time `gorm:"type:date;not null;index"`
	TransactionType string    `gorm:"size:10;not null"` // credit | debit
	Amount          float64   `gorm:"type:decimal(15,2);not null"`
	SourceType      string    `gorm:"size:30;not null"`
	// payment | expense | transfer_to_vault | transfer_from_vault
	SourceID    *uint  `gorm:""`
	Description string `gorm:"size:255;not null"`
	CreatedBy   uint   `gorm:"not null"`
	CreatedAt   time.Time
	UpdatedAt   time.Time

	AcademicYear AcademicYear `gorm:"foreignKey:AcademicYearID"`
	Creator      User         `gorm:"foreignKey:CreatedBy"`
}

func (CashTransaction) TableName() string {
	return "cash_transactions"
}
