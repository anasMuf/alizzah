// Package keuangan adalah modul Keuangan dalam layout modular monolith.
//
// Struktur: module -> feature -> layer. Tiap fitur (pengeluaran, pemasukan, kas,
// tabungan, tagihan, laporan, ...) adalah sub-package berisi model/dto/repository/
// service/handler. File ini merangkai antar-fitur, menyuntik middleware auth &
// dependency bersama, lalu mendaftarkan route.
//
// Lihat docs/architecture/adr-001-modular-structure.md.
package keuangan

import (
	"api/handler"
	"api/internal/modules/keuangan/berangkas"
	"api/internal/modules/keuangan/dispensasi"
	"api/internal/modules/keuangan/kas"
	"api/internal/modules/keuangan/laporan"
	"api/internal/modules/keuangan/pembayaran"
	"api/internal/modules/keuangan/penerimaan"
	"api/internal/modules/keuangan/pengeluaran"
	"api/internal/modules/keuangan/tabungan"
	"api/internal/modules/keuangan/tagihan"
	"api/internal/modules/keuangan/tarif"
	"api/internal/modules/keuangan/tutupbuku"
	"api/internal/shared"
	"api/middleware"
	"api/repository"

	"github.com/labstack/echo/v4"
)

// Module adalah entry point modul Keuangan.
type Module struct {
	Berangkas   *berangkas.Handler
	Dispensasi  *dispensasi.Handler
	Kas         *kas.Handler
	Laporan     *laporan.Handler
	Pembayaran  *pembayaran.Handler
	Pengeluaran *pengeluaran.Handler
	Penerimaan  *penerimaan.Handler
	Tabungan    *tabungan.Handler
	Tagihan     *tagihan.Handler
	Tarif       *tarif.Handler
	TutupBuku   *tutupbuku.Handler
	jwt         echo.MiddlewareFunc
	guard       *middleware.ModuleGuard
}

func New(deps *shared.Deps,
	reportHandler *handler.ReportHandler,
	savingsHandler *handler.SavingsHandler,
	invoiceHandler *handler.InvoiceHandler,
	paymentHandler *handler.PaymentHandler,
	feeConfigHandler *handler.FeeConfigHandler,
	dispensationHandler *handler.DispensationHandler,
) *Module {
	db := deps.DB
	ayRepo := repository.NewAcademicYearRepository(db)

	return &Module{
		Berangkas:   berangkas.New(db),
		Dispensasi:  dispensasi.New(dispensationHandler),
		Kas:         kas.New(db),
		Laporan:     laporan.New(reportHandler),
		Pembayaran:  pembayaran.New(paymentHandler),
		Pengeluaran: pengeluaran.New(db, ayRepo),
		Penerimaan:  penerimaan.New(db, ayRepo),
		Tabungan:    tabungan.New(savingsHandler),
		Tagihan:     tagihan.New(invoiceHandler),
		Tarif:       tarif.New(feeConfigHandler),
		TutupBuku:   tutupbuku.New(db),
		jwt:         middleware.JWTAuth(repository.NewTokenBlacklistRepository(db)),
		guard:       middleware.NewModuleGuard(repository.NewUserModuleRepository(db)),
	}
}

func (m *Module) RegisterNestedRoutes(students *echo.Group) {
	m.Dispensasi.RegisterNested(students, m.guard)
	m.Pembayaran.RegisterNested(students, m.guard)
	m.Tabungan.RegisterNested(students, m.guard)
	m.Tagihan.RegisterNested(students, m.guard)
}

// Models mengembalikan seluruh model GORM milik modul untuk dipakai AutoMigrate.
func (m *Module) Models() []any {
	var models []any
	models = append(models, m.Berangkas.Models()...)
	models = append(models, m.Kas.Models()...)
	models = append(models, m.Pengeluaran.Models()...)
	models = append(models, m.Penerimaan.Models()...)
	models = append(models, m.TutupBuku.Models()...)
	return models
}

// RegisterRoutes mendaftarkan seluruh route modul di bawah grup API (/api/v1).
func (m *Module) RegisterRoutes(api *echo.Group) {
	m.Berangkas.RegisterRoutes(api, m.jwt, m.guard)
	m.Dispensasi.RegisterRoutes(api, m.jwt, m.guard)
	m.Kas.RegisterRoutes(api, m.jwt, m.guard)
	m.Laporan.RegisterRoutes(api, m.jwt, m.guard)
	m.Pembayaran.RegisterRoutes(api, m.jwt, m.guard)
	m.Pengeluaran.RegisterRoutes(api, m.jwt, m.guard)
	m.Penerimaan.RegisterRoutes(api, m.jwt, m.guard)
	m.Tagihan.RegisterRoutes(api, m.jwt, m.guard)
	m.Tarif.RegisterRoutes(api, m.jwt, m.guard)
	m.TutupBuku.RegisterRoutes(api, m.jwt, m.guard)
}
