// Package sdm adalah modul SDM/HR — Penggajian (rewrite dari Aplikasi
// Penggajian Al-Izzah lama). Struktur mengikuti modular monolith yang sama
// dengan koperasi: module -> feature -> layer.
//
// Fitur: master HR (golongan, kehadiran, kedisiplinan, fungsional, tugas
// tambahan, penanggung jawab, lain-lain), data karyawan (guru) + lampiran HR,
// absensi per periode, pinjaman, dan kalkulasi penggajian bulanan.
//
// Lihat docs/sdm/plan.md dan docs/old/penggajian/docs/.
package sdm

import (
	"net/http"

	"api/internal/modules/sdm/absen"
	"api/internal/modules/sdm/guru"
	"api/internal/modules/sdm/master"
	"api/internal/modules/sdm/penggajian"
	"api/internal/modules/sdm/pinjam"
	"api/internal/shared"
	"api/middleware"
	"api/repository"

	"github.com/labstack/echo/v4"
)

// Module adalah entry point modul SDM.
type Module struct {
	master     *master.Handler
	guru       *guru.Handler
	absen      *absen.Handler
	pinjam     *pinjam.Handler
	penggajian *penggajian.Handler
	jwt        echo.MiddlewareFunc
	guard      *middleware.ModuleGuard
}

// New membangun modul dengan dependency bersama yang diinjeksikan.
func New(deps *shared.Deps) *Module {
	db := deps.DB
	masterRepo := master.NewRepository(db)

	return &Module{
		master:     master.New(db),
		guru:       guru.New(db, masterRepo),
		absen:      absen.New(db),
		pinjam:     pinjam.New(db),
		penggajian: penggajian.New(db),
		jwt:        middleware.JWTAuth(repository.NewTokenBlacklistRepository(db)),
		guard:      middleware.NewModuleGuard(repository.NewUserModuleRepository(db)),
	}
}

// Models mengembalikan seluruh model GORM milik modul untuk AutoMigrate.
func (m *Module) Models() []any {
	return []any{
		&master.Golongan{}, &master.TarifKehadiran{}, &master.Kedisiplinan{},
		&master.Fungsional{}, &master.TugasTambahan{}, &master.PenanggungJawab{},
		&master.Lainlain{},
		&guru.Employee{}, &guru.FungsionalDetail{}, &guru.TugasTambahanDetail{},
		&guru.PenanggungJawabDetail{}, &guru.LainlainDetail{},
		&absen.Absen{},
		&pinjam.Pinjam{}, &pinjam.PinjamDetail{},
		&penggajian.PayrollPeriode{}, &penggajian.PayrollDetail{},
	}
}

// RegisterRoutes mendaftarkan seluruh route modul di bawah grup API (/api/v1).
func (m *Module) RegisterRoutes(api *echo.Group) {
	api.GET("/sdm/health", m.health)

	// Semua route SDM wajib JWT + modul sdm (superadmin bypass).
	g := api.Group("/sdm", m.jwt)
	manage := m.guard.RequireModule(middleware.ModuleSDM)
	m.master.RegisterRoutes(g, manage)
	m.guru.RegisterRoutes(g, manage)
	m.absen.RegisterRoutes(g, manage)
	m.pinjam.RegisterRoutes(g, manage)
	m.penggajian.RegisterRoutes(g, manage)
}

func (m *Module) health(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]string{
		"module": "sdm",
		"status": "ok",
	})
}
