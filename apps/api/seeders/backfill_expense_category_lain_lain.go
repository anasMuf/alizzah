package seeders

import (
	"api/model"
	"log"

	"gorm.io/gorm"
)

// BackfillExpenseCategoryLainLain memastikan kategori "Lain-lain" beserta
// sub-kategorinya tersedia di database. Untuk deployment yang sudah memiliki
// data kategori tetapi belum memiliki "Lain-lain".
func BackfillExpenseCategoryLainLain(db *gorm.DB) {
	var existing model.ExpenseCategory
	if err := db.Where("name = ? AND parent_id IS NULL", "Lain-lain").First(&existing).Error; err == nil {
		log.Println("[BackfillLainLain] Kategori Lain-lain sudah ada, skip")
		return
	}

	lainLain := model.ExpenseCategory{Name: "Lain-lain", InvoiceCategory: "lainnya"}
	if err := db.Create(&lainLain).Error; err != nil {
		log.Printf("[BackfillLainLain] Gagal membuat kategori Lain-lain: %v", err)
		return
	}

	subCategories := []string{"ATK", "Transportasi", "Listrik & Air", "Internet & Telepon", "Pemeliharaan", "Lain-lain"}
	for _, name := range subCategories {
		child := model.ExpenseCategory{Name: name, ParentID: &lainLain.ID}
		if err := db.Create(&child).Error; err != nil {
			log.Printf("[BackfillLainLain] Gagal membuat sub-kategori '%s': %v", name, err)
		}
	}

	log.Println("[BackfillLainLain] Kategori Lain-lain beserta sub-kategori berhasil dibuat")
}
