package model

import "time"

type DailyClosing struct {
	PrimaryKey
	AcademicYearID     uint      `gorm:"not null;index"`
	ClosingDate        time.Time `gorm:"type:date;not null;uniqueIndex"`
	PhysicalCashAmount float64   `gorm:"type:decimal(15,2);not null"`
	SystemCashAmount   float64   `gorm:"type:decimal(15,2);not null"`
	Difference         float64   `gorm:"type:decimal(15,2);not null"`
	Notes              string    `gorm:"type:text"`
	IsConfirmed        bool      `gorm:"not null;default:false"`
	ClosedBy           uint      `gorm:"not null"`
	CreatedAt          time.Time
	UpdatedAt          time.Time

	AcademicYear AcademicYear `gorm:"foreignKey:AcademicYearID"`
	Closer       User         `gorm:"foreignKey:ClosedBy"`
}
