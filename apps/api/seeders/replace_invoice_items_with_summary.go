package seeders

import (
	"api/model"
	"log"

	"gorm.io/gorm"
)

// ReplaceInvoiceItemsWithSummary mengganti item-item detail di invoice initial dan
// registration yang sudah ada menjadi item summary (1 item per invoice). Total amount
// invoice tidak berubah — hanya invoice_items yang diganti. Payment dan installment
// schedule tetap valid karena invoice_id dan total_amount tidak berubah.
//
// Setiap invoice diproses dalam transaksi: buat item summary baru → arahkan ulang
// PaymentItem ke item baru → hapus item lama.
//
// Migration ini dijalankan satu kali saat startup. Setelah jalan, semua invoice
// existing akan memiliki format summary yang sama dengan invoice siswa baru.
func ReplaceInvoiceItemsWithSummary(db *gorm.DB) {
	// === Step 1: Replace invoice_items for type=initial ===
	var initialInvoices []model.Invoice
	if err := db.Where("type = ?", "initial").Find(&initialInvoices).Error; err != nil {
		log.Println("[ReplaceInvoiceItemsWithSummary] Gagal cari invoice initial:", err)
		return
	}

	initialReplaced := 0
	for _, inv := range initialInvoices {
		if err := replaceInvoiceItemsWithSingleSummary(db, inv, "initial", "Biaya Awal Pendidikan"); err != nil {
			log.Printf("[ReplaceInvoiceItemsWithSummary] Gagal migrate invoice initial %d: %v", inv.ID, err)
			continue
		}
		initialReplaced++
	}
	if initialReplaced > 0 {
		log.Printf("[ReplaceInvoiceItemsWithSummary] %d invoice initial berhasil diganti ke format summary", initialReplaced)
	}

	// === Step 2: Replace invoice_items for type=registration ===
	type invoiceWithLevelGender struct {
		model.Invoice
		ClassLevel    string
		StudentGender string
	}

	regReplaced := 0
	var regInvoices []invoiceWithLevelGender
	if err := db.Table("invoices").
		Select("invoices.*, class_groups.level AS class_level, students.gender AS student_gender").
		Joins("JOIN students ON students.id = invoices.student_id").
		Joins("JOIN student_enrollments ON student_enrollments.student_id = invoices.student_id AND student_enrollments.academic_year_id = invoices.academic_year_id").
		Joins("JOIN class_groups ON class_groups.id = student_enrollments.class_group_id").
		Where("invoices.type = ? AND student_enrollments.status = 'active'", "registration").
		Find(&regInvoices).Error; err != nil {
		log.Println("[ReplaceInvoiceItemsWithSummary] Gagal cari invoice registration:", err)
		return
	}

	for _, inv := range regInvoices {
		itemName := registrationSummaryName(inv.ClassLevel, inv.StudentGender)
		if err := replaceInvoiceItemsWithSingleSummary(db, inv.Invoice, "registration", itemName); err != nil {
			log.Printf("[ReplaceInvoiceItemsWithSummary] Gagal migrate invoice registration %d: %v", inv.ID, err)
			continue
		}
		regReplaced++
	}
	if regReplaced > 0 {
		log.Printf("[ReplaceInvoiceItemsWithSummary] %d invoice registration berhasil diganti ke format summary", regReplaced)
	}

	if initialReplaced == 0 && regReplaced == 0 {
		log.Println("[ReplaceInvoiceItemsWithSummary] Tidak ada invoice yang perlu diganti (mungkin sudah format summary)")
	}
}

// replaceInvoiceItemsWithSingleSummary mengganti semua invoice_items pada satu invoice
// menjadi satu item summary. Berjalan dalam transaksi agar PaymentItem FK tetap valid.
func replaceInvoiceItemsWithSingleSummary(db *gorm.DB, inv model.Invoice, category, itemName string) error {
	return db.Transaction(func(tx *gorm.DB) error {
		// 1. Cek apakah invoice sudah punya 1 item saja (mungkin sudah dimigrasi)
		var count int64
		if err := tx.Model(&model.InvoiceItem{}).Where("invoice_id = ?", inv.ID).Count(&count).Error; err != nil {
			return err
		}
		if count <= 1 {
			// Sudah format summary atau tidak ada item — skip
			return nil
		}

		// 2. Buat item summary baru
		newItem := model.InvoiceItem{
			InvoiceID:   inv.ID,
			Name:        itemName,
			Category:    category,
			Amount:      inv.TotalAmount,
			PaidAmount:  inv.PaidAmount,
			Status:      inv.Status,
			IsMandatory: true,
		}
		if err := tx.Create(&newItem).Error; err != nil {
			return err
		}

		// 3. Arahkan ulang semua PaymentItem ke item summary baru (jika ada payment)
		// PaymentItem mengacu ke InvoiceItem via invoice_item_id
		var oldItemIDs []uint
		if err := tx.Model(&model.InvoiceItem{}).
			Where("invoice_id = ?", inv.ID).
			Pluck("id", &oldItemIDs).Error; err != nil {
			return err
		}

		// Hanya update PaymentItem yang mengacu ke item lama (bukan item baru)
		if len(oldItemIDs) > 0 {
			if err := tx.Model(&model.PaymentItem{}).
				Where("invoice_item_id IN ? AND invoice_item_id != ?", oldItemIDs, newItem.ID).
				Update("invoice_item_id", newItem.ID).Error; err != nil {
				return err
			}
		}

		// 4. Hapus semua invoice_items LAMA (kecuali item baru yang baru dibuat)
		if err := tx.Where("invoice_id = ? AND id != ?", inv.ID, newItem.ID).Delete(&model.InvoiceItem{}).Error; err != nil {
			return err
		}

		return nil
	})
}

// registrationSummaryName mengembalikan nama item summary registrasi berdasarkan level & gender.
func registrationSummaryName(level, gender string) string {
	switch {
	case level == "mutiara" && gender == "L":
		return "Biaya Registrasi Mutiara (Laki-laki)"
	case level == "mutiara" && gender == "P":
		return "Biaya Registrasi Mutiara (Perempuan)"
	case level == "intan" && gender == "L":
		return "Biaya Registrasi Intan (Laki-laki)"
	case level == "intan" && gender == "P":
		return "Biaya Registrasi Intan (Perempuan)"
	case level == "berlian" && gender == "L":
		return "Biaya Registrasi Berlian (Laki-laki)"
	case level == "berlian" && gender == "P":
		return "Biaya Registrasi Berlian (Perempuan)"
	default:
		return "Biaya Registrasi"
	}
}
