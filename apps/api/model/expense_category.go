package model

type ExpenseCategory struct {
	PrimaryKey
	ParentID *uint  `gorm:"index"`
	Name     string `gorm:"size:100;not null"`
	BaseModelTimeAt

	Parent   *ExpenseCategory  `gorm:"foreignKey:ParentID"`
	Children []ExpenseCategory `gorm:"foreignKey:ParentID"`
}

func (ExpenseCategory) TableName() string {
	return "expense_categories"
}
