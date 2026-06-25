package dispensasi

import (
	"api/handler"
	"api/middleware"

	"github.com/labstack/echo/v4"
)

type Handler struct {
	h *handler.DispensationHandler
}

func New(h *handler.DispensationHandler) *Handler { return &Handler{h: h} }
func (h *Handler) Models() []any                   { return nil }

func (h *Handler) RegisterRoutes(api *echo.Group, jwt echo.MiddlewareFunc, guard *middleware.ModuleGuard) {
	keu := guard.RequireModule(middleware.ModuleKeuangan)
	d := api.Group("/dispensations", jwt, keu)
	d.PUT("/:id", h.h.Update)
	d.PATCH("/:id/toggle", h.h.Toggle)
	d.DELETE("/:id", h.h.Delete)
}

func (h *Handler) RegisterNested(students *echo.Group, guard *middleware.ModuleGuard) {
	keu := guard.RequireModule(middleware.ModuleKeuangan)
	students.GET("/:id/dispensations", h.h.ListByStudent, keu)
	students.POST("/:id/dispensations", h.h.Create, keu)
}
