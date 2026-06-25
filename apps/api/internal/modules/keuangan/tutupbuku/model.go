package tutupbuku

import (
	"api/model"
	"time"
)

type DailyClosing struct {
	model.PrimaryKey
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

	AcademicYear model.AcademicYear `gorm:"foreignKey:AcademicYearID"`
	Closer       model.User         `gorm:"foreignKey:ClosedBy"`
}

func (DailyClosing) TableName() string { return "daily_closings" }

func Models() []any { return []any{&DailyClosing{}} }
