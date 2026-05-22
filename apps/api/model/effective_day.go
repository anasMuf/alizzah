package model

// EffectiveDay represents the effective days for a class group in a specific month and year.
type EffectiveDay struct {
	PrimaryKey
	ClassGroupID   uint `gorm:"not null;uniqueIndex:uq_effective_days"`
	AcademicYearID uint `gorm:"not null;index"`
	Month          uint `gorm:"not null;uniqueIndex:uq_effective_days"` // 1–12
	Year           uint `gorm:"not null;uniqueIndex:uq_effective_days"`
	TotalDays      uint `gorm:"not null"`
	TotalMondays   uint `gorm:"not null"`
	CreatedBy      uint `gorm:"not null"`
	BaseModelTimeAt

	ClassGroup   ClassGroup   `gorm:"foreignKey:ClassGroupID"`
	AcademicYear AcademicYear `gorm:"foreignKey:AcademicYearID"`
	Creator      User         `gorm:"foreignKey:CreatedBy"`
}

func (EffectiveDay) TableName() string {
	return "effective_days"
}
