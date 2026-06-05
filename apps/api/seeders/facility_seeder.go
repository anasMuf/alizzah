package seeders

import (
	"api/model"
	"log"

	"gorm.io/gorm"
)

func SeedFacilities(db *gorm.DB) {
	var count int64
	db.Model(&model.Facility{}).Count(&count)
	if count > 0 {
		return
	}

	facilities := []model.Facility{
		{Name: "Antar Jemput", Description: "Fasilitas antar jemput siswa dari/ke rumah", IsActive: true},
	}

	for _, f := range facilities {
		if err := db.Create(&f).Error; err != nil {
			log.Printf("Gagal seed facility '%s': %v", f.Name, err)
		}
	}

	log.Printf("Seeded %d facilities", len(facilities))
}
