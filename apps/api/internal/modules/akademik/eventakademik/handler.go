package eventakademik

import (
	"api/handler"
	"api/middleware"

	"github.com/labstack/echo/v4"
)

type Handler struct {
	h *handler.AcademicEventHandler
}

func New(h *handler.AcademicEventHandler) *Handler { return &Handler{h: h} }
func (h *Handler) Models() []any                    { return nil }

func (h *Handler) RegisterRoutes(api *echo.Group, jwt echo.MiddlewareFunc, guard *middleware.ModuleGuard) {
	adm := guard.RequireModule(middleware.ModuleAdministrasi)
	e := api.Group("/academic-events", jwt, adm)
	e.POST("/promotions/preview", h.h.PromotionPreview)
	e.POST("/promotions", h.h.Promotion)
	e.POST("/graduations", h.h.Graduation)
	e.POST("/class-changes", h.h.ClassChange)
	e.POST("/transfers", h.h.TransferIn)
	e.POST("/withdrawals", h.h.Withdrawal)
}

func (h *Handler) RegisterNested(students *echo.Group, guard *middleware.ModuleGuard) {
	students.GET("/:id/academic-events", h.h.GetByStudent, guard.RequireModule(middleware.ModuleAdministrasi))
}
