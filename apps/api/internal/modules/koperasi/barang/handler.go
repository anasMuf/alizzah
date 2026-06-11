package barang

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

// New merangkai repository → service → handler untuk fitur barang.
func New(db *gorm.DB) *Handler { return NewHandler(NewService(NewRepository(db))) }

func (h *Handler) RegisterRoutes(g *echo.Group, mw ...echo.MiddlewareFunc) {
	g.GET("/products", h.List, mw...)
	g.POST("/products", h.Create, mw...)
	g.GET("/products/:id", h.Get, mw...)
	g.PUT("/products/:id", h.Update, mw...)
	g.DELETE("/products/:id", h.Delete, mw...)
}

func fail(c echo.Context, err error) error {
	status, code := utility.GetErrorStatusAndCode(err)
	return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
}

// List godoc
// @Summary List barang koperasi
// @Tags koperasi-barang
// @Security ApiKeyAuth
// @Param search query string false "Cari nama"
// @Param active query bool false "Hanya yang aktif"
// @Success 200 {object} dto.SuccessResponse{data=[]barang.Response}
// @Router /v1/koperasi/products [get]
func (h *Handler) List(c echo.Context) error {
	items, err := h.svc.List(c.QueryParam("search"), c.QueryParam("active") == "true")
	if err != nil {
		return fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil daftar barang", Data: items})
}

// Create godoc
// @Summary Tambah barang
// @Tags koperasi-barang
// @Security ApiKeyAuth
// @Param request body barang.CreateRequest true "Data barang"
// @Success 201 {object} dto.SuccessResponse{data=barang.Response}
// @Router /v1/koperasi/products [post]
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
	return c.JSON(http.StatusCreated, dto.SuccessResponse{Message: "Berhasil menambah barang", Data: item})
}

// Get godoc
// @Summary Detail barang
// @Tags koperasi-barang
// @Security ApiKeyAuth
// @Param id path int true "Product ID"
// @Success 200 {object} dto.SuccessResponse{data=barang.Response}
// @Router /v1/koperasi/products/{id} [get]
func (h *Handler) Get(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}
	item, err := h.svc.Get(uint(id))
	if err != nil {
		return fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil barang", Data: item})
}

// Update godoc
// @Summary Perbarui barang
// @Tags koperasi-barang
// @Security ApiKeyAuth
// @Param id path int true "Product ID"
// @Param request body barang.CreateRequest true "Data barang"
// @Success 200 {object} dto.SuccessResponse{data=barang.Response}
// @Router /v1/koperasi/products/{id} [put]
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
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil memperbarui barang", Data: item})
}

// Delete godoc
// @Summary Hapus barang
// @Tags koperasi-barang
// @Security ApiKeyAuth
// @Param id path int true "Product ID"
// @Success 200 {object} dto.SuccessResponse
// @Router /v1/koperasi/products/{id} [delete]
func (h *Handler) Delete(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}
	if err := h.svc.Delete(uint(id)); err != nil {
		return fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil menghapus barang"})
}
