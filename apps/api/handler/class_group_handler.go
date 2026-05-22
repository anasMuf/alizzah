package handler

import (
	"api/dto"
	"api/service"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
)

type ClassGroupHandler struct {
	classGroupService service.ClassGroupService
}

func NewClassGroupHandler(classGroupService service.ClassGroupService) *ClassGroupHandler {
	return &ClassGroupHandler{classGroupService: classGroupService}
}

// List godoc
// @Summary      List all class groups
// @Description  Get all class groups with optional filters
// @Tags         class-groups
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        academic_year_id  query   int     false  "Filter by academic year"
// @Param        level             query   string  false  "Filter by level (mutiara, intan, berlian)"
// @Success      200  {object}  dto.SuccessResponse{data=[]dto.ClassGroupResponse}
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Router       /v1/class-groups [get]
func (h *ClassGroupHandler) List(c echo.Context) error {
	academicYearID, _ := strconv.ParseUint(c.QueryParam("academic_year_id"), 10, 32)
	params := dto.ClassGroupQueryParams{
		AcademicYearID: uint(academicYearID),
		Level:          c.QueryParam("level"),
	}

	cgs, err := h.classGroupService.GetAll(params)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Data retrieved successfully",
		Data:    cgs,
	})
}

// Create godoc
// @Summary      Create a new class group
// @Description  Create a new class group with schedule
// @Tags         class-groups
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        request  body      dto.CreateClassGroupRequest  true  "Class group data"
// @Success      201      {object}  dto.SuccessResponse{data=dto.ClassGroupResponse}
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Router       /v1/class-groups [post]
func (h *ClassGroupHandler) Create(c echo.Context) error {
	var req dto.CreateClassGroupRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Format request tidak valid")
	}
	if err := c.Validate(&req); err != nil {
		return err
	}

	cg, err := h.classGroupService.Create(req)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusCreated, dto.SuccessResponse{
		Message: "Rombel berhasil dibuat",
		Data:    cg,
	})
}

// Get godoc
// @Summary      Get class group by ID
// @Description  Get a single class group's detail
// @Tags         class-groups
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id   path      int  true  "Class Group ID"
// @Success      200  {object}  dto.SuccessResponse{data=dto.ClassGroupResponse}
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Failure      404  {object}  dto.ErrorResponse
// @Router       /v1/class-groups/{id} [get]
func (h *ClassGroupHandler) Get(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "ID tidak valid")
	}

	cg, err := h.classGroupService.GetByID(uint(id))
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Data retrieved successfully",
		Data:    cg,
	})
}

// Update godoc
// @Summary      Update a class group
// @Description  Update class group data
// @Tags         class-groups
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id       path      int                          true  "Class Group ID"
// @Param        request  body      dto.CreateClassGroupRequest  true  "Updated class group data"
// @Success      200      {object}  dto.SuccessResponse{data=dto.ClassGroupResponse}
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Failure      404      {object}  dto.ErrorResponse
// @Router       /v1/class-groups/{id} [put]
func (h *ClassGroupHandler) Update(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "ID tidak valid")
	}

	var req dto.CreateClassGroupRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Format request tidak valid")
	}
	if err := c.Validate(&req); err != nil {
		return err
	}

	cg, err := h.classGroupService.Update(uint(id), req)
	if err != nil {
		if err.Error() == "Rombel tidak ditemukan" {
			return echo.NewHTTPError(http.StatusNotFound, err.Error())
		}
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Rombel berhasil diperbarui",
		Data:    cg,
	})
}

// Delete godoc
// @Summary      Delete a class group
// @Description  Delete a class group (fails if it still has active students)
// @Tags         class-groups
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id   path      int  true  "Class Group ID"
// @Success      200  {object}  dto.SuccessResponse
// @Failure      400  {object}  dto.ErrorResponse
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Failure      404  {object}  dto.ErrorResponse
// @Failure      422  {object}  dto.ErrorResponse
// @Router       /v1/class-groups/{id} [delete]
func (h *ClassGroupHandler) Delete(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "ID tidak valid")
	}

	err = h.classGroupService.Delete(uint(id))
	if err != nil {
		if err.Error() == "Rombel tidak ditemukan" {
			return echo.NewHTTPError(http.StatusNotFound, err.Error())
		}
		return echo.NewHTTPError(http.StatusUnprocessableEntity, err.Error())
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Rombel berhasil dihapus",
	})
}
