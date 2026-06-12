package anggota

import (
	"net/http"
	"strconv"

	"api/dto"
	"api/utility"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type Handler struct{ svc Service }

func NewHandler(svc Service) *Handler { return &Handler{svc: svc} }

// New merangkai repository → service → handler untuk fitur anggota.
func New(db *gorm.DB) *Handler { return NewHandler(NewService(NewRepository(db))) }

func (h *Handler) RegisterRoutes(g *echo.Group, mw ...echo.MiddlewareFunc) {
	g.GET("/members", h.List, mw...)
	g.POST("/members", h.Create, mw...)
	g.GET("/members/:id", h.Get, mw...)
	g.PUT("/members/:id", h.Update, mw...)
	g.DELETE("/members/:id", h.Delete, mw...)
}

func fail(c echo.Context, err error) error {
	status, code := utility.GetErrorStatusAndCode(err)
	return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
}

// List godoc
// @Summary List anggota koperasi
// @Tags koperasi-anggota
// @Security ApiKeyAuth
// @Param search query string false "Cari nama"
// @Param active query bool false "Hanya yang aktif"
// @Success 200 {object} dto.SuccessResponse{data=[]anggota.Response}
// @Router /v1/koperasi/members [get]
func (h *Handler) List(c echo.Context) error {
	items, err := h.svc.List(c.QueryParam("search"), c.QueryParam("active") == "true")
	if err != nil {
		return fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil daftar anggota", Data: items})
}

// Create godoc
// @Summary Tambah anggota
// @Tags koperasi-anggota
// @Security ApiKeyAuth
// @Param request body anggota.CreateRequest true "Data anggota"
// @Success 201 {object} dto.SuccessResponse{data=anggota.Response}
// @Router /v1/koperasi/members [post]
func (h *Handler) Create(c echo.Context) error {
	var req CreateRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}
	item, err := h.svc.Create(req)
	if err != nil {
		return fail(c, err)
	}
	return c.JSON(http.StatusCreated, dto.SuccessResponse{Message: "Berhasil menambah anggota", Data: item})
}

// Get godoc
// @Summary Detail anggota
// @Tags koperasi-anggota
// @Security ApiKeyAuth
// @Param id path int true "Member ID"
// @Success 200 {object} dto.SuccessResponse{data=anggota.Response}
// @Router /v1/koperasi/members/{id} [get]
func (h *Handler) Get(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}
	item, err := h.svc.Get(uint(id))
	if err != nil {
		return fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil anggota", Data: item})
}

// Update godoc
// @Summary Perbarui anggota
// @Tags koperasi-anggota
// @Security ApiKeyAuth
// @Param id path int true "Member ID"
// @Param request body anggota.CreateRequest true "Data anggota"
// @Success 200 {object} dto.SuccessResponse{data=anggota.Response}
// @Router /v1/koperasi/members/{id} [put]
func (h *Handler) Update(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}
	var req CreateRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}
	item, err := h.svc.Update(uint(id), req)
	if err != nil {
		return fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil memperbarui anggota", Data: item})
}

// Delete godoc
// @Summary Hapus anggota
// @Tags koperasi-anggota
// @Security ApiKeyAuth
// @Param id path int true "Member ID"
// @Success 200 {object} dto.SuccessResponse
// @Router /v1/koperasi/members/{id} [delete]
func (h *Handler) Delete(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}
	if err := h.svc.Delete(uint(id)); err != nil {
		return fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil menghapus anggota"})
}
