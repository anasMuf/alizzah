package handler

import (
	"api/dto"
	"api/middleware"
	"api/service"
	"api/utility"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
)

type DaycareEnrollmentHandler struct {
	daycareService service.DaycareEnrollmentService
}

func NewDaycareEnrollmentHandler(daycareService service.DaycareEnrollmentService) *DaycareEnrollmentHandler {
	return &DaycareEnrollmentHandler{daycareService: daycareService}
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
		if err.Error() == "Siswa sudah memiliki pendaftaran daycare aktif di tahun ajaran ini" {
			status = http.StatusConflict
			code = "CONFLICT"
		}
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
