package handler

import (
	"api/dto"
	"api/service"
	"api/utility"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
)

type SavingsHandler struct {
	service service.SavingsService
}

func NewSavingsHandler(service service.SavingsService) *SavingsHandler {
	return &SavingsHandler{service: service}
}

// GetByStudent godoc
// @Summary Get savings balance by student ID
// @Description Get general and mandatory savings balance for a specific student
// @Tags savings
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param id path int true "Student ID"
// @Success 200 {object} dto.SuccessResponse{data=dto.StudentSavingsResponse}
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 403 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /students/{id}/savings [get]
func (h *SavingsHandler) GetByStudent(c echo.Context) error {
	studentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID siswa tidak valid"})
	}

	savings, err := h.service.GetByStudentID(uint(studentID))
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil saldo tabungan", Data: savings})
}

// GetTransactions godoc
// @Summary Get savings transactions
// @Description Get a paginated list of savings transactions for a student
// @Tags savings
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param id path int true "Student ID"
// @Param type query string false "Savings Type (general/mandatory)"
// @Param start_date query string false "Start Date (YYYY-MM-DD)"
// @Param end_date query string false "End Date (YYYY-MM-DD)"
// @Param page query int false "Page number"
// @Param limit query int false "Limit per page"
// @Success 200 {object} dto.PaginatedResponse{data=[]dto.SavingsTransactionResponse}
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 403 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /students/{id}/savings/transactions [get]
func (h *SavingsHandler) GetTransactions(c echo.Context) error {
	studentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID siswa tidak valid"})
	}

	page, _ := strconv.Atoi(c.QueryParam("page"))
	limit, _ := strconv.Atoi(c.QueryParam("limit"))

	params := dto.SavingsTransactionQueryParams{
		Type:      c.QueryParam("type"),
		StartDate: c.QueryParam("start_date"),
		EndDate:   c.QueryParam("end_date"),
		Page:      page,
		Limit:     limit,
	}

	txns, meta, err := h.service.GetTransactions(uint(studentID), params)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.PaginatedResponse{
		Message: "Berhasil mengambil riwayat transaksi tabungan",
		Data:    txns,
		Meta:    *meta,
	})
}

// GuardianWithdrawal godoc
// @Summary Guardian withdrawal
// @Description Record a savings withdrawal by a guardian
// @Tags savings
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param id path int true "Student ID"
// @Param request body dto.SavingsWithdrawalRequest true "Withdrawal request"
// @Success 200 {object} dto.SuccessResponse{data=dto.WithdrawalResponse}
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 403 {object} dto.ErrorResponse
// @Failure 422 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /students/{id}/savings/withdrawals [post]
func (h *SavingsHandler) GuardianWithdrawal(c echo.Context) error {
	studentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID siswa tidak valid"})
	}

	var req dto.SavingsWithdrawalRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}

	createdBy := c.Get("user_id").(uint)
	result, err := h.service.GuardianWithdrawal(uint(studentID), createdBy, req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Penarikan tabungan berhasil", Data: result})
}
