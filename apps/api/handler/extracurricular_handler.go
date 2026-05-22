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
		if err.Error() == "Tidak bisa menghapus ekstrakurikuler karena masih diikuti oleh siswa" {
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
		Message: "Berhasil menghapus ekstrakurikuler",
	})
}
