package seeders

import (
	"api/model"
	"log"

	"gorm.io/gorm"
)

var defaultExpenseCategories = []struct {
	Name     string
	Children []string
}{
	{"Biaya Awal", []string{"Infaq Sarpras", "Infaq APE", "Biaya Psikotes IQ", "Koperasi"}},
	{"Biaya Registrasi", []string{"Biaya MPLS", "Buku PK Karakter", "Alat Belajar", "Iuran Kegiatan Kecamatan/Kabupaten", "Administrasi LPP", "Kalender", "Koperasi"}},
	{"SPP", []string{"Gaji Guru"}},
}

func SeedExpenseCategories(db *gorm.DB) {
	var count int64
	db.Model(&model.ExpenseCategory{}).Count(&count)
	if count > 0 {
		log.Println("Expense categories sudah ada, skip seeder")
		return
	}

	for _, cat := range defaultExpenseCategories {
		parent := model.ExpenseCategory{Name: cat.Name}
		if err := db.Create(&parent).Error; err != nil {
			log.Printf("Gagal membuat kategori '%s': %v", cat.Name, err)
			continue
		}
		for _, childName := range cat.Children {
			child := model.ExpenseCategory{Name: childName, ParentID: &parent.ID}
			if err := db.Create(&child).Error; err != nil {
				log.Printf("Gagal membuat sub-kategori '%s': %v", childName, err)
			}
		}
	}
	log.Println("Expense categories seeder berhasil")
}
