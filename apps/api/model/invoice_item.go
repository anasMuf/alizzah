package model

type InvoiceItem struct {
	PrimaryKey
	InvoiceID         uint     `gorm:"not null;index"`
	Name              string   `gorm:"size:100;not null"`
	Category          string   `gorm:"size:30;not null"`
	Amount            float64  `gorm:"type:decimal(15,2);not null"`
	PaidAmount        float64  `gorm:"type:decimal(15,2);not null;default:0"`
	Status            string   `gorm:"size:20;not null;default:unpaid"` // unpaid | partial | paid
	IsMandatory       bool     `gorm:"default:true"`
	Quantity          *uint    `gorm:""`                   // jumlah hari/senin (nil = item fixed/flat)
	UnitPrice         *float64 `gorm:"type:decimal(15,2)"` // harga satuan per hari/senin (nil = item fixed/flat)
	Notes             string   `gorm:"type:text"`
	IsKoperasi        bool     `gorm:"not null;default:false"` // denormalisasi dari fee_config_item
	KoperasiProductID *uint    `gorm:""`                       // diturunkan dari fee_config_item
	KoperasiVariantID *uint    `gorm:""`                       // dipilih per siswa saat generate/edit invoice
	FacilityID        *uint    `gorm:"index"`                  // fasilitas asal item (kategori facility); nil = legacy
	BaseModelTimeAt

	Invoice Invoice `gorm:"foreignKey:InvoiceID"`
}

func (InvoiceItem) TableName() string {
	return "invoice_items"
}
