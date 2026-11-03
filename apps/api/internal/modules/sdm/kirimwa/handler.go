package kirimwa

import (
	"net/http"
	"strconv"

	"api/dto"
	"api/utility"

	"github.com/labstack/echo/v4"
)

// Handler menyediakan endpoint admin pengiriman slip WA.
type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

// RegisterRoutes mendaftarkan route di bawah grup SDM (JWT + modul).
func (h *Handler) RegisterRoutes(g *echo.Group, mw ...echo.MiddlewareFunc) {
	g.GET("/penggajian/kirim-wa/status", h.Status, mw...)
	g.POST("/penggajian/kirim-wa/kirim/:employee_id", h.SendOne, mw...)
	g.POST("/penggajian/kirim-wa/semua", h.SendAll, mw...)
	g.POST("/penggajian/kirim-wa/ulang-gagal", h.RetryFailed, mw...)
	g.POST("/penggajian/kirim-wa/tandai-terkirim", h.MarkSent, mw...)
	g.POST("/penggajian/kirim-wa/tandai-semua-terkirim", h.MarkAllSent, mw...)
}

// SendOne godoc
// @Summary Kirim slip gaji 1 karyawan via WhatsApp (teks + tautan)
// @Tags sdm-penggajian
// @Security ApiKeyAuth
// @Param employee_id path int true "Employee ID"
// @Param request body kirimwa.SendRequest true "Periode"
// @Success 200 {object} dto.SuccessResponse{data=kirimwa.SendResult}
// @Router /v1/sdm/penggajian/kirim-wa/kirim/{employee_id} [post]
func (h *Handler) SendOne(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("employee_id"))
	if err != nil || id <= 0 {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID karyawan tidak valid"})
	}
	var req SendRequest
	if err := c.Bind(&req); err != nil || req.Periode == "" {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: "Periode wajib diisi"})
	}
	res, err := h.svc.SendOne(uint(id), req.Periode)
	if err != nil {
		return utility.Fail(c, err)
	}
	msg := "Slip berhasil dikirim"
	switch res.Status {
	case StatusSent:
	case StatusUnknown:
		msg = "Status belum pasti — menunggu konfirmasi Wablas (webhook)"
	default:
		msg = "Gagal mengirim slip"
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: msg, Data: res})
}

// SendAll godoc
// @Summary Jadwalkan kirim slip seluruh karyawan aktif via WhatsApp (async)
// @Tags sdm-penggajian
// @Security ApiKeyAuth
// @Param request body kirimwa.SendRequest true "Periode"
// @Success 200 {object} dto.SuccessResponse{data=kirimwa.EnqueueResult}
// @Router /v1/sdm/penggajian/kirim-wa/semua [post]
func (h *Handler) SendAll(c echo.Context) error {
	var req SendRequest
	if err := c.Bind(&req); err != nil || req.Periode == "" {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: "Periode wajib diisi"})
	}
	res, err := h.svc.EnqueueAll(req.Periode)
	if err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Pengiriman dijadwalkan. Status akan diperbarui otomatis.",
		Data:    res,
	})
}

// RetryFailed godoc
// @Summary Jadwalkan ulang kirim slip yang GAGAL pada satu periode (async)
// @Tags sdm-penggajian
// @Security ApiKeyAuth
// @Param request body kirimwa.SendRequest true "Periode"
// @Success 200 {object} dto.SuccessResponse{data=kirimwa.EnqueueResult}
// @Router /v1/sdm/penggajian/kirim-wa/ulang-gagal [post]
func (h *Handler) RetryFailed(c echo.Context) error {
	var req SendRequest
	if err := c.Bind(&req); err != nil || req.Periode == "" {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: "Periode wajib diisi"})
	}
	res, err := h.svc.RetryFailed(req.Periode)
	if err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Pengiriman ulang dijadwalkan. Status akan diperbarui otomatis.",
		Data:    res,
	})
}

// MarkSent godoc
// @Summary Tandai slip 1 karyawan sebagai terkirim (koreksi manual)
// @Tags sdm-penggajian
// @Security ApiKeyAuth
// @Param request body kirimwa.MarkSentRequest true "Periode + employee_id"
// @Success 200 {object} dto.SuccessResponse{data=kirimwa.MarkSentResult}
// @Router /v1/sdm/penggajian/kirim-wa/tandai-terkirim [post]
func (h *Handler) MarkSent(c echo.Context) error {
	var req MarkSentRequest
	if err := c.Bind(&req); err != nil || req.Periode == "" || req.EmployeeID == 0 {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: "periode & employee_id wajib diisi"})
	}
	changed, err := h.svc.MarkSent(req.EmployeeID, req.Periode)
	if err != nil {
		return utility.Fail(c, err)
	}
	msg := "Status ditandai terkirim"
	if !changed {
		msg = "Tidak ada status yang perlu dikoreksi"
	}
	updated := 0
	if changed {
		updated = 1
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: msg, Data: MarkSentResult{Updated: updated}})
}

// MarkAllSent godoc
// @Summary Tandai SEMUA slip gagal/belum pasti pada periode sebagai terkirim
// @Tags sdm-penggajian
// @Security ApiKeyAuth
// @Param request body kirimwa.SendRequest true "Periode"
// @Success 200 {object} dto.SuccessResponse{data=kirimwa.MarkSentResult}
// @Router /v1/sdm/penggajian/kirim-wa/tandai-semua-terkirim [post]
func (h *Handler) MarkAllSent(c echo.Context) error {
	var req SendRequest
	if err := c.Bind(&req); err != nil || req.Periode == "" {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: "Periode wajib diisi"})
	}
	n, err := h.svc.MarkAllSent(req.Periode)
	if err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Status diperbarui",
		Data:    MarkSentResult{Updated: n},
	})
}

// Status godoc
// @Summary Status pengiriman slip WA per periode
// @Tags sdm-penggajian
// @Security ApiKeyAuth
// @Param periode query string true "Periode YYYY-MM"
// @Success 200 {object} dto.SuccessResponse{data=[]kirimwa.StatusItem}
// @Router /v1/sdm/penggajian/kirim-wa/status [get]
func (h *Handler) Status(c echo.Context) error {
	periode := c.QueryParam("periode")
	if periode == "" {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: "Periode wajib diisi"})
	}
	items, err := h.svc.StatusList(periode)
	if err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil status pengiriman", Data: items})
}
