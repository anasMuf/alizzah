package seeders

import (
	"api/model"
	"log"
	"strings"

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
			continue
		}

		// Auto-create fee config item (sync seperti extracurricular)
		var fc model.FeeConfig
		if db.Order("created_at DESC").First(&fc).Error == nil {
			slug := strings.ToLower(strings.ReplaceAll(f.Name, " ", "_"))
			itemKey := "facility_" + slug
			var existing int64
			db.Model(&model.FeeConfigItem{}).Where("fee_config_id = ? AND item_key = ?", fc.ID, itemKey).Count(&existing)
			if existing == 0 {
				db.Create(&model.FeeConfigItem{
					FeeConfigID: fc.ID,
					Category:    "facility",
					ItemKey:     itemKey,
					Name:        f.Name,
					Level:       "all",
					Gender:      "all",
					Amount:      15000,
					Unit:        "per_day",
				})
			}
		}
	}

	log.Printf("Seeded %d facilities", len(facilities))
}
