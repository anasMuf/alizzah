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

type DailyClosingHandler struct {
	service service.DailyClosingService
}

func NewDailyClosingHandler(service service.DailyClosingService) *DailyClosingHandler {
	return &DailyClosingHandler{service: service}
}

// List godoc
// @Summary      List daily closings
// @Description  Get a paginated list of daily closings
// @Tags         daily-closings
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        page              query   int     false  "Page number"
// @Param        limit             query   int     false  "Limit per page"
// @Param        academic_year_id  query   int     false  "Academic Year ID"
// @Param        start_date        query   string  false  "Start Date (YYYY-MM-DD)"
// @Param        end_date          query   string  false  "End Date (YYYY-MM-DD)"
// @Param        is_confirmed      query   bool    false  "Is Confirmed"
// @Success      200               {object}  dto.PaginatedResponse{data=[]dto.DailyClosingListResponse}
// @Failure      401               {object}  dto.ErrorResponse
// @Failure      403               {object}  dto.ErrorResponse
// @Failure      500               {object}  dto.ErrorResponse
// @Router       /v1/daily-closings [get]
func (h *DailyClosingHandler) List(c echo.Context) error {
	page, _ := strconv.Atoi(c.QueryParam("page"))
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	academicYearID, _ := strconv.Atoi(c.QueryParam("academic_year_id"))

	var isConfirmed *bool
	if c.QueryParam("is_confirmed") != "" {
		b, err := strconv.ParseBool(c.QueryParam("is_confirmed"))
		if err == nil {
			isConfirmed = &b
		}
	}

	params := dto.DailyClosingQueryParams{
		AcademicYearID: uint(academicYearID),
		StartDate:      c.QueryParam("start_date"),
		EndDate:        c.QueryParam("end_date"),
		IsConfirmed:    isConfirmed,
		Page:           page,
		Limit:          limit,
	}

	closings, meta, err := h.service.GetAll(params)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.PaginatedResponse{
		Message: "Berhasil mengambil riwayat tutup buku",
		Data:    closings,
		Meta:    *meta,
	})
}

// Get godoc
// @Summary      Get daily closing by ID
// @Description  Get a single daily closing record by ID
// @Tags         daily-closings
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id   path      int  true  "Daily Closing ID"
// @Success      200  {object}  dto.SuccessResponse{data=dto.DailyClosingListResponse}
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Failure      404  {object}  dto.ErrorResponse
// @Failure      500  {object}  dto.ErrorResponse
// @Router       /v1/daily-closings/{id} [get]
func (h *DailyClosingHandler) Get(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}

	dc, err := h.service.GetByID(uint(id))
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil detail tutup buku", Data: dc})
}

// Create godoc
// @Summary      Create daily closing
// @Description  Record a new daily closing
// @Tags         daily-closings
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        request  body      dto.CreateDailyClosingRequest  true  "Daily closing request"
// @Success      201      {object}  dto.SuccessResponse{data=dto.DailyClosingListResponse}
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Failure      409      {object}  dto.ErrorResponse
// @Failure      500      {object}  dto.ErrorResponse
// @Router       /v1/daily-closings [post]
func (h *DailyClosingHandler) Create(c echo.Context) error {
	var req dto.CreateDailyClosingRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}

	createdBy, err := middleware.GetUserID(c)
	if err != nil {
		return err
	}

	dc, err := h.service.Create(createdBy, req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusCreated, dto.SuccessResponse{Message: "Berhasil membuat catatan tutup buku", Data: dc})
}

// Confirm godoc
// @Summary      Confirm daily closing
// @Description  Confirm a daily closing record
// @Tags         daily-closings
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id       path      int                             true  "Daily Closing ID"
// @Param        request  body      dto.ConfirmDailyClosingRequest  true  "Confirm request"
// @Success      200      {object}  dto.SuccessResponse
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Failure      404      {object}  dto.ErrorResponse
// @Failure      409      {object}  dto.ErrorResponse
// @Failure      500      {object}  dto.ErrorResponse
// @Router       /v1/daily-closings/{id}/confirm [patch]
func (h *DailyClosingHandler) Confirm(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}

	var req dto.ConfirmDailyClosingRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}

	confirmedBy, err := middleware.GetUserID(c)
	if err != nil {
		return err
	}

	if err := h.service.Confirm(uint(id), confirmedBy, req); err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Tutup buku berhasil dikonfirmasi"})
}
