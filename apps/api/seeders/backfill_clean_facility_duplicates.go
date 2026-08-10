package seeders

import (
	"api/model"
	"fmt"
	"log"

	"gorm.io/gorm"
)

// BackfillCleanFacilityDuplicates membersihkan item fasilitas (Antar Jemput, dll)
// yang duplikat atau berada di bulan sebelum start_date student_facility.
//
// Masalah yang diperbaiki:
//  1. Item fasilitas di bulan SEBELUM student_facility.start_date
//     (terjadi saat start_date diubah mundur setelah item terlanjur dibuat)
//  2. Item fasilitas duplikat akibat soft-delete + reactivation
//     (Enroll → Unenroll → Enroll lagi menghasilkan item baru tanpa
//     menghapus permanen item lama yang di-soft-delete)
//
// Idempotent: aman dijalankan berkali-kali.
func BackfillCleanFacilityDuplicates(db *gorm.DB) {
	// ── 1. Hard-delete semua item fasilitas yang sudah soft-deleted ──
	var softDelCount int64
	db.Model(&model.InvoiceItem{}).
		Where("category = ? AND deleted_at IS NOT NULL", "facility").
		Count(&softDelCount)

	if softDelCount > 0 {
		// Kumpulkan invoice_id yang terdampak untuk recalculate nanti
		var softDelInvoiceIDs []uint
		db.Model(&model.InvoiceItem{}).
			Where("category = ? AND deleted_at IS NOT NULL", "facility").
			Pluck("DISTINCT invoice_id", &softDelInvoiceIDs)

		// Hard-delete (Unscoped bypass GORM soft-delete)
		db.Unscoped().
			Where("category = ? AND deleted_at IS NOT NULL", "facility").
			Delete(&model.InvoiceItem{})

		log.Printf("[CleanFacility] %d item fasilitas soft-deleted dihapus permanen", softDelCount)

		// Recalculate invoice yang terdampak
		recalculateInvoices(db, softDelInvoiceIDs)
	} else {
		log.Println("[CleanFacility] Tidak ada item fasilitas soft-deleted, skip langkah 1")
	}

	// ── 2. Hapus item fasilitas di bulan SEBELUM start_date ──
	type sfInfo struct {
		StudentFacilityID uint
		StudentID         uint
		FacilityName      string
		StartMonth        uint
		StartYear         uint
	}

	var enrollments []sfInfo
	db.Table("student_facilities sf").
		Select("sf.id as student_facility_id, sf.student_id, f.name as facility_name, " +
			"EXTRACT(MONTH FROM sf.start_date)::int as start_month, " +
			"EXTRACT(YEAR FROM sf.start_date)::int as start_year").
		Joins("JOIN facilities f ON f.id = sf.facility_id").
		Where("sf.deleted_at IS NULL AND sf.end_date IS NULL").
		Find(&enrollments)

	type beforeStartItem struct {
		ID        uint
		InvoiceID uint
	}
	var itemsToDelete []beforeStartItem

	for _, enr := range enrollments {
		var items []beforeStartItem
		db.Table("invoice_items ii").
			Select("ii.id, ii.invoice_id").
			Joins("JOIN invoices i ON i.id = ii.invoice_id").
			Where("i.student_id = ? AND ii.category = ? AND ii.deleted_at IS NULL AND ii.paid_amount = 0", enr.StudentID, "facility").
			Where("i.type = 'monthly'").
			// bulan invoice < bulan start_date
			Where("(i.year < ? OR (i.year = ? AND i.month < ?))", enr.StartYear, enr.StartYear, enr.StartMonth).
			Where("ii.name ILIKE ?", "%"+enr.FacilityName+"%").
			Find(&items)

		if len(items) > 0 {
			itemsToDelete = append(itemsToDelete, items...)
		}
	}

	if len(itemsToDelete) > 0 {
		// Kumpulkan invoice_id unik
		invoiceIDSet := make(map[uint]bool)
		var ids []uint
		for _, it := range itemsToDelete {
			ids = append(ids, it.ID)
			invoiceIDSet[it.InvoiceID] = true
		}

		// Hapus item (hard delete — bypass GORM soft-delete)
		db.Unscoped().Where("id IN ?", ids).Delete(&model.InvoiceItem{})

		var invoiceIDs []uint
		for invID := range invoiceIDSet {
			invoiceIDs = append(invoiceIDs, invID)
		}

		log.Printf("[CleanFacility] %d item fasilitas sebelum start_date dihapus", len(itemsToDelete))

		// Recalculate invoice terdampak
		recalculateInvoices(db, invoiceIDs)
	} else {
		log.Println("[CleanFacility] Tidak ada item fasilitas sebelum start_date, skip langkah 2")
	}

	log.Println("[CleanFacility] Selesai")
}

// recalculateInvoices menghitung ulang total_amount, paid_amount, dan status
// untuk daftar invoice yang diberikan.
func recalculateInvoices(db *gorm.DB, invoiceIDs []uint) {
	if len(invoiceIDs) == 0 {
		return
	}

	recalculated := 0
	for _, invID := range invoiceIDs {
		var total, paid float64
		if err := db.Model(&model.InvoiceItem{}).
			Where("invoice_id = ?", invID).
			Select("COALESCE(SUM(amount), 0), COALESCE(SUM(paid_amount), 0)").
			Row().Scan(&total, &paid); err != nil {
			log.Printf("[CleanFacility] Gagal scan invoice %d: %v", invID, err)
			continue
		}

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
			log.Printf("[CleanFacility] Gagal update invoice %d: %v", invID, err)
			continue
		}
		recalculated++
	}

	if recalculated > 0 {
		fmt.Printf("\n✅ [CleanFacility] %d invoice di-recalculate\n", recalculated)
	}
}
