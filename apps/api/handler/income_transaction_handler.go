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

type IncomeTransactionHandler struct {
	service service.IncomeTransactionService
}

func NewIncomeTransactionHandler(service service.IncomeTransactionService) *IncomeTransactionHandler {
	return &IncomeTransactionHandler{service: service}
}

// List godoc
// @Summary      List income transactions
// @Description  Get a paginated list of income transactions (BOS, donasi, hibah, etc.)
// @Tags         income-transactions
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        page              query   int     false  "Page number"
// @Param        limit             query   int     false  "Limit per page"
// @Param        academic_year_id  query   int     false  "Academic Year ID"
// @Param        category          query   string  false  "Filter by category (bos, donasi, hibah, lainnya)"
// @Param        start_date        query   string  false  "Start Date (YYYY-MM-DD)"
// @Param        end_date          query   string  false  "End Date (YYYY-MM-DD)"
// @Success      200               {object}  dto.PaginatedResponse{data=[]dto.IncomeTransactionResponse}
// @Failure      401               {object}  dto.ErrorResponse
// @Failure      403               {object}  dto.ErrorResponse
// @Failure      500               {object}  dto.ErrorResponse
// @Router       /v1/income-transactions [get]
func (h *IncomeTransactionHandler) List(c echo.Context) error {
	page, limit := utility.ParsePagination(c)
	academicYearID, _ := strconv.Atoi(c.QueryParam("academic_year_id"))

	params := dto.IncomeTransactionQueryParams{
		AcademicYearID: uint(academicYearID),
		Category:       c.QueryParam("category"),
		StartDate:      c.QueryParam("start_date"),
		EndDate:        c.QueryParam("end_date"),
		Page:           page,
		Limit:          limit,
	}

	txns, meta, err := h.service.GetAll(params)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.PaginatedResponse{
		Message: "Berhasil mengambil daftar penerimaan",
		Data:    txns,
		Meta:    *meta,
	})
}

// Create godoc
// @Summary      Create income transaction
// @Description  Record a new income transaction (BOS, donasi, hibah, etc.)
// @Tags         income-transactions
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        request  body      dto.CreateIncomeTransactionRequest  true  "Create income transaction"
// @Success      201      {object}  dto.SuccessResponse{data=dto.IncomeTransactionResponse}
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Failure      422      {object}  dto.ErrorResponse
// @Failure      500      {object}  dto.ErrorResponse
// @Router       /v1/income-transactions [post]
func (h *IncomeTransactionHandler) Create(c echo.Context) error {
	var req dto.CreateIncomeTransactionRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}

	createdBy, err := middleware.GetUserID(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, dto.ErrorResponse{Status: http.StatusUnauthorized, Code: "UNAUTHORIZED", Message: "User ID tidak ditemukan di context"})
	}
	txn, err := h.service.Create(createdBy, req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusCreated, dto.SuccessResponse{Message: "Berhasil mencatat penerimaan", Data: txn})
}

// Get godoc
// @Summary      Get income transaction by ID
// @Description  Get income transaction detail
// @Tags         income-transactions
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id   path      int  true  "Income Transaction ID"
// @Success      200  {object}  dto.SuccessResponse{data=dto.IncomeTransactionResponse}
// @Failure      400  {object}  dto.ErrorResponse
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Failure      404  {object}  dto.ErrorResponse
// @Failure      500  {object}  dto.ErrorResponse
// @Router       /v1/income-transactions/{id} [get]
func (h *IncomeTransactionHandler) Get(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}

	txn, err := h.service.GetByID(uint(id))
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil detail penerimaan", Data: txn})
}

// Update godoc
// @Summary      Update income transaction
// @Description  Update an existing income transaction
// @Tags         income-transactions
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id       path      int                                  true  "Income Transaction ID"
// @Param        request  body      dto.CreateIncomeTransactionRequest   true  "Update income transaction"
// @Success      200      {object}  dto.SuccessResponse{data=dto.IncomeTransactionResponse}
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Failure      404      {object}  dto.ErrorResponse
// @Failure      422      {object}  dto.ErrorResponse
// @Failure      500      {object}  dto.ErrorResponse
// @Router       /v1/income-transactions/{id} [put]
func (h *IncomeTransactionHandler) Update(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}

	var req dto.CreateIncomeTransactionRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}

	txn, err := h.service.Update(uint(id), req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil memperbarui penerimaan", Data: txn})
}

// Delete godoc
// @Summary      Delete income transaction
// @Description  Delete an existing income transaction
// @Tags         income-transactions
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id   path      int  true  "Income Transaction ID"
// @Success      200  {object}  dto.SuccessResponse
// @Failure      400  {object}  dto.ErrorResponse
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Failure      404  {object}  dto.ErrorResponse
// @Failure      422  {object}  dto.ErrorResponse
// @Failure      500  {object}  dto.ErrorResponse
// @Router       /v1/income-transactions/{id} [delete]
func (h *IncomeTransactionHandler) Delete(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}

	if err := h.service.Delete(uint(id)); err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil menghapus penerimaan"})
}
