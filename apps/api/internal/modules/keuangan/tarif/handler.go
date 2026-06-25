package tarif

import (
	"api/handler"
	"api/middleware"

	"github.com/labstack/echo/v4"
)

type Handler struct {
	h *handler.FeeConfigHandler
}

func New(h *handler.FeeConfigHandler) *Handler { return &Handler{h: h} }
func (h *Handler) Models() []any               { return nil }

func (h *Handler) RegisterRoutes(api *echo.Group, jwt echo.MiddlewareFunc, guard *middleware.ModuleGuard) {
	keu := guard.RequireModule(middleware.ModuleKeuangan)
	fc := api.Group("/fee-configs", jwt, keu)
	fc.GET("", h.h.List)
	fc.POST("", h.h.Create)
	fc.GET("/:id", h.h.Get)
	fc.PUT("/:id", h.h.Update)
	fc.GET("/:id/items", h.h.ListItems)
	fc.POST("/:id/items", h.h.CreateItem)
	fc.PUT("/:id/items/:item_id", h.h.UpdateItem)
	fc.DELETE("/:id/items/:item_id", h.h.DeleteItem)
}
