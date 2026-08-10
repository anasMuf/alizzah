package model

// DaycareMonthlyAttendance stores the monthly attendance summary for daycare billing.
// Replaces per-day attendance counting with a simple monthly input of SPD days and meal days.
// TPQ has been removed from billing calculation.
type DaycareMonthlyAttendance struct {
	PrimaryKey
	StudentID       uint `gorm:"not null;uniqueIndex:uq_dma_student_month_year,priority:1"`
	AcademicYearID  uint `gorm:"not null;index"`
	Month           uint `gorm:"not null;uniqueIndex:uq_dma_student_month_year,priority:2"`
	Year            uint `gorm:"not null;uniqueIndex:uq_dma_student_month_year,priority:3"`
	SPDDays         uint `gorm:"not null;default:0"`
	MealDays        uint `gorm:"not null;default:0"`
	OvertimeMinutes uint `gorm:"not null;default:0"`
	CreatedBy       uint `gorm:"not null"`
	BaseModelTimeAt

	Student      Student      `gorm:"foreignKey:StudentID"`
	AcademicYear AcademicYear `gorm:"foreignKey:AcademicYearID"`
	Creator      User         `gorm:"foreignKey:CreatedBy"`
}

func (DaycareMonthlyAttendance) TableName() string {
	return "daycare_monthly_attendances"
}
