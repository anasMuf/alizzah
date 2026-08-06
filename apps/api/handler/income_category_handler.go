package handler

import (
	"api/dto"
	"api/service"
	"api/utility"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
)

type IncomeCategoryHandler struct {
	service service.IncomeCategoryService
}

func NewIncomeCategoryHandler(service service.IncomeCategoryService) *IncomeCategoryHandler {
	return &IncomeCategoryHandler{service: service}
}

// List godoc
// @Summary      Get income category list
// @Description  Get all income categories (flat list)
// @Tags         income-categories
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Success      200  {object}  dto.SuccessResponse{data=[]dto.IncomeCategoryResponse}
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Failure      500  {object}  dto.ErrorResponse
// @Router       /v1/income-categories [get]
func (h *IncomeCategoryHandler) List(c echo.Context) error {
	categories, err := h.service.GetAll()
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil kategori penerimaan", Data: categories})
}

// Create godoc
// @Summary      Create income category
// @Description  Create a new income category
// @Tags         income-categories
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        request  body      dto.CreateIncomeCategoryRequest  true  "Create category request"
// @Success      201      {object}  dto.SuccessResponse{data=dto.IncomeCategoryResponse}
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Failure      422      {object}  dto.ErrorResponse
// @Failure      500      {object}  dto.ErrorResponse
// @Router       /v1/income-categories [post]
func (h *IncomeCategoryHandler) Create(c echo.Context) error {
	var req dto.CreateIncomeCategoryRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}

	cat, err := h.service.Create(req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusCreated, dto.SuccessResponse{Message: "Berhasil membuat kategori penerimaan", Data: cat})
}

// Update godoc
// @Summary      Update income category
// @Description  Update an existing income category
// @Tags         income-categories
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id       path      int                               true  "Category ID"
// @Param        request  body      dto.CreateIncomeCategoryRequest   true  "Update category request"
// @Success      200      {object}  dto.SuccessResponse{data=dto.IncomeCategoryResponse}
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Failure      404      {object}  dto.ErrorResponse
// @Failure      422      {object}  dto.ErrorResponse
// @Failure      500      {object}  dto.ErrorResponse
// @Router       /v1/income-categories/{id} [put]
func (h *IncomeCategoryHandler) Update(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}

	var req dto.CreateIncomeCategoryRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}

	cat, err := h.service.Update(uint(id), req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil memperbarui kategori penerimaan", Data: cat})
}

// Delete godoc
// @Summary      Delete income category
// @Description  Delete an existing income category (only if no transactions use it)
// @Tags         income-categories
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id   path      int  true  "Category ID"
// @Success      200  {object}  dto.SuccessResponse
// @Failure      400  {object}  dto.ErrorResponse
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Failure      404  {object}  dto.ErrorResponse
// @Failure      422  {object}  dto.ErrorResponse
// @Failure      500  {object}  dto.ErrorResponse
// @Router       /v1/income-categories/{id} [delete]
func (h *IncomeCategoryHandler) Delete(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}

	if err := h.service.Delete(uint(id)); err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil menghapus kategori penerimaan"})
}
