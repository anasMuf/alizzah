package barang

import "api/model"

// Product adalah barang dagangan koperasi. Harga modal (CostPrice) diisi manual
// (lihat ADR koperasi D5); stok dikelola oleh transaksi pembelian/penjualan (8c).
type Product struct {
	model.PrimaryKey
	Name      string  `gorm:"size:100;not null" json:"name"`
	Category  string  `gorm:"size:50" json:"category"`
	Unit      string  `gorm:"size:20" json:"unit"`
	CostPrice float64 `gorm:"type:decimal(15,2);not null" json:"cost_price"`
	SalePrice float64 `gorm:"type:decimal(15,2);not null" json:"sale_price"`
	Stock     int     `gorm:"not null;default:0" json:"stock"`
	IsActive  bool    `gorm:"not null;default:true" json:"is_active"`
	model.BaseModelTimeAt
}

func (Product) TableName() string { return "koperasi_products" }
