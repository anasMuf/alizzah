package pinjaman

import (
	"net/http"
	"strconv"

	"api/dto"
	"api/internal/modules/koperasi/anggota"
	"api/internal/modules/koperasi/kas"
	"api/internal/modules/koperasi/pembayaran"
	"api/middleware"
	"api/repository"
	"api/utility"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type Handler struct{ svc Service }

func NewHandler(svc Service) *Handler { return &Handler{svc: svc} }

// New merangkai fitur pinjaman dengan dependency bersama dari modul.
func New(
	db *gorm.DB,
	paymentSvc pembayaran.Service,
	cashWriter kas.Writer,
	ayRepo repository.AcademicYearRepository,
) *Handler {
	return NewHandler(NewService(db, NewRepository(db), anggota.NewRepository(db), cashWriter, paymentSvc, ayRepo))
}

func (h *Handler) RegisterRoutes(g *echo.Group, mw ...echo.MiddlewareFunc) {
	g.GET("/loans", h.List, mw...)
	g.POST("/loans", h.Create, mw...)
	g.GET("/loans/summary", h.Summary, mw...)
	g.GET("/loans/:id", h.Get, mw...)
	g.GET("/loans/:id/installments", h.GetInstallments, mw...)
	g.POST("/loans/:id/payments", h.Pay, mw...)
}

func fail(c echo.Context, err error) error {
	status, code := utility.GetErrorStatusAndCode(err)
	return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
}

// List godoc
// @Summary List pinjaman koperasi
// @Tags koperasi-pinjaman
// @Security ApiKeyAuth
// @Param academic_year_id query int false "Tahun ajaran"
// @Param member_id query int false "Anggota"
// @Param status query string false "unpaid|partial|paid"
// @Param page query int false "Halaman"
// @Param limit query int false "Per halaman"
// @Success 200 {object} dto.PaginatedResponse{data=[]pinjaman.Response}
// @Router /v1/koperasi/loans [get]
func (h *Handler) List(c echo.Context) error {
	page, _ := strconv.Atoi(c.QueryParam("page"))
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	ayID, _ := strconv.Atoi(c.QueryParam("academic_year_id"))
	memID, _ := strconv.Atoi(c.QueryParam("member_id"))
	p := QueryParams{
		AcademicYearID: uint(ayID),
		MemberID:       uint(memID),
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
		Message: "Berhasil mengambil daftar pinjaman",
		Data:    items,
		Meta:    dto.Meta{Page: np, Limit: nl, Total: total},
	})
}

// Create godoc
// @Summary Catat pinjaman anggota
// @Tags koperasi-pinjaman
// @Security ApiKeyAuth
// @Param request body pinjaman.CreateRequest true "Data pinjaman"
// @Success 201 {object} dto.SuccessResponse{data=pinjaman.Response}
// @Router /v1/koperasi/loans [post]
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
	return c.JSON(http.StatusCreated, dto.SuccessResponse{Message: "Berhasil mencatat pinjaman", Data: item})
}

// Summary godoc
// @Summary Rekap pinjaman per anggota (hutang/terbayar/sisa)
// @Tags koperasi-pinjaman
// @Security ApiKeyAuth
// @Param academic_year_id query int false "Tahun ajaran"
// @Success 200 {object} dto.SuccessResponse{data=[]pinjaman.SummaryItem}
// @Router /v1/koperasi/loans/summary [get]
func (h *Handler) Summary(c echo.Context) error {
	ayID, _ := strconv.Atoi(c.QueryParam("academic_year_id"))
	items, err := h.svc.Summary(uint(ayID))
	if err != nil {
		return fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Rekap pinjaman per anggota", Data: items})
}

// Get godoc
// @Summary Detail pinjaman (beserta jadwal angsuran)
// @Tags koperasi-pinjaman
// @Security ApiKeyAuth
// @Param id path int true "Loan ID"
// @Success 200 {object} dto.SuccessResponse{data=pinjaman.Response}
// @Router /v1/koperasi/loans/{id} [get]
func (h *Handler) Get(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}
	item, err := h.svc.Get(uint(id))
	if err != nil {
		return fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil pinjaman", Data: item})
}

// GetInstallments godoc
// @Summary Jadwal angsuran pinjaman
// @Tags koperasi-pinjaman
// @Security ApiKeyAuth
// @Param id path int true "Loan ID"
// @Success 200 {object} dto.SuccessResponse{data=[]pinjaman.InstallmentResponse}
// @Router /v1/koperasi/loans/{id}/installments [get]
func (h *Handler) GetInstallments(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}
	item, err := h.svc.Get(uint(id))
	if err != nil {
		return fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Jadwal angsuran", Data: item.Installments})
}

// Pay godoc
// @Summary Bayar angsuran pinjaman (fleksibel)
// @Tags koperasi-pinjaman
// @Security ApiKeyAuth
// @Param id path int true "Loan ID"
// @Param request body pinjaman.PaymentRequest true "Pembayaran"
// @Success 200 {object} dto.SuccessResponse{data=pinjaman.Response}
// @Router /v1/koperasi/loans/{id}/payments [post]
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
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mencatat angsuran", Data: item})
}
