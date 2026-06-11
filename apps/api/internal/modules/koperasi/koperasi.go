// Package koperasi adalah modul Koperasi (Batch 8) dalam layout modular monolith.
//
// Struktur: module -> feature -> layer. Tiap fitur (anggota, barang, pemasok, ...)
// adalah sub-package berisi model/dto/repository/service/handler. File ini merangkai
// antar-fitur, menyuntik middleware auth, dan mendaftarkan route.
//
// Lihat docs/architecture/adr-001-modular-structure.md dan
// docs/koperasi/integration-plan.md.
package koperasi

import (
	"net/http"

	"api/internal/modules/koperasi/anggota"
	"api/internal/modules/koperasi/barang"
	"api/internal/modules/koperasi/pemasok"
	"api/internal/shared"
	"api/middleware"
	"api/repository"

	"github.com/labstack/echo/v4"
)

// Module adalah entry point modul Koperasi.
type Module struct {
	anggota *anggota.Handler
	barang  *barang.Handler
	pemasok *pemasok.Handler
	jwt     echo.MiddlewareFunc
}

// New membangun modul dengan dependency bersama yang diinjeksikan.
func New(deps *shared.Deps) *Module {
	db := deps.DB
	return &Module{
		anggota: anggota.New(db),
		barang:  barang.New(db),
		pemasok: pemasok.New(db),
		jwt:     middleware.JWTAuth(repository.NewTokenBlacklistRepository(db)),
	}
}

// Models mengembalikan seluruh model GORM milik modul untuk dipakai AutoMigrate.
func (m *Module) Models() []any {
	return []any{
		&anggota.Member{},
		&barang.Product{},
		&pemasok.Supplier{},
	}
}

// RegisterRoutes mendaftarkan seluruh route modul di bawah grup API (/api/v1).
func (m *Module) RegisterRoutes(api *echo.Group) {
	// Health check publik (penanda modul ter-wire & untuk healthcheck container).
	api.GET("/koperasi/health", m.health)

	// Grup koperasi: wajib JWT; aksi kelola hanya superadmin & admin_koperasi.
	g := api.Group("/koperasi", m.jwt)
	manage := middleware.RequireRoles("superadmin", "admin_koperasi")
	m.anggota.RegisterRoutes(g, manage)
	m.barang.RegisterRoutes(g, manage)
	m.pemasok.RegisterRoutes(g, manage)
}

func (m *Module) health(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]string{
		"module": "koperasi",
		"status": "ok",
	})
}
