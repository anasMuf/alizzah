package penjualan

import (
	"time"

	"api/model"
)

// Sale adalah header penjualan barang ke siswa/wali (atau pembeli umum). Bisa dibayar
// sebagian → sisanya menjadi piutang. student_id opsional (relasi ringan D6).
type Sale struct {
	model.PrimaryKey
	AcademicYearID uint      `gorm:"not null;index" json:"academic_year_id"`
	StudentID      *uint     `gorm:"index" json:"student_id"`
	BuyerName      string    `gorm:"size:100" json:"buyer_name"`
	SaleDate       time.Time `gorm:"type:date;not null" json:"sale_date"`
	TotalAmount    float64   `gorm:"type:decimal(15,2);not null" json:"total_amount"`
	PaidAmount     float64   `gorm:"type:decimal(15,2);not null;default:0" json:"paid_amount"`
	Status         string    `gorm:"size:20;not null;default:unpaid" json:"status"` // unpaid | partial | paid
	Source         string    `gorm:"size:20;not null;default:pos" json:"source"`    // pos | registrasi
	Notes          string    `gorm:"type:text" json:"notes"`
	CreatedBy      uint      `gorm:"not null" json:"created_by"`
	model.BaseModelTimeAt

	Items   []SaleItem     `gorm:"foreignKey:SaleID" json:"items"`
	Student *model.Student `gorm:"foreignKey:StudentID" json:"-"`
	Creator model.User     `gorm:"foreignKey:CreatedBy" json:"-"`
}

func (Sale) TableName() string { return "koperasi_sales" }

// SaleItem adalah baris item penjualan. product_name & unit_cost (HPP) di-snapshot
// saat transaksi agar laba terukur walau harga modal barang berubah kemudian (D5).
type SaleItem struct {
	model.PrimaryKey
	SaleID      uint    `gorm:"not null;index" json:"sale_id"`
	ProductID   uint    `gorm:"not null;index" json:"product_id"`
	ProductName string  `gorm:"size:100;not null" json:"product_name"`
	VariantID   uint    `gorm:"index" json:"variant_id"`
	VariantName string  `gorm:"size:50" json:"variant_name"`
	Quantity    int     `gorm:"not null" json:"quantity"`
	UnitPrice   float64 `gorm:"type:decimal(15,2);not null" json:"unit_price"`
	UnitCost    float64 `gorm:"type:decimal(15,2);not null" json:"unit_cost"`
	Subtotal    float64 `gorm:"type:decimal(15,2);not null" json:"subtotal"`
	model.BaseModelTimeAt
}

func (SaleItem) TableName() string { return "koperasi_sale_items" }
