package model

import "time"

// AcademicYear represents the academic_years table.
// Only one academic year can be active at a time (is_active=true).
type AcademicYear struct {
	PrimaryKey
	Name      string    `gorm:"size:20;not null;uniqueIndex" json:"name"`
	StartDate time.Time `gorm:"type:date;not null" json:"start_date"`
	EndDate   time.Time `gorm:"type:date;not null" json:"end_date"`
	IsActive  bool      `gorm:"default:false" json:"is_active"`
	BaseModelTimeAt
}
