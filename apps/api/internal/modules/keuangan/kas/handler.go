package kas

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
	view := guard.RequireModule(middleware.ModuleKeuangan, middleware.ModuleLaporan)
	cash := api.Group("/cash", jwt)
	cash.GET("/balance", h.GetBalance, view)
	cash.GET("/transactions", h.GetTransactions, view)
	cash.POST("/transfers", h.TransferToVault, guard.RequireModule(middleware.ModuleKeuangan))
}

func (h *Handler) GetBalance(c echo.Context) error {
	academicYearID, _ := strconv.Atoi(c.QueryParam("academic_year_id"))
	balance, err := h.svc.GetBalance(uint(academicYearID))
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil saldo kas", Data: balance})
}

func (h *Handler) GetTransactions(c echo.Context) error {
	page, _ := strconv.Atoi(c.QueryParam("page"))
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	academicYearID, _ := strconv.Atoi(c.QueryParam("academic_year_id"))
	params := QueryParams{
		AcademicYearID:  uint(academicYearID),
		TransactionType: c.QueryParam("transaction_type"),
		SourceType:      c.QueryParam("source_type"),
		StartDate:       c.QueryParam("start_date"),
		EndDate:         c.QueryParam("end_date"),
		Page:            page, Limit: limit,
	}
	txns, meta, err := h.svc.GetTransactions(params)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}
	return c.JSON(http.StatusOK, dto.PaginatedResponse{Message: "Berhasil mengambil riwayat transaksi kas", Data: txns, Meta: *meta})
}

func (h *Handler) TransferToVault(c echo.Context) error {
	var req TransferRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}
	academicYearID, _ := strconv.Atoi(c.QueryParam("academic_year_id"))
	createdBy, err := middleware.GetUserID(c)
	if err != nil {
		return err
	}
	if err := h.svc.TransferToVault(createdBy, req, uint(academicYearID)); err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil memindahkan kas ke berangkas"})
}
