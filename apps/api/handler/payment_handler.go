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

type PaymentHandler struct {
	service service.PaymentService
}

func NewPaymentHandler(service service.PaymentService) *PaymentHandler {
	return &PaymentHandler{service: service}
}

// List godoc
// @Summary      Get payment list
// @Description  Get a paginated list of payments
// @Tags         payments
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        page              query   int     false  "Page number"
// @Param        limit             query   int     false  "Limit per page"
// @Param        student_id        query   int     false  "Student ID"
// @Param        academic_year_id  query   int     false  "Academic Year ID"
// @Param        source            query   string  false  "Payment Source (cash/savings)"
// @Param        start_date        query   string  false  "Start Date (YYYY-MM-DD)"
// @Param        end_date          query   string  false  "End Date (YYYY-MM-DD)"
// @Param        search            query   string  false  "Search by student name"
// @Param        level             query   string  false  "Jenjang siswa (intan/berlian) via enrollment aktif"
// @Param        class_group_id    query   int     false  "ID rombel siswa via enrollment aktif"
// @Param        created_by        query   int     false  "Petugas pencatat (user ID)"
// @Param        category          query   string  false  "Kategori item yang dibayar (monthly_spp, pasta, dll)"
// @Param        month             query   int     false  "Periode tagihan yang dibayar (bulan 1-12)"
// @Param        year              query   int     false  "Periode tagihan yang dibayar (tahun)"
// @Success      200               {object}  dto.PaginatedResponse{data=[]dto.PaymentListResponse}
// @Failure      401               {object}  dto.ErrorResponse
// @Failure      403               {object}  dto.ErrorResponse
// @Failure      500               {object}  dto.ErrorResponse
// @Router       /v1/payments [get]
func (h *PaymentHandler) List(c echo.Context) error {
	page, limit := utility.ParsePagination(c)
	studentID, _ := strconv.Atoi(c.QueryParam("student_id"))
	academicYearID, _ := strconv.Atoi(c.QueryParam("academic_year_id"))
	classGroupID, _ := strconv.Atoi(c.QueryParam("class_group_id"))
	createdBy, _ := strconv.Atoi(c.QueryParam("created_by"))
	month, _ := strconv.Atoi(c.QueryParam("month"))
	year, _ := strconv.Atoi(c.QueryParam("year"))

	params := dto.PaymentQueryParams{
		StudentID:      uint(studentID),
		AcademicYearID: uint(academicYearID),
		StartDate:      c.QueryParam("start_date"),
		EndDate:        c.QueryParam("end_date"),
		Source:         c.QueryParam("source"),
		Search:         c.QueryParam("search"),
		Level:          c.QueryParam("level"),
		ClassGroupID:   uint(classGroupID),
		CreatedBy:      uint(createdBy),
		Category:       c.QueryParam("category"),
		Month:          uint(month),
		Year:           uint(year),
		Page:           page,
		Limit:          limit,
	}

	payments, meta, err := h.service.GetAll(params)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.PaginatedResponse{
		Message: "Berhasil mengambil daftar pembayaran",
		Data:    payments,
		Meta:    *meta,
	})
}

// Create godoc
// @Summary      Create payment
// @Description  Record a new payment from cash or savings
// @Tags         payments
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        request  body      dto.CreatePaymentRequest  true  "Create payment request"
// @Success      201      {object}  dto.SuccessResponse{data=dto.PaymentDetailResponse}
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Failure      422      {object}  dto.ErrorResponse
// @Failure      500      {object}  dto.ErrorResponse
// @Router       /v1/payments [post]
func (h *PaymentHandler) Create(c echo.Context) error {
	var req dto.CreatePaymentRequest
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
	payment, err := h.service.Create(createdBy, req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusCreated, dto.SuccessResponse{Message: "Pembayaran berhasil dicatat", Data: payment})
}

// Get godoc
// @Summary      Get payment by ID
// @Description  Get payment detail by ID
// @Tags         payments
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id   path      int  true  "Payment ID"
// @Success      200  {object}  dto.SuccessResponse{data=dto.PaymentDetailResponse}
// @Failure      400  {object}  dto.ErrorResponse
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Failure      404  {object}  dto.ErrorResponse
// @Failure      500  {object}  dto.ErrorResponse
// @Router       /v1/payments/{id} [get]
func (h *PaymentHandler) Get(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}

	payment, err := h.service.GetByID(uint(id))
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil detail pembayaran", Data: payment})
}

// GetByStudent godoc
// @Summary      Get payment history by student ID
// @Description  Get all payments for a specific student
// @Tags         payments
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id                path   int     true   "Student ID"
// @Param        academic_year_id  query  int     false  "Academic Year ID"
// @Param        start_date        query  string  false  "Start Date (YYYY-MM-DD)"
// @Param        end_date          query  string  false  "End Date (YYYY-MM-DD)"
// @Success      200               {object}  dto.SuccessResponse{data=[]dto.PaymentListResponse}
// @Failure      400               {object}  dto.ErrorResponse
// @Failure      401               {object}  dto.ErrorResponse
// @Failure      403               {object}  dto.ErrorResponse
// @Failure      500               {object}  dto.ErrorResponse
// @Router       /v1/students/{id}/payments [get]
func (h *PaymentHandler) GetByStudent(c echo.Context) error {
	studentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID siswa tidak valid"})
	}

	academicYearID, _ := strconv.Atoi(c.QueryParam("academic_year_id"))
	params := dto.StudentPaymentQueryParams{
		AcademicYearID: uint(academicYearID),
		StartDate:      c.QueryParam("start_date"),
		EndDate:        c.QueryParam("end_date"),
	}

	payments, err := h.service.GetByStudentID(uint(studentID), params)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil pembayaran siswa", Data: payments})
}

// Update godoc
// @Summary      Update payment
// @Description  Membatalkan payment lama & membuat payment baru dengan data koreksi
// @Tags         payments
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id       path      int                      true  "Payment ID"
// @Param        request  body      dto.CreatePaymentRequest true  "Update payment request"
// @Success      200      {object}  dto.SuccessResponse{data=dto.PaymentDetailResponse}
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Failure      404      {object}  dto.ErrorResponse
// @Failure      422      {object}  dto.ErrorResponse
// @Failure      500      {object}  dto.ErrorResponse
// @Router       /v1/payments/{id} [put]
func (h *PaymentHandler) Update(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid",
		})
	}

	var req dto.CreatePaymentRequest
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

	createdBy, err := middleware.GetUserID(c)
	if err != nil {
		return err
	}

	payment, err := h.service.Update(uint(id), createdBy, req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Pembayaran berhasil diperbarui", Data: payment,
	})
}

// Delete godoc
// @Summary      Delete payment
// @Description  Membatalkan seluruh efek keuangan & menghapus payment
// @Tags         payments
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id   path      int  true  "Payment ID"
// @Success      200  {object}  dto.SuccessResponse
// @Failure      400  {object}  dto.ErrorResponse
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Failure      404  {object}  dto.ErrorResponse
// @Failure      500  {object}  dto.ErrorResponse
// @Router       /v1/payments/{id} [delete]
func (h *PaymentHandler) Delete(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid",
		})
	}

	if err := h.service.Delete(uint(id)); err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Pembayaran berhasil dihapus"})
}
