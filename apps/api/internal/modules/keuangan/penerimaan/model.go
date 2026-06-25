package penerimaan

import (
	"api/model"
	"time"
)

// IncomeTransaction adalah penerimaan dana bantuan (BOS, donasi, hibah, dll).
type IncomeTransaction struct {
	model.PrimaryKey
	AcademicYearID  uint      `gorm:"not null;index"`
	Category        string    `gorm:"size:30;not null"` // bos | donasi | hibah | lainnya
	SourceName      string    `gorm:"size:100;not null"`
	Amount          float64   `gorm:"type:decimal(15,2);not null"`
	TransactionDate time.Time `gorm:"type:date;not null"`
	ReferenceNumber string    `gorm:"size:50"`
	Notes           string    `gorm:"type:text"`
	CreatedBy       uint      `gorm:"not null"`
	model.BaseModelTimeAt

	AcademicYear model.AcademicYear `gorm:"foreignKey:AcademicYearID"`
	Creator      model.User         `gorm:"foreignKey:CreatedBy"`
}

func (IncomeTransaction) TableName() string { return "income_transactions" }

func Models() []any {
	return []any{&IncomeTransaction{}}
}
