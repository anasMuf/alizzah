package seeders

import (
	"api/model"
	"log"

	"gorm.io/gorm"
)

// ReplacePaymentItemsWithSummary menggabungkan payment_items detail registrasi
// dan biaya awal menjadi 1 item summary per payment (mirip dengan invoice).
//
// Setelah ReplaceInvoiceItemsWithSummary, payment_items mungkin masih menunjuk
// ke invoice_item summary yang sama dengan amount terpisah-pisah (sisa dari
// payment lama). Migration ini menggabungkan menjadi 1 payment_item.
func ReplacePaymentItemsWithSummary(db *gorm.DB) {
	type paymentGroup struct {
		PaymentID       uint
		InvoiceItemID   uint
		InvoiceItemName string
		TotalAmount     float64
	}

	// Cari payment_items yang perlu digabung (> 1 item dengan invoice_item_id sama)
	var groups []paymentGroup
	if err := db.Raw(`
		SELECT pi.payment_id, pi.invoice_item_id,
		       ii.name AS invoice_item_name,
		       SUM(pi.amount) AS total_amount
		FROM payment_items pi
		JOIN invoice_items ii ON ii.id = pi.invoice_item_id AND ii.deleted_at IS NULL
		JOIN invoices i ON i.id = ii.invoice_id
		WHERE pi.deleted_at IS NULL AND i.type IN ('initial', 'registration')
		GROUP BY pi.payment_id, pi.invoice_item_id, ii.name
		HAVING COUNT(*) > 1
	`).Scan(&groups).Error; err != nil {
		log.Println("[ReplacePaymentItemsWithSummary] Gagal cari payment items:", err)
		return
	}

	merged := 0
	for _, g := range groups {
		err := db.Transaction(func(tx *gorm.DB) error {
			// Hapus semua payment_items lama untuk invoice_item_id ini
			if err := tx.Where("payment_id = ? AND invoice_item_id = ?", g.PaymentID, g.InvoiceItemID).
				Delete(&model.PaymentItem{}).Error; err != nil {
				return err
			}

			// Buat 1 payment_item summary
			newItem := model.PaymentItem{
				PaymentID:     g.PaymentID,
				InvoiceItemID: g.InvoiceItemID,
				Amount:        g.TotalAmount,
			}
			return tx.Create(&newItem).Error
		})
		if err != nil {
			log.Printf("[ReplacePaymentItemsWithSummary] Gagal merge payment %d: %v", g.PaymentID, err)
			continue
		}
		merged++
	}

	if merged > 0 {
		log.Printf("[ReplacePaymentItemsWithSummary] %d payment berhasil digabung item-nya", merged)
	} else {
		log.Println("[ReplacePaymentItemsWithSummary] Tidak ada payment_items yang perlu digabung")
	}
}
