// Package master berisi seluruh data master HR: golongan gaji pokok, tarif
// kehadiran, kedisiplinan, fungsional, tugas tambahan, penanggung jawab, dan
// lain-lain. Master adalah fondasi kalkulasi gaji (lihat package penggajian).
//
// Desain memperbaiki aplikasi lama: kedisiplinan memakai `kode` stabil
// (siaga/terlambat/piket/pulang_awal) alih-alih id yang dikode keras; lainlain
// memakai AUTO_INCREMENT dengan nama unik (nominal per pemasangan di detail).
package master

import (
	"api/model"
)

// Golongan — gaji pokok berdasarkan masa pengabdian (tabel `pokok` lama).
type Golongan struct {
	model.PrimaryKey
	Kode       string `gorm:"size:1;not null;uniqueIndex" json:"kode"` // A–F
	FromDay    *int   `gorm:"index" json:"from_day"`
	ToDay      *int   `gorm:"index" json:"to_day"`
	Keterangan string `gorm:"size:120" json:"keterangan"`
	Nilai      int    `gorm:"not null" json:"nilai"`
	model.BaseModelTimeAt
}

func (Golongan) TableName() string { return "sdm_golongan" }

// TarifKehadiran — konfigurasi nominal per hari hadir (single-row config).
type TarifKehadiran struct {
	model.PrimaryKey
	NilaiPerHari int `gorm:"not null" json:"nilai_per_hari"`
	model.BaseModelTimeAt
}

func (TarifKehadiran) TableName() string { return "sdm_tarif_kehadiran" }

// Kedisiplinan — item kedisiplinan dengan `kode` stabil. Hanya `siaga` dan
// `piket` yang dipakai dalam kalkulasi; `terlambat` & `pulang_awal` menjadi
// pemicu bonus (lihat service penggajian).
type Kedisiplinan struct {
	model.PrimaryKey
	Kode  string `gorm:"size:20;not null;uniqueIndex" json:"kode"` // siaga | terlambat | piket | pulang_awal
	Nama  string `gorm:"size:50;not null" json:"nama"`
	Nilai int    `gorm:"not null" json:"nilai"`
	model.BaseModelTimeAt
}

func (Kedisiplinan) TableName() string { return "sdm_kedisiplinan" }

// Fungsional — jabatan fungsional dengan nominal tetap per bulan.
type Fungsional struct {
	model.PrimaryKey
	Nama  string `gorm:"size:50;not null" json:"nama"`
	Nilai int    `gorm:"not null" json:"nilai"`
	model.BaseModelTimeAt
}

func (Fungsional) TableName() string { return "sdm_fungsional" }

// TugasTambahan — bidang tugas tambahan. Nominal diisi per-guru di detail.
type TugasTambahan struct {
	model.PrimaryKey
	Nama string `gorm:"size:50;not null" json:"nama"`
	model.BaseModelTimeAt
}

func (TugasTambahan) TableName() string { return "sdm_tugas_tambahan" }

// PenanggungJawab — peran penanggung jawab dengan nominal tetap per bulan.
type PenanggungJawab struct {
	model.PrimaryKey
	Nama  string `gorm:"size:50;not null" json:"nama"`
	Nilai int    `gorm:"not null" json:"nilai"`
	model.BaseModelTimeAt
}

func (PenanggungJawab) TableName() string { return "sdm_penanggung_jawab" }

// Lainlain — item pendapatan tambahan. Dibuat on-the-fly saat dilampirkan ke
// karyawan; nama unik (normalisasi dari 1.643 baris duplikat di sistem lama).
type Lainlain struct {
	model.PrimaryKey
	Nama string `gorm:"size:80;not null;uniqueIndex" json:"nama"`
	model.BaseModelTimeAt
}

func (Lainlain) TableName() string { return "sdm_lainlain" }
