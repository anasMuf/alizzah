package seeders

import (
	"api/model"
	"fmt"
	"log"
	"math/rand"
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

	var enrollments []model.StudentEnrollment
	db.Preload("ClassGroup").Preload("Student").
		Where("academic_year_id = ? AND status = ?", activeYear.ID, "active").Find(&enrollments)

	var feeConfig model.FeeConfig
	if err := db.Where("academic_year_id = ?", activeYear.ID).First(&feeConfig).Error; err != nil {
		log.Println("Gagal cari fee config untuk transaction seeder:", err)
		return
	}

	var feeItems []model.FeeConfigItem
	db.Where("fee_config_id = ?", feeConfig.ID).Find(&feeItems)

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

	findFeeItems := func(category, level, gender string) []model.FeeConfigItem {
		var matched []model.FeeConfigItem
		for _, fi := range feeItems {
			if fi.Category == category && (fi.Level == level || fi.Level == "all") && (fi.Gender == gender || fi.Gender == "all") {
				matched = append(matched, fi)
			}
		}
		return matched
	}

	findMandatoryFeeItems := func(level, gender string) []model.FeeConfigItem {
		var matched []model.FeeConfigItem
		for _, fi := range feeItems {
			if fi.IsMandatory && (fi.Level == level || fi.Level == "all") && (fi.Gender == gender || fi.Gender == "all") {
				matched = append(matched, fi)
			}
		}
		return matched
	}

	// === Enroll siswa ke ekskul/pasta (data akademik) ===
	var allExtracurriculars []model.Extracurricular
	db.Find(&allExtracurriculars)

	exByName := make(map[string]model.Extracurricular)
	var pastaList []model.Extracurricular
	for _, ex := range allExtracurriculars {
		exByName[ex.Name] = ex
		if ex.Type == "pasta" {
			pastaList = append(pastaList, ex)
		}
	}

	rng := rand.New(rand.NewSource(42)) // deterministic for reproducibility
	taStartDate := activeYear.StartDate

	var totalSERecords int
	for _, enr := range enrollments {
		level := enr.ClassGroup.Level

		// Wajib: Calisan sesuai jenjang
		if level == "mutiara" {
			if ex, ok := exByName["Calisan KB"]; ok {
				db.Create(&model.StudentExtracurricular{
					StudentID: enr.StudentID, ExtracurricularID: ex.ID,
					AcademicYearID: activeYear.ID, StartDate: taStartDate,
				})
				totalSERecords++
			}
		} else {
			// intan & berlian → Calisan TK
			if ex, ok := exByName["Calisan TK"]; ok {
				db.Create(&model.StudentExtracurricular{
					StudentID: enr.StudentID, ExtracurricularID: ex.ID,
					AcademicYearID: activeYear.ID, StartDate: taStartDate,
				})
				totalSERecords++
			}
		}

		// Wajib: Aslin untuk Berlian
		if level == "berlian" {
			if ex, ok := exByName["Aslin"]; ok {
				db.Create(&model.StudentExtracurricular{
					StudentID: enr.StudentID, ExtracurricularID: ex.ID,
					AcademicYearID: activeYear.ID, StartDate: taStartDate,
				})
				totalSERecords++
			}
		}

		// Opsional: ~40% siswa ikut 1-2 pasta random
		if rng.Float64() < 0.40 && len(pastaList) > 0 {
			numPasta := 1 + rng.Intn(2) // 1 atau 2 pasta
			perm := rng.Perm(len(pastaList))
			for i := 0; i < numPasta && i < len(perm); i++ {
				pasta := pastaList[perm[i]]
				db.Create(&model.StudentExtracurricular{
					StudentID: enr.StudentID, ExtracurricularID: pasta.ID,
					AcademicYearID: activeYear.ID, StartDate: taStartDate,
				})
				totalSERecords++
			}
		}
	}
	log.Printf("  → %d student extracurricular enrollments", totalSERecords)

	// === Tagihan Biaya Awal (initial) — siswa baru & mutasi ===
	var totalInitial, totalRegistration int
	for _, enr := range enrollments {
		level := enr.ClassGroup.Level
		gender := enr.Student.Gender

		// Biaya Awal: hanya untuk siswa baru (enrollment_type = "new") dan mutasi (enrollment_type = "mutation")
		if enr.EnrollmentType == "new" || enr.EnrollmentType == "mutation" {
			initialItems := findFeeItems("initial", level, gender)
			if len(initialItems) > 0 {
				var totalAmount float64
				var invoiceItems []model.InvoiceItem
				for _, fi := range initialItems {
					totalAmount += fi.Amount
					invoiceItems = append(invoiceItems, model.InvoiceItem{
						Name:        fi.Name,
						Category:    "initial",
						Amount:      fi.Amount,
						IsMandatory: true,
					})
				}

				invoice := model.Invoice{
					StudentID:      enr.StudentID,
					AcademicYearID: activeYear.ID,
					Type:           "initial",
					Status:         "unpaid",
					TotalAmount:    totalAmount,
				}
				if err := db.Create(&invoice).Error; err == nil {
					for i := range invoiceItems {
						invoiceItems[i].InvoiceID = invoice.ID
						db.Create(&invoiceItems[i])
					}
					totalInitial++
				}
			}
		}

		// Registrasi Tahunan: semua siswa aktif
		regItems := findFeeItems("registration", level, gender)
		if len(regItems) > 0 {
			var totalAmount float64
			var invoiceItems []model.InvoiceItem
			for _, fi := range regItems {
				totalAmount += fi.Amount
				invoiceItems = append(invoiceItems, model.InvoiceItem{
					Name:        fi.Name,
					Category:    "registration",
					Amount:      fi.Amount,
					IsMandatory: true,
				})
			}

			invoice := model.Invoice{
				StudentID:      enr.StudentID,
				AcademicYearID: activeYear.ID,
				Type:           "registration",
				Status:         "unpaid",
				TotalAmount:    totalAmount,
			}
			if err := db.Create(&invoice).Error; err == nil {
				for i := range invoiceItems {
					invoiceItems[i].InvoiceID = invoice.ID
					db.Create(&invoiceItems[i])
				}
				totalRegistration++
			}
		}
	}
	log.Printf("  → %d tagihan biaya awal, %d tagihan registrasi", totalInitial, totalRegistration)

	// All months in TA: Juli 2025 – Juni 2026
	type targetMonth struct {
		Month   uint
		Year    uint
		DueDay  int
		DueMon  time.Month
		DueYear int
	}
	targetMonths := []targetMonth{
		{7, 2025, 10, time.August, 2025},
		{8, 2025, 10, time.September, 2025},
		{9, 2025, 10, time.October, 2025},
		{10, 2025, 10, time.November, 2025},
		{11, 2025, 10, time.December, 2025},
		{12, 2025, 10, time.January, 2026},
		{1, 2026, 10, time.February, 2026},
		{2, 2026, 10, time.March, 2026},
		{3, 2026, 10, time.April, 2026},
		{4, 2026, 10, time.May, 2026},
		{5, 2026, 10, time.June, 2026},
		{6, 2026, 10, time.June, 2026}, // Juni: due date akhir bulan
	}

	// Load effective days
	var allEds []model.EffectiveDay
	db.Where("academic_year_id = ?", activeYear.ID).Find(&allEds)
	edMap := make(map[string]model.EffectiveDay)
	for _, ed := range allEds {
		key := fmt.Sprintf("%d-%d-%d", ed.ClassGroupID, ed.Month, ed.Year)
		edMap[key] = ed
	}

	// Load active daycare enrollments
	var daycareEnrollments []model.DaycareEnrollment
	db.Where("academic_year_id = ? AND status = 'active'", activeYear.ID).Find(&daycareEnrollments)
	daycareByStudent := make(map[uint]*model.DaycareEnrollment)
	for i := range daycareEnrollments {
		daycareByStudent[daycareEnrollments[i].StudentID] = &daycareEnrollments[i]
	}

	// Daycare package → fee item_key mapping
	daycarePackageToItemKey := map[string]string{
		"monthly_kb":         "daycare_spd_kb",
		"monthly_tk":         "daycare_spd_tk",
		"monthly_package_kb": "daycare_paket_kb",
		"monthly_package_tk": "daycare_paket_tk",
	}

	var totalInvoices, totalPayments, totalExpenses int

	// === Generate Invoices for all months ===
	for _, tm := range targetMonths {
		for _, enr := range enrollments {
			level := enr.ClassGroup.Level

			edKey := fmt.Sprintf("%d-%d-%d", enr.ClassGroupID, tm.Month, tm.Year)
			ed, hasEd := edMap[edKey]

			sppKey := "spp_kb"
			if level == "intan" || level == "berlian" {
				sppKey = "spp_tk"
			}

			sppAmount := findFee("monthly_spp", sppKey, level)

			var infaqTotal float64
			var infaqDays uint
			infaqPerDay := findFee("monthly_infaq", "infaq_harian", level)
			if hasEd {
				infaqDays = ed.TotalDays
				infaqTotal = infaqPerDay * float64(infaqDays)
			}

			totalAmount := sppAmount + infaqTotal

			var items []model.InvoiceItem
			items = append(items, model.InvoiceItem{
				Name:        fmt.Sprintf("SPP %s", monthName(int(tm.Month))),
				Category:    "monthly_spp",
				Amount:      sppAmount,
				IsMandatory: true,
			})

			infaqNotes := ""
			if !hasEd {
				infaqNotes = "Menunggu input hari efektif"
			}
			items = append(items, model.InvoiceItem{
				Name:        fmt.Sprintf("Infaq Harian %s (%d hari)", monthName(int(tm.Month)), infaqDays),
				Category:    "monthly_infaq",
				Amount:      infaqTotal,
				IsMandatory: true,
				Notes:       infaqNotes,
			})

			// Item wajib otomatis (is_mandatory=true di fee config): Calisan, Aslin, dll
			mandatoryExtras := findMandatoryFeeItems(level, enr.Student.Gender)
			for _, mi := range mandatoryExtras {
				totalAmount += mi.Amount
				items = append(items, model.InvoiceItem{
					Name:        mi.Name,
					Category:    mi.Category,
					Amount:      mi.Amount,
					IsMandatory: true,
				})
			}

			// Berlian: tabungan wajib
			if level == "berlian" && hasEd {
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

			// Daycare: add monthly item if student has active daycare
			if de, ok := daycareByStudent[enr.StudentID]; ok {
				monthDate := time.Date(int(tm.Year), time.Month(tm.Month), 1, 0, 0, 0, 0, time.UTC)
				if !monthDate.Before(de.StartDate) {
					if itemKey, mapped := daycarePackageToItemKey[de.PackageType]; mapped {
						daycareAmount := findFee("daycare", itemKey, "all")
						if daycareAmount > 0 {
							totalAmount += daycareAmount
							items = append(items, model.InvoiceItem{
								Name:        findFeeName("daycare", itemKey, feeItems),
								Category:    "daycare",
								Amount:      daycareAmount,
								IsMandatory: true,
							})
						}
					}
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

	// === Payments: biaya awal & registrasi (mayoritas lunas) ===
	payInitialAndReg := func(invoiceType string, payRate float64, payBaseDate time.Time) {
		var invoices []model.Invoice
		db.Preload("Items").
			Where("academic_year_id = ? AND type = ? AND status = 'unpaid'", activeYear.ID, invoiceType).
			Find(&invoices)

		payCount := int(float64(len(invoices)) * payRate)
		rng.Shuffle(len(invoices), func(i, j int) {
			invoices[i], invoices[j] = invoices[j], invoices[i]
		})

		for idx := 0; idx < payCount && idx < len(invoices); idx++ {
			inv := invoices[idx]
			payDay := payBaseDate.Day() + (int(inv.StudentID) % 14)
			if payDay > 28 {
				payDay = 28
			}
			paymentDate := time.Date(payBaseDate.Year(), payBaseDate.Month(), payDay, 0, 0, 0, 0, time.UTC)

			payment := model.Payment{
				StudentID:      inv.StudentID,
				AcademicYearID: activeYear.ID,
				PaymentDate:    paymentDate,
				TotalAmount:    inv.TotalAmount,
				Source:         "cash",
				CreatedBy:      admin.ID,
			}
			if err := db.Create(&payment).Error; err != nil {
				continue
			}

			for _, item := range inv.Items {
				db.Create(&model.PaymentItem{PaymentID: payment.ID, InvoiceItemID: item.ID, Amount: item.Amount})
				db.Model(&item).Updates(map[string]interface{}{"paid_amount": item.Amount, "status": "paid"})
			}
			db.Model(&inv).Updates(map[string]interface{}{"paid_amount": inv.TotalAmount, "status": "paid"})

			db.Create(&model.CashTransaction{
				AcademicYearID:  activeYear.ID,
				TransactionDate: paymentDate,
				TransactionType: "credit",
				Amount:          payment.TotalAmount,
				SourceType:      "payment",
				SourceID:        &payment.ID,
				Description:     fmt.Sprintf("Pembayaran %s - %s", invoiceType, studentNameByID(db, inv.StudentID)),
				CreatedBy:       admin.ID,
			})
			totalPayments++
		}
	}

	// Biaya awal: 85% lunas (dibayar sekitar Juli 2025)
	payInitialAndReg("initial", 0.85, time.Date(2025, time.July, 5, 0, 0, 0, 0, time.UTC))
	// Registrasi: 75% lunas (dibayar sekitar Juli-Agustus 2025, bisa dicicil sisanya)
	payInitialAndReg("registration", 0.75, time.Date(2025, time.July, 10, 0, 0, 0, 0, time.UTC))

	// === Payments: tagihan bulanan (distribusi realistis) ===
	// Bulan lama → lebih banyak lunas, bulan baru → lebih sedikit
	paymentMonths := []struct {
		Month      uint
		Year       uint
		PayRate    float64 // 0.0 - 1.0 percentage of students who pay
		PayMonth   time.Month
		PayYear    int
		DayOffset  int // base payment day in the month
	}{
		{7, 2025, 0.90, time.July, 2025, 15},
		{8, 2025, 0.85, time.August, 2025, 15},
		{9, 2025, 0.80, time.September, 2025, 15},
		{10, 2025, 0.75, time.October, 2025, 15},
		{11, 2025, 0.70, time.November, 2025, 15},
		{12, 2025, 0.65, time.December, 2025, 15},
		{1, 2026, 0.60, time.January, 2026, 15},
		{2, 2026, 0.55, time.February, 2026, 15},
		{3, 2026, 0.45, time.March, 2026, 15},
		{4, 2026, 0.35, time.April, 2026, 15},
		{5, 2026, 0.20, time.May, 2026, 15},
		// Juni 2026: belum ada yang bayar (bulan berjalan)
	}

	for _, pm := range paymentMonths {
		var invoices []model.Invoice
		db.Preload("Items").
			Where("academic_year_id = ? AND month = ? AND year = ? AND type = 'monthly' AND status = 'unpaid'",
				activeYear.ID, pm.Month, pm.Year).
			Find(&invoices)

		payCount := int(float64(len(invoices)) * pm.PayRate)

		// Shuffle deterministically then pick first payCount
		rng.Shuffle(len(invoices), func(i, j int) {
			invoices[i], invoices[j] = invoices[j], invoices[i]
		})

		for idx := 0; idx < payCount && idx < len(invoices); idx++ {
			inv := invoices[idx]
			payDay := pm.DayOffset + (int(inv.StudentID) % 14)
			if payDay > 28 {
				payDay = 28
			}
			paymentDate := time.Date(pm.PayYear, pm.PayMonth, payDay, 0, 0, 0, 0, time.UTC)

			payment := model.Payment{
				StudentID:      inv.StudentID,
				AcademicYearID: activeYear.ID,
				PaymentDate:    paymentDate,
				TotalAmount:    inv.TotalAmount,
				Source:         "cash",
				CreatedBy:      admin.ID,
			}
			if err := db.Create(&payment).Error; err != nil {
				continue
			}

			for _, item := range inv.Items {
				pi := model.PaymentItem{
					PaymentID:     payment.ID,
					InvoiceItemID: item.ID,
					Amount:        item.Amount,
				}
				db.Create(&pi)
				db.Model(&item).Updates(map[string]interface{}{
					"paid_amount": item.Amount,
					"status":      "paid",
				})
			}

			db.Model(&inv).Updates(map[string]interface{}{
				"paid_amount": inv.TotalAmount,
				"status":      "paid",
			})

			cashTxn := model.CashTransaction{
				AcademicYearID:  activeYear.ID,
				TransactionDate: paymentDate,
				TransactionType: "credit",
				Amount:          payment.TotalAmount,
				SourceType:      "payment",
				SourceID:        &payment.ID,
				Description:     fmt.Sprintf("Pembayaran tagihan %s %d - %s", monthName(int(pm.Month)), pm.Year, studentNameByID(db, inv.StudentID)),
				CreatedBy:       admin.ID,
			}
			db.Create(&cashTxn)

			totalPayments++
		}
	}

	// === Expenses: spread across 12 months ===
	var expCategories []model.ExpenseCategory
	db.Where("parent_id IS NOT NULL").Find(&expCategories)

	monthlyExpenses := []struct {
		Month    time.Month
		Year     int
		Expenses []struct {
			Description string
			Amount      float64
			Day         int
			CatIndex    int
		}
	}{
		{time.July, 2025, []struct {
			Description string; Amount float64; Day int; CatIndex int
		}{
			{"Pembelian ATK kantor", 350000, 3, 0},
			{"Bayar listrik bulan Juli", 1500000, 5, 1},
			{"Honor guru les tambahan", 2000000, 10, 2},
		}},
		{time.August, 2025, []struct {
			Description string; Amount float64; Day int; CatIndex int
		}{
			{"Bayar listrik bulan Agustus", 1450000, 5, 1},
			{"Pembelian alat kebersihan", 275000, 8, 0},
			{"Dekorasi HUT RI", 500000, 12, 0},
		}},
		{time.September, 2025, []struct {
			Description string; Amount float64; Day int; CatIndex int
		}{
			{"Bayar listrik bulan September", 1400000, 5, 1},
			{"Bayar air PDAM", 450000, 5, 1},
			{"Cetak rapor siswa", 600000, 18, 0},
		}},
		{time.October, 2025, []struct {
			Description string; Amount float64; Day int; CatIndex int
		}{
			{"Bayar listrik bulan Oktober", 1500000, 5, 1},
			{"Pembelian toner printer", 350000, 10, 0},
			{"Perbaikan AC ruang guru", 800000, 14, 1},
		}},
		{time.November, 2025, []struct {
			Description string; Amount float64; Day int; CatIndex int
		}{
			{"Bayar listrik bulan November", 1350000, 5, 1},
			{"Pembelian buku perpustakaan", 1200000, 12, 0},
			{"Biaya perjalanan dinas", 500000, 20, 1},
		}},
		{time.December, 2025, []struct {
			Description string; Amount float64; Day int; CatIndex int
		}{
			{"Bayar listrik bulan Desember", 1300000, 5, 1},
			{"Hampers akhir tahun guru", 750000, 10, 2},
			{"Perlengkapan acara Natal", 400000, 15, 0},
		}},
		{time.January, 2026, []struct {
			Description string; Amount float64; Day int; CatIndex int
		}{
			{"Bayar listrik bulan Januari", 1400000, 5, 1},
			{"Bayar air PDAM semester 2", 450000, 5, 1},
			{"Pembelian ATK semester 2", 400000, 8, 0},
		}},
		{time.February, 2026, []struct {
			Description string; Amount float64; Day int; CatIndex int
		}{
			{"Bayar listrik bulan Februari", 1350000, 5, 1},
			{"Pembelian cat tembok kelas", 900000, 12, 1},
		}},
		{time.March, 2026, []struct {
			Description string; Amount float64; Day int; CatIndex int
		}{
			{"Bayar listrik bulan Maret", 1400000, 5, 1},
			{"Biaya field trip mutiara", 1500000, 18, 0},
			{"Konsumsi rapat wali murid", 350000, 20, 0},
		}},
		{time.April, 2026, []struct {
			Description string; Amount float64; Day int; CatIndex int
		}{
			{"Bayar listrik bulan April", 1450000, 5, 1},
			{"Pembelian alat olahraga", 650000, 10, 0},
			{"Honor panitia UTS", 1000000, 15, 2},
		}},
		{time.May, 2026, []struct {
			Description string; Amount float64; Day int; CatIndex int
		}{
			{"Bayar listrik bulan Mei", 1400000, 5, 1},
			{"Persiapan wisuda berlian", 2500000, 12, 0},
			{"Pembelian piala dan sertifikat", 750000, 18, 0},
		}},
		{time.June, 2026, []struct {
			Description string; Amount float64; Day int; CatIndex int
		}{
			{"Bayar listrik bulan Juni", 1300000, 5, 1},
			{"Biaya acara wisuda", 3000000, 10, 0},
		}},
	}

	for _, me := range monthlyExpenses {
		for _, se := range me.Expenses {
			catIdx := se.CatIndex
			if catIdx >= len(expCategories) {
				catIdx = 0
			}

			expenseDate := time.Date(me.Year, me.Month, se.Day, 0, 0, 0, 0, time.UTC)
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

func findFeeName(category, itemKey string, feeItems []model.FeeConfigItem) string {
	for _, fi := range feeItems {
		if fi.Category == category && fi.ItemKey == itemKey {
			return fi.Name
		}
	}
	return itemKey
}
