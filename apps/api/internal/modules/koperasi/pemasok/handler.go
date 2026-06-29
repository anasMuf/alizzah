package pemasok

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

// New merangkai repository → service → handler untuk fitur pemasok.
func New(db *gorm.DB) *Handler { return NewHandler(NewService(NewRepository(db))) }

func (h *Handler) RegisterRoutes(g *echo.Group, mw ...echo.MiddlewareFunc) {
	g.GET("/suppliers", h.List, mw...)
	g.POST("/suppliers", h.Create, mw...)
	g.GET("/suppliers/:id", h.Get, mw...)
	g.PUT("/suppliers/:id", h.Update, mw...)
	g.DELETE("/suppliers/:id", h.Delete, mw...)
}

func fail(c echo.Context, err error) error {
	status, code := utility.GetErrorStatusAndCode(err)
	return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
}

// List godoc
// @Summary List pemasok koperasi
// @Tags koperasi-pemasok
// @Security ApiKeyAuth
// @Param search query string false "Cari nama"
// @Success 200 {object} dto.SuccessResponse{data=[]pemasok.Response}
// @Router /v1/koperasi/suppliers [get]
func (h *Handler) List(c echo.Context) error {
	items, err := h.svc.List(c.QueryParam("search"))
	if err != nil {
		return fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil daftar pemasok", Data: items})
}

// Create godoc
// @Summary Tambah pemasok
// @Tags koperasi-pemasok
// @Security ApiKeyAuth
// @Param request body pemasok.CreateRequest true "Data pemasok"
// @Success 201 {object} dto.SuccessResponse{data=pemasok.Response}
// @Router /v1/koperasi/suppliers [post]
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
	return c.JSON(http.StatusCreated, dto.SuccessResponse{Message: "Berhasil menambah pemasok", Data: item})
}

// Get godoc
// @Summary Detail pemasok
// @Tags koperasi-pemasok
// @Security ApiKeyAuth
// @Param id path int true "Supplier ID"
// @Success 200 {object} dto.SuccessResponse{data=pemasok.Response}
// @Router /v1/koperasi/suppliers/{id} [get]
func (h *Handler) Get(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}
	item, err := h.svc.Get(uint(id))
	if err != nil {
		return fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil pemasok", Data: item})
}

// Update godoc
// @Summary Perbarui pemasok
// @Tags koperasi-pemasok
// @Security ApiKeyAuth
// @Param id path int true "Supplier ID"
// @Param request body pemasok.CreateRequest true "Data pemasok"
// @Success 200 {object} dto.SuccessResponse{data=pemasok.Response}
// @Router /v1/koperasi/suppliers/{id} [put]
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
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil memperbarui pemasok", Data: item})
}

// Delete godoc
// @Summary Hapus pemasok
// @Tags koperasi-pemasok
// @Security ApiKeyAuth
// @Param id path int true "Supplier ID"
// @Success 200 {object} dto.SuccessResponse
// @Router /v1/koperasi/suppliers/{id} [delete]
func (h *Handler) Delete(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}
	if err := h.svc.Delete(uint(id)); err != nil {
		return fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil menghapus pemasok"})
}
