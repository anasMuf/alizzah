package model

// Guardian represents the guardians table.
type Guardian struct {
	PrimaryKey
	FullName     string `gorm:"size:100;not null" json:"full_name"`
	Relationship string `gorm:"size:20;not null" json:"relationship"` // ayah | ibu | wali
	Phone        string `gorm:"size:20;not null" json:"phone"`
	Address      string `gorm:"type:text" json:"address"`
	BaseModelTimeAt

	Students []Student `gorm:"many2many:student_guardians;" json:"students,omitempty"`
}

func (Guardian) TableName() string {
	return "guardians"
}
