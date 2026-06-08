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

	transactions := []model.IncomeTransaction{
		{
			AcademicYearID:  activeYear.ID,
			Category:        "bos",
			SourceName:      "BOS Reguler Semester 1 TA 2025/2026",
			Amount:          15000000,
			TransactionDate: time.Date(2025, 8, 15, 0, 0, 0, 0, time.UTC),
			ReferenceNumber: "BOS-2025-001",
			Notes:           "Dana BOS reguler dari Kemendikbud semester 1",
			CreatedBy:       admin.ID,
		},
		{
			AcademicYearID:  activeYear.ID,
			Category:        "donasi",
			SourceName:      "Donatur Bpk. Ahmad Hidayat",
			Amount:          5000000,
			TransactionDate: time.Date(2025, 9, 10, 0, 0, 0, 0, time.UTC),
			Notes:           "Donasi untuk renovasi perpustakaan",
			CreatedBy:       admin.ID,
		},
		{
			AcademicYearID:  activeYear.ID,
			Category:        "hibah",
			SourceName:      "Yayasan Pendidikan Desa Sejahtera",
			Amount:          3000000,
			TransactionDate: time.Date(2025, 10, 1, 0, 0, 0, 0, time.UTC),
			ReferenceNumber: "HIB-2025-003",
			Notes:           "Hibah untuk pengadaan alat peraga",
			CreatedBy:       admin.ID,
		},
		{
			AcademicYearID:  activeYear.ID,
			Category:        "bos",
			SourceName:      "BOS Reguler Semester 2 TA 2025/2026",
			Amount:          15000000,
			TransactionDate: time.Date(2026, 1, 20, 0, 0, 0, 0, time.UTC),
			ReferenceNumber: "BOS-2026-001",
			Notes:           "Dana BOS reguler dari Kemendikbud semester 2",
			CreatedBy:       admin.ID,
		},
		{
			AcademicYearID:  activeYear.ID,
			Category:        "lainnya",
			SourceName:      "Hasil Bazaar Sekolah",
			Amount:          2500000,
			TransactionDate: time.Date(2025, 12, 20, 0, 0, 0, 0, time.UTC),
			Notes:           "Hasil penjualan bazaar akhir semester 1",
			CreatedBy:       admin.ID,
		},
	}

	for _, t := range transactions {
		if err := db.Create(&t).Error; err != nil {
			log.Printf("Gagal seed income transaction '%s': %v", t.SourceName, err)
			continue
		}

		// Create corresponding cash_transaction (credit)
		cashTxn := model.CashTransaction{
			AcademicYearID:  t.AcademicYearID,
			TransactionDate: t.TransactionDate,
			TransactionType: "credit",
			Amount:          t.Amount,
			SourceType:      "income",
			SourceID:        &t.ID,
			Description:     categoryLabel(t.Category) + ": " + t.SourceName,
			CreatedBy:       t.CreatedBy,
		}
		if err := db.Create(&cashTxn).Error; err != nil {
			log.Printf("Gagal seed cash transaction for income '%s': %v", t.SourceName, err)
		}
	}

	log.Printf("Seeded %d income transactions", len(transactions))
}

func categoryLabel(cat string) string {
	switch cat {
	case "bos":
		return "Dana BOS"
	case "donasi":
		return "Donasi"
	case "hibah":
		return "Hibah"
	default:
		return "Penerimaan Lainnya"
	}
}
