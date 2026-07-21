package seeders

import (
	"log"

	"gorm.io/gorm"
)

// FixSavingsTransactionTypes memperbaiki transaction_type yang salah pada
// savings_transactions untuk transaksi uang KELUAR (guardian_withdrawal,
// graduation_allocation) yang tercatat sebagai "debit", seharusnya "credit".
//
// Bug ini terjadi karena kode lama menggunakan TransactionType "debit" untuk
// penarikan. Di konvensi saat ini: debit = uang masuk, credit = uang keluar.
func FixSavingsTransactionTypes(db *gorm.DB) {
	// Hanya perbaiki yang masih salah (debit → credit untuk uang keluar)
	result := db.Table("savings_transactions").
		Where("source_type IN ?", []string{"guardian_withdrawal", "graduation_allocation"}).
		Where("transaction_type = ?", "debit").
		Update("transaction_type", "credit")

	if result.Error != nil {
		log.Printf("[FixSavingsTransactionTypes] Gagal: %v", result.Error)
		return
	}

	if result.RowsAffected > 0 {
		log.Printf("[FixSavingsTransactionTypes] %d transaksi diperbaiki (debit→credit)", result.RowsAffected)
	} else {
		log.Println("[FixSavingsTransactionTypes] Semua transaksi sudah benar, tidak ada yang perlu diperbaiki")
	}
}
