package handler

import (
	"api/dto"
	"api/service"
	"api/utility"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
)

type VaultHandler struct {
	service service.VaultService
}

func NewVaultHandler(service service.VaultService) *VaultHandler {
	return &VaultHandler{service: service}
}

// GetBalance godoc
// @Summary      Get vault balance
// @Description  Get current vault balance and total student savings
// @Tags         vault
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        academic_year_id  query  int  false  "Academic Year ID"
// @Success      200               {object}  dto.SuccessResponse{data=dto.VaultBalanceResponse}
// @Failure      401               {object}  dto.ErrorResponse
// @Failure      403               {object}  dto.ErrorResponse
// @Failure      500               {object}  dto.ErrorResponse
// @Router       /v1/vault/balance [get]
func (h *VaultHandler) GetBalance(c echo.Context) error {
	academicYearID, _ := strconv.Atoi(c.QueryParam("academic_year_id"))
	balance, err := h.service.GetBalance(uint(academicYearID))
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil saldo berangkas", Data: balance})
}

// GetTransactions godoc
// @Summary      Get vault transactions
// @Description  Get a paginated list of vault transactions
// @Tags         vault
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
// @Success      200               {object}  dto.PaginatedResponse{data=[]dto.VaultTransactionResponse}
// @Failure      401               {object}  dto.ErrorResponse
// @Failure      403               {object}  dto.ErrorResponse
// @Failure      500               {object}  dto.ErrorResponse
// @Router       /v1/vault/transactions [get]
func (h *VaultHandler) GetTransactions(c echo.Context) error {
	page, limit := utility.ParsePagination(c)
	academicYearID, _ := strconv.Atoi(c.QueryParam("academic_year_id"))

	params := dto.VaultTransactionQueryParams{
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
		Message: "Berhasil mengambil riwayat transaksi berangkas",
		Data:    txns,
		Meta:    *meta,
	})
}
