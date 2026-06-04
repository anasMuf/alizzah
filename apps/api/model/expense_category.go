package model

type ExpenseCategory struct {
	PrimaryKey
	ParentID        *uint  `gorm:"index"`
	Name            string `gorm:"size:100;not null"`
	InvoiceCategory string `gorm:"size:30"` // mapping ke invoice_items.category (hanya parent)
	BaseModelTimeAt

	Parent   *ExpenseCategory  `gorm:"foreignKey:ParentID"`
	Children []ExpenseCategory `gorm:"foreignKey:ParentID"`
}

func (ExpenseCategory) TableName() string {
	return "expense_categories"
}
