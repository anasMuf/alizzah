package seeders

import (
	"api/model"
	"fmt"
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

	// Bulan tahun ajaran diturunkan dari tahun aktif (otomatis ikut TA aktif)
	months := acadMonthYears(activeYear)
	holidays := nationalHolidays(activeYear)

	var total int
	for _, cg := range classGroups {
		for _, my := range months {
			totalDays, totalMondays := countEffectiveDays(cg.Name, cg.Level, my.Month, my.Year, holidays)

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
func countEffectiveDays(name, level string, month, year int, holidays map[string]bool) (int, int) {
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

// nationalHolidays mengembalikan perkiraan tanggal libur nasional untuk tahun ajaran ay.
// Libur tanggal-tetap (Kemerdekaan, Natal, Tahun Baru, Hari Buruh, Pancasila) diturunkan
// otomatis dari tahun ajaran. Libur lunar/berubah (Maulid, Isra Miraj, Idul Fitri/Adha,
// Imlek, Nyepi, Waisak) bersifat APPROXIMATE — admin menyesuaikan via UI; perbarui daftar
// lunar ini saat berganti tahun ajaran.
func nationalHolidays(ay model.AcademicYear) map[string]bool {
	startY := ay.StartDate.Year()
	endY := ay.EndDate.Year()
	h := map[string]bool{
		// Libur tanggal tetap (otomatis ikut tahun ajaran)
		fmt.Sprintf("%d-08-17", startY): true, // Hari Kemerdekaan
		fmt.Sprintf("%d-12-25", startY): true, // Natal
		fmt.Sprintf("%d-12-26", startY): true, // Cuti bersama Natal
		fmt.Sprintf("%d-01-01", endY):   true, // Tahun Baru Masehi
		fmt.Sprintf("%d-05-01", endY):   true, // Hari Buruh
		fmt.Sprintf("%d-06-01", endY):   true, // Hari Lahir Pancasila
	}
	// Libur lunar/berubah — perkiraan untuk TA 2026/2027 (verifikasi & sesuaikan via UI).
	for _, d := range []string{
		"2026-08-26", // Maulid Nabi (approx)
		"2027-01-15", // Isra Miraj (approx)
		"2027-02-06", // Tahun Baru Imlek (approx)
		"2027-03-09", // Hari Raya Nyepi (approx)
		"2027-03-11", // Idul Fitri 1448H hari ke-1 (approx)
		"2027-03-12", // Idul Fitri 1448H hari ke-2 (approx)
		"2027-03-26", // Wafat Isa Al Masih (approx)
		"2027-05-06", // Kenaikan Isa Al Masih (approx)
		"2027-05-18", // Idul Adha (approx)
		"2027-05-20", // Hari Raya Waisak (approx)
	} {
		h[d] = true
	}
	return h
}
