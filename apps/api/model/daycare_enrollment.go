package model

import "time"

// DaycareEnrollment represents a student's enrollment in daycare.
type DaycareEnrollment struct {
	PrimaryKey
	StudentID      uint       `gorm:"not null;index"`
	AcademicYearID uint       `gorm:"not null;index"`
	PackageType    string     `gorm:"size:30;not null"`                 // backward compat, auto-generated
	Category       string     `gorm:"size:10;not null;default:regular"` // premium | regular
	TimeSlot       string     `gorm:"size:10;not null;default:07-15"`   // 07-15 | 10-15 | 10-13
	AgeGroup       string     `gorm:"size:10;not null;default:kbtk"`    // kbtk | under3
	StartDate      time.Time  `gorm:"type:date;not null"`
	EndDate        *time.Time `gorm:"type:date"`
	Status         string     `gorm:"size:20;not null;default:active"`
	CreatedBy      uint       `gorm:"not null"`
	BaseModelTimeAt

	Student      Student      `gorm:"foreignKey:StudentID"`
	AcademicYear AcademicYear `gorm:"foreignKey:AcademicYearID"`
	Creator      User         `gorm:"foreignKey:CreatedBy"`
}

func (DaycareEnrollment) TableName() string {
	return "daycare_enrollments"
}

// DaycareAttendance records daily attendance for daycare students.
// Regular students: attendance determines billing.
// Premium students: attendance is for tracking only (SPD flat from enrollment).
type DaycareAttendance struct {
	PrimaryKey
	StudentID      uint      `gorm:"not null;uniqueIndex:uq_daycare_attendance,priority:1"`
	AcademicYearID uint      `gorm:"not null;index"`
	Date           time.Time `gorm:"type:date;not null;uniqueIndex:uq_daycare_attendance,priority:2"`
	TimeSlot       string    `gorm:"size:10;not null"`       // "07-15"|"10-15"|"10-13" (empty = absent)
	WithMeal       bool      `gorm:"not null;default:false"` // per-hari: ambil paket konsumsi?
	WithTpq        bool      `gorm:"not null;default:false"` // per-hari: lanjut TPQ?
	CreatedBy      uint      `gorm:"not null"`
	BaseModelTimeAt

	Student      Student      `gorm:"foreignKey:StudentID"`
	AcademicYear AcademicYear `gorm:"foreignKey:AcademicYearID"`
	Creator      User         `gorm:"foreignKey:CreatedBy"`
}

func (DaycareAttendance) TableName() string {
	return "daycare_attendances"
}
