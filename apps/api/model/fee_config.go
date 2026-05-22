package model

type FeeConfig struct {
	PrimaryKey
	AcademicYearID   uint    `gorm:"not null;uniqueIndex"`
	SavingsAdminRate float64 `gorm:"type:decimal(5,2);not null;default:2.50"`
	BaseModelTimeAt

	AcademicYear AcademicYear    `gorm:"foreignKey:AcademicYearID"`
	Items        []FeeConfigItem `gorm:"foreignKey:FeeConfigID"`
}
