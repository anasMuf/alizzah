package model

// Extracurricular represents the master data for pastas.
type Extracurricular struct {
	PrimaryKey
	Name   string `gorm:"size:100;not null"`
	Type   string `gorm:"size:20;not null;default:pasta"`
	Levels string `gorm:"size:100"` // comma-separated: "intan,berlian". kosong = all
	BaseModelTimeAt
}

func (Extracurricular) TableName() string {
	return "extracurriculars"
}
