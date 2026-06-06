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

type DispensationHandler struct {
	service service.DispensationService
}

func NewDispensationHandler(service service.DispensationService) *DispensationHandler {
	return &DispensationHandler{service: service}
}

// ListByStudent godoc
// @Summary      List dispensations for a student
// @Tags         dispensations
// @Security     ApiKeyAuth
// @Param        id               path   int   true   "Student ID"
// @Param        academic_year_id query  int   false  "Academic Year ID"
// @Success      200  {object}  dto.SuccessResponse{data=[]dto.DispensationResponse}
// @Router       /v1/students/{id}/dispensations [get]
func (h *DispensationHandler) ListByStudent(c echo.Context) error {
	studentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}

	ayID, _ := strconv.Atoi(c.QueryParam("academic_year_id"))
	params := dto.DispensationQueryParams{AcademicYearID: uint(ayID)}

	items, err := h.service.GetByStudentID(uint(studentID), params)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil daftar dispensasi", Data: items})
}

// Create godoc
// @Summary      Create dispensation for a student
// @Tags         dispensations
// @Security     ApiKeyAuth
// @Param        id       path  int                             true  "Student ID"
// @Param        request  body  dto.CreateDispensationRequest   true  "Create dispensation"
// @Success      201  {object}  dto.SuccessResponse{data=dto.DispensationResponse}
// @Router       /v1/students/{id}/dispensations [post]
func (h *DispensationHandler) Create(c echo.Context) error {
	studentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}

	var req dto.CreateDispensationRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}

	createdBy, err := middleware.GetUserID(c)
	if err != nil {
		return err
	}
	item, err := h.service.Create(uint(studentID), createdBy, req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusCreated, dto.SuccessResponse{Message: "Berhasil menambah dispensasi", Data: item})
}

// Update godoc
// @Summary      Update dispensation
// @Tags         dispensations
// @Security     ApiKeyAuth
// @Param        id       path  int                             true  "Dispensation ID"
// @Param        request  body  dto.UpdateDispensationRequest   true  "Update dispensation"
// @Success      200  {object}  dto.SuccessResponse{data=dto.DispensationResponse}
// @Router       /v1/dispensations/{id} [put]
func (h *DispensationHandler) Update(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}

	var req dto.UpdateDispensationRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}

	item, err := h.service.Update(uint(id), req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil memperbarui dispensasi", Data: item})
}

// Toggle godoc
// @Summary      Toggle dispensation active status
// @Tags         dispensations
// @Security     ApiKeyAuth
// @Param        id  path  int  true  "Dispensation ID"
// @Success      200  {object}  dto.SuccessResponse{data=dto.DispensationResponse}
// @Router       /v1/dispensations/{id}/toggle [patch]
func (h *DispensationHandler) Toggle(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}

	item, err := h.service.Toggle(uint(id))
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengubah status dispensasi", Data: item})
}

// Delete godoc
// @Summary      Delete dispensation
// @Tags         dispensations
// @Security     ApiKeyAuth
// @Param        id  path  int  true  "Dispensation ID"
// @Success      200  {object}  dto.SuccessResponse
// @Router       /v1/dispensations/{id} [delete]
func (h *DispensationHandler) Delete(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}

	if err := h.service.Delete(uint(id)); err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil menghapus dispensasi"})
}
