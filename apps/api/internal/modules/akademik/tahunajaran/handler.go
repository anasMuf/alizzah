package tahunajaran

import (
	"api/handler"
	"api/middleware"

	"github.com/labstack/echo/v4"
)

type Handler struct {
	h *handler.AcademicYearHandler
}

func New(h *handler.AcademicYearHandler) *Handler { return &Handler{h: h} }
func (h *Handler) Models() []any                   { return nil }

func (h *Handler) RegisterRoutes(api *echo.Group, jwt echo.MiddlewareFunc, guard *middleware.ModuleGuard) {
	read := guard.RequireModule(middleware.ModuleAdministrasi, middleware.ModuleKeuangan, middleware.ModuleKoperasi, middleware.ModuleLaporan)
	write := guard.RequireModule(middleware.ModuleAdministrasi)

	ay := api.Group("/academic-years", jwt)
	ay.GET("", h.h.List, read)
	ay.POST("", h.h.Create, write)
	ay.GET("/:id", h.h.Get, read)
	ay.PUT("/:id", h.h.Update, write)
	ay.PATCH("/:id/activate", h.h.Activate, write)
}
