// Package shared menampung dependency lintas-modul yang dipakai bersama oleh
// modul-modul di internal/modules (mis. base model, ledger writer, provider
// tahun ajaran). Lihat docs/architecture/adr-001-modular-structure.md.
package shared

import "gorm.io/gorm"

// Deps adalah kumpulan dependency bersama yang diinjeksikan ke setiap modul
// lewat konstruktornya (New(deps)). Untuk sekarang hanya berisi *gorm.DB;
// pada Fase 1/2 ledger writer & academic year provider dipindahkan ke sini.
type Deps struct {
	DB *gorm.DB
}

// New membangun Deps bersama dari koneksi database.
func New(db *gorm.DB) *Deps {
	return &Deps{DB: db}
}
