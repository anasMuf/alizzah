package tagihan

import (
	"api/handler"
	"api/middleware"

	"github.com/labstack/echo/v4"
)

type Handler struct {
	h *handler.InvoiceHandler
}

func New(h *handler.InvoiceHandler) *Handler {
	return &Handler{h: h}
}

func (h *Handler) Models() []any { return nil }

func (h *Handler) RegisterRoutes(api *echo.Group, jwt echo.MiddlewareFunc, guard *middleware.ModuleGuard) {
	keu := guard.RequireModule(middleware.ModuleKeuangan)
	inv := api.Group("/invoices", jwt, keu)
	inv.GET("", h.h.List)
	inv.GET("/batch", h.h.Batch)
	inv.GET("/:id", h.h.Get)
	inv.POST("/:id/items", h.h.AddItem)
	inv.PUT("/:id/items/:item_id", h.h.UpdateItem)
	inv.PUT("/:id/items/:item_id/quantity", h.h.UpdateItemQuantity)
	inv.DELETE("/:id/items/:item_id", h.h.DeleteItem)
	inv.GET("/:id/installments", h.h.GetInstallments)
	inv.POST("/:id/installments", h.h.CreateInstallments)
	inv.PUT("/:id/installments/:inst_id", h.h.UpdateInstallment)
	inv.DELETE("/:id/installments/:inst_id", h.h.DeleteInstallment)
}

func (h *Handler) RegisterNested(students *echo.Group, guard *middleware.ModuleGuard) {
	students.GET("/:id/invoices", h.h.GetByStudent, guard.RequireModule(middleware.ModuleKeuangan))
}
