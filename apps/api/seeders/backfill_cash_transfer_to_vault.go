package seeders

import (
	"api/model"
	"log"
	"time"

	"gorm.io/gorm"
)

// BackfillCashTransferToVault membuat cash_transactions DEBIT untuk setiap
// payment dengan savings_deposit > 0 yang belum memiliki entry transfer_to_vault.
// Ini memperbaiki double-counting uang kas vs brangkas — setiap setoran tabungan
// dari kas harus mengurangi saldo kas (debit) saat masuk ke brangkas.
func BackfillCashTransferToVault(db *gorm.DB) {
	type paymentInfo struct {
		Payment         model.Payment
		StudentName     string
		CashCreditCount int64
		CashDebitCount  int64
	}

	var payments []paymentInfo
	if err := db.Table("payments").
		Select("payments.*, students.full_name AS student_name, (SELECT COUNT(*) FROM cash_transactions WHERE source_type = 'payment' AND source_id = payments.id) AS cash_credit_count, (SELECT COUNT(*) FROM cash_transactions WHERE source_type = 'transfer_to_vault' AND source_id = payments.id) AS cash_debit_count").
		Joins("JOIN students ON students.id = payments.student_id").
		Where("payments.savings_deposit > 0 AND payments.source = 'cash'").
		Find(&payments).Error; err != nil {
		log.Println("[BackfillCashTransferToVault] Gagal cari payment:", err)
		return
	}

	backfilled := 0
	for _, p := range payments {
		if p.CashDebitCount > 0 || p.CashCreditCount == 0 {
			continue // sudah ada debit, atau tidak ada cash credit (uang tidak lewat kas)
		}

		desc := "Transfer ke brangkas: setoran " + p.StudentName
		ct := model.CashTransaction{
			AcademicYearID:  p.Payment.AcademicYearID,
			TransactionDate: p.Payment.PaymentDate,
			TransactionType: "debit",
			Amount:          p.Payment.SavingsDeposit,
			SourceType:      "transfer_to_vault",
			SourceID:        &p.Payment.ID,
			Description:     desc,
			CreatedBy:       p.Payment.CreatedBy,
		}
		ct.CreatedAt = time.Now()
		ct.UpdatedAt = time.Now()

		if err := db.Create(&ct).Error; err != nil {
			log.Printf("[BackfillCashTransferToVault] Gagal buat cash debit payment %d: %v", p.Payment.ID, err)
			continue
		}
		backfilled++
	}

	if backfilled > 0 {
		log.Printf("[BackfillCashTransferToVault] %d cash debit transfer_to_vault berhasil dibuat", backfilled)
	} else {
		log.Println("[BackfillCashTransferToVault] Semua payment sudah memiliki cash debit transfer")
	}
}
