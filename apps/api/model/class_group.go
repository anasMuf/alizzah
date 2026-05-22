package model

import "gorm.io/datatypes"

// ClassGroup represents the class_groups table.
type ClassGroup struct {
	PrimaryKey
	AcademicYearID uint           `gorm:"not null;index" json:"academic_year_id"`
	Name           string         `gorm:"size:50;not null" json:"name"`
	Level          string         `gorm:"size:20;not null" json:"level"` // mutiara | intan | berlian
	Schedule       datatypes.JSON `gorm:"type:jsonb;not null" json:"schedule"`
	BaseModelTimeAt

	AcademicYear AcademicYear `gorm:"foreignKey:AcademicYearID" json:"academic_year,omitempty"`
	Enrollments  []StudentEnrollment `gorm:"foreignKey:ClassGroupID" json:"-"`
}

func (ClassGroup) TableName() string {
	return "class_groups"
}
