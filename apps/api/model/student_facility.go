package model

import "time"

type StudentFacility struct {
	PrimaryKey
	StudentID      uint       `gorm:"not null;index;uniqueIndex:uq_student_facility,priority:1"`
	FacilityID     uint       `gorm:"not null;index;uniqueIndex:uq_student_facility,priority:2"`
	AcademicYearID uint       `gorm:"not null;index;uniqueIndex:uq_student_facility,priority:3"`
	StartDate      time.Time  `gorm:"type:date;not null"`
	EndDate        *time.Time `gorm:"type:date"`
	BaseModelTimeAt

	Student      Student      `gorm:"foreignKey:StudentID"`
	Facility     Facility     `gorm:"foreignKey:FacilityID"`
	AcademicYear AcademicYear `gorm:"foreignKey:AcademicYearID"`
}

func (StudentFacility) TableName() string {
	return "student_facilities"
}
