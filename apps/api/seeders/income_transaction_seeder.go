package seeders

import (
	"api/model"
	"log"
	"time"

	"gorm.io/gorm"
)

func SeedIncomeTransactions(db *gorm.DB) {
	// Data keuangan sample dimatikan (lihat seedSampleFinance): kas mulai kosong.
	if !seedSampleFinance {
		return
	}

	var count int64
	db.Model(&model.IncomeTransaction{}).Count(&count)
	if count > 0 {
		return
	}

	// Get active academic year
	var activeYear model.AcademicYear
	if err := db.Where("is_active = ?", true).First(&activeYear).Error; err != nil {
		log.Println("Skip seed income transactions: no active academic year")
		return
	}

	// Get superadmin user
	var admin model.User
	if err := db.Where("role = ?", "superadmin").First(&admin).Error; err != nil {
		log.Println("Skip seed income transactions: no superadmin")
		return
	}

	// Resolve income category IDs from code
	resolveCat := func(code string) uint {
		var cat model.IncomeCategory
		if err := db.Where("code = ?", code).First(&cat).Error; err != nil {
			log.Printf("WARNING: income category '%s' not found, fallback to 'lainnya'", code)
			db.Where("code = ?", "lainnya").First(&cat)
		}
		return cat.ID
	}

	catBOS := resolveCat("bos")
	catDonasi := resolveCat("donasi")
	catHibah := resolveCat("hibah")
	catLainnya := resolveCat("lainnya")

	transactions := []struct {
		CategoryID      uint
		SourceName      string
		Amount          float64
		TransactionDate time.Time
		ReferenceNumber string
		Notes           string
		CategoryLabel   string
	}{
		{
			CategoryID:      catBOS,
			SourceName:      "BOS Reguler Semester 1 TA 2025/2026",
			Amount:          15000000,
			TransactionDate: time.Date(2025, 8, 15, 0, 0, 0, 0, time.UTC),
			ReferenceNumber: "BOS-2025-001",
			Notes:           "Dana BOS reguler dari Kemendikbud semester 1",
			CategoryLabel:   "Dana BOS",
		},
		{
			CategoryID:      catDonasi,
			SourceName:      "Donatur Bpk. Ahmad Hidayat",
			Amount:          5000000,
			TransactionDate: time.Date(2025, 9, 10, 0, 0, 0, 0, time.UTC),
			Notes:           "Donasi untuk renovasi perpustakaan",
			CategoryLabel:   "Donasi",
		},
		{
			CategoryID:      catHibah,
			SourceName:      "Yayasan Pendidikan Desa Sejahtera",
			Amount:          3000000,
			TransactionDate: time.Date(2025, 10, 1, 0, 0, 0, 0, time.UTC),
			ReferenceNumber: "HIB-2025-003",
			Notes:           "Hibah untuk pengadaan alat peraga",
			CategoryLabel:   "Hibah",
		},
		{
			CategoryID:      catBOS,
			SourceName:      "BOS Reguler Semester 2 TA 2025/2026",
			Amount:          15000000,
			TransactionDate: time.Date(2026, 1, 20, 0, 0, 0, 0, time.UTC),
			ReferenceNumber: "BOS-2026-001",
			Notes:           "Dana BOS reguler dari Kemendikbud semester 2",
			CategoryLabel:   "Dana BOS",
		},
		{
			CategoryID:      catLainnya,
			SourceName:      "Hasil Bazaar Sekolah",
			Amount:          2500000,
			TransactionDate: time.Date(2025, 12, 20, 0, 0, 0, 0, time.UTC),
			Notes:           "Hasil penjualan bazaar akhir semester 1",
			CategoryLabel:   "Penerimaan Lainnya",
		},
	}

	for _, t := range transactions {
		income := model.IncomeTransaction{
			AcademicYearID:   activeYear.ID,
			IncomeCategoryID: t.CategoryID,
			SourceName:       t.SourceName,
			Amount:           t.Amount,
			TransactionDate:  t.TransactionDate,
			ReferenceNumber:  t.ReferenceNumber,
			Notes:            t.Notes,
			CreatedBy:        admin.ID,
		}
		if err := db.Create(&income).Error; err != nil {
			log.Printf("Gagal seed income transaction '%s': %v", t.SourceName, err)
			continue
		}

		// Create corresponding cash_transaction (credit)
		desc := t.CategoryLabel + ": " + t.SourceName
		cashTxn := model.CashTransaction{
			AcademicYearID:  income.AcademicYearID,
			TransactionDate: income.TransactionDate,
			TransactionType: "credit",
			Amount:          income.Amount,
			SourceType:      "income",
			SourceID:        &income.ID,
			Description:     desc,
			CreatedBy:       income.CreatedBy,
		}
		if err := db.Create(&cashTxn).Error; err != nil {
			log.Printf("Gagal seed cash transaction for income '%s': %v", t.SourceName, err)
		}
	}

	log.Printf("Seeded %d income transactions", len(transactions))
}
