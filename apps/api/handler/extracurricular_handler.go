package handler

import (
	"api/dto"
	"api/service"
	"api/utility"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
)

type ExtracurricularHandler struct {
	extracurricularService service.ExtracurricularService
}

func NewExtracurricularHandler(extracurricularService service.ExtracurricularService) *ExtracurricularHandler {
	return &ExtracurricularHandler{extracurricularService: extracurricularService}
}

// List godoc
// @Summary      List extracurriculars
// @Description  Get a list of all extracurriculars
// @Tags         extracurriculars
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        type  query   string  false  "Filter by type (wajib/pilihan)"
// @Success      200   {object}  dto.SuccessResponse{data=[]dto.ExtracurricularResponse}
// @Failure      401   {object}  dto.ErrorResponse
// @Failure      403   {object}  dto.ErrorResponse
// @Failure      500   {object}  dto.ErrorResponse
// @Router       /v1/extracurriculars [get]
func (h *ExtracurricularHandler) List(c echo.Context) error {
	params := dto.ExtracurricularQueryParams{
		Type: c.QueryParam("type"),
	}

	exs, err := h.extracurricularService.GetAll(params)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Berhasil mengambil daftar ekstrakurikuler",
		Data:    exs,
	})
}

// Create godoc
// @Summary      Create extracurricular
// @Description  Create a new extracurricular
// @Tags         extracurriculars
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        request  body      dto.CreateExtracurricularRequest  true  "Extracurricular data"
// @Success      201      {object}  dto.SuccessResponse{data=dto.ExtracurricularResponse}
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Failure      500      {object}  dto.ErrorResponse
// @Router       /v1/extracurriculars [post]
func (h *ExtracurricularHandler) Create(c echo.Context) error {
	var req dto.CreateExtracurricularRequest
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

	ex, err := h.extracurricularService.Create(req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusCreated, dto.SuccessResponse{
		Message: "Berhasil membuat ekstrakurikuler",
		Data:    ex,
	})
}

// Update godoc
// @Summary      Update extracurricular
// @Description  Update extracurricular details
// @Tags         extracurriculars
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id       path      int                               true  "Extracurricular ID"
// @Param        request  body      dto.CreateExtracurricularRequest  true  "Updated data"
// @Success      200      {object}  dto.SuccessResponse{data=dto.ExtracurricularResponse}
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Failure      404      {object}  dto.ErrorResponse
// @Failure      500      {object}  dto.ErrorResponse
// @Router       /v1/extracurriculars/{id} [put]
func (h *ExtracurricularHandler) Update(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID ekstrakurikuler tidak valid",
		})
	}

	var req dto.CreateExtracurricularRequest
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

	ex, err := h.extracurricularService.Update(uint(id), req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Berhasil memperbarui ekstrakurikuler",
		Data:    ex,
	})
}

// Delete godoc
// @Summary      Delete extracurricular
// @Description  Delete an extracurricular
// @Tags         extracurriculars
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id   path      int  true  "Extracurricular ID"
// @Success      200  {object}  dto.SuccessResponse
// @Failure      400  {object}  dto.ErrorResponse
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Failure      404  {object}  dto.ErrorResponse
// @Failure      422  {object}  dto.ErrorResponse
// @Failure      500  {object}  dto.ErrorResponse
// @Router       /v1/extracurriculars/{id} [delete]
func (h *ExtracurricularHandler) Delete(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID ekstrakurikuler tidak valid",
		})
	}

	if err := h.extracurricularService.Delete(uint(id)); err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Berhasil menghapus ekstrakurikuler",
	})
}
