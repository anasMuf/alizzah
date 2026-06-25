package wali

import (
	"api/handler"
	"api/middleware"

	"github.com/labstack/echo/v4"
)

type Handler struct {
	h *handler.GuardianHandler
}

func New(h *handler.GuardianHandler) *Handler { return &Handler{h: h} }
func (h *Handler) Models() []any              { return nil }

func (h *Handler) RegisterRoutes(api *echo.Group, jwt echo.MiddlewareFunc, guard *middleware.ModuleGuard) {
	g := api.Group("/guardians", jwt, guard.RequireModule(middleware.ModuleAdministrasi))
	g.POST("", h.h.Create)
	g.GET("/:id", h.h.Get)
	g.PUT("/:id", h.h.Update)
}

func (h *Handler) RegisterNested(students *echo.Group, guard *middleware.ModuleGuard) {
	adm := guard.RequireModule(middleware.ModuleAdministrasi)
	students.GET("/:id/guardians", h.h.GetByStudent, adm)
	students.POST("/:id/guardians", h.h.LinkToStudent, adm)
	students.DELETE("/:id/guardians/:guardian_id", h.h.UnlinkFromStudent, adm)
	students.PATCH("/:id/guardians/:guardian_id/primary", h.h.SetPrimary, adm)
}
