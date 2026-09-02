package absen

import (
	"net/http"
	"strconv"

	"api/dto"
	"api/utility"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

// New merangkai repository → service → handler untuk fitur absensi.
func New(db *gorm.DB) *Handler {
	return NewHandler(NewService(NewRepository(db)))
}

func (h *Handler) RegisterRoutes(g *echo.Group, mw ...echo.MiddlewareFunc) {
	g.GET("/absen", h.List, mw...)
	g.PUT("/absen", h.Upsert, mw...)
	g.DELETE("/absen", h.Delete, mw...)
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

// List godoc
// @Summary Daftar absensi satu periode
// @Tags sdm-absen
// @Security ApiKeyAuth
// @Param periode query string true "Periode mmYYYY"
// @Success 200 {object} dto.SuccessResponse{data=[]absen.Response}
// @Router /v1/sdm/absen [get]
func (h *Handler) List(c echo.Context) error {
	periode := c.QueryParam("periode")
	if periode == "" {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: "Periode wajib diisi"})
	}
	items, err := h.svc.List(periode)
	if err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil absensi", Data: items})
}

// Upsert godoc
// @Summary Simpan absensi satu periode (bulk upsert)
// @Tags sdm-absen
// @Security ApiKeyAuth
// @Param request body absen.UpsertRequest true "Data absensi"
// @Success 200 {object} dto.SuccessResponse
// @Router /v1/sdm/absen [put]
func (h *Handler) Upsert(c echo.Context) error {
	var req UpsertRequest
	if err := bindAndValidate(c, &req); err != nil {
		return err
	}
	n, err := h.svc.Upsert(req)
	if err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil menyimpan absensi " + req.Periode + " (" + strconv.Itoa(n) + " baris)"})
}

// Delete godoc
// @Summary Hapus seluruh absensi satu periode
// @Tags sdm-absen
// @Security ApiKeyAuth
// @Param periode query string true "Periode mmYYYY"
// @Success 200 {object} dto.SuccessResponse
// @Router /v1/sdm/absen [delete]
func (h *Handler) Delete(c echo.Context) error {
	periode := c.QueryParam("periode")
	if periode == "" {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: "Periode wajib diisi"})
	}
	if err := h.svc.Delete(periode); err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil menghapus absensi periode " + periode})
}
