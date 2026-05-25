package model

import "time"

type Payment struct {
	PrimaryKey
	StudentID      uint      `gorm:"not null;index"`
	AcademicYearID uint      `gorm:"not null;index"`
	PaymentDate    time.Time `gorm:"type:date;not null"`
	TotalAmount    float64   `gorm:"type:decimal(15,2);not null"`
	SavingsDeposit float64   `gorm:"type:decimal(15,2);not null;default:0"`
	Source         string    `gorm:"size:20;not null"` // cash | savings
	Notes          string    `gorm:"type:text"`
	CreatedBy      uint      `gorm:"not null"`
	BaseModelTimeAt

	Student      Student       `gorm:"foreignKey:StudentID"`
	AcademicYear AcademicYear  `gorm:"foreignKey:AcademicYearID"`
	Creator      User          `gorm:"foreignKey:CreatedBy"`
	Items        []PaymentItem `gorm:"foreignKey:PaymentID"`
}

func (Payment) TableName() string {
	return "payments"
}
