package handler

import (
	"api/dto"
	"api/service"
	"api/utility"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
)

type FeeConfigHandler struct {
	service service.FeeConfigService
}

func NewFeeConfigHandler(service service.FeeConfigService) *FeeConfigHandler {
	return &FeeConfigHandler{service: service}
}

// List godoc
// @Summary      List fee configs
// @Description  Get a list of all fee configurations
// @Tags         fee-configs
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Success      200  {object}  dto.SuccessResponse{data=[]dto.FeeConfigResponse}
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Failure      500  {object}  dto.ErrorResponse
// @Router       /v1/fee-configs [get]
func (h *FeeConfigHandler) List(c echo.Context) error {
	fcs, err := h.service.GetAll()
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Berhasil mengambil daftar konfigurasi tarif",
		Data:    fcs,
	})
}

// Create godoc
// @Summary      Create fee config
// @Description  Create a new fee configuration
// @Tags         fee-configs
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        request  body      dto.CreateFeeConfigRequest  true  "Fee config data"
// @Success      201      {object}  dto.SuccessResponse{data=dto.FeeConfigResponse}
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Failure      409      {object}  dto.ErrorResponse
// @Failure      500      {object}  dto.ErrorResponse
// @Router       /v1/fee-configs [post]
func (h *FeeConfigHandler) Create(c echo.Context) error {
	var req dto.CreateFeeConfigRequest
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

	fc, err := h.service.Create(req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		if err.Error() == "Konfigurasi tarif sudah ada untuk tahun ajaran ini" {
			status = http.StatusConflict
			code = "CONFLICT"
		}
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusCreated, dto.SuccessResponse{
		Message: "Berhasil membuat konfigurasi tarif",
		Data:    fc,
	})
}

// Get godoc
// @Summary      Get fee config
// @Description  Get fee configuration by ID
// @Tags         fee-configs
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id   path      int  true  "Fee Config ID"
// @Success      200  {object}  dto.SuccessResponse{data=dto.FeeConfigResponse}
// @Failure      400  {object}  dto.ErrorResponse
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Failure      404  {object}  dto.ErrorResponse
// @Failure      500  {object}  dto.ErrorResponse
// @Router       /v1/fee-configs/{id} [get]
func (h *FeeConfigHandler) Get(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID tidak valid",
		})
	}

	fc, err := h.service.GetByID(uint(id))
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Berhasil mengambil konfigurasi tarif",
		Data:    fc,
	})
}

// Update godoc
// @Summary      Update fee config
// @Description  Update a fee configuration
// @Tags         fee-configs
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id       path      int                         true  "Fee Config ID"
// @Param        request  body      dto.UpdateFeeConfigRequest  true  "Fee config update data"
// @Success      200      {object}  dto.SuccessResponse{data=dto.FeeConfigResponse}
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Failure      404      {object}  dto.ErrorResponse
// @Failure      500      {object}  dto.ErrorResponse
// @Router       /v1/fee-configs/{id} [put]
func (h *FeeConfigHandler) Update(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID tidak valid",
		})
	}

	var req dto.UpdateFeeConfigRequest
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

	fc, err := h.service.Update(uint(id), req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Berhasil memperbarui konfigurasi tarif",
		Data:    fc,
	})
}

// ListItems godoc
// @Summary      List fee config items
// @Description  Get a list of items within a fee configuration
// @Tags         fee-configs
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id        path   int     true   "Fee Config ID"
// @Param        category  query  string  false  "Filter by category"
// @Param        level     query  string  false  "Filter by level"
// @Param        gender    query  string  false  "Filter by gender"
// @Success      200       {object}  dto.SuccessResponse{data=[]dto.FeeConfigItemResponse}
// @Failure      400       {object}  dto.ErrorResponse
// @Failure      401       {object}  dto.ErrorResponse
// @Failure      403       {object}  dto.ErrorResponse
// @Failure      404       {object}  dto.ErrorResponse
// @Failure      500       {object}  dto.ErrorResponse
// @Router       /v1/fee-configs/{id}/items [get]
func (h *FeeConfigHandler) ListItems(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID tidak valid",
		})
	}

	params := dto.FeeConfigItemQueryParams{
		Category: c.QueryParam("category"),
		Level:    c.QueryParam("level"),
		Gender:   c.QueryParam("gender"),
	}

	items, err := h.service.GetItems(uint(id), params)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Berhasil mengambil daftar item tarif",
		Data:    items,
	})
}

// CreateItem godoc
// @Summary      Create fee config item
// @Description  Add a new item to a fee configuration
// @Tags         fee-configs
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id       path      int                             true  "Fee Config ID"
// @Param        request  body      dto.CreateFeeConfigItemRequest  true  "Item data"
// @Success      201      {object}  dto.SuccessResponse{data=dto.FeeConfigItemResponse}
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Failure      404      {object}  dto.ErrorResponse
// @Failure      409      {object}  dto.ErrorResponse
// @Failure      500      {object}  dto.ErrorResponse
// @Router       /v1/fee-configs/{id}/items [post]
func (h *FeeConfigHandler) CreateItem(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID tidak valid",
		})
	}

	var req dto.CreateFeeConfigItemRequest
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

	item, err := h.service.CreateItem(uint(id), req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		if err.Error() == "Kombinasi item tarif sudah ada untuk fee config ini" {
			status = http.StatusConflict
			code = "CONFLICT"
		}
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusCreated, dto.SuccessResponse{
		Message: "Berhasil menambahkan item tarif",
		Data:    item,
	})
}

// UpdateItem godoc
// @Summary      Update fee config item
// @Description  Update a fee config item
// @Tags         fee-configs
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id       path      int                             true  "Fee Config ID"
// @Param        item_id  path      int                             true  "Item ID"
// @Param        request  body      dto.CreateFeeConfigItemRequest  true  "Updated item data"
// @Success      200      {object}  dto.SuccessResponse{data=dto.FeeConfigItemResponse}
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Failure      404      {object}  dto.ErrorResponse
// @Failure      409      {object}  dto.ErrorResponse
// @Failure      500      {object}  dto.ErrorResponse
// @Router       /v1/fee-configs/{id}/items/{item_id} [put]
func (h *FeeConfigHandler) UpdateItem(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID fee config tidak valid",
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

	var req dto.CreateFeeConfigItemRequest
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
		if err.Error() == "Kombinasi item tarif sudah ada untuk fee config ini" {
			status = http.StatusConflict
			code = "CONFLICT"
		}
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Berhasil memperbarui item tarif",
		Data:    item,
	})
}

// DeleteItem godoc
// @Summary      Delete fee config item
// @Description  Delete an item from a fee configuration
// @Tags         fee-configs
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id       path      int  true  "Fee Config ID"
// @Param        item_id  path      int  true  "Item ID"
// @Success      200      {object}  dto.SuccessResponse
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Failure      404      {object}  dto.ErrorResponse
// @Failure      422      {object}  dto.ErrorResponse
// @Failure      500      {object}  dto.ErrorResponse
// @Router       /v1/fee-configs/{id}/items/{item_id} [delete]
func (h *FeeConfigHandler) DeleteItem(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID fee config tidak valid",
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
		if err.Error() == "Tidak bisa menghapus item yang sudah digunakan pada tagihan" {
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
		Message: "Berhasil menghapus item tarif",
	})
}
