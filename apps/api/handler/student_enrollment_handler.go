package handler

import (
	"api/dto"
	"api/middleware"
	"api/service"
	"api/utility"
	"fmt"
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

// UpdateEnrollment godoc
// @Summary      Update enrollment type
// @Description  Update the enrollment_type of an enrollment (new, repeat, mutation, etc.)
// @Tags         student-enrollments
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id       path   int                            true  "Enrollment ID"
// @Param        request  body   dto.UpdateEnrollmentRequest    true  "Enrollment type"
// @Success      200      {object}  dto.SuccessResponse{data=dto.EnrollmentDetailResponse}
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      404      {object}  dto.ErrorResponse
// @Router       /v1/enrollments/{id} [put]
func (h *StudentEnrollmentHandler) UpdateEnrollment(c echo.Context) error {
	enrollmentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID enrollment tidak valid",
		})
	}

	var req dto.UpdateEnrollmentRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Format request tidak valid")
	}
	if err := c.Validate(req); err != nil {
		return err
	}

	result, err := h.enrollmentService.UpdateEnrollmentType(uint(enrollmentID), req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Tipe enrollment berhasil diupdate",
		Data:    result,
	})
}

// Enroll godoc
// @Summary      Enroll a student into a class group
// @Description  Create a new enrollment for an existing student + generate invoices
// @Tags         student-enrollments
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id       path      int                            true  "Student ID"
// @Param        request  body      dto.CreateEnrollmentRequest    true  "Enrollment data"
// @Success      201      {object}  dto.SuccessResponse{data=dto.EnrollmentDetailResponse}
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Failure      409      {object}  dto.ErrorResponse
// @Router       /v1/students/{id}/enrollments [post]
func (h *StudentEnrollmentHandler) Enroll(c echo.Context) error {
	studentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID siswa tidak valid",
		})
	}

	var req dto.CreateEnrollmentRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error(),
		})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error(),
		})
	}

	createdBy := middleware.GetCurrentUserID(c)
	result, err := h.enrollmentService.EnrollStudent(uint(studentID), createdBy, req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status: status, Code: code, Message: err.Error(),
		})
	}

	return c.JSON(http.StatusCreated, dto.SuccessResponse{
		Message: "Siswa berhasil didaftarkan ke rombel",
		Data:    result,
	})
}

// BatchEnrollRequest is the request body for bulk student enrollment.
type BatchEnrollRequest struct {
	StudentIDs []uint `json:"student_ids"`
	dto.CreateEnrollmentRequest
}

// EnrollBatch godoc
// @Summary      Bulk enroll students into a class group
// @Description  Enroll multiple existing students into the same rombel + generate invoices
// @Tags         student-enrollments
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        request  body      BatchEnrollRequest  true  "Batch enrollment data"
// @Success      201      {object}  dto.SuccessResponse
// @Failure      400      {object}  dto.ErrorResponse
// @Router       /v1/students/enrollments/batch [post]
func (h *StudentEnrollmentHandler) EnrollBatch(c echo.Context) error {
	var req BatchEnrollRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error(),
		})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error(),
		})
	}
	if len(req.StudentIDs) == 0 {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "Minimal satu siswa harus dipilih",
		})
	}

	createdBy := middleware.GetCurrentUserID(c)
	var success, failed int
	var errors []string

	for _, sid := range req.StudentIDs {
		_, err := h.enrollmentService.EnrollStudent(sid, createdBy, req.CreateEnrollmentRequest)
		if err != nil {
			failed++
			errors = append(errors, fmt.Sprintf("Siswa ID %d: %s", sid, err.Error()))
		} else {
			success++
		}
	}

	status := http.StatusCreated
	if success == 0 {
		status = http.StatusBadRequest
	}

	return c.JSON(status, dto.SuccessResponse{
		Message: fmt.Sprintf("%d berhasil, %d gagal", success, failed),
		Data: map[string]interface{}{
			"success": success,
			"failed":  failed,
			"errors":  errors,
		},
	})
}
