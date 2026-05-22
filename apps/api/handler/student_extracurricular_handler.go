package handler

import (
	"api/dto"
	"api/service"
	"api/utility"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
)

type StudentExtracurricularHandler struct {
	seService service.StudentExtracurricularService
}

func NewStudentExtracurricularHandler(seService service.StudentExtracurricularService) *StudentExtracurricularHandler {
	return &StudentExtracurricularHandler{seService: seService}
}

// GetByStudent godoc
// @Summary      Get student extracurriculars
// @Description  Get a list of extracurriculars for a specific student
// @Tags         student-extracurriculars
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id                path   int  true   "Student ID"
// @Param        academic_year_id  query  int  false  "Academic Year ID"
// @Success      200  {object}  dto.SuccessResponse{data=[]dto.StudentExtracurricularResponse}
// @Failure      400  {object}  dto.ErrorResponse
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Failure      500  {object}  dto.ErrorResponse
// @Router       /v1/students/{id}/extracurriculars [get]
func (h *StudentExtracurricularHandler) GetByStudent(c echo.Context) error {
	studentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID siswa tidak valid",
		})
	}

	params := dto.StudentExtracurricularQueryParams{}
	if ayID := c.QueryParam("academic_year_id"); ayID != "" {
		if id, err := strconv.Atoi(ayID); err == nil {
			params.AcademicYearID = uint(id)
		}
	}

	ses, err := h.seService.GetByStudentID(uint(studentID), params)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Berhasil mengambil data ekstrakurikuler siswa",
		Data:    ses,
	})
}

// Enroll godoc
// @Summary      Enroll student in extracurricular
// @Description  Enroll a student in an extracurricular for a specific academic year
// @Tags         student-extracurriculars
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id       path      int                                 true  "Student ID"
// @Param        request  body      dto.EnrollExtracurricularRequest    true  "Enrollment data"
// @Success      201      {object}  dto.SuccessResponse{data=dto.StudentExtracurricularResponse}
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Failure      409      {object}  dto.ErrorResponse
// @Failure      500      {object}  dto.ErrorResponse
// @Router       /v1/students/{id}/extracurriculars [post]
func (h *StudentExtracurricularHandler) Enroll(c echo.Context) error {
	studentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID siswa tidak valid",
		})
	}

	var req dto.EnrollExtracurricularRequest
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

	se, err := h.seService.Enroll(uint(studentID), req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		if err.Error() == "Siswa sudah terdaftar di ekstrakurikuler ini untuk tahun ajaran tersebut" {
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
		Message: "Berhasil mendaftarkan ekstrakurikuler siswa",
		Data:    se,
	})
}

// Update godoc
// @Summary      Update student extracurricular
// @Description  Update student extracurricular details
// @Tags         student-extracurriculars
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id       path      int                                      true  "Student ID"
// @Param        se_id    path      int                                      true  "Student Extracurricular ID"
// @Param        request  body      dto.UpdateStudentExtracurricularRequest  true  "Updated data"
// @Success      200      {object}  dto.SuccessResponse{data=dto.StudentExtracurricularResponse}
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Failure      404      {object}  dto.ErrorResponse
// @Failure      500      {object}  dto.ErrorResponse
// @Router       /v1/students/{id}/extracurriculars/{se_id} [put]
func (h *StudentExtracurricularHandler) Update(c echo.Context) error {
	studentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID siswa tidak valid",
		})
	}

	seID, err := strconv.Atoi(c.Param("se_id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID pendaftaran tidak valid",
		})
	}

	var req dto.UpdateStudentExtracurricularRequest
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

	se, err := h.seService.Update(uint(studentID), uint(seID), req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Berhasil memperbarui data ekstrakurikuler siswa",
		Data:    se,
	})
}

// Unenroll godoc
// @Summary      Unenroll student from extracurricular
// @Description  Unenroll a student from an extracurricular
// @Tags         student-extracurriculars
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id     path      int  true  "Student ID"
// @Param        se_id  path      int  true  "Student Extracurricular ID"
// @Success      200    {object}  dto.SuccessResponse
// @Failure      400    {object}  dto.ErrorResponse
// @Failure      401    {object}  dto.ErrorResponse
// @Failure      403    {object}  dto.ErrorResponse
// @Failure      404    {object}  dto.ErrorResponse
// @Failure      500    {object}  dto.ErrorResponse
// @Router       /v1/students/{id}/extracurriculars/{se_id} [delete]
func (h *StudentExtracurricularHandler) Unenroll(c echo.Context) error {
	studentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID siswa tidak valid",
		})
	}

	seID, err := strconv.Atoi(c.Param("se_id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID pendaftaran tidak valid",
		})
	}

	if err := h.seService.Unenroll(uint(studentID), uint(seID)); err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Berhasil mencabut ekstrakurikuler siswa",
	})
}
