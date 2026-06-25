package rombonganbelajar

import (
	"api/handler"
	"api/middleware"

	"github.com/labstack/echo/v4"
)

type Handler struct {
	classGroup     *handler.ClassGroupHandler
	enrollment     *handler.StudentEnrollmentHandler
	effectiveDay   *handler.EffectiveDayHandler
}

func New(classGroup *handler.ClassGroupHandler, enrollment *handler.StudentEnrollmentHandler, effectiveDay *handler.EffectiveDayHandler) *Handler {
	return &Handler{classGroup: classGroup, enrollment: enrollment, effectiveDay: effectiveDay}
}
func (h *Handler) Models() []any { return nil }

func (h *Handler) RegisterRoutes(api *echo.Group, jwt echo.MiddlewareFunc, guard *middleware.ModuleGuard) {
	view := guard.RequireModule(middleware.ModuleAdministrasi, middleware.ModuleKeuangan)
	manage := guard.RequireModule(middleware.ModuleAdministrasi)

	cg := api.Group("/class-groups", jwt)
	cg.GET("", h.classGroup.List, view)
	cg.POST("", h.classGroup.Create, manage)
	cg.POST("/clone", h.classGroup.Clone, manage)
	cg.GET("/:id", h.classGroup.Get, view)
	cg.PUT("/:id", h.classGroup.Update, manage)
	cg.DELETE("/:id", h.classGroup.Delete, manage)

	// Nested
	cg.GET("/:id/students", h.enrollment.GetStudentsByClassGroup, view)
	cg.GET("/:id/effective-days", h.effectiveDay.List, manage)
	cg.POST("/:id/effective-days", h.effectiveDay.Upsert, manage)
	cg.PUT("/:id/effective-days/:ed_id", h.effectiveDay.Update, manage)
}
