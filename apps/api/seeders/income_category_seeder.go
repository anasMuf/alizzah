package seeders

import (
	"api/model"
	"log"

	"gorm.io/gorm"
)

// SeedIncomeCategories memastikan 4 kategori penerimaan default ada di database.
// Dijalankan setiap startup, idempotent (skip jika code sudah ada).
func SeedIncomeCategories(db *gorm.DB) {
	categories := []struct {
		Code string
		Name string
	}{
		{Code: "bos", Name: "Dana BOS"},
		{Code: "donasi", Name: "Donasi"},
		{Code: "hibah", Name: "Hibah"},
		{Code: "lainnya", Name: "Lainnya"},
	}

	for _, c := range categories {
		var existing model.IncomeCategory
		if err := db.Where("code = ?", c.Code).First(&existing).Error; err == nil {
			continue // sudah ada
		}

		cat := model.IncomeCategory{Code: c.Code, Name: c.Name}
		if err := db.Create(&cat).Error; err != nil {
			log.Printf("[SeedIncomeCat] Gagal membuat kategori '%s': %v", c.Code, err)
		} else {
			log.Printf("[SeedIncomeCat] Kategori dibuat: %s (%s)", c.Name, c.Code)
		}
	}
}

// BackfillIncomeCategoryFK memigrasi data income_transactions dari kolom category (string)
// ke income_category_id (FK). Dijalankan setiap startup, idempotent.
// Note: pre-migration di main.go menangani initial setup. Fungsi ini hanya fallback.
func BackfillIncomeCategoryFK(db *gorm.DB) {
	// Cek apakah kolom 'category' lama masih ada
	if !db.Migrator().HasColumn(&model.IncomeTransaction{}, "category") {
		return // sudah di-migrasi oleh pre-migration
	}

	// Kolom category masih ada — artinya pre-migration belum jalan (misal first run tanpa data)
	// Tidak perlu backfill karena tidak ada data. Cukup drop kolom.
	log.Println("[BackfillIncomeCat] Drop kolom 'category' yang tersisa")
	if err := db.Migrator().DropColumn(&model.IncomeTransaction{}, "category"); err != nil {
		log.Printf("[BackfillIncomeCat] Gagal drop kolom category: %v", err)
	}
}
