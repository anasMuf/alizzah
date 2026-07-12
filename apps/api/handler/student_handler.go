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

type StudentHandler struct {
	studentService service.StudentService
}

func NewStudentHandler(studentService service.StudentService) *StudentHandler {
	return &StudentHandler{studentService: studentService}
}

// List godoc
// @Summary      List all students
// @Description  Get paginated list of students
// @Tags         students
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        search          query   string  false  "Search by name"
// @Param        status          query   string  false  "Filter by status"
// @Param        class_group_id  query   int     false  "Filter by class group (Batch 3)"
// @Param        academic_year_id query   int     false  "Filter by academic year (Batch 3)"
// @Param        is_daycare_only query   bool    false  "Filter by daycare only"
// @Param        page            query   int     false  "Page number"  default(1)
// @Param        limit           query   int     false  "Items per page"  default(20)
// @Success      200  {object}  dto.PaginatedResponse{data=[]dto.StudentListResponse}
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Router       /v1/students [get]
func (h *StudentHandler) List(c echo.Context) error {
	page, limit := utility.ParsePagination(c)

	var isDaycare *bool
	if dc := c.QueryParam("is_daycare_only"); dc != "" {
		val, err := strconv.ParseBool(dc)
		if err == nil {
			isDaycare = &val
		}
	}

	classGroupID, _ := strconv.ParseUint(c.QueryParam("class_group_id"), 10, 32)
	academicYearID, _ := strconv.ParseUint(c.QueryParam("academic_year_id"), 10, 32)

	params := dto.StudentQueryParams{
		Search:         c.QueryParam("search"),
		Status:         c.QueryParam("status"),
		ClassGroupID:   uint(classGroupID),
		NoClassGroup:   c.QueryParam("no_class_group") == "true",
		AcademicYearID: uint(academicYearID),
		IsDaycareOnly:  isDaycare,
		Page:           page,
		Limit:          limit,
	}

	students, meta, err := h.studentService.GetAll(params)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, dto.PaginatedResponse{
		Message: "Data retrieved successfully",
		Data:    students,
		Meta:    *meta,
	})
}

// Create godoc
// @Summary      Create a new student
// @Description  Create a new student with optional inline guardians
// @Tags         students
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        request  body      dto.CreateStudentRequest  true  "Student data"
// @Success      201      {object}  dto.SuccessResponse{data=dto.StudentDetailResponse}
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Router       /v1/students [post]
func (h *StudentHandler) Create(c echo.Context) error {
	var req dto.CreateStudentRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Format request tidak valid")
	}
	if err := c.Validate(&req); err != nil {
		return err
	}

	userID, err := middleware.GetUserID(c)
	if err != nil {
		return err
	}
	student, err := h.studentService.Create(userID, req)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusCreated, dto.SuccessResponse{
		Message: "Siswa berhasil dibuat",
		Data:    student,
	})
}

// Get godoc
// @Summary      Get student by ID
// @Description  Get a single student's detail
// @Tags         students
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id   path      int  true  "Student ID"
// @Success      200  {object}  dto.SuccessResponse{data=dto.StudentDetailResponse}
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Failure      404  {object}  dto.ErrorResponse
// @Router       /v1/students/{id} [get]
func (h *StudentHandler) Get(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "ID tidak valid")
	}

	student, err := h.studentService.GetByID(uint(id))
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Data retrieved successfully",
		Data:    student,
	})
}

// Update godoc
// @Summary      Update a student
// @Description  Update student data
// @Tags         students
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id       path      int                       true  "Student ID"
// @Param        request  body      dto.UpdateStudentRequest  true  "Updated student data"
// @Success      200      {object}  dto.SuccessResponse{data=dto.StudentDetailResponse}
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Failure      404      {object}  dto.ErrorResponse
// @Router       /v1/students/{id} [put]
func (h *StudentHandler) Update(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "ID tidak valid")
	}

	var req dto.UpdateStudentRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Format request tidak valid")
	}
	if err := c.Validate(&req); err != nil {
		return err
	}

	student, err := h.studentService.Update(uint(id), req)
	if err != nil {
		if err.Error() == "Siswa tidak ditemukan" {
			return echo.NewHTTPError(http.StatusNotFound, err.Error())
		}
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Siswa berhasil diperbarui",
		Data:    student,
	})
}

// Delete godoc
// @Summary      Delete a student
// @Description  Delete a student (fails if student has active enrollments)
// @Tags         students
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id   path      int  true  "Student ID"
// @Success      200  {object}  dto.SuccessResponse
// @Failure      400  {object}  dto.ErrorResponse
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Failure      404  {object}  dto.ErrorResponse
// @Failure      422  {object}  dto.ErrorResponse
// @Router       /v1/students/{id} [delete]
func (h *StudentHandler) Delete(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "ID tidak valid")
	}

	err = h.studentService.Delete(uint(id))
	if err != nil {
		if err.Error() == "Siswa tidak ditemukan" {
			return echo.NewHTTPError(http.StatusNotFound, err.Error())
		}
		return echo.NewHTTPError(http.StatusUnprocessableEntity, err.Error())
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Siswa berhasil dihapus",
	})
}

// Import godoc
// @Summary      Import students
// @Description  Import students from a CSV file
// @Tags         students
// @Accept       multipart/form-data
// @Produce      json
// @Security     ApiKeyAuth
// @Param        file formData file true "CSV file"
// @Success      200  {object}  dto.SuccessResponse{data=dto.ImportSummaryResponse}
// @Failure      400  {object}  dto.ErrorResponse
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Router       /v1/students/import [post]
func (h *StudentHandler) Import(c echo.Context) error {
	file, err := c.FormFile("file")
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "File CSV diperlukan")
	}

	summary, err := h.studentService.Import(file)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Proses import selesai",
		Data:    summary,
	})
}

// RegenerateInvoices godoc
// @Summary      Regenerate student invoices
// @Description  Delete all invoices (initial, registration, monthly) and regenerate them based on current enrollment data. Initial invoice only generated for enrollment_type "new" or "mutation".
// @Tags         students
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id   path   int  true  "Student ID"
// @Success      200  {object}  dto.SuccessResponse
// @Failure      400  {object}  dto.ErrorResponse
// @Failure      404  {object}  dto.ErrorResponse
// @Failure      500  {object}  dto.ErrorResponse
// @Router       /v1/students/{id}/regenerate-invoices [post]
func (h *StudentHandler) RegenerateInvoices(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "ID tidak valid")
	}

	if err := h.studentService.RegenerateInvoices(uint(id)); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Invoice berhasil diregenerate",
	})
}
