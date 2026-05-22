package model

import "time"

// StudentExtracurricular represents the relation between a student and an extracurricular.
type StudentExtracurricular struct {
	PrimaryKey
	StudentID         uint       `gorm:"not null;index"`
	ExtracurricularID uint       `gorm:"not null;index"`
	AcademicYearID    uint       `gorm:"not null;index"`
	StartDate         time.Time  `gorm:"type:date;not null"`
	EndDate           *time.Time `gorm:"type:date"`
	BaseModelTimeAt

	Student         Student         `gorm:"foreignKey:StudentID"`
	Extracurricular Extracurricular `gorm:"foreignKey:ExtracurricularID"`
	AcademicYear    AcademicYear    `gorm:"foreignKey:AcademicYearID"`
}

func (StudentExtracurricular) TableName() string {
	return "student_extracurriculars"
}
