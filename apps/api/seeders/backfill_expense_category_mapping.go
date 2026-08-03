package seeders

import (
	"api/model"
	"log"

	"gorm.io/gorm"
)

// BackfillExpenseCategoryMapping memastikan semua invoice_category terisi
// dan kategori pengeluaran mencakup seluruh income category fee_config_items.
// Dijalankan setiap startup, idempotent.
func BackfillExpenseCategoryMapping(db *gorm.DB) {
	// 1. Fix invoice_category kosong pada parent yang sudah ada
	type fix struct {
		id               uint
		name             string
		invoice_category string
	}
	fixes := []fix{
		{23, "INFAQ HARIAN", "monthly_infaq"},
		{16, "Lain-lain", "lainnya"},
	}

	for _, f := range fixes {
		result := db.Model(&model.ExpenseCategory{}).
			Where("id = ? AND parent_id IS NULL AND (invoice_category = '' OR invoice_category IS NULL)", f.id).
			Update("invoice_category", f.invoice_category)
		if result.RowsAffected > 0 {
			log.Printf("[BackfillExpCat] Fixed invoice_category '%s' → '%s'", f.name, f.invoice_category)
		}
	}

	// 2. Tambah parent kategori untuk income category yang belum ada
	type newCat struct {
		name             string
		invoice_category string
	}
	newCategories := []newCat{
		{"Daycare", "daycare"},
		{"Pasta & Ekskul", "pasta"},
		{"Tabungan Wajib", "savings_mandatory"},
		{"Wisuda", "graduation"},
		{"Fasilitas", "facility"},
		{"Infaq Harian", "monthly_infaq"},
	}

	for _, nc := range newCategories {
		var existing model.ExpenseCategory
		if err := db.Where("parent_id IS NULL AND invoice_category = ?", nc.invoice_category).First(&existing).Error; err == nil {
			continue // sudah ada
		}

		cat := model.ExpenseCategory{Name: nc.name, InvoiceCategory: nc.invoice_category}
		if err := db.Create(&cat).Error; err != nil {
			log.Printf("[BackfillExpCat] Gagal membuat kategori '%s': %v", nc.name, err)
		} else {
			log.Printf("[BackfillExpCat] Kategori baru dibuat: '%s' (invoice_category=%s)", nc.name, nc.invoice_category)
		}
	}
}
