package handler

import (
	"api/dto"
	"api/service"
	"api/utility"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
)

type ExpenseHandler struct {
	service service.ExpenseService
}

func NewExpenseHandler(service service.ExpenseService) *ExpenseHandler {
	return &ExpenseHandler{service: service}
}

// List godoc
// @Summary Get expense list
// @Description Get a paginated list of expenses
// @Tags expenses
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param page query int false "Page number"
// @Param limit query int false "Limit per page"
// @Param academic_year_id query int false "Academic Year ID"
// @Param expense_category_id query int false "Expense Category ID"
// @Param start_date query string false "Start Date (YYYY-MM-DD)"
// @Param end_date query string false "End Date (YYYY-MM-DD)"
// @Success 200 {object} dto.PaginatedResponse{data=[]dto.ExpenseResponse}
// @Failure 401 {object} dto.ErrorResponse
// @Failure 403 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /expenses [get]
func (h *ExpenseHandler) List(c echo.Context) error {
	page, _ := strconv.Atoi(c.QueryParam("page"))
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	academicYearID, _ := strconv.Atoi(c.QueryParam("academic_year_id"))
	categoryID, _ := strconv.Atoi(c.QueryParam("expense_category_id"))

	params := dto.ExpenseQueryParams{
		AcademicYearID:    uint(academicYearID),
		ExpenseCategoryID: uint(categoryID),
		StartDate:         c.QueryParam("start_date"),
		EndDate:           c.QueryParam("end_date"),
		Page:              page,
		Limit:             limit,
	}

	expenses, meta, err := h.service.GetAll(params)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.PaginatedResponse{
		Message: "Berhasil mengambil daftar pengeluaran",
		Data:    expenses,
		Meta:    *meta,
	})
}

// Create godoc
// @Summary Create expense
// @Description Record a new expense
// @Tags expenses
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param request body dto.CreateExpenseRequest true "Create expense request"
// @Success 201 {object} dto.SuccessResponse{data=dto.ExpenseResponse}
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 403 {object} dto.ErrorResponse
// @Failure 422 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /expenses [post]
func (h *ExpenseHandler) Create(c echo.Context) error {
	var req dto.CreateExpenseRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}

	createdBy := c.Get("user_id").(uint)
	expense, err := h.service.Create(createdBy, req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusCreated, dto.SuccessResponse{Message: "Berhasil mencatat pengeluaran", Data: expense})
}

// Get godoc
// @Summary Get expense by ID
// @Description Get expense detail by ID
// @Tags expenses
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param id path int true "Expense ID"
// @Success 200 {object} dto.SuccessResponse{data=dto.ExpenseResponse}
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 403 {object} dto.ErrorResponse
// @Failure 404 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /expenses/{id} [get]
func (h *ExpenseHandler) Get(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}

	expense, err := h.service.GetByID(uint(id))
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil detail pengeluaran", Data: expense})
}

// Update godoc
// @Summary Update expense
// @Description Update an existing expense
// @Tags expenses
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param id path int true "Expense ID"
// @Param request body dto.CreateExpenseRequest true "Update expense request"
// @Success 200 {object} dto.SuccessResponse{data=dto.ExpenseResponse}
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 403 {object} dto.ErrorResponse
// @Failure 404 {object} dto.ErrorResponse
// @Failure 422 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /expenses/{id} [put]
func (h *ExpenseHandler) Update(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}

	var req dto.CreateExpenseRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}

	expense, err := h.service.Update(uint(id), req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil memperbarui pengeluaran", Data: expense})
}

// Delete godoc
// @Summary Delete expense
// @Description Delete an existing expense
// @Tags expenses
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param id path int true "Expense ID"
// @Success 200 {object} dto.SuccessResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 403 {object} dto.ErrorResponse
// @Failure 404 {object} dto.ErrorResponse
// @Failure 422 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /expenses/{id} [delete]
func (h *ExpenseHandler) Delete(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}

	if err := h.service.Delete(uint(id)); err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil menghapus pengeluaran"})
}
