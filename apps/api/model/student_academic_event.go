package model

import "time"

// StudentAcademicEvent represents a student's mutation/promotion event.
type StudentAcademicEvent struct {
	PrimaryKey
	StudentID        uint      `gorm:"not null;index"`
	AcademicYearID   uint      `gorm:"not null;index"`
	FromClassGroupID *uint     `gorm:"index"`
	ToClassGroupID   *uint     `gorm:"index"`
	EventType        string    `gorm:"size:30;not null"`
	EventDate        time.Time `gorm:"type:date;not null"`
	Notes            string    `gorm:"type:text"`
	CreatedBy        uint      `gorm:"not null"`
	BaseModelTimeAt

	Student        Student      `gorm:"foreignKey:StudentID"`
	AcademicYear   AcademicYear `gorm:"foreignKey:AcademicYearID"`
	FromClassGroup *ClassGroup  `gorm:"foreignKey:FromClassGroupID"`
	ToClassGroup   *ClassGroup  `gorm:"foreignKey:ToClassGroupID"`
	Creator        User         `gorm:"foreignKey:CreatedBy"`
}

func (StudentAcademicEvent) TableName() string {
	return "student_academic_events"
}
