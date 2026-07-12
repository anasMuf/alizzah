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
		{Name: "Aslin (Asah Literasi Numerasi)", Type: "pasta", Levels: "intan,berlian"},
		{Name: "Calisan (Baca Tulis Al Qur'an)", Type: "pasta", Levels: ""},
		{Name: "Robotika", Type: "pasta", Levels: "intan,berlian"},
		{Name: "Sempoa Kids", Type: "pasta", Levels: "intan,berlian"},
		{Name: "Laptop Kids", Type: "pasta", Levels: "intan,berlian"},
		{Name: "Tilawah & Tahfidz Surat Pendek", Type: "pasta", Levels: "intan,berlian"},
		{Name: "Taekwondo", Type: "pasta", Levels: "intan,berlian"},
		{Name: "Menari & Fashion Show", Type: "pasta", Levels: ""},
		{Name: "Melukis & Mewarnai", Type: "pasta", Levels: ""},
		{Name: "Menyanyi", Type: "pasta", Levels: ""},
		{Name: "Musik Keyboard", Type: "pasta", Levels: "intan,berlian"},
	}

	for i := range items {
		if err := db.Create(&items[i]).Error; err != nil {
			log.Printf("Gagal membuat extracurricular '%s': %v", items[i].Name, err)
		}
	}
	log.Printf("Extracurricular seeder berhasil (%d records)", len(items))
}
