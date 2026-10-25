package model

import "time"

type DailyClosing struct {
	PrimaryKey
	AcademicYearID     uint      `gorm:"not null;index"`
	ClosingDate        time.Time `gorm:"type:date;not null;uniqueIndex"`
	PhysicalCashAmount float64   `gorm:"type:decimal(15,2);not null"`
	SystemCashAmount   float64   `gorm:"type:decimal(15,2);not null"` // = LedgerCash - WorkaroundAdjustment
	// LedgerCashAmount: saldo kas mentah dari cash_transactions (sebelum koreksi).
	LedgerCashAmount float64 `gorm:"type:decimal(15,2);not null;default:0"`
	// WorkaroundAdjustment: uang-hantu dari pola "tarik lalu bayar tunai" yang
	// menggelembungkan ledger; dikurangkan agar SystemCash mendekati tunai fisik.
	WorkaroundAdjustment float64 `gorm:"type:decimal(15,2);not null;default:0"`
	Difference           float64 `gorm:"type:decimal(15,2);not null"`
	Notes                string  `gorm:"type:text"`
	IsConfirmed          bool    `gorm:"not null;default:false"`
	ClosedBy             uint    `gorm:"not null"`
	CreatedAt            time.Time
	UpdatedAt            time.Time

	AcademicYear AcademicYear `gorm:"foreignKey:AcademicYearID"`
	Closer       User         `gorm:"foreignKey:ClosedBy"`
}
