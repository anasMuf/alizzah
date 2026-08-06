package model

import "time"

type IncomeTransaction struct {
	PrimaryKey
	AcademicYearID   uint      `gorm:"not null;index"`
	IncomeCategoryID uint      `gorm:"not null;index"`
	SourceName       string    `gorm:"size:100;not null"`
	Amount           float64   `gorm:"type:decimal(15,2);not null"`
	TransactionDate  time.Time `gorm:"type:date;not null"`
	ReferenceNumber  string    `gorm:"size:50"`
	Notes            string    `gorm:"type:text"`
	CreatedBy        uint      `gorm:"not null"`
	BaseModelTimeAt

	AcademicYear   AcademicYear   `gorm:"foreignKey:AcademicYearID"`
	IncomeCategory IncomeCategory `gorm:"foreignKey:IncomeCategoryID"`
	Creator        User           `gorm:"foreignKey:CreatedBy"`
}

func (IncomeTransaction) TableName() string {
	return "income_transactions"
}
