package barang

import (
	"log"

	"gorm.io/gorm"
)

// MigrateVariants memindahkan data lama ke model varian (B1). Idempotent & aman
// dijalankan tiap start; harus dipanggil SETELAH AutoMigrate (tabel varian & kolom
// variant_id sudah ada).
//
//  1. Tiap barang yang belum punya varian → dibuatkan satu varian "Default" dari
//     kolom legacy (cost_price/sale_price/stock) bila kolom itu masih ada.
//  2. Item penjualan/pembelian lama yang variant_id-nya kosong → diisi varian
//     default barang terkait (+ snapshot nama varian).
func MigrateVariants(db *gorm.DB) {
	migrateDefaultVariants(db)
	dropLegacyProductColumns(db)
	backfillItemVariant(db, "koperasi_sale_items")
	backfillItemVariant(db, "koperasi_purchase_items")
}

// dropLegacyProductColumns membuang kolom harga/stok lama dari koperasi_products
// SETELAH datanya dipindah ke varian. Kolom NOT NULL ini, bila dibiarkan, membuat
// INSERT barang baru gagal (nilai NULL). Idempotent (dijaga HasColumn).
func dropLegacyProductColumns(db *gorm.DB) {
	for _, col := range []string{"cost_price", "sale_price", "stock"} {
		if !db.Migrator().HasColumn(&Product{}, col) {
			continue
		}
		if err := db.Migrator().DropColumn(&Product{}, col); err != nil {
			log.Printf("MigrateVariants: gagal drop kolom legacy %s: %v", col, err)
		} else {
			log.Printf("MigrateVariants: kolom legacy koperasi_products.%s dibuang", col)
		}
	}
}

func migrateDefaultVariants(db *gorm.DB) {
	// Kolom legacy hanya ada di DB lama (sebelum B1); pada install baru tidak ada.
	if !db.Migrator().HasColumn(&Product{}, "cost_price") {
		return
	}
	type legacy struct {
		ID        uint
		CostPrice float64
		SalePrice float64
		Stock     int
	}
	var rows []legacy
	if err := db.Table("koperasi_products").
		Select("id, cost_price, sale_price, stock").
		Where("deleted_at IS NULL").
		Where("id NOT IN (SELECT product_id FROM koperasi_product_variants)").
		Scan(&rows).Error; err != nil {
		log.Printf("MigrateVariants: gagal baca barang legacy: %v", err)
		return
	}
	for _, r := range rows {
		v := Variant{
			ProductID: r.ID,
			Name:      DefaultVariantName,
			CostPrice: r.CostPrice,
			SalePrice: r.SalePrice,
			Stock:     r.Stock,
			IsActive:  true,
		}
		if err := db.Create(&v).Error; err != nil {
			log.Printf("MigrateVariants: gagal buat varian default barang %d: %v", r.ID, err)
		}
	}
	if len(rows) > 0 {
		log.Printf("MigrateVariants: %d barang lama → varian Default", len(rows))
	}
}

func backfillItemVariant(db *gorm.DB, table string) {
	// DISTINCT ON memilih varian default (bernama "Default" diprioritaskan, lalu id
	// terkecil) per barang. Hanya menyentuh baris yang variant_id-nya masih kosong.
	sql := `
UPDATE ` + table + ` it
SET variant_id = sub.vid, variant_name = sub.vname
FROM (
  SELECT DISTINCT ON (product_id) product_id, id AS vid, name AS vname
  FROM koperasi_product_variants
  ORDER BY product_id, (name = 'Default') DESC, id ASC
) sub
WHERE it.product_id = sub.product_id
  AND (it.variant_id IS NULL OR it.variant_id = 0)`
	res := db.Exec(sql)
	if res.Error != nil {
		log.Printf("MigrateVariants: gagal backfill %s: %v", table, res.Error)
		return
	}
	if res.RowsAffected > 0 {
		log.Printf("MigrateVariants: %d baris %s → variant_id default", res.RowsAffected, table)
	}
}
