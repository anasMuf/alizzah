// Package guru mengelola data karyawan (guru honorer) beserta lampiran komponen
// HR (fungsional, tugas tambahan, penanggung jawab, lain-lain). Data ini menjadi
// dasar kalkulasi gaji — lihat package penggajian.
package guru

import (
	"time"

	"api/internal/modules/sdm/master"
	"api/model"
)

// Employee — data karyawan (menggantikan tabel `guru` lama). `LegacyID`
// menyimpan `id_guru` dari database lama untuk referensi & migrasi.
type Employee struct {
	model.PrimaryKey
	LegacyID    *int       `gorm:"uniqueIndex" json:"legacy_id"`
	Nama        string     `gorm:"size:100;not null" json:"nama"`
	TglMasuk    *time.Time `gorm:"type:date" json:"tgl_masuk"`
	GolonganID  *uint      `gorm:"index" json:"golongan_id"`
	Sertifikasi bool       `gorm:"not null;default:false" json:"sertifikasi"`
	Impasing    bool       `gorm:"not null;default:false" json:"impasing"`
	IsActive    bool       `gorm:"not null;default:true" json:"is_active"`
	model.BaseModelTimeAt

	Golongan *master.Golongan `gorm:"foreignKey:GolonganID" json:"golongan,omitempty"`
}

func (Employee) TableName() string { return "sdm_employees" }

// FungsionalDetail — lampiran jabatan fungsional ke karyawan (many-to-many).
type FungsionalDetail struct {
	model.PrimaryKey
	FungsionalID uint `gorm:"not null;index;uniqueIndex:uq_fungsional_guru" json:"fungsional_id"`
	EmployeeID   uint `gorm:"not null;index;uniqueIndex:uq_fungsional_guru" json:"employee_id"`
	model.BaseModelTimeAt

	Fungsional *master.Fungsional `gorm:"foreignKey:FungsionalID" json:"fungsional,omitempty"`
}

func (FungsionalDetail) TableName() string { return "sdm_fungsional_detail" }

// TugasTambahanDetail — lampiran bidang tugas tambahan; nominal diisi per-guru.
type TugasTambahanDetail struct {
	model.PrimaryKey
	TugasTambahanID uint `gorm:"not null;index;uniqueIndex:uq_tugas_tambahan_guru" json:"tugas_tambahan_id"`
	EmployeeID      uint `gorm:"not null;index;uniqueIndex:uq_tugas_tambahan_guru" json:"employee_id"`
	Nilai           int  `gorm:"not null;default:0" json:"nilai"`
	model.BaseModelTimeAt

	TugasTambahan *master.TugasTambahan `gorm:"foreignKey:TugasTambahanID" json:"tugas_tambahan,omitempty"`
}

func (TugasTambahanDetail) TableName() string { return "sdm_tugas_tambahan_detail" }

// PenanggungJawabDetail — lampiran peran penanggung jawab ke karyawan.
type PenanggungJawabDetail struct {
	model.PrimaryKey
	PenanggungJawabID uint `gorm:"not null;index;uniqueIndex:uq_pj_guru" json:"penanggung_jawab_id"`
	EmployeeID        uint `gorm:"not null;index;uniqueIndex:uq_pj_guru" json:"employee_id"`
	model.BaseModelTimeAt

	PenanggungJawab *master.PenanggungJawab `gorm:"foreignKey:PenanggungJawabID" json:"penanggung_jawab,omitempty"`
}

func (PenanggungJawabDetail) TableName() string { return "sdm_penanggung_jawab_detail" }

// LainlainDetail — lampiran lain-lain; nominal disimpan saat pemasangan
// (mengikuti pola lama yang nominalnya bervariasi per guru).
type LainlainDetail struct {
	model.PrimaryKey
	LainlainID uint `gorm:"not null;index;uniqueIndex:uq_lainlain_guru" json:"lainlain_id"`
	EmployeeID uint `gorm:"not null;index;uniqueIndex:uq_lainlain_guru" json:"employee_id"`
	Nilai      int  `gorm:"not null;default:0" json:"nilai"`
	model.BaseModelTimeAt

	Lainlain *master.Lainlain `gorm:"foreignKey:LainlainID" json:"lainlain,omitempty"`
}

func (LainlainDetail) TableName() string { return "sdm_lainlain_detail" }
