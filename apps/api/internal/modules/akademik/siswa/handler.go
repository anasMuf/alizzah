package siswa

import (
	"api/handler"
	"api/middleware"

	"github.com/labstack/echo/v4"
)

type Handler struct {
	h *handler.StudentHandler
}

func New(h *handler.StudentHandler) *Handler { return &Handler{h: h} }
func (h *Handler) Models() []any             { return nil }

func (h *Handler) RegisterRoutes(api *echo.Group, jwt echo.MiddlewareFunc, guard *middleware.ModuleGuard) {
	view := guard.RequireModule(middleware.ModuleAdministrasi, middleware.ModuleKeuangan, middleware.ModuleKoperasi)
	adm := guard.RequireModule(middleware.ModuleAdministrasi)

	s := api.Group("/students", jwt)
	s.GET("", h.h.List, view)
	s.POST("", h.h.Create, adm)
	s.POST("/import", h.h.Import, adm)
	s.GET("/:id", h.h.Get, view)
	s.PUT("/:id", h.h.Update, adm)
	s.DELETE("/:id", h.h.Delete, adm)
}
