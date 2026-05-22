package model

type FeeConfigItem struct {
	PrimaryKey
	FeeConfigID uint    `gorm:"not null;index;uniqueIndex:uq_fee_config_items,priority:1"`
	Category    string  `gorm:"size:30;not null"`
	ItemKey     string  `gorm:"size:50;not null;uniqueIndex:uq_fee_config_items,priority:2"`
	Name        string  `gorm:"size:100;not null"`
	Level       string  `gorm:"size:20;not null;default:all;uniqueIndex:uq_fee_config_items,priority:3"`
	Gender      string  `gorm:"size:5;not null;default:all;uniqueIndex:uq_fee_config_items,priority:4"`
	Amount      float64 `gorm:"type:decimal(15,2);not null"`
	Unit        string  `gorm:"size:20;not null;default:fixed"`
	BaseModelTimeAt

	FeeConfig FeeConfig `gorm:"foreignKey:FeeConfigID"`
}
