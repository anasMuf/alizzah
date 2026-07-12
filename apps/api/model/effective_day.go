package model

// EffectiveDay represents the effective days for a class group or level in a specific month and year.
// Two modes:
//   - Per rombel: ClassGroupID diisi, Level kosong
//   - Per jenjang: ClassGroupID = 0, Level diisi ("mutiara"/"intan"/"berlian")
type EffectiveDay struct {
	PrimaryKey
	ClassGroupID   uint   `gorm:"not null"`
	Level          string `gorm:"size:20"`
	AcademicYearID uint   `gorm:"not null;index"`
	Month          uint   `gorm:"not null"`
	Year           uint   `gorm:"not null"`
	TotalDays      uint   `gorm:"not null"`
	TotalMondays   uint   `gorm:"not null"`
	CreatedBy      uint   `gorm:"not null"`
	BaseModelTimeAt

	AcademicYear AcademicYear `gorm:"foreignKey:AcademicYearID"`
	Creator      User         `gorm:"foreignKey:CreatedBy"`
}

func (EffectiveDay) TableName() string {
	return "effective_days"
}
