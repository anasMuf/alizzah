package pemasok

import "api/model"

// Supplier adalah pemasok barang koperasi (pihak luar sekolah).
type Supplier struct {
	model.PrimaryKey
	Name          string `gorm:"size:100;not null" json:"name"`
	ContactPerson string `gorm:"size:100" json:"contact_person"`
	Phone         string `gorm:"size:20" json:"phone"`
	Address       string `gorm:"type:text" json:"address"`
	model.BaseModelTimeAt
}

func (Supplier) TableName() string { return "koperasi_suppliers" }
