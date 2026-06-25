package pembayaran

import (
	"api/handler"
	"api/middleware"

	"github.com/labstack/echo/v4"
)

type Handler struct {
	h *handler.PaymentHandler
}

func New(h *handler.PaymentHandler) *Handler {
	return &Handler{h: h}
}

func (h *Handler) Models() []any { return nil }

func (h *Handler) RegisterRoutes(api *echo.Group, jwt echo.MiddlewareFunc, guard *middleware.ModuleGuard) {
	keu := guard.RequireModule(middleware.ModuleKeuangan)
	p := api.Group("/payments", jwt, keu)
	p.GET("", h.h.List)
	p.POST("", h.h.Create)
	p.GET("/:id", h.h.Get)
}

func (h *Handler) RegisterNested(students *echo.Group, guard *middleware.ModuleGuard) {
	students.GET("/:id/payments", h.h.GetByStudent, guard.RequireModule(middleware.ModuleKeuangan))
}
