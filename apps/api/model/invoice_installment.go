package model

import "time"

type InvoiceInstallment struct {
	PrimaryKey
	InvoiceID         uint      `gorm:"not null;index"`
	InstallmentNumber uint      `gorm:"not null"`
	DueDate           time.Time `gorm:"type:date;not null"`
	Amount            float64   `gorm:"type:decimal(15,2);not null"`
	Notes             string    `gorm:"type:text"`
	BaseModelTimeAt

	Invoice Invoice `gorm:"foreignKey:InvoiceID"`
}

func (InvoiceInstallment) TableName() string {
	return "invoice_installments"
}
