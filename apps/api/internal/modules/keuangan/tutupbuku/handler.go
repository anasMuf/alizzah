package tutupbuku

import (
	"api/dto"
	"api/middleware"
	"api/utility"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type Handler struct{ svc Service }

func New(db *gorm.DB) *Handler {
	return &Handler{svc: NewService(db, NewRepository(db))}
}

func (h *Handler) Models() []any { return Models() }

func (h *Handler) RegisterRoutes(api *echo.Group, jwt echo.MiddlewareFunc, guard *middleware.ModuleGuard) {
	manage := guard.RequireModule(middleware.ModuleKeuangan)
	view := guard.RequireModule(middleware.ModuleKeuangan, middleware.ModuleLaporan)
	dc := api.Group("/daily-closings", jwt)
	dc.GET("", h.List, view)
	dc.POST("", h.Create, manage)
	dc.GET("/:id", h.Get, view)
	dc.PATCH("/:id/confirm", h.Confirm, manage)
}

func (h *Handler) List(c echo.Context) error {
	page, _ := strconv.Atoi(c.QueryParam("page"))
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	academicYearID, _ := strconv.Atoi(c.QueryParam("academic_year_id"))
	var isConfirmed *bool
	if v := c.QueryParam("is_confirmed"); v != "" {
		b, _ := strconv.ParseBool(v); isConfirmed = &b
	}
	dcs, meta, err := h.svc.GetAll(QueryParams{
		AcademicYearID: uint(academicYearID),
		StartDate: c.QueryParam("start_date"), EndDate: c.QueryParam("end_date"),
		IsConfirmed: isConfirmed, Page: page, Limit: limit,
	})
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}
	return c.JSON(http.StatusOK, dto.PaginatedResponse{Message: "Berhasil mengambil riwayat tutup buku", Data: dcs, Meta: *meta})
}

func (h *Handler) Get(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	dc, err := h.svc.GetByID(uint(id))
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil detail tutup buku", Data: dc})
}

func (h *Handler) Create(c echo.Context) error {
	var req CreateRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}
	createdBy, err := middleware.GetUserID(c)
	if err != nil { return err }
	dc, err := h.svc.Create(createdBy, req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}
	return c.JSON(http.StatusCreated, dto.SuccessResponse{Message: "Berhasil membuat catatan tutup buku", Data: dc})
}

func (h *Handler) Confirm(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	var req ConfirmRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if _, err := middleware.GetUserID(c); err != nil { return err }
	if err := h.svc.Confirm(uint(id), req); err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Tutup buku berhasil dikonfirmasi"})
}
