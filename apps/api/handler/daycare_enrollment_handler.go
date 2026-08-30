package handler

import (
	"api/dto"
	"api/middleware"
	"api/service"
	"api/utility"
	"fmt"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
)

type DaycareEnrollmentHandler struct {
	daycareService service.DaycareEnrollmentService
	invoiceGen     service.InvoiceGenerateService
}

func NewDaycareEnrollmentHandler(daycareService service.DaycareEnrollmentService, invoiceGen service.InvoiceGenerateService) *DaycareEnrollmentHandler {
	return &DaycareEnrollmentHandler{daycareService: daycareService, invoiceGen: invoiceGen}
}

// List godoc
// @Summary      List daycare enrollments
// @Description  Get a paginated list of daycare enrollments
// @Tags         daycare-enrollments
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        status            query   string  false  "Filter by status"
// @Param        search            query   string  false  "Search by student name"
// @Param        academic_year_id  query   int     false  "Academic Year ID"
// @Param        page              query   int     false  "Page number"
// @Param        limit             query   int     false  "Items per page"
// @Success      200  {object}  dto.PaginatedResponse{data=[]dto.DaycareEnrollmentResponse}
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Failure      500  {object}  dto.ErrorResponse
// @Router       /v1/daycare-enrollments [get]
func (h *DaycareEnrollmentHandler) List(c echo.Context) error {
	params := dto.DaycareEnrollmentQueryParams{
		Status: c.QueryParam("status"),
		Search: c.QueryParam("search"),
		Page:   1,
		Limit:  10,
	}

	if ayID := c.QueryParam("academic_year_id"); ayID != "" {
		if id, err := strconv.Atoi(ayID); err == nil {
			params.AcademicYearID = uint(id)
		}
	}
	if p := c.QueryParam("page"); p != "" {
		if page, err := strconv.Atoi(p); err == nil && page > 0 {
			params.Page = page
		}
	}
	if l := c.QueryParam("limit"); l != "" {
		if limit, err := strconv.Atoi(l); err == nil && limit > 0 {
			params.Limit = limit
		}
	}

	des, meta, err := h.daycareService.GetAll(params)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.PaginatedResponse{
		Message: "Berhasil mengambil daftar pendaftaran daycare",
		Data:    des,
		Meta:    *meta,
	})
}

// Get godoc
// @Summary      Get daycare enrollment
// @Description  Get a single daycare enrollment by ID
// @Tags         daycare-enrollments
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id   path      int  true  "Daycare Enrollment ID"
// @Success      200  {object}  dto.SuccessResponse{data=dto.DaycareEnrollmentResponse}
// @Failure      400  {object}  dto.ErrorResponse
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Failure      404  {object}  dto.ErrorResponse
// @Failure      500  {object}  dto.ErrorResponse
// @Router       /v1/daycare-enrollments/{id} [get]
func (h *DaycareEnrollmentHandler) Get(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID tidak valid",
		})
	}

	de, err := h.daycareService.GetByID(uint(id))
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Berhasil mengambil pendaftaran daycare",
		Data:    de,
	})
}

// Create godoc
// @Summary      Create daycare enrollment
// @Description  Create a new daycare enrollment
// @Tags         daycare-enrollments
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        request  body      dto.CreateDaycareEnrollmentRequest  true  "Daycare enrollment data"
// @Success      201      {object}  dto.SuccessResponse{data=dto.DaycareEnrollmentResponse}
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Failure      409      {object}  dto.ErrorResponse
// @Failure      500      {object}  dto.ErrorResponse
// @Router       /v1/daycare-enrollments [post]
func (h *DaycareEnrollmentHandler) Create(c echo.Context) error {
	var req dto.CreateDaycareEnrollmentRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: err.Error(),
		})
	}

	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "VALIDATION_ERROR",
			Message: err.Error(),
		})
	}

	userID := middleware.GetCurrentUserID(c)
	de, err := h.daycareService.Create(userID, req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusCreated, dto.SuccessResponse{
		Message: "Berhasil membuat pendaftaran daycare",
		Data:    de,
	})
}

// Update godoc
// @Summary      Update daycare enrollment
// @Description  Update daycare enrollment details
// @Tags         daycare-enrollments
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id       path      int                                 true  "Daycare Enrollment ID"
// @Param        request  body      dto.CreateDaycareEnrollmentRequest  true  "Updated daycare data"
// @Success      200      {object}  dto.SuccessResponse{data=dto.DaycareEnrollmentResponse}
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Failure      404      {object}  dto.ErrorResponse
// @Failure      500      {object}  dto.ErrorResponse
// @Router       /v1/daycare-enrollments/{id} [put]
func (h *DaycareEnrollmentHandler) Update(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID tidak valid",
		})
	}

	var req dto.CreateDaycareEnrollmentRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: err.Error(),
		})
	}

	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "VALIDATION_ERROR",
			Message: err.Error(),
		})
	}

	de, err := h.daycareService.Update(uint(id), req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Berhasil memperbarui pendaftaran daycare",
		Data:    de,
	})
}

// UpdateStatus godoc
// @Summary      Update daycare status
// @Description  Update the status of a daycare enrollment
// @Tags         daycare-enrollments
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id       path      int                             true  "Daycare Enrollment ID"
// @Param        request  body      dto.UpdateDaycareStatusRequest  true  "Updated status data"
// @Success      200      {object}  dto.SuccessResponse
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Failure      404      {object}  dto.ErrorResponse
// @Failure      500      {object}  dto.ErrorResponse
// @Router       /v1/daycare-enrollments/{id}/status [patch]
func (h *DaycareEnrollmentHandler) UpdateStatus(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID tidak valid",
		})
	}

	var req dto.UpdateDaycareStatusRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: err.Error(),
		})
	}

	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "VALIDATION_ERROR",
			Message: err.Error(),
		})
	}

	if err := h.daycareService.UpdateStatus(uint(id), req); err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Berhasil memperbarui status daycare",
	})
}

// SyncInvoices godoc
// @Summary      Sync daycare monthly invoices
// @Description  Generate missing monthly invoices for all active daycare enrollments
// @Tags         daycare-enrollments
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Success      200  {object}  dto.SuccessResponse{data=dto.DaycareSyncResult}
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Failure      500  {object}  dto.ErrorResponse
// @Router       /v1/daycare-enrollments/sync-invoices [post]
func (h *DaycareEnrollmentHandler) SyncInvoices(c echo.Context) error {
	result, err := h.invoiceGen.SyncDaycareMonthlyInvoices()
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Sinkronisasi tagihan daycare bulanan selesai",
		Data:    result,
	})
}

// PreviewSyncInvoices godoc
// @Summary      Preview daycare sync (dry-run)
// @Description  Hitung rencana sinkronisasi tagihan daycare bulanan TANPA
//
//	mengubah data: per enrollment, premium = akan diproses, regular = dilewati.
//
// @Tags         daycare-enrollments
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Success      200  {object}  dto.SuccessResponse{data=dto.DaycarePreviewResponse}
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Failure      500  {object}  dto.ErrorResponse
// @Router       /v1/daycare-enrollments/preview-sync-invoices [post]
func (h *DaycareEnrollmentHandler) PreviewSyncInvoices(c echo.Context) error {
	result, err := h.invoiceGen.PlanDaycareSync()
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Preview sinkronisasi daycare berhasil dihitung",
		Data:    result,
	})
}

// GenerateMonthlyInvoices godoc
// @Summary      Generate monthly daycare SPD
// @Description  Generate SPD for a specific student/month (Regular: attendance-based)
// @Tags         daycare-enrollments
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        request  body      dto.GenerateDaycareMonthlyRequest  true  "Generate params"
// @Success      200      {object}  dto.SuccessResponse
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Failure      500      {object}  dto.ErrorResponse
// @Router       /v1/daycare-enrollments/generate-monthly [post]
func (h *DaycareEnrollmentHandler) GenerateMonthlyInvoices(c echo.Context) error {
	var req dto.GenerateDaycareMonthlyRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: err.Error(),
		})
	}

	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "VALIDATION_ERROR",
			Message: err.Error(),
		})
	}

	err := h.invoiceGen.GenerateDaycareMonthlyInvoices(dto.GenerateDaycareMonthlyParams{
		StudentID:      req.StudentID,
		AcademicYearID: req.AcademicYearID,
		Month:          req.Month,
		Year:           req.Year,
		CreatedBy:      middleware.GetCurrentUserID(c),
	})
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "SPD daycare berhasil digenerate",
	})
}

// GenerateMonthlyBulk godoc
// @Summary      Generate monthly SPD for all active daycare students
// @Description  Generate SPD for all active daycare students in a given month
// @Tags         daycare-enrollments
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        request  body      dto.GenerateDaycareMonthlyBulkRequest  true  "Generate params"
// @Success      200      {object}  dto.SuccessResponse{data=dto.DaycareSyncResult}
// @Router       /v1/daycare-enrollments/generate-monthly-bulk [post]
func (h *DaycareEnrollmentHandler) GenerateMonthlyBulk(c echo.Context) error {
	var req dto.GenerateDaycareMonthlyBulkRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: err.Error(),
		})
	}

	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "VALIDATION_ERROR",
			Message: err.Error(),
		})
	}

	result, err := h.invoiceGen.GenerateDaycareMonthlyBulk(dto.GenerateDaycareMonthlyParams{
		AcademicYearID: req.AcademicYearID,
		Month:          req.Month,
		Year:           req.Year,
		CreatedBy:      middleware.GetCurrentUserID(c),
	})
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: fmt.Sprintf("SPD daycare berhasil digenerate (%d berhasil, %d skip)", result.TotalSynced, result.TotalSkipped),
		Data:    result,
	})
}

// ─── Attendance ──────────────────────────────────────────────────────

// UpsertAttendance godoc
// @Summary      Upsert daycare attendance
// @Description  Create or update daily attendance for a daycare student
// @Tags         daycare-enrollments
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        request  body  dto.UpsertDaycareAttendanceRequest  true  "Attendance data"
// @Success      200      {object}  dto.SuccessResponse{data=dto.DaycareAttendanceResponse}
// @Router       /v1/daycare/attendance [put]
func (h *DaycareEnrollmentHandler) UpsertAttendance(c echo.Context) error {
	var req dto.UpsertDaycareAttendanceRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Format request tidak valid")
	}
	if err := c.Validate(req); err != nil {
		return err
	}

	userID := middleware.GetCurrentUserID(c)
	result, err := h.daycareService.UpsertAttendance(userID, req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Absensi disimpan", Data: result})
}

// GetAttendance godoc
// @Summary      Get daycare attendance
// @Description  Get daily attendance for a daycare student in a specific month
// @Tags         daycare-enrollments
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        student_id  query   int  true   "Student ID"
// @Param        month       query   int  true   "Month (1-12)"
// @Param        year        query   int  true   "Year"
// @Success      200  {object}  dto.SuccessResponse{data=[]dto.DaycareAttendanceResponse}
// @Router       /v1/daycare/attendance [get]
func (h *DaycareEnrollmentHandler) GetAttendance(c echo.Context) error {
	sid, _ := strconv.Atoi(c.QueryParam("student_id"))
	month, _ := strconv.Atoi(c.QueryParam("month"))
	year, _ := strconv.Atoi(c.QueryParam("year"))

	result, err := h.daycareService.GetAttendance(uint(sid), uint(month), uint(year))
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Data absensi", Data: result})
}

// ─── Monthly Attendance ──────────────────────────────────────

// UpsertMonthlyAttendance godoc
// @Summary      Upsert daycare monthly attendance
// @Description  Create or update monthly attendance (SPD days + meal days) for a daycare student
// @Tags         daycare-enrollments
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        request  body  dto.UpsertDaycareMonthlyAttendanceRequest  true  "Monthly attendance data"
// @Success      200      {object}  dto.SuccessResponse{data=dto.DaycareMonthlyAttendanceResponse}
// @Router       /v1/daycare-enrollments/monthly-attendance [put]
func (h *DaycareEnrollmentHandler) UpsertMonthlyAttendance(c echo.Context) error {
	var req dto.UpsertDaycareMonthlyAttendanceRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Format request tidak valid")
	}
	if err := c.Validate(req); err != nil {
		return err
	}

	userID := middleware.GetCurrentUserID(c)
	result, err := h.daycareService.UpsertMonthlyAttendance(userID, req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Kehadiran bulanan disimpan", Data: result})
}

// GetMonthlyAttendance godoc
// @Summary      Get daycare monthly attendance
// @Description  Get monthly attendance for a daycare student, or all students for a given month
// @Tags         daycare-enrollments
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        student_id       query   int  false  "Student ID (optional, omit for all)"
// @Param        academic_year_id query   int  false  "Academic Year ID"
// @Param        month            query   int  true   "Month (1-12)"
// @Param        year             query   int  true   "Year"
// @Success      200  {object}  dto.SuccessResponse{data=interface{}}
// @Router       /v1/daycare-enrollments/monthly-attendance [get]
func (h *DaycareEnrollmentHandler) GetMonthlyAttendance(c echo.Context) error {
	sidStr := c.QueryParam("student_id")
	month, err := strconv.Atoi(c.QueryParam("month"))
	if err != nil || month < 1 || month > 12 {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status: http.StatusBadRequest, Code: "BAD_REQUEST",
			Message: "Parameter month wajib diisi (1-12)",
		})
	}
	year, err := strconv.Atoi(c.QueryParam("year"))
	if err != nil || year < 2000 {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status: http.StatusBadRequest, Code: "BAD_REQUEST",
			Message: "Parameter year wajib diisi",
		})
	}
	sid, _ := strconv.Atoi(sidStr)

	// Jika student_id diberikan, return single record
	if sidStr != "" && sid > 0 {
		result, err := h.daycareService.GetMonthlyAttendance(uint(sid), uint(month), uint(year))
		if err != nil {
			status, code := utility.GetErrorStatusAndCode(err)
			return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
		}
		return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Data kehadiran bulanan", Data: result})
	}

	// Otherwise return all students for this month
	ayIDStr := c.QueryParam("academic_year_id")
	ayID, _ := strconv.Atoi(ayIDStr)
	result, err := h.daycareService.GetAllMonthlyAttendance(uint(month), uint(year), uint(ayID))
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Data kehadiran bulanan", Data: result})
}

// Delete godoc
// @Summary      Delete daycare enrollment
// @Description  Delete a daycare enrollment. If delete_invoices=true, also removes unpaid monthly invoices from current month onward.
// @Tags         daycare-enrollments
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id               path      int   true  "Daycare Enrollment ID"
// @Param        delete_invoices  query     bool  false "Also delete unpaid invoices"
// @Success      200  {object}  dto.SuccessResponse{data=dto.DeleteDaycareEnrollmentResponse}
// @Failure      400  {object}  dto.ErrorResponse
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Failure      404  {object}  dto.ErrorResponse
// @Router       /v1/daycare-enrollments/{id} [delete]
// CheckPremiumHistory godoc
// @Summary      Check if student has premium history
// @Description  Check if a student has ever had a premium daycare enrollment (for auto-detect Lanjutan/Baru)
// @Tags         daycare-enrollments
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        student_id  query  int  true  "Student ID"
// @Success      200  {object}  dto.SuccessResponse{data=map[string]bool}
// @Router       /v1/daycare-enrollments/check-premium-history [get]
func (h *DaycareEnrollmentHandler) CheckPremiumHistory(c echo.Context) error {
	sid, err := strconv.Atoi(c.QueryParam("student_id"))
	if err != nil || sid <= 0 {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "student_id tidak valid",
		})
	}

	hasHistory, err := h.daycareService.HasPremiumHistory(uint(sid))
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "OK",
		Data: map[string]bool{
			"has_premium_history": hasHistory,
		},
	})
}

func (h *DaycareEnrollmentHandler) Delete(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID tidak valid",
		})
	}

	deleteInvoices := c.QueryParam("delete_invoices") == "true"

	var result *dto.DeleteDaycareEnrollmentResponse
	if deleteInvoices {
		result, err = h.daycareService.DeleteWithInvoices(uint(id))
	} else {
		result, err = h.daycareService.Delete(uint(id))
	}
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	if !deleteInvoices && result.Warning {
		return c.JSON(http.StatusOK, dto.SuccessResponse{
			Message: result.Message,
			Data:    result,
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: result.Message,
		Data:    result,
	})
}
