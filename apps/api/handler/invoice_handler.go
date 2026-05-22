package handler

import (
	"api/dto"
	"api/service"
	"api/utility"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
)

type InvoiceHandler struct {
	service service.InvoiceService
}

func NewInvoiceHandler(service service.InvoiceService) *InvoiceHandler {
	return &InvoiceHandler{service: service}
}

// List godoc
// @Summary      List invoices
// @Description  Get a paginated list of invoices with various filters
// @Tags         invoices
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        page              query   int     false  "Page number"  default(1)
// @Param        limit             query   int     false  "Items per page"  default(20)
// @Param        student_id        query   int     false  "Filter by student ID"
// @Param        academic_year_id  query   int     false  "Filter by academic year ID"
// @Param        month             query   int     false  "Filter by month (1-12)"
// @Param        year              query   int     false  "Filter by year"
// @Param        class_group_id    query   int     false  "Filter by class group ID"
// @Param        type              query   string  false  "Filter by type"
// @Param        status            query   string  false  "Filter by status"
// @Success      200               {object}  dto.PaginatedResponse{data=[]dto.InvoiceListResponse}
// @Failure      401               {object}  dto.ErrorResponse
// @Failure      403               {object}  dto.ErrorResponse
// @Failure      500               {object}  dto.ErrorResponse
// @Router       /v1/invoices [get]
func (h *InvoiceHandler) List(c echo.Context) error {
	page, _ := strconv.Atoi(c.QueryParam("page"))
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	studentID, _ := strconv.Atoi(c.QueryParam("student_id"))
	academicYearID, _ := strconv.Atoi(c.QueryParam("academic_year_id"))
	month, _ := strconv.Atoi(c.QueryParam("month"))
	year, _ := strconv.Atoi(c.QueryParam("year"))
	classGroupID, _ := strconv.Atoi(c.QueryParam("class_group_id"))

	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}

	params := dto.InvoiceQueryParams{
		StudentID:      uint(studentID),
		AcademicYearID: uint(academicYearID),
		Type:           c.QueryParam("type"),
		Status:         c.QueryParam("status"),
		Month:          uint(month),
		Year:           uint(year),
		ClassGroupID:   uint(classGroupID),
		Page:           page,
		Limit:          limit,
	}

	invoices, meta, err := h.service.GetAll(params)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.PaginatedResponse{
		Message: "Berhasil mengambil daftar tagihan",
		Data:    invoices,
		Meta:    *meta,
	})
}

// Get godoc
// @Summary      Get invoice details
// @Description  Get detailed information of a specific invoice
// @Tags         invoices
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id   path      int  true  "Invoice ID"
// @Success      200  {object}  dto.SuccessResponse{data=dto.InvoiceDetailResponse}
// @Failure      400  {object}  dto.ErrorResponse
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Failure      404  {object}  dto.ErrorResponse
// @Failure      500  {object}  dto.ErrorResponse
// @Router       /v1/invoices/{id} [get]
func (h *InvoiceHandler) Get(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID tidak valid",
		})
	}

	invoice, err := h.service.GetByID(uint(id))
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Berhasil mengambil detail tagihan",
		Data:    invoice,
	})
}

// GetByStudent godoc
// @Summary      Get invoices by student
// @Description  Get a list of invoices for a specific student
// @Tags         invoices
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id                path   int     true   "Student ID"
// @Param        academic_year_id  query  int     false  "Filter by academic year ID"
// @Param        type              query  string  false  "Filter by type"
// @Param        status            query  string  false  "Filter by status"
// @Success      200               {object}  dto.SuccessResponse{data=[]dto.InvoiceListResponse}
// @Failure      400               {object}  dto.ErrorResponse
// @Failure      401               {object}  dto.ErrorResponse
// @Failure      403               {object}  dto.ErrorResponse
// @Failure      500               {object}  dto.ErrorResponse
// @Router       /v1/students/{id}/invoices [get]
func (h *InvoiceHandler) GetByStudent(c echo.Context) error {
	studentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID siswa tidak valid",
		})
	}

	academicYearID, _ := strconv.Atoi(c.QueryParam("academic_year_id"))

	invoices, err := h.service.GetByStudentID(
		uint(studentID),
		c.QueryParam("type"),
		c.QueryParam("status"),
		uint(academicYearID),
	)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Berhasil mengambil tagihan siswa",
		Data:    invoices,
	})
}

// AddItem godoc
// @Summary      Add item to invoice
// @Description  Add a new item to an existing invoice
// @Tags         invoices
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id       path      int                        true  "Invoice ID"
// @Param        request  body      dto.AddInvoiceItemRequest  true  "Item data"
// @Success      201      {object}  dto.SuccessResponse{data=dto.InvoiceItemResponse}
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Failure      404      {object}  dto.ErrorResponse
// @Failure      500      {object}  dto.ErrorResponse
// @Router       /v1/invoices/{id}/items [post]
func (h *InvoiceHandler) AddItem(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID tidak valid",
		})
	}

	var req dto.AddInvoiceItemRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: err.Error(),
		})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "VALIDATION_ERROR",
			Message: err.Error(),
		})
	}

	item, err := h.service.AddItem(uint(id), req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusCreated, dto.SuccessResponse{
		Message: "Berhasil menambahkan item tagihan",
		Data:    item,
	})
}

// UpdateItem godoc
// @Summary      Update invoice item
// @Description  Update details of a specific invoice item
// @Tags         invoices
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id       path      int                           true  "Invoice ID"
// @Param        item_id  path      int                           true  "Item ID"
// @Param        request  body      dto.UpdateInvoiceItemRequest  true  "Updated item data"
// @Success      200      {object}  dto.SuccessResponse{data=dto.InvoiceItemResponse}
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Failure      404      {object}  dto.ErrorResponse
// @Failure      422      {object}  dto.ErrorResponse
// @Failure      500      {object}  dto.ErrorResponse
// @Router       /v1/invoices/{id}/items/{item_id} [put]
func (h *InvoiceHandler) UpdateItem(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID invoice tidak valid",
		})
	}
	itemID, err := strconv.Atoi(c.Param("item_id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID item tidak valid",
		})
	}

	var req dto.UpdateInvoiceItemRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: err.Error(),
		})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "VALIDATION_ERROR",
			Message: err.Error(),
		})
	}

	item, err := h.service.UpdateItem(uint(id), uint(itemID), req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		if err.Error() == "Item sudah sebagian dibayar, tidak bisa diubah" {
			status = http.StatusUnprocessableEntity
			code = "UNPROCESSABLE_ENTITY"
		}
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Berhasil memperbarui item tagihan",
		Data:    item,
	})
}

// DeleteItem godoc
// @Summary      Delete invoice item
// @Description  Delete an item from an invoice
// @Tags         invoices
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id       path      int  true  "Invoice ID"
// @Param        item_id  path      int  true  "Item ID"
// @Success      200      {object}  dto.SuccessResponse
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Failure      404      {object}  dto.ErrorResponse
// @Failure      422      {object}  dto.ErrorResponse
// @Failure      500      {object}  dto.ErrorResponse
// @Router       /v1/invoices/{id}/items/{item_id} [delete]
func (h *InvoiceHandler) DeleteItem(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID invoice tidak valid",
		})
	}
	itemID, err := strconv.Atoi(c.Param("item_id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID item tidak valid",
		})
	}

	if err := h.service.DeleteItem(uint(id), uint(itemID)); err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		errMsg := err.Error()
		if errMsg == "Tidak bisa menghapus item mandatory" || errMsg == "Tidak bisa menghapus item yang sudah dibayar" || errMsg == "Tidak bisa menghapus item yang sudah memiliki riwayat pembayaran" {
			status = http.StatusUnprocessableEntity
			code = "UNPROCESSABLE_ENTITY"
		}
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Berhasil menghapus item tagihan",
	})
}

// GetInstallments godoc
// @Summary      Get invoice installments
// @Description  Get a list of installments for an invoice
// @Tags         invoices
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id   path      int  true  "Invoice ID"
// @Success      200  {object}  dto.SuccessResponse{data=[]dto.InstallmentResponse}
// @Failure      400  {object}  dto.ErrorResponse
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Failure      404  {object}  dto.ErrorResponse
// @Failure      500  {object}  dto.ErrorResponse
// @Router       /v1/invoices/{id}/installments [get]
func (h *InvoiceHandler) GetInstallments(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID tidak valid",
		})
	}

	installments, err := h.service.GetInstallments(uint(id))
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Berhasil mengambil jadwal cicilan",
		Data:    installments,
	})
}

// CreateInstallments godoc
// @Summary      Create invoice installments
// @Description  Create a schedule of installments for an invoice
// @Tags         invoices
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id       path      int                                     true  "Invoice ID"
// @Param        request  body      dto.CreateInstallmentScheduleRequest    true  "Installment schedule data"
// @Success      201      {object}  dto.SuccessResponse{data=[]dto.InstallmentResponse}
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Failure      404      {object}  dto.ErrorResponse
// @Failure      422      {object}  dto.ErrorResponse
// @Failure      500      {object}  dto.ErrorResponse
// @Router       /v1/invoices/{id}/installments [post]
func (h *InvoiceHandler) CreateInstallments(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID tidak valid",
		})
	}

	var req dto.CreateInstallmentScheduleRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: err.Error(),
		})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "VALIDATION_ERROR",
			Message: err.Error(),
		})
	}

	installments, err := h.service.CreateInstallmentSchedule(uint(id), req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		if err.Error() == "Jadwal cicilan hanya tersedia untuk invoice bertipe registration" {
			status = http.StatusUnprocessableEntity
			code = "UNPROCESSABLE_ENTITY"
		}
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusCreated, dto.SuccessResponse{
		Message: "Berhasil membuat jadwal cicilan",
		Data:    installments,
	})
}

// UpdateInstallment godoc
// @Summary      Update invoice installment
// @Description  Update details of a specific installment
// @Tags         invoices
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id       path      int                           true  "Invoice ID"
// @Param        inst_id  path      int                           true  "Installment ID"
// @Param        request  body      dto.UpdateInstallmentRequest  true  "Updated installment data"
// @Success      200      {object}  dto.SuccessResponse{data=dto.InstallmentResponse}
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Failure      404      {object}  dto.ErrorResponse
// @Failure      500      {object}  dto.ErrorResponse
// @Router       /v1/invoices/{id}/installments/{inst_id} [put]
func (h *InvoiceHandler) UpdateInstallment(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID invoice tidak valid",
		})
	}
	instID, err := strconv.Atoi(c.Param("inst_id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID cicilan tidak valid",
		})
	}

	var req dto.UpdateInstallmentRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: err.Error(),
		})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "VALIDATION_ERROR",
			Message: err.Error(),
		})
	}

	inst, err := h.service.UpdateInstallment(uint(id), uint(instID), req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Berhasil memperbarui cicilan",
		Data:    inst,
	})
}

// DeleteInstallment godoc
// @Summary      Delete invoice installment
// @Description  Delete a specific installment
// @Tags         invoices
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id       path      int  true  "Invoice ID"
// @Param        inst_id  path      int  true  "Installment ID"
// @Success      200      {object}  dto.SuccessResponse
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Failure      404      {object}  dto.ErrorResponse
// @Failure      500      {object}  dto.ErrorResponse
// @Router       /v1/invoices/{id}/installments/{inst_id} [delete]
func (h *InvoiceHandler) DeleteInstallment(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID invoice tidak valid",
		})
	}
	instID, err := strconv.Atoi(c.Param("inst_id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID cicilan tidak valid",
		})
	}

	if err := h.service.DeleteInstallment(uint(id), uint(instID)); err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Berhasil menghapus cicilan",
	})
}
