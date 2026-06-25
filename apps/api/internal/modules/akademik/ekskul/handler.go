package ekskul

import (
	"api/handler"
	"api/middleware"

	"github.com/labstack/echo/v4"
)

type Handler struct {
	h *handler.ExtracurricularHandler
}

func New(h *handler.ExtracurricularHandler) *Handler { return &Handler{h: h} }
func (h *Handler) Models() []any                      { return nil }

func (h *Handler) RegisterRoutes(api *echo.Group, jwt echo.MiddlewareFunc, guard *middleware.ModuleGuard) {
	g := api.Group("/extracurriculars", jwt, guard.RequireModule(middleware.ModuleAdministrasi))
	g.GET("", h.h.List)
	g.POST("", h.h.Create)
	g.PUT("/:id", h.h.Update)
	g.DELETE("/:id", h.h.Delete)
}
