package handler

import (
	"api/dto"
	"api/repository"
	"api/service"
	"api/utility"
	"errors"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
)

type BillingExclusionHandler struct {
	svc    service.BillingExclusionService
	seRepo repository.StudentExtracurricularRepository
	sfRepo repository.StudentFacilityRepository
}

func NewBillingExclusionHandler(svc service.BillingExclusionService, seRepo repository.StudentExtracurricularRepository, sfRepo repository.StudentFacilityRepository) *BillingExclusionHandler {
	return &BillingExclusionHandler{svc: svc, seRepo: seRepo, sfRepo: sfRepo}
}

// resolveExtracurricular memvalidasi bahwa se_id milik siswa, lalu mengembalikan
// extracurricular_id (master) — key exclusion memakai extracurricular_id.
func (h *BillingExclusionHandler) resolveExtracurricular(studentID, seID uint) (uint, error) {
	se, err := h.seRepo.FindByID(seID)
	if err != nil || se.StudentID != studentID {
		return 0, errors.New("Data pendaftaran ekstrakurikuler tidak ditemukan")
	}
	return se.ExtracurricularID, nil
}

// resolveFacility memvalidasi bahwa facilityId milik siswa, lalu mengembalikan
// facility_id (master) — key exclusion memakai facility_id.
func (h *BillingExclusionHandler) resolveFacility(studentID, sfID uint) (uint, error) {
	sf, err := h.sfRepo.FindByID(sfID)
	if err != nil || sf.StudentID != studentID {
		return 0, errors.New("Data pendaftaran fasilitas tidak ditemukan")
	}
	return sf.FacilityID, nil
}

// GetExtracurricular godoc
// @Summary      Get billing month exclusions for a student extracurricular
// @Description  Daftar bulan yang tagihan PASTA/ekskul-nya di-skip
// @Tags         student-extracurriculars
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id     path  int  true  "Student ID"
// @Param        se_id  path  int  true  "Student Extracurricular ID"
// @Success      200  {object}  dto.SuccessResponse{data=dto.BillingExclusionsResponse}
// @Failure      400  {object}  dto.ErrorResponse
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Failure      404  {object}  dto.ErrorResponse
// @Failure      500  {object}  dto.ErrorResponse
// @Router       /v1/students/{id}/extracurriculars/{se_id}/billing-exclusions [get]
func (h *BillingExclusionHandler) GetExtracurricular(c echo.Context) error {
	studentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID siswa tidak valid"})
	}
	seID, err := strconv.Atoi(c.Param("se_id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID pendaftaran tidak valid"})
	}

	exID, err := h.resolveExtracurricular(uint(studentID), uint(seID))
	if err != nil {
		return c.JSON(http.StatusNotFound, dto.ErrorResponse{Status: http.StatusNotFound, Code: "NOT_FOUND", Message: err.Error()})
	}

	resp, err := h.svc.GetByStudentAndEntity(uint(studentID), "extracurricular", exID)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil daftar bulan skip", Data: resp})
}

// SetExtracurricular godoc
// @Summary      Set billing month exclusions for a student extracurricular
// @Description  Ganti seluruh daftar bulan yang tagihan PASTA/ekskul-nya di-skip
// @Tags         student-extracurriculars
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id       path  int                                  true  "Student ID"
// @Param        se_id    path  int                                  true  "Student Extracurricular ID"
// @Param        request  body  dto.SetBillingExclusionsRequest      true  "Daftar bulan skip"
// @Success      200      {object}  dto.SuccessResponse{data=dto.BillingExclusionsResponse}
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Failure      404      {object}  dto.ErrorResponse
// @Failure      500      {object}  dto.ErrorResponse
// @Router       /v1/students/{id}/extracurriculars/{se_id}/billing-exclusions [put]
func (h *BillingExclusionHandler) SetExtracurricular(c echo.Context) error {
	studentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID siswa tidak valid"})
	}
	seID, err := strconv.Atoi(c.Param("se_id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID pendaftaran tidak valid"})
	}

	var req dto.SetBillingExclusionsRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}

	exID, err := h.resolveExtracurricular(uint(studentID), uint(seID))
	if err != nil {
		return c.JSON(http.StatusNotFound, dto.ErrorResponse{Status: http.StatusNotFound, Code: "NOT_FOUND", Message: err.Error()})
	}

	resp, err := h.svc.SetExclusions(uint(studentID), "extracurricular", exID, req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil menyimpan daftar bulan skip", Data: resp})
}

// GetFacility godoc
// @Summary      Get billing month exclusions for a student facility
// @Description  Daftar bulan yang tagihan fasilitas-nya di-skip
// @Tags         student-facilities
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id           path  int  true  "Student ID"
// @Param        facilityId   path  int  true  "Student Facility ID"
// @Success      200  {object}  dto.SuccessResponse{data=dto.BillingExclusionsResponse}
// @Failure      400  {object}  dto.ErrorResponse
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Failure      404  {object}  dto.ErrorResponse
// @Failure      500  {object}  dto.ErrorResponse
// @Router       /v1/students/{id}/facilities/{facilityId}/billing-exclusions [get]
func (h *BillingExclusionHandler) GetFacility(c echo.Context) error {
	studentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID siswa tidak valid"})
	}
	sfID, err := strconv.Atoi(c.Param("facilityId"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID fasilitas tidak valid"})
	}

	facilityID, err := h.resolveFacility(uint(studentID), uint(sfID))
	if err != nil {
		return c.JSON(http.StatusNotFound, dto.ErrorResponse{Status: http.StatusNotFound, Code: "NOT_FOUND", Message: err.Error()})
	}

	resp, err := h.svc.GetByStudentAndEntity(uint(studentID), "facility", facilityID)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil daftar bulan skip", Data: resp})
}

// SetFacility godoc
// @Summary      Set billing month exclusions for a student facility
// @Description  Ganti seluruh daftar bulan yang tagihan fasilitas-nya di-skip
// @Tags         student-facilities
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id           path  int                                  true  "Student ID"
// @Param        facilityId   path  int                                  true  "Student Facility ID"
// @Param        request      body  dto.SetBillingExclusionsRequest      true  "Daftar bulan skip"
// @Success      200          {object}  dto.SuccessResponse{data=dto.BillingExclusionsResponse}
// @Failure      400          {object}  dto.ErrorResponse
// @Failure      401          {object}  dto.ErrorResponse
// @Failure      403          {object}  dto.ErrorResponse
// @Failure      404          {object}  dto.ErrorResponse
// @Failure      500          {object}  dto.ErrorResponse
// @Router       /v1/students/{id}/facilities/{facilityId}/billing-exclusions [put]
func (h *BillingExclusionHandler) SetFacility(c echo.Context) error {
	studentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID siswa tidak valid"})
	}
	sfID, err := strconv.Atoi(c.Param("facilityId"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID fasilitas tidak valid"})
	}

	var req dto.SetBillingExclusionsRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}

	facilityID, err := h.resolveFacility(uint(studentID), uint(sfID))
	if err != nil {
		return c.JSON(http.StatusNotFound, dto.ErrorResponse{Status: http.StatusNotFound, Code: "NOT_FOUND", Message: err.Error()})
	}

	resp, err := h.svc.SetExclusions(uint(studentID), "facility", facilityID, req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil menyimpan daftar bulan skip", Data: resp})
}
