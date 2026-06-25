package berangkas

import (
	"api/model"
	"time"
)

type VaultTransaction struct {
	model.PrimaryKey
	AcademicYearID  uint      `gorm:"not null;index"`
	TransactionDate time.Time `gorm:"type:date;not null;index"`
	TransactionType string    `gorm:"size:10;not null"`
	Amount          float64   `gorm:"type:decimal(15,2);not null"`
	SourceType      string    `gorm:"size:30;not null"`
	SourceID        *uint
	Description     string `gorm:"size:255;not null"`
	CreatedBy       uint   `gorm:"not null"`
	CreatedAt       time.Time
	UpdatedAt       time.Time

	AcademicYear model.AcademicYear `gorm:"foreignKey:AcademicYearID"`
	Creator      model.User         `gorm:"foreignKey:CreatedBy"`
}

func (VaultTransaction) TableName() string { return "vault_transactions" }

func Models() []any { return []any{&VaultTransaction{}} }
