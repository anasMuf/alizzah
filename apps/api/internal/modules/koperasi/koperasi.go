// Package koperasi adalah modul Koperasi (Batch 8) dalam layout modular monolith.
//
// Struktur: module -> feature -> layer. Tiap fitur (anggota, barang, pemasok, kas,
// modal, ...) adalah sub-package berisi model/dto/repository/service/handler. File ini
// merangkai antar-fitur, menyuntik middleware auth, dan mendaftarkan route.
//
// Lihat docs/architecture/adr-001-modular-structure.md dan
// docs/koperasi/integration-plan.md.
package koperasi

import (
	"net/http"

	"api/internal/modules/koperasi/anggota"
	"api/internal/modules/koperasi/barang"
	"api/internal/modules/koperasi/kas"
	"api/internal/modules/koperasi/modal"
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
	kas     *kas.Handler
	modal   *modal.Handler
	jwt     echo.MiddlewareFunc
}

// New membangun modul dengan dependency bersama yang diinjeksikan.
func New(deps *shared.Deps) *Module {
	db := deps.DB
	return &Module{
		anggota: anggota.New(db),
		barang:  barang.New(db),
		pemasok: pemasok.New(db),
		kas:     kas.New(db),
		modal:   modal.New(db, kas.NewWriter()),
		jwt:     middleware.JWTAuth(repository.NewTokenBlacklistRepository(db)),
	}
}

// Models mengembalikan seluruh model GORM milik modul untuk dipakai AutoMigrate.
func (m *Module) Models() []any {
	return []any{
		&anggota.Member{},
		&barang.Product{},
		&pemasok.Supplier{},
		&kas.CashTransaction{},
		&modal.CapitalInjection{},
	}
}

// RegisterRoutes mendaftarkan seluruh route modul di bawah grup API (/api/v1).
func (m *Module) RegisterRoutes(api *echo.Group) {
	// Health check publik (penanda modul ter-wire & untuk healthcheck container).
	api.GET("/koperasi/health", m.health)

	// Semua route koperasi wajib JWT.
	g := api.Group("/koperasi", m.jwt)

	// Master data: kelola hanya superadmin & admin_koperasi.
	manage := middleware.RequireRoles("superadmin", "admin_koperasi")
	m.anggota.RegisterRoutes(g, manage)
	m.barang.RegisterRoutes(g, manage)
	m.pemasok.RegisterRoutes(g, manage)

	// Kas (saldo & jurnal): view luas untuk pemangku kepentingan.
	view := middleware.RequireRoles("superadmin", "admin_koperasi", "admin_keuangan", "kepala_sekolah", "yayasan")
	m.kas.RegisterRoutes(g, view)

	// Modal: penyaluran (disburse) oleh keuangan sekolah; lihat oleh koperasi & keuangan.
	disburse := middleware.RequireRoles("superadmin", "admin_keuangan")
	modalView := middleware.RequireRoles("superadmin", "admin_keuangan", "admin_koperasi")
	m.modal.RegisterRoutes(g, disburse, modalView)
}

func (m *Module) health(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]string{
		"module": "koperasi",
		"status": "ok",
	})
}
