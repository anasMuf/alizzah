package model

type PaymentItem struct {
	PrimaryKey
	PaymentID     uint    `gorm:"not null;index"`
	InvoiceItemID uint    `gorm:"not null;index"`
	Amount        float64 `gorm:"type:decimal(15,2);not null"`
	BaseModelTimeAt

	Payment     Payment     `gorm:"foreignKey:PaymentID"`
	InvoiceItem InvoiceItem `gorm:"foreignKey:InvoiceItemID"`
}

func (PaymentItem) TableName() string {
	return "payment_items"
}
