package seeders

import (
	"api/model"
	"log"
	"time"

	"gorm.io/gorm"
)

func SeedAcademicYears(db *gorm.DB) {
	var count int64
	db.Model(&model.AcademicYear{}).Count(&count)
	if count > 0 {
		log.Println("Academic years sudah ada, skip seeder")
		return
	}

	years := []model.AcademicYear{
		{
			Name:      "2024/2025",
			StartDate: time.Date(2024, 7, 15, 0, 0, 0, 0, time.UTC),
			EndDate:   time.Date(2025, 6, 30, 0, 0, 0, 0, time.UTC),
			IsActive:  false,
		},
		{
			Name:      "2025/2026",
			StartDate: time.Date(2025, 7, 14, 0, 0, 0, 0, time.UTC),
			EndDate:   time.Date(2026, 6, 30, 0, 0, 0, 0, time.UTC),
			IsActive:  true,
		},
		{
			Name:      "2026/2027",
			StartDate: time.Date(2026, 7, 13, 0, 0, 0, 0, time.UTC),
			EndDate:   time.Date(2027, 6, 30, 0, 0, 0, 0, time.UTC),
			IsActive:  false,
		},
	}

	for i := range years {
		if err := db.Create(&years[i]).Error; err != nil {
			log.Printf("Gagal membuat tahun ajaran '%s': %v", years[i].Name, err)
		}
	}
	log.Println("Academic year seeder berhasil (3 tahun ajaran)")
}
