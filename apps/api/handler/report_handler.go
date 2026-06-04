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
