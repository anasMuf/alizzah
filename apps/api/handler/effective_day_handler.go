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

type EffectiveDayHandler struct {
	effectiveDayService service.EffectiveDayService
}

func NewEffectiveDayHandler(effectiveDayService service.EffectiveDayService) *EffectiveDayHandler {
	return &EffectiveDayHandler{effectiveDayService: effectiveDayService}
}

// List godoc
// @Summary      List effective days
// @Description  Get a list of effective days for a specific class group
// @Tags         effective-days
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id                path   int  true   "Class Group ID"
// @Param        academic_year_id  query  int  false  "Academic Year ID"
// @Param        year              query  int  false  "Year"
// @Success      200  {object}  dto.SuccessResponse{data=[]dto.EffectiveDayResponse}
// @Failure      400  {object}  dto.ErrorResponse
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Failure      500  {object}  dto.ErrorResponse
// @Router       /v1/class-groups/{id}/effective-days [get]
func (h *EffectiveDayHandler) List(c echo.Context) error {
	classGroupID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID rombel tidak valid",
		})
	}

	params := dto.EffectiveDayQueryParams{}
	if ayID := c.QueryParam("academic_year_id"); ayID != "" {
		if id, err := strconv.Atoi(ayID); err == nil {
			params.AcademicYearID = uint(id)
		}
	}
	if y := c.QueryParam("year"); y != "" {
		if id, err := strconv.Atoi(y); err == nil {
			params.Year = uint(id)
		}
	}

	eds, err := h.effectiveDayService.GetByClassGroup(uint(classGroupID), params)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Berhasil mengambil data hari efektif",
		Data:    eds,
	})
}

// Upsert godoc
// @Summary      Create or Update effective day
// @Description  Create a new effective day or update if it already exists for the month/year
// @Tags         effective-days
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id       path      int                            true  "Class Group ID"
// @Param        request  body      dto.UpsertEffectiveDayRequest  true  "Effective day data"
// @Success      200      {object}  dto.SuccessResponse{data=dto.EffectiveDayResponse}
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Failure      500      {object}  dto.ErrorResponse
// @Router       /v1/class-groups/{id}/effective-days [post]
func (h *EffectiveDayHandler) Upsert(c echo.Context) error {
	classGroupID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID rombel tidak valid",
		})
	}

	var req dto.UpsertEffectiveDayRequest
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

	userID := middleware.GetCurrentUserID(c)
	ed, err := h.effectiveDayService.Upsert(uint(classGroupID), userID, req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Berhasil menyimpan hari efektif",
		Data:    ed,
	})
}

// Update godoc
// @Summary      Update effective day
// @Description  Update a specific effective day record
// @Tags         effective-days
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id       path      int                            true  "Class Group ID"
// @Param        ed_id    path      int                            true  "Effective Day ID"
// @Param        request  body      dto.UpsertEffectiveDayRequest  true  "Effective day data"
// @Success      200      {object}  dto.SuccessResponse{data=dto.EffectiveDayResponse}
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Failure      404      {object}  dto.ErrorResponse
// @Failure      500      {object}  dto.ErrorResponse
// @Router       /v1/class-groups/{id}/effective-days/{ed_id} [put]
func (h *EffectiveDayHandler) Update(c echo.Context) error {
	classGroupID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID rombel tidak valid",
		})
	}

	edID, err := strconv.Atoi(c.Param("ed_id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID hari efektif tidak valid",
		})
	}

	var req dto.UpsertEffectiveDayRequest
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

	ed, err := h.effectiveDayService.Update(uint(classGroupID), uint(edID), req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Berhasil memperbarui hari efektif",
		Data:    ed,
	})
}
