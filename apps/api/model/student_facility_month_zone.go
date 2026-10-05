package model

// StudentFacilityMonthZone merekam override ZONA per bulan untuk satu
// pendaftaran fasilitas (antar jemput). Key: (student_facility_id, month, year).
//
// Semantik:
//   - TIDAK ada baris  → bulan mengikuti zona default enrollment
//     (student_facilities.fee_config_item_id).
//   - ADA baris        → override eksplisit; FeeConfigItemID NULL berarti
//     "tanpa zona" (memakai item dasar nama fasilitas).
type StudentFacilityMonthZone struct {
	PrimaryKey
	StudentFacilityID uint  `gorm:"not null;index;uniqueIndex:uq_sf_month_zone,priority:1"`
	Month             uint  `gorm:"not null;uniqueIndex:uq_sf_month_zone,priority:2"` // 1-12
	Year              uint  `gorm:"not null;uniqueIndex:uq_sf_month_zone,priority:3"`
	FeeConfigItemID   *uint `gorm:"index"`
	BaseModelTimeAt

	StudentFacility StudentFacility `gorm:"foreignKey:StudentFacilityID"`
	FeeConfigItem   *FeeConfigItem  `gorm:"foreignKey:FeeConfigItemID"`
}

func (StudentFacilityMonthZone) TableName() string {
	return "student_facility_month_zones"
}
