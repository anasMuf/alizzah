package model

import "time"

type SavingsTransaction struct {
	PrimaryKey
	StudentSavingsID uint    `gorm:"not null;index"`
	TransactionType  string  `gorm:"size:10;not null"` // credit | debit
	Amount           float64 `gorm:"type:decimal(15,2);not null"`
	AdminFee         float64 `gorm:"type:decimal(15,2);not null;default:0"`
	NetAmount        float64 `gorm:"type:decimal(15,2);not null"`
	SourceType       string  `gorm:"size:30;not null"`
	// payment_deposit | guardian_withdrawal | payment_usage | graduation_allocation | transfer_return
	SourceID  *uint  `gorm:""`
	Notes     string `gorm:"type:text"`
	CreatedBy uint   `gorm:"not null"`
	// TransactionDate: tanggal buku transaksi (bukan timestamp input). Dipakai
	// laporan agar penarikan/setoran dikelompokkan per tanggal buku, lepas dari
	// timezone server. Default CURRENT_DATE untuk jalur yang tak menyetel eksplisit.
	TransactionDate time.Time `gorm:"type:date;not null;default:CURRENT_DATE;index"`
	BaseModelTimeAt

	StudentSavings StudentSavings `gorm:"foreignKey:StudentSavingsID"`
	Creator        User           `gorm:"foreignKey:CreatedBy"`
}

func (SavingsTransaction) TableName() string {
	return "savings_transactions"
}
