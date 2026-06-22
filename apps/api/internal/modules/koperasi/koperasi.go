// Package koperasi adalah modul Koperasi (Batch 8) dalam layout modular monolith.
//
// Struktur: module -> feature -> layer. Tiap fitur (anggota, barang, pemasok, kas,
// modal, pembelian, penjualan, ...) adalah sub-package berisi model/dto/repository/
// service/handler. File ini merangkai antar-fitur, menyuntik middleware auth & dependency
// bersama, lalu mendaftarkan route.
//
// Lihat docs/architecture/adr-001-modular-structure.md dan
// docs/koperasi/integration-plan.md.
package koperasi

import (
	"net/http"

	"api/internal/modules/koperasi/anggota"
	"api/internal/modules/koperasi/barang"
	"api/internal/modules/koperasi/kas"
	"api/internal/modules/koperasi/lainlain"
	"api/internal/modules/koperasi/laporan"
	"api/internal/modules/koperasi/master"
	"api/internal/modules/koperasi/pemasok"
	"api/internal/modules/koperasi/pembayaran"
	"api/internal/modules/koperasi/pembelian"
	"api/internal/modules/koperasi/penjualan"
	"api/internal/modules/koperasi/pinjaman"
	"api/internal/shared"
	"api/middleware"
	"api/repository"

	"github.com/labstack/echo/v4"
)

// Module adalah entry point modul Koperasi.
type Module struct {
	anggota   *anggota.Handler
	barang    *barang.Handler
	master    *master.Handler
	pemasok   *pemasok.Handler
	kas       *kas.Handler
	pembelian *pembelian.Handler
	penjualan *penjualan.Handler
	pinjaman  *pinjaman.Handler
	lainlain  *lainlain.Handler
	laporan   *laporan.Handler
	jwt       echo.MiddlewareFunc
	guard     *middleware.ModuleGuard
}

// New membangun modul dengan dependency bersama yang diinjeksikan.
func New(deps *shared.Deps) *Module {
	db := deps.DB

	// Dependency bersama antar-fitur transaksional.
	cashWriter := kas.NewWriter()
	paymentSvc := pembayaran.NewService(pembayaran.NewRepository(db), cashWriter)
	barangRepo := barang.NewRepository(db)
	supplierRepo := pemasok.NewRepository(db)
	studentRepo := repository.NewStudentRepository(db)
	ayRepo := repository.NewAcademicYearRepository(db)

	return &Module{
		anggota:   anggota.New(db),
		barang:    barang.New(db),
		master:    master.New(db),
		pemasok:   pemasok.New(db),
		kas:       kas.New(db),
		pembelian: pembelian.New(db, paymentSvc, barangRepo, supplierRepo, ayRepo),
		penjualan: penjualan.New(db, paymentSvc, barangRepo, studentRepo, ayRepo),
		pinjaman:  pinjaman.New(db, paymentSvc, cashWriter, ayRepo),
		lainlain:  lainlain.New(db, cashWriter, ayRepo),
		laporan:   laporan.New(db),
		jwt:       middleware.JWTAuth(repository.NewTokenBlacklistRepository(db)),
		guard:     middleware.NewModuleGuard(repository.NewUserModuleRepository(db)),
	}
}

// Models mengembalikan seluruh model GORM milik modul untuk dipakai AutoMigrate.
func (m *Module) Models() []any {
	return []any{
		&anggota.Employee{}, &anggota.Member{},
		&barang.Product{}, &barang.Variant{},
		&master.MasterData{},
		&pemasok.Supplier{},
		&kas.CashTransaction{},
		&pembelian.Purchase{}, &pembelian.PurchaseItem{},
		&penjualan.Sale{}, &penjualan.SaleItem{},
		&pinjaman.Loan{}, &pinjaman.LoanInstallment{},
		&lainlain.MiscTransaction{},
		&pembayaran.Payment{},
	}
}

// RegisterRoutes mendaftarkan seluruh route modul di bawah grup API (/api/v1).
func (m *Module) RegisterRoutes(api *echo.Group) {
	// Health check publik (penanda modul ter-wire & untuk healthcheck container).
	api.GET("/koperasi/health", m.health)

	// Semua route koperasi wajib JWT.
	g := api.Group("/koperasi", m.jwt)

	// Master data & transaksi: kelola = modul koperasi (superadmin bypass).
	manage := m.guard.RequireModule(middleware.ModuleKoperasi)
	m.anggota.RegisterRoutes(g, manage)
	m.barang.RegisterRoutes(g, manage)
	m.master.RegisterRoutes(g, manage)
	m.pemasok.RegisterRoutes(g, manage)
	m.pembelian.RegisterRoutes(g, manage)
	m.penjualan.RegisterRoutes(g, manage)
	m.pinjaman.RegisterRoutes(g, manage)
	m.lainlain.RegisterRoutes(g, manage)

	// Kas (saldo & jurnal): view luas — koperasi, keuangan, atau laporan.
	view := m.guard.RequireModule(middleware.ModuleKoperasi, middleware.ModuleKeuangan, middleware.ModuleLaporan)
	m.kas.RegisterRoutes(g, view)
	m.laporan.RegisterRoutes(g, view)
}

func (m *Module) health(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]string{
		"module": "koperasi",
		"status": "ok",
	})
}
