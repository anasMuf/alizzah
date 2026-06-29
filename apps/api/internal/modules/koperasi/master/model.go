package master

import "api/model"

// Jenis master data koperasi.
const (
	KindCategory = "category"
	KindUnit     = "unit"
)

// MasterData adalah daftar nilai master generik koperasi — saat ini kategori &
// satuan barang — yang menjadi sumber dropdown form barang, menggantikan input
// teks bebas (feedback-01 B2). Dibedakan oleh kolom Kind; unik per (kind, name).
type MasterData struct {
	model.PrimaryKey
	Kind string `gorm:"size:20;not null;uniqueIndex:idx_koperasi_master_kind_name" json:"kind"`
	Name string `gorm:"size:50;not null;uniqueIndex:idx_koperasi_master_kind_name" json:"name"`
	model.BaseModelTimeAt
}

func (MasterData) TableName() string { return "koperasi_master_data" }
