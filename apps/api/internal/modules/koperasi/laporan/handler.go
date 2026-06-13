package laporan

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

// New merangkai fitur laporan (read-only).
func New(db *gorm.DB) *Handler { return NewHandler(NewService(NewRepository(db))) }

func (h *Handler) RegisterRoutes(g *echo.Group, mw ...echo.MiddlewareFunc) {
	g.GET("/reports/monthly", h.Monthly, mw...)
	g.GET("/reports/profit-loss", h.ProfitLoss, mw...)
	g.GET("/reports/receivables", h.Receivables, mw...)
	g.GET("/reports/payables", h.Payables, mw...)
	g.GET("/reports/stock", h.Stock, mw...)
}

func fail(c echo.Context, err error) error {
	status, code := utility.GetErrorStatusAndCode(err)
	return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
}

// Monthly godoc
// @Summary Laporan bulanan arus kas per kategori
// @Tags koperasi-laporan
// @Security ApiKeyAuth
// @Param academic_year_id query int false "Tahun ajaran"
// @Param month query int false "Bulan (1-12)"
// @Param year query int false "Tahun"
// @Success 200 {object} dto.SuccessResponse{data=laporan.MonthlyReport}
// @Router /v1/koperasi/reports/monthly [get]
func (h *Handler) Monthly(c echo.Context) error {
	ayID, _ := strconv.Atoi(c.QueryParam("academic_year_id"))
	month, _ := strconv.Atoi(c.QueryParam("month"))
	year, _ := strconv.Atoi(c.QueryParam("year"))
	res, err := h.svc.Monthly(uint(ayID), month, year)
	if err != nil {
		return fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Laporan bulanan koperasi", Data: res})
}

// ProfitLoss godoc
// @Summary Laporan laba-rugi koperasi
// @Tags koperasi-laporan
// @Security ApiKeyAuth
// @Param academic_year_id query int false "Tahun ajaran"
// @Param start_date query string false "YYYY-MM-DD"
// @Param end_date query string false "YYYY-MM-DD"
// @Success 200 {object} dto.SuccessResponse{data=laporan.ProfitLoss}
// @Router /v1/koperasi/reports/profit-loss [get]
func (h *Handler) ProfitLoss(c echo.Context) error {
	ayID, _ := strconv.Atoi(c.QueryParam("academic_year_id"))
	res, err := h.svc.ProfitLoss(uint(ayID), c.QueryParam("start_date"), c.QueryParam("end_date"))
	if err != nil {
		return fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Laba-rugi koperasi", Data: res})
}

// Receivables godoc
// @Summary Rekap piutang penjualan (belum lunas)
// @Tags koperasi-laporan
// @Security ApiKeyAuth
// @Param academic_year_id query int false "Tahun ajaran"
// @Success 200 {object} dto.SuccessResponse{data=laporan.OutstandingReport}
// @Router /v1/koperasi/reports/receivables [get]
func (h *Handler) Receivables(c echo.Context) error {
	ayID, _ := strconv.Atoi(c.QueryParam("academic_year_id"))
	res, err := h.svc.Receivables(uint(ayID))
	if err != nil {
		return fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Rekap piutang koperasi", Data: res})
}

// Payables godoc
// @Summary Rekap hutang pembelian (belum lunas)
// @Tags koperasi-laporan
// @Security ApiKeyAuth
// @Param academic_year_id query int false "Tahun ajaran"
// @Success 200 {object} dto.SuccessResponse{data=laporan.OutstandingReport}
// @Router /v1/koperasi/reports/payables [get]
func (h *Handler) Payables(c echo.Context) error {
	ayID, _ := strconv.Atoi(c.QueryParam("academic_year_id"))
	res, err := h.svc.Payables(uint(ayID))
	if err != nil {
		return fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Rekap hutang koperasi", Data: res})
}

// Stock godoc
// @Summary Laporan stok & nilai persediaan
// @Tags koperasi-laporan
// @Security ApiKeyAuth
// @Success 200 {object} dto.SuccessResponse{data=laporan.StockReport}
// @Router /v1/koperasi/reports/stock [get]
func (h *Handler) Stock(c echo.Context) error {
	res, err := h.svc.Stock()
	if err != nil {
		return fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Laporan stok koperasi", Data: res})
}
