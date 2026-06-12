package modal

import (
	"time"

	"api/model"
)

// CapitalInjection adalah penyaluran modal dari keuangan sekolah ke koperasi per
// tahun ajaran. Jejak ke kedua buku kas memakai idiom source_type/source_id:
// baris debit kas sekolah & credit kas koperasi sama-sama menunjuk ID record ini.
type CapitalInjection struct {
	model.PrimaryKey
	AcademicYearID uint      `gorm:"not null;index" json:"academic_year_id"`
	InjectionDate  time.Time `gorm:"type:date;not null" json:"injection_date"`
	Amount         float64   `gorm:"type:decimal(15,2);not null" json:"amount"`
	Notes          string    `gorm:"type:text" json:"notes"`
	CreatedBy      uint      `gorm:"not null" json:"created_by"`
	model.BaseModelTimeAt

	AcademicYear model.AcademicYear `gorm:"foreignKey:AcademicYearID" json:"-"`
	Creator      model.User         `gorm:"foreignKey:CreatedBy" json:"-"`
}

func (CapitalInjection) TableName() string { return "koperasi_capital_injections" }
