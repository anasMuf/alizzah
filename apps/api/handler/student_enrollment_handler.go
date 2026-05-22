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

// GetByStudent handles GET /api/v1/students/:id/enrollments
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

// GetStudentsByClassGroup handles GET /api/v1/class-groups/:id/students
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
