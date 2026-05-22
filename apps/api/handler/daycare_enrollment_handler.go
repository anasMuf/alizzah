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
