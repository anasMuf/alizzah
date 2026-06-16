package barang

import "api/model"

// DefaultVariantName adalah label varian tunggal untuk barang "tanpa varian"
// (semua barang punya ≥1 varian; non-varian = satu varian "Default"). Lihat B1.
const DefaultVariantName = "Default"

// Product adalah barang dagangan koperasi. Harga modal & stok kini berada di level
// VARIAN (lihat Variant); satu barang punya satu atau beberapa varian. Lihat
// feedback-01 B1.
type Product struct {
	model.PrimaryKey
	Name     string `gorm:"size:100;not null" json:"name"`
	Category string `gorm:"size:50" json:"category"`
	Unit     string `gorm:"size:20" json:"unit"`
	IsActive bool   `gorm:"not null;default:true" json:"is_active"`
	model.BaseModelTimeAt

	Variants []Variant `gorm:"foreignKey:ProductID" json:"variants"`
}

func (Product) TableName() string { return "koperasi_products" }

// Variant adalah varian barang (mis. ukuran S/M/L) dengan harga modal, harga jual,
// dan stok masing-masing. Snapshot HPP penjualan mengambil CostPrice varian (D5).
type Variant struct {
	model.PrimaryKey
	ProductID uint    `gorm:"not null;index" json:"product_id"`
	Name      string  `gorm:"size:50;not null" json:"name"`
	CostPrice float64 `gorm:"type:decimal(15,2);not null" json:"cost_price"`
	SalePrice float64 `gorm:"type:decimal(15,2);not null" json:"sale_price"`
	Stock     int     `gorm:"not null;default:0" json:"stock"`
	IsActive  bool    `gorm:"not null;default:true" json:"is_active"`
	model.BaseModelTimeAt
}

func (Variant) TableName() string { return "koperasi_product_variants" }
