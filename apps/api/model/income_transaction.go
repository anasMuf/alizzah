package model

import "time"

type IncomeTransaction struct {
	PrimaryKey
	AcademicYearID  uint      `gorm:"not null;index"`
	Category        string    `gorm:"size:30;not null"` // bos | donasi | hibah | lainnya
	SourceName      string    `gorm:"size:100;not null"`
	Amount          float64   `gorm:"type:decimal(15,2);not null"`
	TransactionDate time.Time `gorm:"type:date;not null"`
	ReferenceNumber string    `gorm:"size:50"`
	Notes           string    `gorm:"type:text"`
	CreatedBy       uint      `gorm:"not null"`
	BaseModelTimeAt

	AcademicYear AcademicYear `gorm:"foreignKey:AcademicYearID"`
	Creator      User         `gorm:"foreignKey:CreatedBy"`
}

func (IncomeTransaction) TableName() string {
	return "income_transactions"
}
