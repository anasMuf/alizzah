package pembelian

import (
	"time"

	"api/internal/modules/koperasi/pemasok"
	"api/model"
)

// Purchase adalah header pembelian/restock barang dari pemasok. Bisa dibayar
// sebagian → sisanya menjadi hutang (status unpaid/partial/paid).
type Purchase struct {
	model.PrimaryKey
	AcademicYearID  uint      `gorm:"not null;index" json:"academic_year_id"`
	SupplierID      uint      `gorm:"not null;index" json:"supplier_id"`
	PurchaseDate    time.Time `gorm:"type:date;not null" json:"purchase_date"`
	ReferenceNumber string    `gorm:"size:50" json:"reference_number"`
	TotalAmount     float64   `gorm:"type:decimal(15,2);not null" json:"total_amount"`
	PaidAmount      float64   `gorm:"type:decimal(15,2);not null;default:0" json:"paid_amount"`
	Status          string    `gorm:"size:20;not null;default:unpaid" json:"status"` // unpaid | partial | paid
	Notes           string    `gorm:"type:text" json:"notes"`
	CreatedBy       uint      `gorm:"not null" json:"created_by"`
	model.BaseModelTimeAt

	Items    []PurchaseItem   `gorm:"foreignKey:PurchaseID" json:"items"`
	Supplier pemasok.Supplier `gorm:"foreignKey:SupplierID" json:"-"`
	Creator  model.User       `gorm:"foreignKey:CreatedBy" json:"-"`
}

func (Purchase) TableName() string { return "koperasi_purchases" }

// PurchaseItem adalah baris item pembelian. product_name di-snapshot saat transaksi.
type PurchaseItem struct {
	model.PrimaryKey
	PurchaseID  uint    `gorm:"not null;index" json:"purchase_id"`
	ProductID   uint    `gorm:"not null;index" json:"product_id"`
	ProductName string  `gorm:"size:100;not null" json:"product_name"`
	VariantID   uint    `gorm:"index" json:"variant_id"`
	VariantName string  `gorm:"size:50" json:"variant_name"`
	Quantity    int     `gorm:"not null" json:"quantity"`
	UnitPrice   float64 `gorm:"type:decimal(15,2);not null" json:"unit_price"`
	Subtotal    float64 `gorm:"type:decimal(15,2);not null" json:"subtotal"`
	model.BaseModelTimeAt
}

func (PurchaseItem) TableName() string { return "koperasi_purchase_items" }
