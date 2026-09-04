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
// @Param        month             query int   false  "Bulan (1-12) untuk kuantitas hari; default bulan berjalan"
// @Param        year              query int   false  "Tahun untuk kuantitas hari; default tahun berjalan"
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
	month, _ := strconv.Atoi(c.QueryParam("month"))
	year, _ := strconv.Atoi(c.QueryParam("year"))

	params := dto.FacilityStudentQueryParams{
		AcademicYearID: uint(ayID),
		Search:         c.QueryParam("search"),
		Page:           page,
		Limit:          limit,
		Month:          uint(month),
		Year:           uint(year),
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

// UpdateEnrollment godoc
// @Summary      Update student facility enrollment (change zone/package)
// @Tags         facilities
// @Security     ApiKeyAuth
// @Param        id          path  int                                true  "Student ID"
// @Param        facilityId  path  int                                true  "Student Facility enrollment ID"
// @Param        request     body  dto.UpdateStudentFacilityRequest   true  "Update enrollment"
// @Success      200  {object}  dto.SuccessResponse{data=dto.StudentFacilityResponse}
// @Router       /v1/students/{id}/facilities/{facilityId} [put]
func (h *FacilityHandler) UpdateEnrollment(c echo.Context) error {
	studentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}

	sfID, err := strconv.Atoi(c.Param("facilityId"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID fasilitas tidak valid"})
	}

	var req dto.UpdateStudentFacilityRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}

	sf, summary, err := h.sfService.UpdateEnrollment(uint(studentID), uint(sfID), req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Berhasil memperbarui fasilitas siswa",
		Data:    dto.StudentFacilityUpdateResponse{Facility: *sf, Summary: summary},
	})
}

// SetMonthZone godoc
// @Summary      Set per-month zone override for a facility enrollment
// @Tags         facilities
// @Security     ApiKeyAuth
// @Param        id          path  int                                    true  "Student ID"
// @Param        facilityId  path  int                                    true  "Student Facility enrollment ID"
// @Param        request     body  dto.UpdateStudentFacilityMonthZoneRequest  true  "Set month zone"
// @Success      200  {object}  dto.SuccessResponse{data=dto.FacilityMonthZoneResponse}
// @Router       /v1/students/{id}/facilities/{facilityId}/month-zone [put]
func (h *FacilityHandler) SetMonthZone(c echo.Context) error {
	studentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}

	sfID, err := strconv.Atoi(c.Param("facilityId"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID fasilitas tidak valid"})
	}

	var req dto.UpdateStudentFacilityMonthZoneRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}

	resp, err := h.sfService.SetMonthZone(uint(studentID), uint(sfID), req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil memperbarui zona bulanan fasilitas", Data: resp})
}

// ClearMonthZone godoc
// @Summary      Remove per-month zone override (back to default)
// @Tags         facilities
// @Security     ApiKeyAuth
// @Param        id          path  int  true  "Student ID"
// @Param        facilityId  path  int  true  "Student Facility enrollment ID"
// @Param        month       query int  true  "Bulan (1-12)"
// @Param        year        query int  true  "Tahun"
// @Param        force       query bool false "Izinkan rewrite item yang sudah dibayar"
// @Success      200  {object}  dto.SuccessResponse{data=dto.FacilityMonthZoneResponse}
// @Router       /v1/students/{id}/facilities/{facilityId}/month-zone [delete]
func (h *FacilityHandler) ClearMonthZone(c echo.Context) error {
	studentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}

	sfID, err := strconv.Atoi(c.Param("facilityId"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID fasilitas tidak valid"})
	}

	month, _ := strconv.Atoi(c.QueryParam("month"))
	year, _ := strconv.Atoi(c.QueryParam("year"))
	force := c.QueryParam("force") == "true" || c.QueryParam("force") == "1"

	resp, err := h.sfService.ClearMonthZone(uint(studentID), uint(sfID), uint(month), uint(year), force)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengembalikan zona bulanan ke default", Data: resp})
}

// GetCurrentMonthDays godoc
// @Summary      Get current month effective days & invoice item quantity for a facility enrollment
// @Tags         facilities
// @Security     ApiKeyAuth
// @Param        id          path  int  true  "Student ID"
// @Param        facilityId  path  int  true  "Student Facility enrollment ID"
// @Success      200  {object}  dto.SuccessResponse{data=dto.FacilityCurrentMonthDaysResponse}
// @Router       /v1/students/{id}/facilities/{facilityId}/current-month-days [get]
func (h *FacilityHandler) GetCurrentMonthDays(c echo.Context) error {
	studentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}

	sfID, err := strconv.Atoi(c.Param("facilityId"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID fasilitas tidak valid"})
	}

	result, err := h.sfService.GetCurrentMonthDays(uint(studentID), uint(sfID))
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil data hari", Data: result})
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
