package penjualan

import (
	"net/http"
	"strconv"

	"api/dto"
	"api/internal/modules/koperasi/barang"
	"api/internal/modules/koperasi/pembayaran"
	"api/middleware"
	"api/repository"
	"api/utility"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type Handler struct{ svc Service }

func NewHandler(svc Service) *Handler { return &Handler{svc: svc} }

// New merangkai fitur penjualan dengan dependency bersama dari modul.
func New(
	db *gorm.DB,
	paymentSvc pembayaran.Service,
	barangRepo barang.Repository,
	studentRepo repository.StudentRepository,
	ayRepo repository.AcademicYearRepository,
) *Handler {
	return NewHandler(NewService(db, NewRepository(db), barangRepo, studentRepo, paymentSvc, ayRepo))
}

func (h *Handler) RegisterRoutes(g *echo.Group, mw ...echo.MiddlewareFunc) {
	g.GET("/sales", h.List, mw...)
	g.POST("/sales", h.Create, mw...)
	g.GET("/sales/:id", h.Get, mw...)
	g.POST("/sales/:id/payments", h.Pay, mw...)
}

func fail(c echo.Context, err error) error {
	status, code := utility.GetErrorStatusAndCode(err)
	return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
}

// List godoc
// @Summary List penjualan koperasi
// @Tags koperasi-penjualan
// @Security ApiKeyAuth
// @Param academic_year_id query int false "Tahun ajaran"
// @Param student_id query int false "Siswa"
// @Param status query string false "unpaid|partial|paid"
// @Param page query int false "Halaman"
// @Param limit query int false "Per halaman"
// @Success 200 {object} dto.PaginatedResponse{data=[]penjualan.Response}
// @Router /v1/koperasi/sales [get]
func (h *Handler) List(c echo.Context) error {
	page, _ := strconv.Atoi(c.QueryParam("page"))
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	ayID, _ := strconv.Atoi(c.QueryParam("academic_year_id"))
	stID, _ := strconv.Atoi(c.QueryParam("student_id"))
	p := QueryParams{
		AcademicYearID: uint(ayID),
		StudentID:      uint(stID),
		Status:         c.QueryParam("status"),
		Page:           page,
		Limit:          limit,
	}
	items, total, err := h.svc.List(p)
	if err != nil {
		return fail(c, err)
	}
	np, nl := utility.NormalizePagination(p.Page, p.Limit)
	return c.JSON(http.StatusOK, dto.PaginatedResponse{
		Message: "Berhasil mengambil daftar penjualan",
		Data:    items,
		Meta:    dto.Meta{Page: np, Limit: nl, Total: total},
	})
}

// Create godoc
// @Summary Catat penjualan
// @Tags koperasi-penjualan
// @Security ApiKeyAuth
// @Param request body penjualan.CreateRequest true "Data penjualan"
// @Success 201 {object} dto.SuccessResponse{data=penjualan.Response}
// @Router /v1/koperasi/sales [post]
func (h *Handler) Create(c echo.Context) error {
	var req CreateRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}
	createdBy, err := middleware.GetUserID(c)
	if err != nil {
		return err
	}
	item, err := h.svc.Create(req, createdBy)
	if err != nil {
		return fail(c, err)
	}
	return c.JSON(http.StatusCreated, dto.SuccessResponse{Message: "Berhasil mencatat penjualan", Data: item})
}

// Get godoc
// @Summary Detail penjualan
// @Tags koperasi-penjualan
// @Security ApiKeyAuth
// @Param id path int true "Sale ID"
// @Success 200 {object} dto.SuccessResponse{data=penjualan.Response}
// @Router /v1/koperasi/sales/{id} [get]
func (h *Handler) Get(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}
	item, err := h.svc.Get(uint(id))
	if err != nil {
		return fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil penjualan", Data: item})
}

// Pay godoc
// @Summary Bayar (cicil) piutang penjualan
// @Tags koperasi-penjualan
// @Security ApiKeyAuth
// @Param id path int true "Sale ID"
// @Param request body penjualan.PaymentRequest true "Pembayaran"
// @Success 200 {object} dto.SuccessResponse{data=penjualan.Response}
// @Router /v1/koperasi/sales/{id}/payments [post]
func (h *Handler) Pay(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}
	var req PaymentRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}
	createdBy, err := middleware.GetUserID(c)
	if err != nil {
		return err
	}
	item, err := h.svc.Pay(uint(id), req, createdBy)
	if err != nil {
		return fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mencatat pembayaran penjualan", Data: item})
}
