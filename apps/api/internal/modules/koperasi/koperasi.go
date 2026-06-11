// Package koperasi adalah modul Koperasi (Batch 8) dalam layout modular monolith.
//
// Struktur target: module -> feature -> layer. Setiap fitur (anggota, barang,
// penjualan, pembelian, pinjaman, kas, modal, laporan) menjadi sub-package
// tersendiri berisi handler/service/repository/model/dto. File ini adalah root
// modul yang merangkai antar-fitur dan mendaftarkan route.
//
// Lihat docs/architecture/adr-001-modular-structure.md dan
// docs/koperasi/integration-plan.md.
package koperasi

import (
	"net/http"

	"api/internal/shared"

	"github.com/labstack/echo/v4"
)

// Module adalah entry point modul Koperasi.
type Module struct {
	deps *shared.Deps
}

// New membangun modul dengan dependency bersama yang diinjeksikan.
func New(deps *shared.Deps) *Module {
	return &Module{deps: deps}
}

// Models mengembalikan seluruh model GORM milik modul untuk dipakai AutoMigrate
// di main.go. Masih kosong — diisi bertahap mulai sub-batch 8a (anggota, barang, ...).
func (m *Module) Models() []any {
	return []any{}
}

// RegisterRoutes mendaftarkan seluruh route modul di bawah grup API yang diberikan
// (mis. /api/v1). Tiap fitur akan menyumbang route-nya di sini saat diimplementasikan.
func (m *Module) RegisterRoutes(api *echo.Group) {
	g := api.Group("/koperasi")

	// Health check modul — penanda bahwa modul ter-wire dengan benar.
	g.GET("/health", m.health)
}

func (m *Module) health(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]string{
		"module": "koperasi",
		"status": "ok",
	})
}
