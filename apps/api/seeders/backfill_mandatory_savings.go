package seeders

import (
	"api/model"
	"log"
	"time"

	"gorm.io/gorm"
)

// BackfillMandatorySavingsDeposit mencari pembayaran yang mengandung item
// tabungan wajib (savings_mandatory) tetapi belum mencatat setoran ke
// student_savings type "mandatory", lalu memperbaikinya secara idempotent.
//
// Sebelum fix ini, pembayaran invoice dengan kategori savings_mandatory
// hanya menandai invoice item sebagai paid tanpa menambah saldo tabungan
// wajib siswa. Akibatnya total_savings_mandatory di laporan berangkas selalu 0.
func BackfillMandatorySavingsDeposit(db *gorm.DB) {
	type paymentMandatoryInfo struct {
		PaymentID        uint
		StudentID        uint
		AcademicYearID   uint
		PaymentDate      time.Time
		Source           string
		CreatedBy        uint
		StudentName      string
		MandatoryAmount  float64
		ExistingTxnCount int64
	}

	// Cari semua payment yang memiliki item savings_mandatory, beserta
	// total nominal yang sudah dibayar. Satu payment bisa mencakup beberapa
	// bulan tabungan wajib → SUM menggabungkan semuanya.
	var payments []paymentMandatoryInfo
	err := db.Raw(`
		SELECT
			p.id AS payment_id,
			p.student_id,
			p.academic_year_id,
			p.payment_date,
			p.source,
			p.created_by,
			s.full_name AS student_name,
			SUM(pi.amount) AS mandatory_amount,
			(SELECT COUNT(*) FROM savings_transactions
			 WHERE source_type = 'payment_mandatory' AND source_id = p.id) AS existing_txn_count
		FROM payment_items pi
		JOIN invoice_items ii ON ii.id = pi.invoice_item_id AND ii.deleted_at IS NULL
		JOIN payments p ON p.id = pi.payment_id AND p.deleted_at IS NULL
		JOIN students s ON s.id = p.student_id
		WHERE pi.deleted_at IS NULL
		  AND ii.category = 'savings_mandatory'
		GROUP BY p.id, p.student_id, p.academic_year_id, p.payment_date, p.source, p.created_by, s.full_name
		HAVING SUM(pi.amount) > 0
		ORDER BY p.id
	`).Scan(&payments).Error

	if err != nil {
		log.Printf("[BackfillMandatorySavingsDeposit] Gagal cari payment: %v", err)
		return
	}

	backfilled := 0
	skipped := 0
	for _, pm := range payments {
		if pm.ExistingTxnCount > 0 {
			skipped++
			continue // sudah ada savings_transaction untuk payment ini
		}

		// Gunakan transaksi agar atomic per payment
		err := db.Transaction(func(tx *gorm.DB) error {
			// 1. Cari atau buat student_savings type "mandatory"
			var mandatorySavings model.StudentSavings
			findErr := tx.Where("student_id = ? AND type = ?", pm.StudentID, "mandatory").
				First(&mandatorySavings).Error
			if findErr != nil {
				mandatorySavings = model.StudentSavings{
					StudentID: pm.StudentID,
					Type:      "mandatory",
					Balance:   0,
				}
				if err := tx.Create(&mandatorySavings).Error; err != nil {
					return err
				}
			}

			// 2. Buat savings_transaction (debit = uang masuk ke tabungan)
			stxn := model.SavingsTransaction{
				StudentSavingsID: mandatorySavings.ID,
				TransactionType:  "debit",
				Amount:           pm.MandatoryAmount,
				NetAmount:        pm.MandatoryAmount,
				SourceType:       "payment_mandatory",
				SourceID:         &pm.PaymentID,
				Notes:            "Backfill: setoran tabungan wajib dari pembayaran",
				CreatedBy:        pm.CreatedBy,
			}
			if err := tx.Create(&stxn).Error; err != nil {
				return err
			}

			// 3. Update student_savings.balance (tambah saldo)
			if err := tx.Model(&mandatorySavings).
				Update("balance", gorm.Expr("balance + ?", pm.MandatoryAmount)).Error; err != nil {
				return err
			}

			// 4. Buat vault_transaction (debit = uang masuk ke brangkas)
			vt := model.VaultTransaction{
				AcademicYearID:  pm.AcademicYearID,
				TransactionDate: pm.PaymentDate,
				TransactionType: "debit",
				Amount:          pm.MandatoryAmount,
				SourceType:      "savings_deposit",
				SourceID:        &pm.PaymentID,
				Description:     "Backfill: setoran tabungan wajib " + pm.StudentName,
				CreatedBy:       pm.CreatedBy,
			}
			if err := tx.Create(&vt).Error; err != nil {
				return err
			}

			// 5. Untuk source cash: transfer dari kas ke brangkas agar
			//    uang tidak double-count di kas + brangkas
			if pm.Source == "cash" {
				ct := model.CashTransaction{
					AcademicYearID:  pm.AcademicYearID,
					TransactionDate: pm.PaymentDate,
					TransactionType: "debit",
					Amount:          pm.MandatoryAmount,
					SourceType:      "transfer_to_vault",
					SourceID:        &pm.PaymentID,
					Description:     "Backfill: transfer ke brangkas (tab wajib) " + pm.StudentName,
					CreatedBy:       pm.CreatedBy,
				}
				if err := tx.Create(&ct).Error; err != nil {
					return err
				}
			}

			return nil
		})

		if err != nil {
			log.Printf("[BackfillMandatorySavingsDeposit] Gagal backfill payment %d (student: %s): %v",
				pm.PaymentID, pm.StudentName, err)
			continue
		}
		backfilled++
	}

	log.Printf("[BackfillMandatorySavingsDeposit] %d payment di-backfill, %d sudah ada, %d error",
		backfilled, skipped, len(payments)-backfilled-skipped)
}
