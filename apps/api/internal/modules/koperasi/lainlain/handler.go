package lainlain

import (
	"net/http"
	"strconv"

	"api/dto"
	"api/internal/modules/koperasi/kas"
	"api/middleware"
	"api/repository"
	"api/utility"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type Handler struct{ svc Service }

func NewHandler(svc Service) *Handler { return &Handler{svc: svc} }

// New merangkai fitur lain-lain dengan dependency bersama dari modul.
func New(db *gorm.DB, cashWriter kas.Writer, ayRepo repository.AcademicYearRepository) *Handler {
	return NewHandler(NewService(db, NewRepository(db), cashWriter, ayRepo))
}

func (h *Handler) RegisterRoutes(g *echo.Group, mw ...echo.MiddlewareFunc) {
	g.GET("/misc-transactions", h.List, mw...)
	g.POST("/misc-transactions", h.Create, mw...)
	g.GET("/misc-transactions/:id", h.Get, mw...)
}

func fail(c echo.Context, err error) error {
	status, code := utility.GetErrorStatusAndCode(err)
	return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
}

// List godoc
// @Summary List transaksi lain-lain
// @Tags koperasi-lain-lain
// @Security ApiKeyAuth
// @Param academic_year_id query int false "Tahun ajaran"
// @Param flow query string false "income|expense"
// @Param page query int false "Halaman"
// @Param limit query int false "Per halaman"
// @Success 200 {object} dto.PaginatedResponse{data=[]lainlain.Response}
// @Router /v1/koperasi/misc-transactions [get]
func (h *Handler) List(c echo.Context) error {
	page, _ := strconv.Atoi(c.QueryParam("page"))
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	ayID, _ := strconv.Atoi(c.QueryParam("academic_year_id"))
	p := QueryParams{
		AcademicYearID: uint(ayID),
		Flow:           c.QueryParam("flow"),
		Page:           page,
		Limit:          limit,
	}
	items, total, err := h.svc.List(p)
	if err != nil {
		return fail(c, err)
	}
	np, nl := utility.NormalizePagination(p.Page, p.Limit)
	return c.JSON(http.StatusOK, dto.PaginatedResponse{
		Message: "Berhasil mengambil daftar transaksi lain-lain",
		Data:    items,
		Meta:    dto.Meta{Page: np, Limit: nl, Total: total},
	})
}

// Create godoc
// @Summary Catat transaksi lain-lain (pemasukan/pengeluaran)
// @Tags koperasi-lain-lain
// @Security ApiKeyAuth
// @Param request body lainlain.CreateRequest true "Data transaksi"
// @Success 201 {object} dto.SuccessResponse{data=lainlain.Response}
// @Router /v1/koperasi/misc-transactions [post]
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
	return c.JSON(http.StatusCreated, dto.SuccessResponse{Message: "Berhasil mencatat transaksi lain-lain", Data: item})
}

// Get godoc
// @Summary Detail transaksi lain-lain
// @Tags koperasi-lain-lain
// @Security ApiKeyAuth
// @Param id path int true "Misc Transaction ID"
// @Success 200 {object} dto.SuccessResponse{data=lainlain.Response}
// @Router /v1/koperasi/misc-transactions/{id} [get]
func (h *Handler) Get(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}
	item, err := h.svc.Get(uint(id))
	if err != nil {
		return fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil transaksi lain-lain", Data: item})
}
