package handler

import (
	"api/dto"
	"api/service"
	"api/utility"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
)

type ReportHandler struct {
	service service.ReportService
}

func NewReportHandler(service service.ReportService) *ReportHandler {
	return &ReportHandler{service: service}
}

// Daily godoc
// @Summary      Daily report
// @Description  Get daily financial report
// @Tags         reports
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        date              query  string  true   "Date (YYYY-MM-DD)"
// @Param        academic_year_id  query  int     false  "Academic Year ID"
// @Success      200               {object}  dto.SuccessResponse{data=dto.DailyReportResponse}
// @Failure      400               {object}  dto.ErrorResponse
// @Failure      401               {object}  dto.ErrorResponse
// @Failure      403               {object}  dto.ErrorResponse
// @Failure      500               {object}  dto.ErrorResponse
// @Router       /v1/reports/daily [get]
func (h *ReportHandler) Daily(c echo.Context) error {
	var req dto.DailyReportRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}

	report, err := h.service.GetDailyReport(req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil laporan harian", Data: report})
}

// Monthly godoc
// @Summary      Monthly report
// @Description  Get monthly financial report
// @Tags         reports
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        month             query  int  true   "Month (1-12)"
// @Param        year              query  int  true   "Year"
// @Param        academic_year_id  query  int  false  "Academic Year ID"
// @Success      200               {object}  dto.SuccessResponse{data=dto.MonthlyReportResponse}
// @Failure      400               {object}  dto.ErrorResponse
// @Failure      401               {object}  dto.ErrorResponse
// @Failure      403               {object}  dto.ErrorResponse
// @Failure      500               {object}  dto.ErrorResponse
// @Router       /v1/reports/monthly [get]
func (h *ReportHandler) Monthly(c echo.Context) error {
	var req dto.MonthlyReportRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}

	report, err := h.service.GetMonthlyReport(req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil laporan bulanan", Data: report})
}

// Annual godoc
// @Summary      Annual report
// @Description  Get annual financial report
// @Tags         reports
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        academic_year_id  query  int  true  "Academic Year ID"
// @Success      200               {object}  dto.SuccessResponse{data=dto.AnnualReportResponse}
// @Failure      400               {object}  dto.ErrorResponse
// @Failure      401               {object}  dto.ErrorResponse
// @Failure      403               {object}  dto.ErrorResponse
// @Failure      500               {object}  dto.ErrorResponse
// @Router       /v1/reports/annual [get]
func (h *ReportHandler) Annual(c echo.Context) error {
	var req dto.AnnualReportRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}

	report, err := h.service.GetAnnualReport(req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil laporan tahunan", Data: report})
}

// ByStudent godoc
// @Summary      Report by student
// @Description  Get financial report for a specific student
// @Tags         reports
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id                path   int   true   "Student ID"
// @Param        academic_year_id  query  int   false  "Academic Year ID"
// @Param        all               query  bool  false  "Across all academic years"
// @Success      200               {object}  dto.SuccessResponse{data=dto.StudentReportResponse}
// @Failure      400               {object}  dto.ErrorResponse
// @Failure      401               {object}  dto.ErrorResponse
// @Failure      403               {object}  dto.ErrorResponse
// @Failure      404               {object}  dto.ErrorResponse
// @Failure      500               {object}  dto.ErrorResponse
// @Router       /v1/reports/students/{id} [get]
func (h *ReportHandler) ByStudent(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}

	var req dto.StudentReportRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}

	report, err := h.service.GetStudentReport(uint(id), req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil laporan siswa", Data: report})
}

// PosisiKas godoc
// @Summary      Cash position report
// @Description  Get cash position report showing balance of all income posts with expense details
// @Tags         reports
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        month             query  int  true   "Month (1-12)"
// @Param        year              query  int  true   "Year"
// @Param        academic_year_id  query  int  false  "Academic Year ID"
// @Success      200               {object}  dto.SuccessResponse{data=dto.PosisiKasResponse}
// @Failure      400               {object}  dto.ErrorResponse
// @Failure      401               {object}  dto.ErrorResponse
// @Failure      403               {object}  dto.ErrorResponse
// @Failure      500               {object}  dto.ErrorResponse
// @Router       /v1/reports/posisi-kas [get]
func (h *ReportHandler) PosisiKas(c echo.Context) error {
	var req dto.PosisiKasRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}

	report, err := h.service.GetPosisiKas(req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil laporan posisi kas", Data: report})
}

// Saldo godoc
// @Summary      Balance report per post or all posts
// @Description  Get daily running balance report, optionally filtered by income post category
// @Tags         reports
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        month             query  int     true   "Month (1-12)"
// @Param        year              query  int     true   "Year"
// @Param        category          query  string  false  "Invoice category filter (empty = all posts)"
// @Param        academic_year_id  query  int     false  "Academic Year ID"
// @Success      200               {object}  dto.SuccessResponse{data=dto.SaldoResponse}
// @Failure      400               {object}  dto.ErrorResponse
// @Failure      401               {object}  dto.ErrorResponse
// @Failure      403               {object}  dto.ErrorResponse
// @Failure      500               {object}  dto.ErrorResponse
// @Router       /v1/reports/saldo [get]
func (h *ReportHandler) Saldo(c echo.Context) error {
	var req dto.SaldoRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}

	report, err := h.service.GetSaldo(req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil laporan saldo", Data: report})
}

// TransaksiPengeluaran godoc
// @Summary      Expense transaction report
// @Description  Get list of all expense transactions for a month in block/card format
// @Tags         reports
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        month             query  int  true   "Month (1-12)"
// @Param        year              query  int  true   "Year"
// @Param        academic_year_id  query  int  false  "Academic Year ID"
// @Success      200               {object}  dto.SuccessResponse{data=dto.TransaksiPengeluaranResponse}
// @Failure      400               {object}  dto.ErrorResponse
// @Failure      401               {object}  dto.ErrorResponse
// @Failure      403               {object}  dto.ErrorResponse
// @Failure      500               {object}  dto.ErrorResponse
// @Router       /v1/reports/transaksi-pengeluaran [get]
func (h *ReportHandler) TransaksiPengeluaran(c echo.Context) error {
	var req dto.TransaksiPengeluaranRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}

	report, err := h.service.GetTransaksiPengeluaran(req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil laporan transaksi pengeluaran", Data: report})
}

// TabunganReport godoc
// @Summary      Savings report
// @Description  Get savings transaction report with daily running balance, optionally filtered by type (general/mandatory)
// @Tags         reports
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        month  query  int     true   "Month (1-12)"
// @Param        year   query  int     true   "Year"
// @Param        type   query  string  false  "Savings type filter: general, mandatory, or empty for all"
// @Success      200    {object}  dto.SuccessResponse{data=dto.TabunganReportResponse}
// @Failure      400    {object}  dto.ErrorResponse
// @Failure      401    {object}  dto.ErrorResponse
// @Failure      403    {object}  dto.ErrorResponse
// @Failure      500    {object}  dto.ErrorResponse
// @Router       /v1/reports/tabungan [get]
func (h *ReportHandler) TabunganReport(c echo.Context) error {
	var req dto.TabunganReportRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}

	report, err := h.service.GetTabunganReport(req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil laporan tabungan", Data: report})
}

// TabunganSiswaReport godoc
// @Summary      Savings report per student
// @Description  Get individual student savings report with running balance for print
// @Tags         reports
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id          path   int     true   "Student ID"
// @Param        start_date  query  string  false  "Start Date (YYYY-MM-DD)"
// @Param        end_date    query  string  false  "End Date (YYYY-MM-DD)"
// @Success      200         {object}  dto.SuccessResponse{data=dto.TabunganSiswaReportResponse}
// @Failure      400         {object}  dto.ErrorResponse
// @Failure      401         {object}  dto.ErrorResponse
// @Failure      404         {object}  dto.ErrorResponse
// @Router       /v1/reports/savings/students/{id} [get]
func (h *ReportHandler) TabunganSiswaReport(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID siswa tidak valid"})
	}

	var req dto.TabunganSiswaReportRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}

	report, err := h.service.GetTabunganSiswaReport(uint(id), req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil laporan tabungan siswa", Data: report})
}

// ByClassGroup godoc
// @Summary      Report by class group
// @Description  Get financial report for a specific class group
// @Tags         reports
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id                path   int  true   "Class Group ID"
// @Param        month             query  int  true   "Month (1-12)"
// @Param        year              query  int  true   "Year"
// @Param        academic_year_id  query  int  false  "Academic Year ID"
// @Success      200               {object}  dto.SuccessResponse{data=dto.ClassGroupReportResponse}
// @Failure      400               {object}  dto.ErrorResponse
// @Failure      401               {object}  dto.ErrorResponse
// @Failure      403               {object}  dto.ErrorResponse
// @Failure      404               {object}  dto.ErrorResponse
// @Failure      500               {object}  dto.ErrorResponse
// @Router       /v1/reports/class-groups/{id} [get]
func (h *ReportHandler) ByClassGroup(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}

	var req dto.ClassGroupReportRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}

	report, err := h.service.GetClassGroupReport(uint(id), req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil laporan kelas", Data: report})
}

// Pemasukan godoc
// @Summary      Income report
// @Description  Get income transactions grouped by date with filter options
// @Tags         reports
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        date_from         query  string  true   "Start date (YYYY-MM-DD)"
// @Param        date_to           query  string  true   "End date (YYYY-MM-DD)"
// @Param        payment_method    query  string  false  "Payment method filter (tunai/tabungan)"
// @Param        fee_item_ids      query  string  false  "Comma-separated fee config item IDs"
// @Param        academic_year_id  query  int     false  "Academic Year ID"
// @Success      200               {object}  dto.SuccessResponse{data=dto.PemasukanResponse}
// @Failure      400               {object}  dto.ErrorResponse
// @Failure      401               {object}  dto.ErrorResponse
// @Failure      403               {object}  dto.ErrorResponse
// @Failure      500               {object}  dto.ErrorResponse
// @Router       /v1/reports/pemasukan [get]
func (h *ReportHandler) Pemasukan(c echo.Context) error {
	var req dto.PemasukanRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}

	report, err := h.service.GetPemasukan(req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil laporan pemasukan", Data: report})
}

// Pengeluaran godoc
// @Summary      Expense report
// @Description  Get expense transactions grouped by date with filter options
// @Tags         reports
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        date_from             query  string  true   "Start date (YYYY-MM-DD)"
// @Param        date_to               query  string  true   "End date (YYYY-MM-DD)"
// @Param        payment_method        query  string  false  "Payment method filter (tunai/tabungan)"
// @Param        fee_item_ids          query  string  false  "Comma-separated fee config item IDs"
// @Param        expense_category_ids  query  string  false  "Comma-separated expense category IDs"
// @Param        academic_year_id      query  int     false  "Academic Year ID"
// @Success      200                   {object}  dto.SuccessResponse{data=dto.PengeluaranResponse}
// @Failure      400                   {object}  dto.ErrorResponse
// @Failure      401                   {object}  dto.ErrorResponse
// @Failure      403                   {object}  dto.ErrorResponse
// @Failure      500                   {object}  dto.ErrorResponse
// @Router       /v1/reports/pengeluaran [get]
func (h *ReportHandler) Pengeluaran(c echo.Context) error {
	var req dto.PengeluaranRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}

	report, err := h.service.GetPengeluaran(req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil laporan pengeluaran", Data: report})
}
