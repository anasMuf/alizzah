package model

import "time"

// StudentEnrollment represents the relation between a student and a class group for a specific academic year.
type StudentEnrollment struct {
	PrimaryKey
	StudentID      uint       `gorm:"not null;index"`
	ClassGroupID   uint       `gorm:"not null;index"`
	AcademicYearID uint       `gorm:"not null;index"`
	StartDate      time.Time  `gorm:"type:date;not null"`
	EndDate        *time.Time `gorm:"type:date"`
	Status         string     `gorm:"size:20;not null;default:active"`
	EnrollmentType string     `gorm:"size:20;not null"`
	Notes          string     `gorm:"type:text"`
	CreatedBy      uint       `gorm:"not null"`
	BaseModelTimeAt

	Student      Student      `gorm:"foreignKey:StudentID"`
	ClassGroup   ClassGroup   `gorm:"foreignKey:ClassGroupID"`
	AcademicYear AcademicYear `gorm:"foreignKey:AcademicYearID"`
	Creator      User         `gorm:"foreignKey:CreatedBy"`
}

func (StudentEnrollment) TableName() string {
	return "student_enrollments"
}
