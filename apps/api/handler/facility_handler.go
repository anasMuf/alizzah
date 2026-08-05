package handler

import (
	"api/dto"
	"api/service"
	"api/utility"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
)

type FacilityHandler struct {
	facilityService service.FacilityService
	sfService       service.StudentFacilityService
}

func NewFacilityHandler(facilityService service.FacilityService, sfService service.StudentFacilityService) *FacilityHandler {
	return &FacilityHandler{facilityService: facilityService, sfService: sfService}
}

// ─── Master Facility ─────────────────────────────────────────────────

// List godoc
// @Summary      List facilities
// @Tags         facilities
// @Security     ApiKeyAuth
// @Success      200  {object}  dto.SuccessResponse{data=[]dto.FacilityResponse}
// @Router       /v1/facilities [get]
func (h *FacilityHandler) List(c echo.Context) error {
	facilities, err := h.facilityService.GetAll()
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil daftar fasilitas", Data: facilities})
}

// Create godoc
// @Summary      Create facility
// @Tags         facilities
// @Security     ApiKeyAuth
// @Param        request  body  dto.CreateFacilityRequest  true  "Create facility"
// @Success      201  {object}  dto.SuccessResponse{data=dto.FacilityResponse}
// @Router       /v1/facilities [post]
func (h *FacilityHandler) Create(c echo.Context) error {
	var req dto.CreateFacilityRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}

	facility, err := h.facilityService.Create(req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusCreated, dto.SuccessResponse{Message: "Berhasil menambah fasilitas", Data: facility})
}

// Update godoc
// @Summary      Update facility
// @Tags         facilities
// @Security     ApiKeyAuth
// @Param        id       path  int                        true  "Facility ID"
// @Param        request  body  dto.CreateFacilityRequest  true  "Update facility"
// @Success      200  {object}  dto.SuccessResponse{data=dto.FacilityResponse}
// @Router       /v1/facilities/{id} [put]
func (h *FacilityHandler) Update(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}

	var req dto.CreateFacilityRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}

	facility, err := h.facilityService.Update(uint(id), req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil memperbarui fasilitas", Data: facility})
}

// Delete godoc
// @Summary      Delete facility
// @Tags         facilities
// @Security     ApiKeyAuth
// @Param        id  path  int  true  "Facility ID"
// @Success      200  {object}  dto.SuccessResponse
// @Router       /v1/facilities/{id} [delete]
func (h *FacilityHandler) Delete(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}

	if err := h.facilityService.Delete(uint(id)); err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil menghapus fasilitas"})
}

// ListStudents godoc
// @Summary      List students enrolled in a facility
// @Tags         facilities
// @Security     ApiKeyAuth
// @Param        id                path  int   true   "Facility ID"
// @Param        academic_year_id  query int   false  "Academic Year ID"
// @Param        search            query string false "Search by student name"
// @Param        page              query int   false  "Page (default 1)"
// @Param        limit             query int   false  "Limit (default 20)"
// @Success      200  {object}  dto.SuccessResponse{data=dto.PaginatedFacilityStudentResponse}
// @Router       /v1/facilities/{id}/students [get]
func (h *FacilityHandler) ListStudents(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}

	ayID, _ := strconv.Atoi(c.QueryParam("academic_year_id"))
	page, _ := strconv.Atoi(c.QueryParam("page"))
	limit, _ := strconv.Atoi(c.QueryParam("limit"))

	params := dto.FacilityStudentQueryParams{
		AcademicYearID: uint(ayID),
		Search:         c.QueryParam("search"),
		Page:           page,
		Limit:          limit,
	}

	result, err := h.sfService.GetStudentsByFacility(uint(id), params)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil daftar siswa", Data: result})
}

// ─── Student Facility ────────────────────────────────────────────────

// ListByStudent godoc
// @Summary      List student facilities
// @Tags         facilities
// @Security     ApiKeyAuth
// @Param        id               path   int  true   "Student ID"
// @Param        academic_year_id query  int  false  "Academic Year ID"
// @Success      200  {object}  dto.SuccessResponse{data=[]dto.StudentFacilityResponse}
// @Router       /v1/students/{id}/facilities [get]
func (h *FacilityHandler) ListByStudent(c echo.Context) error {
	studentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}

	ayID, _ := strconv.Atoi(c.QueryParam("academic_year_id"))
	params := dto.StudentFacilityQueryParams{AcademicYearID: uint(ayID)}

	sfs, err := h.sfService.GetByStudentID(uint(studentID), params)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil daftar fasilitas siswa", Data: sfs})
}

// Enroll godoc
// @Summary      Enroll student to facility
// @Tags         facilities
// @Security     ApiKeyAuth
// @Param        id       path  int                        true  "Student ID"
// @Param        request  body  dto.EnrollFacilityRequest  true  "Enroll facility"
// @Success      201  {object}  dto.SuccessResponse{data=dto.StudentFacilityResponse}
// @Router       /v1/students/{id}/facilities [post]
func (h *FacilityHandler) Enroll(c echo.Context) error {
	studentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}

	var req dto.EnrollFacilityRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}

	sf, err := h.sfService.Enroll(uint(studentID), req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusCreated, dto.SuccessResponse{Message: "Berhasil mendaftarkan siswa ke fasilitas", Data: sf})
}

// Unenroll godoc
// @Summary      Unenroll student from facility
// @Tags         facilities
// @Security     ApiKeyAuth
// @Param        id          path  int  true  "Student ID"
// @Param        facilityId  path  int  true  "Student Facility enrollment ID"
// @Success      200  {object}  dto.SuccessResponse
// @Router       /v1/students/{id}/facilities/{facilityId} [delete]
func (h *FacilityHandler) Unenroll(c echo.Context) error {
	studentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}

	sfID, err := strconv.Atoi(c.Param("facilityId"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID fasilitas tidak valid"})
	}

	if err := h.sfService.Unenroll(uint(studentID), uint(sfID)); err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil melepas siswa dari fasilitas"})
}
