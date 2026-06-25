package tabungan

import (
	"api/handler"
	"api/middleware"

	"github.com/labstack/echo/v4"
)

type Handler struct {
	h *handler.SavingsHandler
}

func New(h *handler.SavingsHandler) *Handler {
	return &Handler{h: h}
}

func (h *Handler) Models() []any { return nil }

// RegisterRoutes mendaftarkan route tabungan. Route ini nested di bawah /students/:id,
// jadi perlu di-register secara manual oleh main.go (tidak bisa otomatis via RegisterRoutes).
// Method ini disediakan agar handler bisa di-inject via Module.
func (h *Handler) RegisterNested(students *echo.Group, guard *middleware.ModuleGuard) {
	keu := guard.RequireModule(middleware.ModuleKeuangan)
	students.GET("/:id/savings", h.h.GetByStudent, keu)
	students.GET("/:id/savings/transactions", h.h.GetTransactions, keu)
	students.POST("/:id/savings/withdrawals", h.h.GuardianWithdrawal, keu)
}
