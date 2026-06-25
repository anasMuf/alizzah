package daycare

import (
	"api/handler"
	"api/middleware"

	"github.com/labstack/echo/v4"
)

type Handler struct {
	h *handler.DaycareEnrollmentHandler
}

func New(h *handler.DaycareEnrollmentHandler) *Handler { return &Handler{h: h} }
func (h *Handler) Models() []any                        { return nil }

func (h *Handler) RegisterRoutes(api *echo.Group, jwt echo.MiddlewareFunc, guard *middleware.ModuleGuard) {
	adm := guard.RequireModule(middleware.ModuleAdministrasi)
	d := api.Group("/daycare-enrollments", jwt, adm)
	d.GET("", h.h.List)
	d.POST("", h.h.Create)
	d.POST("/sync-invoices", h.h.SyncInvoices)
	d.GET("/:id", h.h.Get)
	d.PUT("/:id", h.h.Update)
	d.PATCH("/:id/status", h.h.UpdateStatus)
}
