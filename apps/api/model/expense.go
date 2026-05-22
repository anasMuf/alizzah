package model

import "time"

type Expense struct {
	PrimaryKey
	AcademicYearID    uint      `gorm:"not null;index"`
	ExpenseCategoryID uint      `gorm:"not null;index"`
	ExpenseDate       time.Time `gorm:"type:date;not null"`
	Amount            float64   `gorm:"type:decimal(15,2);not null"`
	Description       string    `gorm:"type:text;not null"`
	ReceiptURL        string    `gorm:"size:255"`
	CreatedBy         uint      `gorm:"not null"`
	BaseModelTimeAt

	AcademicYear    AcademicYear    `gorm:"foreignKey:AcademicYearID"`
	ExpenseCategory ExpenseCategory `gorm:"foreignKey:ExpenseCategoryID"`
	Creator         User            `gorm:"foreignKey:CreatedBy"`
}

func (Expense) TableName() string {
	return "expenses"
}
