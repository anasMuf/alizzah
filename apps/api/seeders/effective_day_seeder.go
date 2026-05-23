package seeders

import (
	"api/model"
	"log"
	"time"

	"gorm.io/gorm"
)

func SeedEffectiveDays(db *gorm.DB) {
	var count int64
	db.Model(&model.EffectiveDay{}).Count(&count)
	if count > 0 {
		log.Println("Effective days sudah ada, skip seeder")
		return
	}

	var activeYear model.AcademicYear
	if err := db.Where("is_active = ?", true).First(&activeYear).Error; err != nil {
		log.Println("Gagal cari tahun ajaran aktif untuk effective day seeder:", err)
		return
	}

	var admin model.User
	if err := db.Where("role = ?", "superadmin").First(&admin).Error; err != nil {
		log.Println("Gagal cari superadmin untuk effective day seeder:", err)
		return
	}

	var classGroups []model.ClassGroup
	db.Where("academic_year_id = ?", activeYear.ID).Find(&classGroups)

	// Academic year months: Jul 2025 – May 2026 (11 months)
	type monthYear struct {
		Month int
		Year  int
	}
	months := []monthYear{
		{7, 2025}, {8, 2025}, {9, 2025}, {10, 2025}, {11, 2025}, {12, 2025},
		{1, 2026}, {2, 2026}, {3, 2026}, {4, 2026}, {5, 2026},
	}

	var total int
	for _, cg := range classGroups {
		for _, my := range months {
			totalDays, totalMondays := countEffectiveDays(cg.Name, cg.Level, my.Month, my.Year)

			ed := model.EffectiveDay{
				ClassGroupID:   cg.ID,
				AcademicYearID: activeYear.ID,
				Month:          uint(my.Month),
				Year:           uint(my.Year),
				TotalDays:      uint(totalDays),
				TotalMondays:   uint(totalMondays),
				CreatedBy:      admin.ID,
			}
			if err := db.Create(&ed).Error; err != nil {
				log.Printf("Gagal membuat effective day %s %d/%d: %v", cg.Name, my.Month, my.Year, err)
			} else {
				total++
			}
		}
	}
	log.Printf("Effective day seeder berhasil (%d records)", total)
}

// countEffectiveDays calculates total school days and total Mondays for a given class group type and month.
// Schedule rules:
//   - Mutiara 1,2,3: Sen, Rab, Jum
//   - Mutiara 4,5,6: Sel, Kam, Sab
//   - Intan 1-8: Sen-Sab (6 days/week)
//   - Berlian 1-8: Sen-Sab (6 days/week)
func countEffectiveDays(name, level string, month, year int) (int, int) {
	// Determine which weekdays are school days
	var schoolDays map[time.Weekday]bool

	switch {
	case level == "mutiara" && isMutiara123(name):
		schoolDays = map[time.Weekday]bool{
			time.Monday:    true,
			time.Wednesday: true,
			time.Friday:    true,
		}
	case level == "mutiara" && isMutiara456(name):
		schoolDays = map[time.Weekday]bool{
			time.Tuesday:  true,
			time.Thursday: true,
			time.Saturday: true,
		}
	default: // intan, berlian: Sen-Sab
		schoolDays = map[time.Weekday]bool{
			time.Monday:    true,
			time.Tuesday:   true,
			time.Wednesday: true,
			time.Thursday:  true,
			time.Friday:    true,
			time.Saturday:  true,
		}
	}

	// National holidays (approximate for 2025-2026)
	holidays := nationalHolidays()

	totalDays := 0
	totalMondays := 0

	// Iterate through all days in the month
	start := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	end := start.AddDate(0, 1, 0) // first day of next month

	for d := start; d.Before(end); d = d.AddDate(0, 0, 1) {
		if d.Weekday() == time.Monday {
			totalMondays++
		}

		if schoolDays[d.Weekday()] {
			// Check if it's not a holiday
			dateStr := d.Format("2006-01-02")
			if !holidays[dateStr] {
				totalDays++
			}
		}
	}

	return totalDays, totalMondays
}

func isMutiara123(name string) bool {
	return name == "Mutiara 1" || name == "Mutiara 2" || name == "Mutiara 3"
}

func isMutiara456(name string) bool {
	return name == "Mutiara 4" || name == "Mutiara 5" || name == "Mutiara 6"
}

// nationalHolidays returns a set of national holiday dates for the 2025/2026 academic year.
// These are approximate dates — the school admin can adjust effective days later via the UI.
func nationalHolidays() map[string]bool {
	return map[string]bool{
		// 2025
		"2025-08-17": true, // Hari Kemerdekaan (Minggu - tapi tetap ditandai)
		"2025-09-05": true, // Maulid Nabi
		"2025-10-20": true, // Tahun Baru Islam placeholder
		"2025-12-25": true, // Natal
		"2025-12-26": true, // Cuti bersama

		// 2026
		"2026-01-01": true, // Tahun Baru
		"2026-01-29": true, // Imlek
		"2026-03-20": true, // Isra Miraj (approx)
		"2026-03-21": true, // Nyepi (approx)
		"2026-03-22": true, // Cuti bersama Nyepi
		"2026-04-03": true, // Wafat Isa Al Masih (approx)
		"2026-05-01": true, // Hari Buruh
		"2026-05-14": true, // Kenaikan Isa Al Masih (approx)
		"2026-05-16": true, // Waisak (approx)
	}
}
