package seeders

import (
	"api/model"
	"fmt"
	"log"

	"gorm.io/gorm"
)

// BackfillRemoveAslinFromJuly menghapus item tagihan Aslin dari semua invoice
// bulan Juli yang belum dibayar, lalu menghitung ulang total invoice.
// Ini diperlukan setelah set start_month=8 untuk Aslin — invoice Juli yang
// sudah terlanjur dibuat harus dibersihkan.
func BackfillRemoveAslinFromJuly(db *gorm.DB) {
	// 1. Cari nama item Aslin dari fee config
	type aslinInfo struct {
		Name string
	}
	var aslinNames []aslinInfo
	if err := db.Model(&model.FeeConfigItem{}).
		Where("item_key = ? AND is_mandatory = ? AND is_active = ?", "pasta_aslin", true, true).
		Select("name").
		Find(&aslinNames).Error; err != nil {
		log.Printf("[BackfillRemoveAslinJuly] Gagal cari item Aslin: %v", err)
		return
	}
	if len(aslinNames) == 0 {
		log.Println("[BackfillRemoveAslinJuly] Tidak ada item Aslin di fee config, skip")
		return
	}

	nameSet := make(map[string]bool)
	for _, a := range aslinNames {
		nameSet[a.Name] = true
	}

	// 2. Cari invoice_items Aslin di invoice bulan 7 (monthly)
	type itemRow struct {
		ID        uint
		InvoiceID uint
		Name      string
		Amount    float64
		Paid      float64
	}
	var items []itemRow
	if err := db.Table("invoice_items ii").
		Select("ii.id, ii.invoice_id, ii.name, ii.amount, ii.paid_amount as paid").
		Joins("JOIN invoices i ON i.id = ii.invoice_id").
		Where("i.type = ? AND i.month = ? AND ii.category = ?", "monthly", 7, "pasta").
		Find(&items).Error; err != nil {
		log.Printf("[BackfillRemoveAslinJuly] Gagal cari invoice items: %v", err)
		return
	}

	// 3. Hapus item Aslin yang belum dibayar
	deleted := 0
	skipped := 0
	invoiceIDs := make(map[uint]bool)

	for _, it := range items {
		if !nameSet[it.Name] {
			continue // bukan Aslin (mungkin pasta lain)
		}
		if it.Paid > 0 {
			log.Printf("[BackfillRemoveAslinJuly] Skip invoice_item %d: sudah dibayar %.0f", it.ID, it.Paid)
			skipped++
			continue
		}
		if err := db.Delete(&model.InvoiceItem{}, it.ID).Error; err != nil {
			log.Printf("[BackfillRemoveAslinJuly] Gagal hapus invoice_item %d: %v", it.ID, err)
			continue
		}
		deleted++
		invoiceIDs[it.InvoiceID] = true
	}

	if deleted == 0 && skipped == 0 {
		log.Println("[BackfillRemoveAslinJuly] Tidak ada item Aslin di invoice Juli, skip")
		return
	}

	// 4. Hitung ulang total invoice yang terdampak
	recalculated := 0
	for invID := range invoiceIDs {
		// Hitung total amount dan paid_amount dari item yang tersisa
		// Gunakan db.Model() agar GORM otomatis memfilter soft-deleted rows (deleted_at IS NULL)
		var total, paid float64
		db.Model(&model.InvoiceItem{}).
			Where("invoice_id = ?", invID).
			Select("COALESCE(SUM(amount), 0), COALESCE(SUM(paid_amount), 0)").
			Row().Scan(&total, &paid)

		status := "unpaid"
		if paid > 0 && paid < total {
			status = "partial"
		} else if paid >= total && total > 0 {
			status = "paid"
		}

		if err := db.Model(&model.Invoice{}).
			Where("id = ?", invID).
			Updates(map[string]interface{}{
				"total_amount": total,
				"paid_amount":  paid,
				"status":       status,
			}).Error; err != nil {
			log.Printf("[BackfillRemoveAslinJuly] Gagal update invoice %d: %v", invID, err)
			continue
		}
		recalculated++
	}

	log.Printf("[BackfillRemoveAslinJuly] Selesai: %d item dihapus, %d invoice di-recalculate, %d item dibayar di-skip",
		deleted, recalculated, skipped)

	if skipped > 0 {
		fmt.Printf("\n⚠️  [BackfillRemoveAslinJuly] %d item Aslin bulan Juli SUDAH DIBAYAR — tidak dihapus.\n", skipped)
		fmt.Println("   Silakan cek manual invoice terkait dan lakukan refund/penyesuaian jika perlu.")
	}
}
