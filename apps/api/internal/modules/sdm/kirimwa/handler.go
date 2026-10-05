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
	if res.Status != StatusSent {
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
