package model

import "time"

// Student represents the students table.
type Student struct {
	PrimaryKey
	FullName      string    `gorm:"size:100;not null" json:"full_name"`
	BirthPlace    string    `gorm:"size:100;not null" json:"birth_place"`
	BirthDate     time.Time `gorm:"type:date;not null" json:"birth_date"`
	Gender        string    `gorm:"size:1;not null" json:"gender"` // L | P
	Religion      string    `gorm:"size:30" json:"religion"`
	PhotoURL      string    `gorm:"size:255" json:"photo_url"`
	Status        string    `gorm:"size:20;not null;default:active" json:"status"` // active | graduated | transferred | dropped
	IsDaycareOnly bool      `gorm:"default:false" json:"is_daycare_only"`
	BaseModelTimeAt

	// Relations
	Guardians        []Guardian             `gorm:"many2many:student_guardians;" json:"guardians,omitempty"`
	StudentGuardians []StudentGuardian      `gorm:"foreignKey:StudentID" json:"-"`
	Enrollments      []StudentEnrollment    `gorm:"foreignKey:StudentID" json:"-"`
	Exceptionality   *StudentExceptionality `gorm:"foreignKey:StudentID" json:"exceptionality,omitempty"`
}

func (Student) TableName() string {
	return "students"
}
