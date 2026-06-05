package model

type Dispensation struct {
	PrimaryKey
	StudentID      uint    `gorm:"not null;index"`
	AcademicYearID uint    `gorm:"not null;index"`
	FeeCategory    string  `gorm:"size:30;not null;default:monthly_spp"`
	DiscountType   string  `gorm:"size:10;not null"` // percent | fixed
	DiscountValue  float64 `gorm:"type:decimal(15,2);not null"`
	IsPermanent    bool    `gorm:"not null;default:false"`
	StartMonth     uint    `gorm:"not null"`
	StartYear      uint    `gorm:"not null"`
	EndMonth       *uint
	EndYear        *uint
	Reason         string `gorm:"size:100;not null"`
	Notes          string `gorm:"type:text"`
	IsActive       bool   `gorm:"not null;default:true"`
	CreatedBy      uint   `gorm:"not null"`
	BaseModelTimeAt

	Student      Student      `gorm:"foreignKey:StudentID"`
	AcademicYear AcademicYear `gorm:"foreignKey:AcademicYearID"`
	Creator      User         `gorm:"foreignKey:CreatedBy"`
}

func (Dispensation) TableName() string {
	return "dispensations"
}
