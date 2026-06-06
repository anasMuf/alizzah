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

type CashHandler struct {
	service service.CashService
}

func NewCashHandler(service service.CashService) *CashHandler {
	return &CashHandler{service: service}
}

// GetBalance godoc
// @Summary      Get cash balance
// @Description  Get current cash balance and today's summary
// @Tags         cash
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        academic_year_id  query  int  false  "Academic Year ID"
// @Success      200               {object}  dto.SuccessResponse{data=dto.CashBalanceResponse}
// @Failure      401               {object}  dto.ErrorResponse
// @Failure      403               {object}  dto.ErrorResponse
// @Failure      500               {object}  dto.ErrorResponse
// @Router       /v1/cash/balance [get]
func (h *CashHandler) GetBalance(c echo.Context) error {
	academicYearID, _ := strconv.Atoi(c.QueryParam("academic_year_id"))
	balance, err := h.service.GetBalance(uint(academicYearID))
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil saldo kas", Data: balance})
}

// GetTransactions godoc
// @Summary      Get cash transactions
// @Description  Get a paginated list of cash transactions
// @Tags         cash
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        page              query   int     false  "Page number"
// @Param        limit             query   int     false  "Limit per page"
// @Param        academic_year_id  query   int     false  "Academic Year ID"
// @Param        transaction_type  query   string  false  "Transaction Type (credit/debit)"
// @Param        source_type       query   string  false  "Source Type"
// @Param        start_date        query   string  false  "Start Date (YYYY-MM-DD)"
// @Param        end_date          query   string  false  "End Date (YYYY-MM-DD)"
// @Success      200               {object}  dto.PaginatedResponse{data=[]dto.CashTransactionResponse}
// @Failure      401               {object}  dto.ErrorResponse
// @Failure      403               {object}  dto.ErrorResponse
// @Failure      500               {object}  dto.ErrorResponse
// @Router       /v1/cash/transactions [get]
func (h *CashHandler) GetTransactions(c echo.Context) error {
	page, _ := strconv.Atoi(c.QueryParam("page"))
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	academicYearID, _ := strconv.Atoi(c.QueryParam("academic_year_id"))

	params := dto.CashTransactionQueryParams{
		AcademicYearID:  uint(academicYearID),
		TransactionType: c.QueryParam("transaction_type"),
		SourceType:      c.QueryParam("source_type"),
		StartDate:       c.QueryParam("start_date"),
		EndDate:         c.QueryParam("end_date"),
		Page:            page,
		Limit:           limit,
	}

	txns, meta, err := h.service.GetTransactions(params)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.PaginatedResponse{
		Message: "Berhasil mengambil riwayat transaksi kas",
		Data:    txns,
		Meta:    *meta,
	})
}

// TransferToVault godoc
// @Summary      Transfer cash to vault
// @Description  Record a transfer from cash to vault
// @Tags         cash
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        academic_year_id  query     int                          false  "Academic Year ID"
// @Param        request           body      dto.TransferToCashRequest    true   "Transfer request"
// @Success      200               {object}  dto.SuccessResponse
// @Failure      400               {object}  dto.ErrorResponse
// @Failure      401               {object}  dto.ErrorResponse
// @Failure      403               {object}  dto.ErrorResponse
// @Failure      422               {object}  dto.ErrorResponse
// @Failure      500               {object}  dto.ErrorResponse
// @Router       /v1/cash/transfers [post]
func (h *CashHandler) TransferToVault(c echo.Context) error {
	var req dto.TransferToCashRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}

	academicYearID, _ := strconv.Atoi(c.QueryParam("academic_year_id"))
	createdBy, err := middleware.GetUserID(c)
	if err != nil {
		return err
	}

	if err := h.service.TransferToVault(createdBy, req, uint(academicYearID)); err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil memindahkan kas ke berangkas"})
}
