package model

type Facility struct {
	PrimaryKey
	Name        string `gorm:"size:100;not null;uniqueIndex"`
	Description string `gorm:"type:text"`
	IsActive    bool   `gorm:"not null;default:true"`
	BaseModelTimeAt
}

func (Facility) TableName() string {
	return "facilities"
}
