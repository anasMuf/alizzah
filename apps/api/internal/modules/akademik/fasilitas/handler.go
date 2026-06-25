package fasilitas

import (
	"api/handler"
	"api/middleware"

	"github.com/labstack/echo/v4"
)

type Handler struct {
	h *handler.FacilityHandler
}

func New(h *handler.FacilityHandler) *Handler { return &Handler{h: h} }
func (h *Handler) Models() []any              { return nil }

func (h *Handler) RegisterRoutes(api *echo.Group, jwt echo.MiddlewareFunc, guard *middleware.ModuleGuard) {
	adm := guard.RequireModule(middleware.ModuleAdministrasi)
	f := api.Group("/facilities", jwt)
	f.GET("", h.h.List, adm)
	f.POST("", h.h.Create, adm)
	f.PUT("/:id", h.h.Update, adm)
	f.DELETE("/:id", h.h.Delete, adm)
}

func (h *Handler) RegisterNested(students *echo.Group, guard *middleware.ModuleGuard) {
	adm := guard.RequireModule(middleware.ModuleAdministrasi)
	students.GET("/:id/facilities", h.h.ListByStudent, adm)
	students.POST("/:id/facilities", h.h.Enroll, adm)
	students.DELETE("/:id/facilities/:facilityId", h.h.Unenroll, adm)
}
