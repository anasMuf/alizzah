package model

type InvoiceItem struct {
	PrimaryKey
	InvoiceID   uint    `gorm:"not null;index"`
	Name        string  `gorm:"size:100;not null"`
	Category    string  `gorm:"size:30;not null"`
	Amount      float64 `gorm:"type:decimal(15,2);not null"`
	PaidAmount  float64 `gorm:"type:decimal(15,2);not null;default:0"`
	Status      string  `gorm:"size:20;not null;default:unpaid"` // unpaid | partial | paid
	IsMandatory bool    `gorm:"default:true"`
	Notes       string  `gorm:"type:text"`
	BaseModelTimeAt

	Invoice Invoice `gorm:"foreignKey:InvoiceID"`
}

func (InvoiceItem) TableName() string {
	return "invoice_items"
}
