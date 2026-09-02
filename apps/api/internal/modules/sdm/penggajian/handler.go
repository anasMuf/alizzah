package penggajian

import (
	"net/http"
	"strconv"

	"api/dto"
	"api/middleware"
	"api/utility"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

// New merangkai repository → service → handler untuk fitur penggajian.
func New(db *gorm.DB) *Handler {
	return NewHandler(NewService(NewRepository(db)))
}

func (h *Handler) RegisterRoutes(g *echo.Group, mw ...echo.MiddlewareFunc) {
	g.GET("/penggajian", h.Get, mw...)
	g.GET("/penggajian/:employee_id", h.Slip, mw...)
	g.POST("/penggajian/finalize", h.Finalize, mw...)
	g.POST("/penggajian/unlock", h.Unlock, mw...)
	g.GET("/rekap", h.Rekap, mw...)
	g.GET("/summary", h.Summary, mw...)
}

func bindAndValidate(c echo.Context, req any) error {
	if err := c.Bind(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}
	return nil
}

// Get godoc
// @Summary Status + daftar gaji semua karyawan satu periode (preview/finalized)
// @Tags sdm-penggajian
// @Security ApiKeyAuth
// @Param periode query string true "Periode YYYY-MM (payday 5)"
// @Success 200 {object} dto.SuccessResponse{data=penggajian.PayrollStatusResponse}
// @Router /v1/sdm/penggajian [get]
func (h *Handler) Get(c echo.Context) error {
	periode := c.QueryParam("periode")
	if periode == "" {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: "Periode wajib diisi"})
	}
	item, err := h.svc.Get(periode)
	if err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil penggajian", Data: item})
}

// Finalize godoc
// @Summary Finalisasi penggajian satu periode (simpan snapshot & kunci)
// @Tags sdm-penggajian
// @Security ApiKeyAuth
// @Param request body penggajian.FinalizeRequest true "Periode"
// @Success 200 {object} dto.SuccessResponse{data=penggajian.PayrollStatusResponse}
// @Router /v1/sdm/penggajian/finalize [post]
func (h *Handler) Finalize(c echo.Context) error {
	var req FinalizeRequest
	if err := bindAndValidate(c, &req); err != nil {
		return err
	}
	item, err := h.svc.Finalize(req.Periode, middleware.GetCurrentUserID(c))
	if err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil memfinalisasi penggajian", Data: item})
}

// Unlock godoc
// @Summary Buka kembali periode yang difinalisasi (koreksi; snapshot dihapus)
// @Tags sdm-penggajian
// @Security ApiKeyAuth
// @Param request body penggajian.FinalizeRequest true "Periode"
// @Success 200 {object} dto.SuccessResponse
// @Router /v1/sdm/penggajian/unlock [post]
func (h *Handler) Unlock(c echo.Context) error {
	var req FinalizeRequest
	if err := bindAndValidate(c, &req); err != nil {
		return err
	}
	if err := h.svc.Unlock(req.Periode); err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil membuka kembali periode"})
}

// Slip godoc
// @Summary Slip gaji detail 1 karyawan (snapshot bila periode difinalisasi)
// @Tags sdm-penggajian
// @Security ApiKeyAuth
// @Param periode query string true "Periode YYYY-MM"
// @Param employee_id path int true "Employee ID"
// @Success 200 {object} dto.SuccessResponse{data=penggajian.SlipResponse}
// @Router /v1/sdm/penggajian/{employee_id} [get]
func (h *Handler) Slip(c echo.Context) error {
	periode := c.QueryParam("periode")
	if periode == "" {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: "Periode wajib diisi"})
	}
	employeeID, err := strconv.Atoi(c.Param("employee_id"))
	if err != nil || employeeID <= 0 {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID karyawan tidak valid"})
	}
	item, err := h.svc.Slip(periode, uint(employeeID))
	if err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil menghitung slip gaji", Data: item})
}

// Rekap godoc
// @Summary Rekap gaji per Tahun Ajaran (ringkasan tiap bulan)
// @Tags sdm-penggajian
// @Security ApiKeyAuth
// @Param academic_year_id query int true "Tahun Ajaran ID"
// @Success 200 {object} dto.SuccessResponse{data=penggajian.RekapResponse}
// @Router /v1/sdm/rekap [get]
func (h *Handler) Rekap(c echo.Context) error {
	yearID, err := strconv.Atoi(c.QueryParam("academic_year_id"))
	if err != nil || yearID <= 0 {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: "academic_year_id wajib diisi"})
	}
	item, err := h.svc.Rekap(uint(yearID))
	if err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil rekap per tahun ajaran", Data: item})
}

// Summary godoc
// @Summary Statistik dashboard SDM (grafik per bulan mengikuti TA bila diberikan)
// @Tags sdm-penggajian
// @Security ApiKeyAuth
// @Param academic_year_id query int false "Tahun Ajaran ID"
// @Param tahun query string false "Tahun (YYYY) fallback bila tanpa academic_year_id"
// @Success 200 {object} dto.SuccessResponse{data=penggajian.SummaryResponse}
// @Router /v1/sdm/summary [get]
func (h *Handler) Summary(c echo.Context) error {
	var yearID *uint
	if v := c.QueryParam("academic_year_id"); v != "" {
		id, err := strconv.Atoi(v)
		if err != nil || id <= 0 {
			return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: "academic_year_id tidak valid"})
		}
		u := uint(id)
		yearID = &u
	}
	item, err := h.svc.Summary(yearID, c.QueryParam("tahun"))
	if err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil ringkasan SDM", Data: item})
}
