package model

import "time"

// DaycareEnrollment represents a student's enrollment in daycare.
type DaycareEnrollment struct {
	PrimaryKey
	StudentID      uint       `gorm:"not null;index"`
	AcademicYearID uint       `gorm:"not null;index"`
	PackageType    string     `gorm:"size:30;not null"`
	StartDate      time.Time  `gorm:"type:date;not null"`
	EndDate        *time.Time `gorm:"type:date"`
	Status         string     `gorm:"size:20;not null;default:active"` // active | inactive
	CreatedBy      uint       `gorm:"not null"`
	BaseModelTimeAt

	Student      Student      `gorm:"foreignKey:StudentID"`
	AcademicYear AcademicYear `gorm:"foreignKey:AcademicYearID"`
	Creator      User         `gorm:"foreignKey:CreatedBy"`
}

func (DaycareEnrollment) TableName() string {
	return "daycare_enrollments"
}
