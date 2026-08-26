package seeders

import (
	"api/model"
	"fmt"
	"log"

	"gorm.io/gorm"
)

// BackfillDaycareRegularCleanup membersihkan tagihan yang tidak semestinya:
//
//  1. Menghapus invoice daycare_initial milik siswa regular (biaya awal hanya
//     berlaku untuk premium).
//  2. Menghitung ulang SEMUA invoice bulanan yang total_amount-nya tidak cocok
//     dengan jumlah item aktif (mencakup siswa daycare maupun non-daycare).
//     Ini menangani bug umum: item dihapus/di-soft-delete tanpa recalculate total.
//
// Idempotent — aman dijalankan berulang kali.
func BackfillDaycareRegularCleanup(db *gorm.DB) {
	log.Println("[BackfillDaycareRegular] Mulai...")

	// ─── 1. Hapus daycare_initial milik siswa regular ───
	type initialInv struct {
		ID        uint
		StudentID uint
		Name      string
		Amount    float64
		Paid      float64
	}
	var wrongInitials []initialInv
	if err := db.Table("invoices i").
		Select("i.id, i.student_id, s.full_name AS name, i.total_amount AS amount, i.paid_amount AS paid").
		Joins("JOIN daycare_enrollments de ON de.student_id = i.student_id AND de.academic_year_id = i.academic_year_id").
		Joins("JOIN students s ON s.id = i.student_id").
		Where("i.type = ? AND i.academic_year_id = de.academic_year_id AND de.category = ?", "daycare_initial", "regular").
		Find(&wrongInitials).Error; err != nil {
		log.Printf("[BackfillDaycareRegular] Gagal cari invoice daycare_initial regular: %v", err)
		return
	}

	deletedInitials := 0
	skippedInitials := 0
	for _, inv := range wrongInitials {
		if inv.Paid > 0 {
			log.Printf("[BackfillDaycareRegular] ⚠️  Skip daycare_initial %d (siswa %d %s): sudah dibayar %.0f — perlu dicek manual",
				inv.ID, inv.StudentID, inv.Name, inv.Paid)
			skippedInitials++
			continue
		}

		// Hapus item dulu, lalu invoice
		if err := db.Where("invoice_id = ?", inv.ID).Delete(&model.InvoiceItem{}).Error; err != nil {
			log.Printf("[BackfillDaycareRegular] Gagal hapus item invoice %d: %v", inv.ID, err)
			continue
		}
		if err := db.Delete(&model.Invoice{}, inv.ID).Error; err != nil {
			log.Printf("[BackfillDaycareRegular] Gagal hapus invoice %d: %v", inv.ID, err)
			continue
		}
		log.Printf("[BackfillDaycareRegular] ✓ Hapus daycare_initial %d: siswa %d %s (Rp %.0f unpaid)",
			inv.ID, inv.StudentID, inv.Name, inv.Amount)
		deletedInitials++
	}

	if deletedInitials > 0 || skippedInitials > 0 {
		log.Printf("[BackfillDaycareRegular] daycare_initial: %d dihapus, %d di-skip (sudah dibayar)",
			deletedInitials, skippedInitials)
		if skippedInitials > 0 {
			fmt.Printf("\n⚠️  [BackfillDaycareRegular] %d invoice daycare_initial regular SUDAH DIBAYAR — tidak dihapus.\n", skippedInitials)
			fmt.Println("   Silakan cek manual invoice terkait dan lakukan refund/penyesuaian jika perlu.")
		}
	} else {
		log.Println("[BackfillDaycareRegular] Tidak ada daycare_initial milik regular, skip")
	}

	// ─── 2. Recalculate SEMUA invoice monthly yang total_amount ≠ SUM(items aktif) ───
	// Mencakup siswa daycare DAN non-daycare (misal: item ekskul/fasilitas
	// dihapus tanpa recalculate).
	type mismatchedInv struct {
		ID          uint
		StudentID   uint
		Name        string
		TotalAmount float64
		ItemsSum    float64
	}
	var mismatched []mismatchedInv
	if err := db.Raw(`
		SELECT i.id, i.student_id, s.full_name AS name,
		       i.total_amount,
		       COALESCE(SUM(ii.amount), 0) AS items_sum
		FROM invoices i
		JOIN students s ON s.id = i.student_id
		LEFT JOIN invoice_items ii ON ii.invoice_id = i.id AND ii.deleted_at IS NULL
		WHERE i.type = 'monthly'
		GROUP BY i.id, i.student_id, s.full_name, i.total_amount
		HAVING i.total_amount != COALESCE(SUM(ii.amount), 0)
		ORDER BY i.id
	`).Scan(&mismatched).Error; err != nil {
		log.Printf("[BackfillDaycareRegular] Gagal cari invoice dengan total mismatch: %v", err)
		return
	}

	recalculated := 0
	for _, inv := range mismatched {
		// Hitung ulang total dan paid dari item yang tersisa (non-deleted)
		var total, paid float64
		if err := db.Model(&model.InvoiceItem{}).
			Where("invoice_id = ?", inv.ID).
			Select("COALESCE(SUM(amount), 0), COALESCE(SUM(paid_amount), 0)").
			Row().Scan(&total, &paid); err != nil {
			log.Printf("[BackfillDaycareRegular] Gagal hitung total invoice %d: %v", inv.ID, err)
			continue
		}

		status := "unpaid"
		if paid > 0 {
			// Kanonik: lunas hanya jika SEMUA item lunas, bukan paid >= total.
			// Dispensasi negatif / item bernilai 0 membuat paid bisa == total
			// padahal masih ada item yang belum dibayar.
			var unpaidItems int64
			if err := db.Model(&model.InvoiceItem{}).
				Where("invoice_id = ? AND status != 'paid'", inv.ID).
				Count(&unpaidItems).Error; err != nil {
				log.Printf("[BackfillDaycareRegular] Gagal hitung item unpaid invoice %d: %v", inv.ID, err)
				continue
			}
			if unpaidItems == 0 {
				status = "paid"
			} else {
				status = "partial"
			}
		}

		if err := db.Model(&model.Invoice{}).
			Where("id = ?", inv.ID).
			Updates(map[string]interface{}{
				"total_amount": total,
				"paid_amount":  paid,
				"status":       status,
			}).Error; err != nil {
			log.Printf("[BackfillDaycareRegular] Gagal update invoice %d: %v", inv.ID, err)
			continue
		}

		log.Printf("[BackfillDaycareRegular] ✓ Recalculate invoice %d: siswa %d %s, %s → Rp %.0f (status: %s)",
			inv.ID, inv.StudentID, inv.Name,
			formatRupiah(inv.TotalAmount), total, status)
		recalculated++
	}

	if recalculated > 0 {
		log.Printf("[BackfillDaycareRegular] %d invoice di-recalculate", recalculated)
	} else {
		log.Println("[BackfillDaycareRegular] Semua invoice sudah konsisten")
	}

	log.Println("[BackfillDaycareRegular] Selesai")
}

func formatRupiah(amount float64) string {
	if amount < 0 {
		return fmt.Sprintf("-Rp %.0f", -amount)
	}
	return fmt.Sprintf("Rp %.0f", amount)
}
