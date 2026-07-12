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
	if !seedSampleTransactions {
		log.Println("Sample transactions disabled (seedSampleTransactions=false), skip")
		return
	}

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

	// === Enroll siswa ke pasta ===
	var allExtracurriculars []model.Extracurricular
	db.Find(&allExtracurriculars)

	exByName := make(map[string]model.Extracurricular)
	var pastaAllLevel []model.Extracurricular
	for _, ex := range allExtracurriculars {
		exByName[ex.Name] = ex
		if ex.Type == "pasta" && ex.Levels == "" {
			pastaAllLevel = append(pastaAllLevel, ex)
		}
	}

	rng := rand.New(rand.NewSource(42))
	taStartDate := activeYear.StartDate

	var totalSERecords int
	for _, enr := range enrollments {
		level := enr.ClassGroup.Level

		// Wajib: Aslin untuk Intan & Berlian
		if level == "intan" || level == "berlian" {
			if ex, ok := exByName["Aslin (Asah Literasi Numerasi)"]; ok {
				db.Create(&model.StudentExtracurricular{
					StudentID: enr.StudentID, ExtracurricularID: ex.ID,
					AcademicYearID: activeYear.ID, StartDate: taStartDate,
				})
				totalSERecords++
			}
		}

		// Opsional: ~40% siswa ikut 1-2 pasta random (all-level, sesuai jenjang)
		if rng.Float64() < 0.40 && len(pastaAllLevel) > 0 {
			numPasta := 1 + rng.Intn(2)
			perm := rng.Perm(len(pastaAllLevel))
			for i := 0; i < numPasta && i < len(perm); i++ {
				pasta := pastaAllLevel[perm[i]]
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
						Name:              fi.Name,
						Category:          "initial",
						Amount:            fi.Amount,
						IsMandatory:       true,
						IsKoperasi:        fi.IsKoperasi,
						KoperasiProductID: fi.KoperasiProductID,
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
					Name:              fi.Name,
					Category:          "registration",
					Amount:            fi.Amount,
					IsMandatory:       true,
					IsKoperasi:        fi.IsKoperasi,
					KoperasiProductID: fi.KoperasiProductID,
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

	// Bulan tahun ajaran diturunkan dari tahun aktif; jatuh tempo = tanggal 10 bulan berikutnya.
	type targetMonth struct {
		Month uint
		Year  uint
		Due   time.Time
	}
	var targetMonths []targetMonth
	for _, my := range acadMonthYears(activeYear) {
		due := time.Date(my.Year, time.Month(my.Month), 1, 0, 0, 0, 0, time.UTC).AddDate(0, 1, 9)
		targetMonths = append(targetMonths, targetMonth{Month: uint(my.Month), Year: uint(my.Year), Due: due})
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
			// Semester: sem1 (Jul-Des), sem2 (Jan-Jun)
			sppSem := "_sem1"
			if tm.Month >= 1 && tm.Month <= 6 {
				sppSem = "_sem2"
			}
			sppAmount := findFee("monthly_spp", sppKey+sppSem, level)
			if sppAmount == 0 {
				// Fallback: item tanpa suffix semester (format lama)
				sppAmount = findFee("monthly_spp", sppKey, level)
			}

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
			infaqUnitPrice := infaqPerDay
			items = append(items, model.InvoiceItem{
				Name:        fmt.Sprintf("Infaq Harian %s (%d hari)", monthName(int(tm.Month)), infaqDays),
				Category:    "monthly_infaq",
				Amount:      infaqTotal,
				Quantity:    &infaqDays,
				UnitPrice:   &infaqUnitPrice,
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
				tabUnitPrice := findFee("savings_mandatory", "tabungan_wajib", level)
				tabAmount := tabUnitPrice * float64(ed.TotalMondays)
				if tabAmount > 0 {
					totalAmount += tabAmount
					tabMondays := ed.TotalMondays
					items = append(items, model.InvoiceItem{
						Name:        fmt.Sprintf("Tabungan Wajib %s (%d Senin)", monthName(int(tm.Month)), ed.TotalMondays),
						Category:    "savings_mandatory",
						Amount:      tabAmount,
						Quantity:    &tabMondays,
						UnitPrice:   &tabUnitPrice,
						IsMandatory: true,
					})
				}
			}

			// Daycare: add monthly SPD for active daycare enrollments (Premium only, flat SPD)
			if de, ok := daycareByStudent[enr.StudentID]; ok && de.Category == "premium" {
				monthDate := time.Date(int(tm.Year), time.Month(tm.Month), 1, 0, 0, 0, 0, time.UTC)
				if !monthDate.Before(de.StartDate) {
					slug := fmt.Sprintf("%s%s", string(de.TimeSlot[0:2]), string(de.TimeSlot[3:5]))
					spdKey := fmt.Sprintf("daycare_premium_%s_%s_spd", slug, de.AgeGroup)
					if spdAmount := findFee("daycare", spdKey, "all"); spdAmount > 0 {
						totalAmount += spdAmount
						items = append(items, model.InvoiceItem{
							Name:        findFeeName("daycare", spdKey, feeItems),
							Category:    "daycare",
							Amount:      spdAmount,
							IsMandatory: true,
						})
					}
					// Meal & TPQ: dari attendance, tidak di-seed di sini
				}
			}

			dueDate := tm.Due
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

	// Data keuangan sample (pembayaran & pengeluaran) — dibuat hanya jika seedSampleFinance=true.
	// Jika false: semua tagihan di atas tetap berstatus unpaid dan saldo kas mulai dari 0.
	if seedSampleFinance {
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

		// Biaya awal & registrasi dibayar sekitar awal tahun ajaran (diturunkan dari tahun aktif)
		startY, startMon := activeYear.StartDate.Year(), activeYear.StartDate.Month()
		// Biaya awal: 85% lunas
		payInitialAndReg("initial", 0.85, time.Date(startY, startMon, 5, 0, 0, 0, 0, time.UTC))
		// Registrasi: 75% lunas (sisanya bisa dicicil)
		payInitialAndReg("registration", 0.75, time.Date(startY, startMon, 10, 0, 0, 0, 0, time.UTC))

		// === Payments: tagihan bulanan (distribusi realistis) ===
		// Bulan lama → lebih banyak lunas, bulan baru → lebih sedikit
		// Rasio lunas per bulan (urut dari bulan pertama TA): bulan lama lebih banyak lunas.
		// Bulan terakhir (mis. Juni) sengaja dilewati = "bulan berjalan". Bulan/tahun diturunkan
		// dari tahun aktif sehingga otomatis mengikuti TA.
		type paymentMonth struct {
			Month     uint
			Year      uint
			PayRate   float64 // 0.0 - 1.0 percentage of students who pay
			PayMonth  time.Month
			PayYear   int
			DayOffset int // base payment day in the month
		}
		var paymentMonths []paymentMonth
		{
			payRates := []float64{0.90, 0.85, 0.80, 0.75, 0.70, 0.65, 0.60, 0.55, 0.45, 0.35, 0.20}
			acadMonths := acadMonthYears(activeYear)
			for i, rate := range payRates {
				if i >= len(acadMonths) {
					break
				}
				my := acadMonths[i]
				paymentMonths = append(paymentMonths, paymentMonth{
					Month: uint(my.Month), Year: uint(my.Year), PayRate: rate,
					PayMonth: time.Month(my.Month), PayYear: my.Year, DayOffset: 15,
				})
			}
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

		// Tahun tiap bulan diturunkan dari tahun aktif (lihat yearForMonth) — tanpa hardcode tahun.
		monthlyExpenses := []struct {
			Month    time.Month
			Expenses []struct {
				Description string
				Amount      float64
				Day         int
				CatIndex    int
			}
		}{
			{time.July, []struct {
				Description string
				Amount      float64
				Day         int
				CatIndex    int
			}{
				{"Pembelian ATK kantor", 350000, 3, 0},
				{"Bayar listrik bulan Juli", 1500000, 5, 1},
				{"Honor guru les tambahan", 2000000, 10, 2},
			}},
			{time.August, []struct {
				Description string
				Amount      float64
				Day         int
				CatIndex    int
			}{
				{"Bayar listrik bulan Agustus", 1450000, 5, 1},
				{"Pembelian alat kebersihan", 275000, 8, 0},
				{"Dekorasi HUT RI", 500000, 12, 0},
			}},
			{time.September, []struct {
				Description string
				Amount      float64
				Day         int
				CatIndex    int
			}{
				{"Bayar listrik bulan September", 1400000, 5, 1},
				{"Bayar air PDAM", 450000, 5, 1},
				{"Cetak rapor siswa", 600000, 18, 0},
			}},
			{time.October, []struct {
				Description string
				Amount      float64
				Day         int
				CatIndex    int
			}{
				{"Bayar listrik bulan Oktober", 1500000, 5, 1},
				{"Pembelian toner printer", 350000, 10, 0},
				{"Perbaikan AC ruang guru", 800000, 14, 1},
			}},
			{time.November, []struct {
				Description string
				Amount      float64
				Day         int
				CatIndex    int
			}{
				{"Bayar listrik bulan November", 1350000, 5, 1},
				{"Pembelian buku perpustakaan", 1200000, 12, 0},
				{"Biaya perjalanan dinas", 500000, 20, 1},
			}},
			{time.December, []struct {
				Description string
				Amount      float64
				Day         int
				CatIndex    int
			}{
				{"Bayar listrik bulan Desember", 1300000, 5, 1},
				{"Hampers akhir tahun guru", 750000, 10, 2},
				{"Perlengkapan acara Natal", 400000, 15, 0},
			}},
			{time.January, []struct {
				Description string
				Amount      float64
				Day         int
				CatIndex    int
			}{
				{"Bayar listrik bulan Januari", 1400000, 5, 1},
				{"Bayar air PDAM semester 2", 450000, 5, 1},
				{"Pembelian ATK semester 2", 400000, 8, 0},
			}},
			{time.February, []struct {
				Description string
				Amount      float64
				Day         int
				CatIndex    int
			}{
				{"Bayar listrik bulan Februari", 1350000, 5, 1},
				{"Pembelian cat tembok kelas", 900000, 12, 1},
			}},
			{time.March, []struct {
				Description string
				Amount      float64
				Day         int
				CatIndex    int
			}{
				{"Bayar listrik bulan Maret", 1400000, 5, 1},
				{"Biaya field trip mutiara", 1500000, 18, 0},
				{"Konsumsi rapat wali murid", 350000, 20, 0},
			}},
			{time.April, []struct {
				Description string
				Amount      float64
				Day         int
				CatIndex    int
			}{
				{"Bayar listrik bulan April", 1450000, 5, 1},
				{"Pembelian alat olahraga", 650000, 10, 0},
				{"Honor panitia UTS", 1000000, 15, 2},
			}},
			{time.May, []struct {
				Description string
				Amount      float64
				Day         int
				CatIndex    int
			}{
				{"Bayar listrik bulan Mei", 1400000, 5, 1},
				{"Persiapan wisuda berlian", 2500000, 12, 0},
				{"Pembelian piala dan sertifikat", 750000, 18, 0},
			}},
			{time.June, []struct {
				Description string
				Amount      float64
				Day         int
				CatIndex    int
			}{
				{"Bayar listrik bulan Juni", 1300000, 5, 1},
				{"Biaya acara wisuda", 3000000, 10, 0},
			}},
		}

		for _, me := range monthlyExpenses {
			meYear := yearForMonth(activeYear, int(me.Month))
			for _, se := range me.Expenses {
				catIdx := se.CatIndex
				if catIdx >= len(expCategories) {
					catIdx = 0
				}

				expenseDate := time.Date(meYear, me.Month, se.Day, 0, 0, 0, 0, time.UTC)
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
	} // end if seedSampleFinance

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
