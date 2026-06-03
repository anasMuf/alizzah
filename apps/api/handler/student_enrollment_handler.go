package handler

import (
	"api/dto"
	"api/service"
	"api/utility"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
)

type StudentEnrollmentHandler struct {
	enrollmentService service.StudentEnrollmentService
}

func NewStudentEnrollmentHandler(enrollmentService service.StudentEnrollmentService) *StudentEnrollmentHandler {
	return &StudentEnrollmentHandler{enrollmentService: enrollmentService}
}

// GetByStudent godoc
// @Summary      Get student enrollments
// @Description  Get a list of enrollments (class groups) for a specific student
// @Tags         student-enrollments
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id                path   int  true   "Student ID"
// @Param        academic_year_id  query  int  false  "Academic Year ID"
// @Success      200  {object}  dto.SuccessResponse{data=[]dto.EnrollmentBriefResponse}
// @Failure      400  {object}  dto.ErrorResponse
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Failure      500  {object}  dto.ErrorResponse
// @Router       /v1/students/{id}/enrollments [get]
func (h *StudentEnrollmentHandler) GetByStudent(c echo.Context) error {
	studentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID siswa tidak valid",
		})
	}

	params := dto.EnrollmentQueryParams{}
	if ayID := c.QueryParam("academic_year_id"); ayID != "" {
		if id, err := strconv.Atoi(ayID); err == nil {
			params.AcademicYearID = uint(id)
		}
	}

	enrollments, err := h.enrollmentService.GetByStudentID(uint(studentID), params)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Berhasil mengambil data enrollment siswa",
		Data:    enrollments,
	})
}

// GetStudentsByClassGroup godoc
// @Summary      Get students by class group
// @Description  Get a list of students enrolled in a specific class group
// @Tags         student-enrollments
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id   path      int  true  "Class Group ID"
// @Success      200  {object}  dto.SuccessResponse{data=[]dto.StudentBriefResponse}
// @Failure      400  {object}  dto.ErrorResponse
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Failure      500  {object}  dto.ErrorResponse
// @Router       /v1/class-groups/{id}/students [get]
func (h *StudentEnrollmentHandler) GetStudentsByClassGroup(c echo.Context) error {
	classGroupID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID rombel tidak valid",
		})
	}

	students, err := h.enrollmentService.GetStudentsByClassGroup(uint(classGroupID))
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Berhasil mengambil data siswa di rombel",
		Data:    students,
	})
}

// ActivateEnrollment godoc
// @Summary      Activate a pending enrollment
// @Description  Change enrollment status from 'pending' to 'active'
// @Tags         student-enrollments
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id   path      int  true  "Enrollment ID"
// @Success      200  {object}  dto.SuccessResponse
// @Failure      400  {object}  dto.ErrorResponse
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Failure      404  {object}  dto.ErrorResponse
// @Router       /v1/enrollments/{id}/activate [patch]
func (h *StudentEnrollmentHandler) ActivateEnrollment(c echo.Context) error {
	enrollmentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID enrollment tidak valid",
		})
	}

	if err := h.enrollmentService.ActivateEnrollment(uint(enrollmentID)); err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Enrollment berhasil diaktifkan",
	})
}
