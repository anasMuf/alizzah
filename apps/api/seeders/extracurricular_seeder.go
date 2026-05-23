package seeders

import (
	"api/model"
	"log"

	"gorm.io/gorm"
)

func SeedExtracurriculars(db *gorm.DB) {
	var count int64
	db.Model(&model.Extracurricular{}).Count(&count)
	if count > 0 {
		log.Println("Extracurriculars sudah ada, skip seeder")
		return
	}

	items := []model.Extracurricular{
		{Name: "Robotika", Type: "pasta"},
		{Name: "Sempoa Kids", Type: "pasta"},
		{Name: "Tilawah", Type: "pasta"},
		{Name: "Laptop Kids", Type: "pasta"},
		{Name: "Taekwondo", Type: "pasta"},
		{Name: "Tari", Type: "pasta"},
		{Name: "Melukis", Type: "pasta"},
		{Name: "Menyanyi", Type: "pasta"},
		{Name: "Calisan KB", Type: "calisan"},
		{Name: "Calisan TK", Type: "calisan"},
		{Name: "Aslin", Type: "ekskul"},
	}

	for i := range items {
		if err := db.Create(&items[i]).Error; err != nil {
			log.Printf("Gagal membuat extracurricular '%s': %v", items[i].Name, err)
		}
	}
	log.Println("Extracurricular seeder berhasil (11 records)")
}
