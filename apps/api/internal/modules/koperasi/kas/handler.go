package kas

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

// New merangkai repository → service → handler untuk fitur kas.
func New(db *gorm.DB) *Handler { return NewHandler(NewService(NewRepository(db))) }

func (h *Handler) RegisterRoutes(g *echo.Group, mw ...echo.MiddlewareFunc) {
	g.GET("/cash/balance", h.Balance, mw...)
	g.GET("/cash/transactions", h.Transactions, mw...)
}

func fail(c echo.Context, err error) error {
	status, code := utility.GetErrorStatusAndCode(err)
	return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
}

// Balance godoc
// @Summary Saldo kas koperasi
// @Tags koperasi-kas
// @Security ApiKeyAuth
// @Param academic_year_id query int false "Tahun ajaran"
// @Success 200 {object} dto.SuccessResponse{data=kas.BalanceResponse}
// @Router /v1/koperasi/cash/balance [get]
func (h *Handler) Balance(c echo.Context) error {
	ayID, _ := strconv.Atoi(c.QueryParam("academic_year_id"))
	res, err := h.svc.Balance(uint(ayID))
	if err != nil {
		return fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Saldo kas koperasi", Data: res})
}

// Transactions godoc
// @Summary Jurnal arus kas koperasi
// @Tags koperasi-kas
// @Security ApiKeyAuth
// @Param academic_year_id query int false "Tahun ajaran"
// @Param source_type query string false "Filter sumber"
// @Param transaction_type query string false "credit|debit"
// @Param start_date query string false "YYYY-MM-DD"
// @Param end_date query string false "YYYY-MM-DD"
// @Param page query int false "Halaman"
// @Param limit query int false "Per halaman"
// @Success 200 {object} dto.PaginatedResponse{data=[]kas.TransactionResponse}
// @Router /v1/koperasi/cash/transactions [get]
func (h *Handler) Transactions(c echo.Context) error {
	page, limit := utility.ParsePagination(c)
	ayID, _ := strconv.Atoi(c.QueryParam("academic_year_id"))
	p := QueryParams{
		AcademicYearID:  uint(ayID),
		TransactionType: c.QueryParam("transaction_type"),
		SourceType:      c.QueryParam("source_type"),
		StartDate:       c.QueryParam("start_date"),
		EndDate:         c.QueryParam("end_date"),
		Page:            page,
		Limit:           limit,
	}
	items, total, err := h.svc.Transactions(p)
	if err != nil {
		return fail(c, err)
	}
	np, nl := utility.NormalizePagination(p.Page, p.Limit)
	return c.JSON(http.StatusOK, dto.PaginatedResponse{
		Message: "Jurnal arus kas koperasi",
		Data:    items,
		Meta:    dto.Meta{Page: np, Limit: nl, Total: total},
	})
}
