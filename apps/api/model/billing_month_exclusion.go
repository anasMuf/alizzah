package model

// BillingMonthExclusion menyimpan daftar bulan di mana tagihan bulanan
// (PASTA/ekskul, fasilitas) di-skip untuk seorang siswa — tanpa mengubah
// status enrollment. Key: (student_id, entity_type, entity_ref_id, month, year).
type BillingMonthExclusion struct {
	PrimaryKey
	StudentID      uint   `gorm:"not null;index;uniqueIndex:uq_billing_exclusion"`
	EntityType     string `gorm:"size:20;not null;uniqueIndex:uq_billing_exclusion"` // "extracurricular" | "facility"
	EntityRefID    uint   `gorm:"not null;uniqueIndex:uq_billing_exclusion"`         // extracurricular_id / facility_id
	Month          uint   `gorm:"not null;uniqueIndex:uq_billing_exclusion"`         // 1-12
	Year           uint   `gorm:"not null;uniqueIndex:uq_billing_exclusion"`
	AcademicYearID uint   `gorm:"not null"`
	BaseModelTimeAt
}

func (BillingMonthExclusion) TableName() string {
	return "billing_month_exclusions"
}
