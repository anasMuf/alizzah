package model

import "time"

// StudentGuardian represents the pivot table between students and guardians.
type StudentGuardian struct {
	PrimaryKey
	StudentID  uint      `gorm:"not null;uniqueIndex:idx_student_guardian"`
	GuardianID uint      `gorm:"not null;uniqueIndex:idx_student_guardian"`
	IsPrimary  bool      `gorm:"default:false"`
	CreatedAt  time.Time `gorm:"autoCreateTime"`
	UpdatedAt  time.Time `gorm:"autoUpdateTime"`

	Student  Student  `gorm:"foreignKey:StudentID"`
	Guardian Guardian `gorm:"foreignKey:GuardianID"`
}

// TableName sets the insert table name for this struct type
func (StudentGuardian) TableName() string {
	return "student_guardians"
}
