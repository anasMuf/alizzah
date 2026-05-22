package model

import "time"

type Invoice struct {
	PrimaryKey
	StudentID      uint       `gorm:"not null;index"`
	AcademicYearID uint       `gorm:"not null;index"`
	Type           string     `gorm:"size:20;not null"` // initial | registration | monthly | graduation
	Month          *uint      `gorm:""`
	Year           *uint      `gorm:""`
	Status         string     `gorm:"size:20;not null;default:unpaid"` // unpaid | partial | paid
	TotalAmount    float64    `gorm:"type:decimal(15,2);not null"`
	PaidAmount     float64    `gorm:"type:decimal(15,2);not null;default:0"`
	DueDate        *time.Time `gorm:"type:date"`
	Notes          string     `gorm:"type:text"`
	BaseModelTimeAt

	Student      Student              `gorm:"foreignKey:StudentID"`
	AcademicYear AcademicYear         `gorm:"foreignKey:AcademicYearID"`
	Items        []InvoiceItem        `gorm:"foreignKey:InvoiceID"`
	Installments []InvoiceInstallment `gorm:"foreignKey:InvoiceID"`
}

func (Invoice) TableName() string {
	return "invoices"
}
