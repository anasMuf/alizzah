package model

// Setting menyimpan key-value untuk konfigurasi aplikasi (logo, ttd, dll).
type Setting struct {
	Key   string `gorm:"size:100;primaryKey" json:"key"`
	Value string `gorm:"type:text" json:"value"`
	BaseModelTimeAt
}

func (Setting) TableName() string {
	return "settings"
}
