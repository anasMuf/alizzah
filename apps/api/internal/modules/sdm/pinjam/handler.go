package pinjam

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

// New merangkai repository → service → handler untuk fitur pinjaman.
func New(db *gorm.DB) *Handler {
	return NewHandler(NewService(NewRepository(db)))
}

func (h *Handler) RegisterRoutes(g *echo.Group, mw ...echo.MiddlewareFunc) {
	g.GET("/pinjaman", h.List, mw...)
	g.POST("/pinjaman", h.Create, mw...)
	g.GET("/pinjaman/:id", h.Get, mw...)
	g.POST("/pinjaman/:id/angsuran", h.Pay, mw...)
	g.DELETE("/pinjaman/:id", h.Delete, mw...)
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

func parseID(c echo.Context) (uint, error) {
	v, err := strconv.Atoi(c.Param("id"))
	if err != nil || v <= 0 {
		return 0, echo.NewHTTPError(http.StatusBadRequest, "ID tidak valid")
	}
	return uint(v), nil
}

// List godoc
// @Summary Daftar pinjaman karyawan
// @Tags sdm-pinjam
// @Security ApiKeyAuth
// @Param search query string false "Cari nama karyawan"
// @Param status query string false "belum_lunas | lunas"
// @Success 200 {object} dto.SuccessResponse{data=[]pinjam.Item}
// @Router /v1/sdm/pinjaman [get]
func (h *Handler) List(c echo.Context) error {
	items, err := h.svc.List(c.QueryParam("search"), c.QueryParam("status"))
	if err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil daftar pinjaman", Data: items})
}

// Create godoc
// @Summary Catat pinjaman baru
// @Tags sdm-pinjam
// @Security ApiKeyAuth
// @Param request body pinjam.CreateRequest true "Data pinjaman"
// @Success 201 {object} dto.SuccessResponse{data=pinjam.Item}
// @Router /v1/sdm/pinjaman [post]
func (h *Handler) Create(c echo.Context) error {
	var req CreateRequest
	if err := bindAndValidate(c, &req); err != nil {
		return err
	}
	item, err := h.svc.Create(req)
	if err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusCreated, dto.SuccessResponse{Message: "Berhasil mencatat pinjaman", Data: item})
}

// Get godoc
// @Summary Detail pinjaman + riwayat angsuran
// @Tags sdm-pinjam
// @Security ApiKeyAuth
// @Param id path int true "Pinjaman ID"
// @Success 200 {object} dto.SuccessResponse{data=pinjam.DetailResponse}
// @Router /v1/sdm/pinjaman/{id} [get]
func (h *Handler) Get(c echo.Context) error {
	id, err := parseID(c)
	if err != nil {
		return err
	}
	item, err := h.svc.Get(id)
	if err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil detail pinjaman", Data: item})
}

// Pay godoc
// @Summary Bayar angsuran pinjaman
// @Tags sdm-pinjam
// @Security ApiKeyAuth
// @Param id path int true "Pinjaman ID"
// @Param request body pinjam.PayRequest true "Data angsuran"
// @Success 200 {object} dto.SuccessResponse{data=pinjam.Item}
// @Router /v1/sdm/pinjaman/{id}/angsuran [post]
func (h *Handler) Pay(c echo.Context) error {
	id, err := parseID(c)
	if err != nil {
		return err
	}
	var req PayRequest
	if err := bindAndValidate(c, &req); err != nil {
		return err
	}
	item, err := h.svc.Pay(id, req)
	if err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mencatat angsuran", Data: item})
}

// Delete godoc
// @Summary Hapus pinjaman
// @Tags sdm-pinjam
// @Security ApiKeyAuth
// @Param id path int true "Pinjaman ID"
// @Success 200 {object} dto.SuccessResponse
// @Router /v1/sdm/pinjaman/{id} [delete]
func (h *Handler) Delete(c echo.Context) error {
	id, err := parseID(c)
	if err != nil {
		return err
	}
	if err := h.svc.Delete(id); err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil menghapus pinjaman"})
}
