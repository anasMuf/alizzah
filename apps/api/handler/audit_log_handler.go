package handler

import (
	"api/dto"
	"api/service"
	"api/utility"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
)

type AuditLogHandler struct {
	auditService service.AuditService
}

func NewAuditLogHandler(auditService service.AuditService) *AuditLogHandler {
	return &AuditLogHandler{auditService: auditService}
}

// List godoc
// @Summary      List audit logs
// @Description  Get paginated audit log entries (superadmin only). Filterable by module, method, status, date range, user, and free-text search.
// @Tags         audit-logs
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        search     query   string  false  "Search by path, error message, or user name"
// @Param        user_id    query   int     false  "Filter by user ID"
// @Param        module     query   string  false  "Filter by module (administrasi|keuangan|koperasi|laporan|pengaturan|auth)"
// @Param        method     query   string  false  "Filter by HTTP method (POST|PUT|PATCH|DELETE)"
// @Param        status_min query   int     false  "Filter status >= N"
// @Param        status_max query   int     false  "Filter status <= N"
// @Param        date_from  query   string  false  "Filter from date (YYYY-MM-DD)"
// @Param        date_to    query   string  false  "Filter to date (YYYY-MM-DD)"
// @Param        page       query   int     false  "Page number"  default(1)
// @Param        limit      query   int     false  "Items per page"  default(20)
// @Success      200  {object}  dto.PaginatedResponse{data=[]dto.AuditLogResponse}
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Router       /v1/audit-logs [get]
func (h *AuditLogHandler) List(c echo.Context) error {
	page, limit := utility.ParsePagination(c)

	params := dto.AuditLogQueryParams{
		Search:   c.QueryParam("search"),
		Module:   c.QueryParam("module"),
		Method:   c.QueryParam("method"),
		DateFrom: c.QueryParam("date_from"),
		DateTo:   c.QueryParam("date_to"),
		Page:     page,
		Limit:    limit,
	}

	if v, err := strconv.ParseUint(c.QueryParam("user_id"), 10, 32); err == nil {
		params.UserID = uint(v)
	}
	if v, err := strconv.Atoi(c.QueryParam("status_min")); err == nil {
		params.StatusMin = v
	}
	if v, err := strconv.Atoi(c.QueryParam("status_max")); err == nil {
		params.StatusMax = v
	}

	entries, meta, err := h.auditService.GetAll(params)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, dto.PaginatedResponse{
		Message: "Data retrieved successfully",
		Data:    entries,
		Meta:    *meta,
	})
}

// Get godoc
// @Summary      Get audit log detail
// @Description  Get a single audit log entry with full request body (superadmin only)
// @Tags         audit-logs
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id   path      int  true  "Audit log ID"
// @Success      200  {object}  dto.SuccessResponse{data=dto.AuditLogResponse}
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Failure      404  {object}  dto.ErrorResponse
// @Router       /v1/audit-logs/{id} [get]
func (h *AuditLogHandler) Get(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "ID tidak valid")
	}

	entry, err := h.auditService.GetByID(uint(id))
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "Audit log tidak ditemukan")
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Data retrieved successfully",
		Data:    entry,
	})
}
