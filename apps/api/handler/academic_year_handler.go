package handler

import (
	"api/dto"
	"api/service"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
)

type AcademicYearHandler struct {
	ayService service.AcademicYearService
}

func NewAcademicYearHandler(ayService service.AcademicYearService) *AcademicYearHandler {
	return &AcademicYearHandler{ayService: ayService}
}

// List godoc
// @Summary      List all academic years
// @Description  Get all academic years ordered by start_date descending
// @Tags         academic-years
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Success      200  {object}  dto.SuccessResponse{data=[]dto.AcademicYearResponse}
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Router       /v1/academic-years [get]
func (h *AcademicYearHandler) List(c echo.Context) error {
	years, err := h.ayService.GetAll()
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Data retrieved successfully",
		Data:    years,
	})
}

// Create godoc
// @Summary      Create a new academic year
// @Description  Create a new academic year (modul administrasi)
// @Tags         academic-years
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        request  body      dto.CreateAcademicYearRequest  true  "Academic year data"
// @Success      201      {object}  dto.SuccessResponse{data=dto.AcademicYearResponse}
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Failure      409      {object}  dto.ErrorResponse
// @Router       /v1/academic-years [post]
func (h *AcademicYearHandler) Create(c echo.Context) error {
	var req dto.CreateAcademicYearRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Format request tidak valid")
	}
	if err := c.Validate(&req); err != nil {
		return err
	}

	ay, err := h.ayService.Create(req)
	if err != nil {
		if err.Error() == "Nama tahun ajaran sudah digunakan" {
			return echo.NewHTTPError(http.StatusConflict, err.Error())
		}
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusCreated, dto.SuccessResponse{
		Message: "Tahun ajaran berhasil dibuat",
		Data:    ay,
	})
}

// Get godoc
// @Summary      Get academic year by ID
// @Description  Get a single academic year's detail
// @Tags         academic-years
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id   path      int  true  "Academic Year ID"
// @Success      200  {object}  dto.SuccessResponse{data=dto.AcademicYearResponse}
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Failure      404  {object}  dto.ErrorResponse
// @Router       /v1/academic-years/{id} [get]
func (h *AcademicYearHandler) Get(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "ID tidak valid")
	}

	ay, err := h.ayService.GetByID(uint(id))
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Data retrieved successfully",
		Data:    ay,
	})
}

// Update godoc
// @Summary      Update an academic year
// @Description  Update academic year data
// @Tags         academic-years
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id       path      int                            true  "Academic Year ID"
// @Param        request  body      dto.CreateAcademicYearRequest  true  "Updated data"
// @Success      200      {object}  dto.SuccessResponse{data=dto.AcademicYearResponse}
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Failure      404      {object}  dto.ErrorResponse
// @Failure      409      {object}  dto.ErrorResponse
// @Router       /v1/academic-years/{id} [put]
func (h *AcademicYearHandler) Update(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "ID tidak valid")
	}

	var req dto.CreateAcademicYearRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Format request tidak valid")
	}
	if err := c.Validate(&req); err != nil {
		return err
	}

	ay, err := h.ayService.Update(uint(id), req)
	if err != nil {
		switch err.Error() {
		case "Tahun ajaran tidak ditemukan":
			return echo.NewHTTPError(http.StatusNotFound, err.Error())
		case "Nama tahun ajaran sudah digunakan":
			return echo.NewHTTPError(http.StatusConflict, err.Error())
		default:
			return echo.NewHTTPError(http.StatusBadRequest, err.Error())
		}
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Tahun ajaran berhasil diperbarui",
		Data:    ay,
	})
}

// Activate godoc
// @Summary      Activate an academic year
// @Description  Set an academic year as active (deactivates all others)
// @Tags         academic-years
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id   path      int  true  "Academic Year ID"
// @Success      200  {object}  dto.SuccessResponse
// @Failure      400  {object}  dto.ErrorResponse
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Failure      404  {object}  dto.ErrorResponse
// @Failure      422  {object}  dto.ErrorResponse
// @Router       /v1/academic-years/{id}/activate [patch]
func (h *AcademicYearHandler) Activate(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "ID tidak valid")
	}

	err = h.ayService.Activate(uint(id))
	if err != nil {
		if err.Error() == "Tahun ajaran tidak ditemukan" {
			return echo.NewHTTPError(http.StatusNotFound, err.Error())
		}
		return echo.NewHTTPError(http.StatusUnprocessableEntity, err.Error())
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Tahun ajaran berhasil diaktifkan",
	})
}
