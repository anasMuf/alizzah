package ekskulstudent

import (
	"api/handler"
	"api/middleware"

	"github.com/labstack/echo/v4"
)

type Handler struct {
	h *handler.StudentExtracurricularHandler
}

func New(h *handler.StudentExtracurricularHandler) *Handler { return &Handler{h: h} }
func (h *Handler) Models() []any                             { return nil }

func (h *Handler) RegisterNested(students *echo.Group, guard *middleware.ModuleGuard) {
	adm := guard.RequireModule(middleware.ModuleAdministrasi)
	students.GET("/:id/extracurriculars", h.h.GetByStudent, adm)
	students.POST("/:id/extracurriculars", h.h.Enroll, adm)
	students.PUT("/:id/extracurriculars/:se_id", h.h.Update, adm)
	students.DELETE("/:id/extracurriculars/:se_id", h.h.Unenroll, adm)
}

// SyncInvoices tetap di route flat dulu (pakai invoiceGen service)
