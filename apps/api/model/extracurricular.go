package model

// Extracurricular represents the master data for extracurriculars, pastas, and calisans.
type Extracurricular struct {
	PrimaryKey
	Name string `gorm:"size:100;not null;uniqueIndex"`
	Type string `gorm:"size:20;not null"` // pasta | calisan | ekskul
	BaseModelTimeAt
}

func (Extracurricular) TableName() string {
	return "extracurriculars"
}
