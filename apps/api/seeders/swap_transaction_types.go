package seeders

import (
	"log"

	"gorm.io/gorm"
)

// SwapTransactionTypes menukar semua nilai transaction_type credit ↔ debit
// di tabel cash_transactions, vault_transactions, dan savings_transactions.
//
// Ini mengubah perspektif dari bank statement (nasabah) menjadi akuntansi
// (entitas/sekolah): debit = uang masuk, credit = uang keluar.
//
// MIGRATION INI HANYA JALAN SEKALI. Deteksi: cek cash_transactions dengan
// source_type='payment'. Dalam perspektif lama (bank), payment = credit.
// Jika masih credit → lakukan swap. Jika sudah debit → skip.
func SwapTransactionTypes(db *gorm.DB) {
	// Deteksi: cek apakah payment masih tercatat sebagai 'credit' (bank perspective)
	var paymentCreditCount int64
	db.Table("cash_transactions").
		Where("source_type = 'payment' AND transaction_type = 'credit'").
		Count(&paymentCreditCount)

	if paymentCreditCount == 0 {
		log.Println("[SwapTransactionTypes] Perspektif sudah akuntansi (payment = debit), skip")
		return
	}

	tables := []string{"cash_transactions", "vault_transactions", "savings_transactions"}

	for _, table := range tables {
		result := db.Exec(
			`UPDATE ` + table + ` SET transaction_type = CASE WHEN transaction_type = 'credit' THEN 'debit' ELSE 'credit' END`,
		)
		if result.Error != nil {
			log.Printf("[SwapTransactionTypes] Gagal swap %s: %v", table, result.Error)
			return
		}
		log.Printf("[SwapTransactionTypes] %s: %d baris di-swap credit↔debit", table, result.RowsAffected)
	}

	log.Println("[SwapTransactionTypes] Swap selesai — debit = masuk, credit = keluar")
}
