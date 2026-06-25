package pendaftaran

import (
	"api/handler"
	"api/middleware"

	"github.com/labstack/echo/v4"
)

type Handler struct {
	h *handler.StudentEnrollmentHandler
}

func New(h *handler.StudentEnrollmentHandler) *Handler { return &Handler{h: h} }
func (h *Handler) Models() []any                        { return nil }

func (h *Handler) RegisterRoutes(api *echo.Group, jwt echo.MiddlewareFunc, guard *middleware.ModuleGuard) {
	adm := guard.RequireModule(middleware.ModuleAdministrasi)
	e := api.Group("/enrollments", jwt, adm)
	e.PATCH("/:id/activate", h.h.ActivateEnrollment)
}

func (h *Handler) RegisterNested(students *echo.Group, guard *middleware.ModuleGuard) {
	view := guard.RequireModule(middleware.ModuleAdministrasi, middleware.ModuleKeuangan)
	adm := guard.RequireModule(middleware.ModuleAdministrasi)
	students.GET("/:id/enrollments", h.h.GetByStudent, view)
	students.POST("/enrollments/batch", h.h.EnrollBatch, adm)
	students.POST("/:id/enrollments", h.h.Enroll, adm)
}
