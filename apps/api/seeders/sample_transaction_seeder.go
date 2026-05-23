package seeders

import (
	"api/model"
	"fmt"
	"log"
	"time"

	"gorm.io/gorm"
)

func SeedSampleTransactions(db *gorm.DB) {
	var count int64
	db.Model(&model.Invoice{}).Count(&count)
	if count > 0 {
		log.Println("Invoices sudah ada, skip sample transaction seeder")
		return
	}

	var activeYear model.AcademicYear
	if err := db.Where("is_active = ?", true).First(&activeYear).Error; err != nil {
		log.Println("Gagal cari tahun ajaran aktif untuk transaction seeder:", err)
		return
	}

	var admin model.User
	if err := db.Where("role = ?", "superadmin").First(&admin).Error; err != nil {
		log.Println("Gagal cari superadmin untuk transaction seeder:", err)
		return
	}

	// Load all enrollments with class group info
	var enrollments []model.StudentEnrollment
	db.Preload("ClassGroup").Where("academic_year_id = ? AND status = ?", activeYear.ID, "active").Find(&enrollments)

	// Load fee config
	var feeConfig model.FeeConfig
	if err := db.Where("academic_year_id = ?", activeYear.ID).First(&feeConfig).Error; err != nil {
		log.Println("Gagal cari fee config untuk transaction seeder:", err)
		return
	}

	// Load fee config items indexed by category+level
	var feeItems []model.FeeConfigItem
	db.Where("fee_config_id = ?", feeConfig.ID).Find(&feeItems)

	// Helper to find fee amount
	findFee := func(category, itemKey, level string) float64 {
		for _, fi := range feeItems {
			if fi.Category == category && fi.ItemKey == itemKey {
				if fi.Level == level || fi.Level == "all" {
					return fi.Amount
				}
			}
		}
		return 0
	}

	// Generate invoices for Juli & Agustus 2025
	targetMonths := []struct {
		Month   uint
		Year    uint
		DueDay  int
		DueMon  time.Month
		DueYear int
	}{
		{7, 2025, 10, time.August, 2025},
		{8, 2025, 10, time.September, 2025},
	}

	var totalInvoices, totalPayments, totalExpenses int

	for _, tm := range targetMonths {
		// Get effective days for this month (we need per class group)
		edMap := make(map[uint]model.EffectiveDay)
		var eds []model.EffectiveDay
		db.Where("academic_year_id = ? AND month = ? AND year = ?", activeYear.ID, tm.Month, tm.Year).Find(&eds)
		for _, ed := range eds {
			edMap[ed.ClassGroupID] = ed
		}

		for _, enr := range enrollments {
			ed, ok := edMap[enr.ClassGroupID]
			if !ok {
				continue
			}

			level := enr.ClassGroup.Level
			sppKey := "spp_kb"
			if level == "intan" || level == "berlian" {
				sppKey = "spp_tk"
			}

			sppAmount := findFee("monthly_spp", sppKey, level)
			infaqPerDay := findFee("monthly_infaq", "infaq_harian", level)
			infaqTotal := infaqPerDay * float64(ed.TotalDays)

			totalAmount := sppAmount + infaqTotal

			// Build invoice items
			var items []model.InvoiceItem
			items = append(items, model.InvoiceItem{
				Name:        fmt.Sprintf("SPP %s", monthName(int(tm.Month))),
				Category:    "monthly_spp",
				Amount:      sppAmount,
				IsMandatory: true,
			})
			items = append(items, model.InvoiceItem{
				Name:        fmt.Sprintf("Infaq Harian %s (%d hari)", monthName(int(tm.Month)), ed.TotalDays),
				Category:    "monthly_infaq",
				Amount:      infaqTotal,
				IsMandatory: true,
			})

			// Berlian: add tabungan wajib
			if level == "berlian" {
				tabAmount := findFee("savings_mandatory", "tabungan_wajib", level) * float64(ed.TotalMondays)
				if tabAmount > 0 {
					totalAmount += tabAmount
					items = append(items, model.InvoiceItem{
						Name:        fmt.Sprintf("Tabungan Wajib %s (%d Senin)", monthName(int(tm.Month)), ed.TotalMondays),
						Category:    "savings_mandatory",
						Amount:      tabAmount,
						IsMandatory: true,
					})
				}
			}

			dueDate := time.Date(tm.DueYear, tm.DueMon, tm.DueDay, 0, 0, 0, 0, time.UTC)
			invoice := model.Invoice{
				StudentID:      enr.StudentID,
				AcademicYearID: activeYear.ID,
				Type:           "monthly",
				Month:          &tm.Month,
				Year:           &tm.Year,
				Status:         "unpaid",
				TotalAmount:    totalAmount,
				PaidAmount:     0,
				DueDate:        &dueDate,
			}

			if err := db.Create(&invoice).Error; err != nil {
				log.Printf("Gagal membuat invoice siswa ID %d bulan %d: %v", enr.StudentID, tm.Month, err)
				continue
			}

			for i := range items {
				items[i].InvoiceID = invoice.ID
				if err := db.Create(&items[i]).Error; err != nil {
					log.Printf("Gagal membuat invoice item: %v", err)
				}
			}
			totalInvoices++
		}
	}

	// === Sample Payments (50 payments spread across Juli invoices) ===
	var juliInvoices []model.Invoice
	juliMonth := uint(7)
	db.Preload("Items").Where("academic_year_id = ? AND month = ? AND year = ? AND status = ?",
		activeYear.ID, juliMonth, 2025, "unpaid").
		Limit(50).Find(&juliInvoices)

	for _, inv := range juliInvoices {
		paymentDate := time.Date(2025, time.July, 15+(int(inv.StudentID)%15), 0, 0, 0, 0, time.UTC)

		payment := model.Payment{
			StudentID:      inv.StudentID,
			AcademicYearID: activeYear.ID,
			PaymentDate:    paymentDate,
			TotalAmount:    inv.TotalAmount,
			Source:         "cash",
			CreatedBy:      admin.ID,
		}
		if err := db.Create(&payment).Error; err != nil {
			log.Printf("Gagal membuat payment: %v", err)
			continue
		}

		// Create payment items for each invoice item
		for _, item := range inv.Items {
			pi := model.PaymentItem{
				PaymentID:     payment.ID,
				InvoiceItemID: item.ID,
				Amount:        item.Amount,
			}
			if err := db.Create(&pi).Error; err != nil {
				log.Printf("Gagal membuat payment item: %v", err)
			}

			// Update invoice item paid
			db.Model(&item).Updates(map[string]interface{}{
				"paid_amount": item.Amount,
				"status":      "paid",
			})
		}

		// Update invoice status
		db.Model(&inv).Updates(map[string]interface{}{
			"paid_amount": inv.TotalAmount,
			"status":      "paid",
		})

		// Create cash transaction (credit)
		cashTxn := model.CashTransaction{
			AcademicYearID:  activeYear.ID,
			TransactionDate: paymentDate,
			TransactionType: "credit",
			Amount:          payment.TotalAmount,
			SourceType:      "payment",
			SourceID:        &payment.ID,
			Description:     fmt.Sprintf("Pembayaran tagihan Juli 2025 - %s", studentNameByID(db, inv.StudentID)),
			CreatedBy:       admin.ID,
		}
		db.Create(&cashTxn)

		totalPayments++
	}

	// === Sample Expenses (10 expenses) ===
	// Find sub-categories for expenses
	var expCategories []model.ExpenseCategory
	db.Where("parent_id IS NOT NULL").Find(&expCategories)

	sampleExpenses := []struct {
		Description string
		Amount      float64
		DateOffset  int // days from July 1st
		CatIndex    int // index into expCategories
	}{
		{"Pembelian ATK kantor", 350000, 3, 0},
		{"Bayar listrik bulan Juli", 1500000, 5, 1},
		{"Pembelian alat kebersihan", 275000, 8, 0},
		{"Honor guru les tambahan", 2000000, 10, 2},
		{"Perbaikan AC ruang guru", 800000, 14, 1},
		{"Cetak rapor siswa", 600000, 18, 0},
		{"Pembelian buku perpustakaan", 1200000, 22, 0},
		{"Biaya perjalanan dinas", 500000, 25, 1},
		{"Bayar air PDAM bulan Juli", 450000, 5, 1},
		{"Pembelian toner printer", 350000, 28, 0},
	}

	for _, se := range sampleExpenses {
		catIdx := se.CatIndex
		if catIdx >= len(expCategories) {
			catIdx = 0
		}

		expenseDate := time.Date(2025, time.July, 1+se.DateOffset, 0, 0, 0, 0, time.UTC)
		expense := model.Expense{
			AcademicYearID:    activeYear.ID,
			ExpenseCategoryID: expCategories[catIdx].ID,
			ExpenseDate:       expenseDate,
			Amount:            se.Amount,
			Description:       se.Description,
			CreatedBy:         admin.ID,
		}
		if err := db.Create(&expense).Error; err != nil {
			log.Printf("Gagal membuat expense: %v", err)
			continue
		}

		// Create cash transaction (debit)
		cashTxn := model.CashTransaction{
			AcademicYearID:  activeYear.ID,
			TransactionDate: expenseDate,
			TransactionType: "debit",
			Amount:          se.Amount,
			SourceType:      "expense",
			SourceID:        &expense.ID,
			Description:     se.Description,
			CreatedBy:       admin.ID,
		}
		db.Create(&cashTxn)

		totalExpenses++
	}

	log.Printf("Sample transaction seeder berhasil (%d invoices, %d payments, %d expenses)", totalInvoices, totalPayments, totalExpenses)
}

func monthName(m int) string {
	names := map[int]string{
		1: "Januari", 2: "Februari", 3: "Maret", 4: "April",
		5: "Mei", 6: "Juni", 7: "Juli", 8: "Agustus",
		9: "September", 10: "Oktober", 11: "November", 12: "Desember",
	}
	return names[m]
}

func studentNameByID(db *gorm.DB, id uint) string {
	var s model.Student
	if err := db.Select("full_name").First(&s, id).Error; err != nil {
		return fmt.Sprintf("Siswa #%d", id)
	}
	return s.FullName
}
