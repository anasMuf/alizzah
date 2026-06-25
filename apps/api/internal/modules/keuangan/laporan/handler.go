package laporan

import (
	"api/handler"
	"api/middleware"

	"github.com/labstack/echo/v4"
)

// Handler membungkus ReportHandler dari flat package.
// Handler tetap di flat karena service-nya punya terlalu banyak dependensi lintas-modul.
type Handler struct {
	h *handler.ReportHandler
}

func New(h *handler.ReportHandler) *Handler {
	return &Handler{h: h}
}

func (h *Handler) Models() []any { return nil }

func (h *Handler) RegisterRoutes(api *echo.Group, jwt echo.MiddlewareFunc, guard *middleware.ModuleGuard) {
	view := guard.RequireModule(middleware.ModuleKeuangan, middleware.ModuleLaporan)
	keu := guard.RequireModule(middleware.ModuleKeuangan)

	r := api.Group("/reports", jwt)
	r.GET("/daily", h.h.Daily, view)
	r.GET("/monthly", h.h.Monthly, view)
	r.GET("/annual", h.h.Annual, view)
	r.GET("/posisi-kas", h.h.PosisiKas, view)
	r.GET("/saldo", h.h.Saldo, view)
	r.GET("/transaksi-pengeluaran", h.h.TransaksiPengeluaran, view)
	r.GET("/tabungan", h.h.TabunganReport, view)
	r.GET("/savings/students/:id", h.h.TabunganSiswaReport, keu)
	r.GET("/students/:id", h.h.ByStudent, keu)
	r.GET("/class-groups/:id", h.h.ByClassGroup, view)
}
