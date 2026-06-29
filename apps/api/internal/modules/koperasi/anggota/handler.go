package anggota

import (
	"net/http"
	"strconv"

	"api/dto"
	"api/utility"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type Handler struct {
	svc    Service
	empRep EmployeeRepository
}

func NewHandler(svc Service, empRep EmployeeRepository) *Handler {
	return &Handler{svc: svc, empRep: empRep}
}

// New merangkai repository → service → handler untuk fitur anggota.
func New(db *gorm.DB) *Handler {
	return NewHandler(NewService(NewRepository(db)), NewEmployeeRepository(db))
}

func (h *Handler) RegisterRoutes(g *echo.Group, mw ...echo.MiddlewareFunc) {
	g.GET("/members", h.List, mw...)
	g.POST("/members", h.Create, mw...)
	g.POST("/members/bulk", h.BulkCreate, mw...)
	g.GET("/members/:id", h.Get, mw...)
	g.GET("/members/:id/detail", h.GetDetail, mw...)
	g.PUT("/members/:id", h.Update, mw...)
	g.DELETE("/members/:id", h.Delete, mw...)
	
	g.GET("/employees", h.ListEmployees, mw...)
	g.GET("/employees/available", h.ListAvailableEmployees, mw...)
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

// BulkCreate godoc
// @Summary Tambah anggota massal
// @Tags koperasi-anggota
// @Security ApiKeyAuth
// @Param request body anggota.BulkCreateRequest true "Data anggota"
// @Success 201 {object} dto.SuccessResponse{data=[]anggota.Response}
// @Router /v1/koperasi/members/bulk [post]
func (h *Handler) BulkCreate(c echo.Context) error {
	var req BulkCreateRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}
	items, err := h.svc.BulkCreate(req)
	if err != nil {
		return fail(c, err)
	}
	return c.JSON(http.StatusCreated, dto.SuccessResponse{Message: "Berhasil menambah anggota massal", Data: items})
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

// GetDetail godoc
// @Summary Detail anggota beserta rekap pinjaman
// @Tags koperasi-anggota
// @Security ApiKeyAuth
// @Param id path int true "Member ID"
// @Success 200 {object} dto.SuccessResponse{data=anggota.DetailResponse}
// @Router /v1/koperasi/members/{id}/detail [get]
func (h *Handler) GetDetail(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}
	item, err := h.svc.GetDetail(uint(id))
	if err != nil {
		return fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil detail anggota", Data: item})
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

// ListEmployees godoc
// @Summary List data referensi pegawai
// @Tags koperasi-anggota
// @Security ApiKeyAuth
// @Param search query string false "Cari nama"
// @Success 200 {object} dto.SuccessResponse{data=[]anggota.EmployeeResponse}
// @Router /v1/koperasi/employees [get]
func (h *Handler) ListEmployees(c echo.Context) error {
	items, err := h.empRep.FindAll(c.QueryParam("search"))
	if err != nil {
		return fail(c, err)
	}
	out := make([]EmployeeResponse, 0, len(items))
	for _, it := range items {
		out = append(out, toEmployeeResponse(it))
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil daftar pegawai", Data: out})
}

// ListAvailableEmployees godoc
// @Summary List pegawai yang belum jadi anggota
// @Tags koperasi-anggota
// @Security ApiKeyAuth
// @Param search query string false "Cari nama"
// @Success 200 {object} dto.SuccessResponse{data=[]anggota.EmployeeResponse}
// @Router /v1/koperasi/employees/available [get]
func (h *Handler) ListAvailableEmployees(c echo.Context) error {
	items, err := h.empRep.FindAvailable(c.QueryParam("search"))
	if err != nil {
		return fail(c, err)
	}
	out := make([]EmployeeResponse, 0, len(items))
	for _, it := range items {
		out = append(out, toEmployeeResponse(it))
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil daftar pegawai tersedia", Data: out})
}
