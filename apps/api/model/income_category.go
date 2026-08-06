package model

type IncomeCategory struct {
	PrimaryKey
	Code string `gorm:"size:30;uniqueIndex;not null" json:"code"` // e.g. bos, donasi, hibah
	Name string `gorm:"size:100;not null" json:"name"`            // e.g. Dana BOS, Donasi
	BaseModelTimeAt
}

func (IncomeCategory) TableName() string {
	return "income_categories"
}
