package pembelian

import (
	"net/http"
	"strconv"

	"api/dto"
	"api/internal/modules/koperasi/barang"
	"api/internal/modules/koperasi/pemasok"
	"api/internal/modules/koperasi/pembayaran"
	"api/middleware"
	"api/repository"
	"api/utility"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type Handler struct{ svc Service }

func NewHandler(svc Service) *Handler { return &Handler{svc: svc} }

// New merangkai fitur pembelian dengan dependency bersama dari modul.
func New(
	db *gorm.DB,
	paymentSvc pembayaran.Service,
	barangRepo barang.Repository,
	supplierRepo pemasok.Repository,
	ayRepo repository.AcademicYearRepository,
) *Handler {
	return NewHandler(NewService(db, NewRepository(db), barangRepo, supplierRepo, paymentSvc, ayRepo))
}

func (h *Handler) RegisterRoutes(g *echo.Group, mw ...echo.MiddlewareFunc) {
	g.GET("/purchases", h.List, mw...)
	g.POST("/purchases", h.Create, mw...)
	g.GET("/purchases/:id", h.Get, mw...)
	g.POST("/purchases/:id/payments", h.Pay, mw...)
}

func fail(c echo.Context, err error) error {
	status, code := utility.GetErrorStatusAndCode(err)
	return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
}

// List godoc
// @Summary List pembelian koperasi
// @Tags koperasi-pembelian
// @Security ApiKeyAuth
// @Param academic_year_id query int false "Tahun ajaran"
// @Param supplier_id query int false "Pemasok"
// @Param status query string false "unpaid|partial|paid"
// @Param page query int false "Halaman"
// @Param limit query int false "Per halaman"
// @Success 200 {object} dto.PaginatedResponse{data=[]pembelian.Response}
// @Router /v1/koperasi/purchases [get]
func (h *Handler) List(c echo.Context) error {
	page, limit := utility.ParsePagination(c)
	ayID, _ := strconv.Atoi(c.QueryParam("academic_year_id"))
	supID, _ := strconv.Atoi(c.QueryParam("supplier_id"))
	p := QueryParams{
		AcademicYearID: uint(ayID),
		SupplierID:     uint(supID),
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
		Message: "Berhasil mengambil daftar pembelian",
		Data:    items,
		Meta:    dto.Meta{Page: np, Limit: nl, Total: total},
	})
}

// Create godoc
// @Summary Catat pembelian/restock
// @Tags koperasi-pembelian
// @Security ApiKeyAuth
// @Param request body pembelian.CreateRequest true "Data pembelian"
// @Success 201 {object} dto.SuccessResponse{data=pembelian.Response}
// @Router /v1/koperasi/purchases [post]
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
	return c.JSON(http.StatusCreated, dto.SuccessResponse{Message: "Berhasil mencatat pembelian", Data: item})
}

// Get godoc
// @Summary Detail pembelian
// @Tags koperasi-pembelian
// @Security ApiKeyAuth
// @Param id path int true "Purchase ID"
// @Success 200 {object} dto.SuccessResponse{data=pembelian.Response}
// @Router /v1/koperasi/purchases/{id} [get]
func (h *Handler) Get(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}
	item, err := h.svc.Get(uint(id))
	if err != nil {
		return fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil pembelian", Data: item})
}

// Pay godoc
// @Summary Bayar (cicil) hutang pembelian
// @Tags koperasi-pembelian
// @Security ApiKeyAuth
// @Param id path int true "Purchase ID"
// @Param request body pembelian.PaymentRequest true "Pembayaran"
// @Success 200 {object} dto.SuccessResponse{data=pembelian.Response}
// @Router /v1/koperasi/purchases/{id}/payments [post]
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
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mencatat pembayaran pembelian", Data: item})
}
