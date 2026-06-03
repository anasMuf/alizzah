package handler

import (
	"api/dto"
	"api/service"
	"api/utility"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
)

type AcademicEventHandler struct {
	eventService    service.StudentAcademicEventService
	academicService service.AcademicEventService
}

func NewAcademicEventHandler(eventService service.StudentAcademicEventService, academicService service.AcademicEventService) *AcademicEventHandler {
	return &AcademicEventHandler{
		eventService:    eventService,
		academicService: academicService,
	}
}

// GetByStudent godoc
// @Summary      Get academic events by student
// @Description  Get a list of academic events (promotion, graduation, etc) for a specific student
// @Tags         academic-events
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id   path      int  true  "Student ID"
// @Success      200  {object}  dto.SuccessResponse{data=[]dto.AcademicEventResponse}
// @Failure      400  {object}  dto.ErrorResponse
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Failure      404  {object}  dto.ErrorResponse
// @Failure      500  {object}  dto.ErrorResponse
// @Router       /v1/students/{id}/academic-events [get]
func (h *AcademicEventHandler) GetByStudent(c echo.Context) error {
	studentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID siswa tidak valid",
		})
	}

	events, err := h.eventService.GetByStudentID(uint(studentID))
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Berhasil mengambil riwayat akademik siswa",
		Data:    events,
	})
}

// Batch 4 Handlers

// PromotionPreview godoc
// @Summary      Preview promotion results (dry run)
// @Description  Preview what will happen when promotions run, without making any changes
// @Tags         academic-events
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        request  body      dto.PromotionRequest  true  "Promotion data"
// @Success      200      {object}  dto.SuccessResponse{data=dto.PromotionPreviewResult}
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Failure      500      {object}  dto.ErrorResponse
// @Router       /v1/academic-events/promotions/preview [post]
func (h *AcademicEventHandler) PromotionPreview(c echo.Context) error {
	var req dto.PromotionRequest
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

	result, err := h.academicService.PreviewPromotion(req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Preview kenaikan kelas berhasil",
		Data:    result,
	})
}

// Promotion godoc
// @Summary      Process student promotion
// @Description  Process promotion of students to the next class group
// @Tags         academic-events
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        request  body      dto.PromotionRequest  true  "Promotion data"
// @Success      200      {object}  dto.SuccessResponse{data=dto.PromotionResult}
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Failure      500      {object}  dto.ErrorResponse
// @Router       /v1/academic-events/promotions [post]
func (h *AcademicEventHandler) Promotion(c echo.Context) error {
	var req dto.PromotionRequest
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

	userID := c.Get("user_id").(uint)
	result, err := h.academicService.ProcessPromotion(userID, req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Proses kenaikan kelas berhasil dijalankan",
		Data:    result,
	})
}

// Graduation godoc
// @Summary      Process student graduation
// @Description  Process graduation of students from the highest class group
// @Tags         academic-events
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        request  body      dto.GraduationRequest  true  "Graduation data"
// @Success      200      {object}  dto.SuccessResponse{data=dto.GraduationResult}
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Failure      500      {object}  dto.ErrorResponse
// @Failure      501      {object}  dto.ErrorResponse
// @Router       /v1/academic-events/graduations [post]
func (h *AcademicEventHandler) Graduation(c echo.Context) error {
	var req dto.GraduationRequest
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

	userID := c.Get("user_id").(uint)
	result, err := h.academicService.ProcessGraduation(userID, req)
	if err != nil {
		if err.Error() == "501_NOT_IMPLEMENTED" {
			return c.JSON(http.StatusNotImplemented, dto.ErrorResponse{
				Status:  http.StatusNotImplemented,
				Code:    "NOT_IMPLEMENTED",
				Message: "Fitur kelulusan akan diimplementasikan pada Batch 5 setelah fitur Invoice selesai",
			})
		}
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Proses kelulusan berhasil dijalankan",
		Data:    result,
	})
}

// ClassChange godoc
// @Summary      Process class change
// @Description  Process class change (pindah rombel) for a student within the same level
// @Tags         academic-events
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        request  body      dto.ClassChangeRequest  true  "Class change data"
// @Success      200      {object}  dto.SuccessResponse
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Failure      500      {object}  dto.ErrorResponse
// @Router       /v1/academic-events/class-changes [post]
func (h *AcademicEventHandler) ClassChange(c echo.Context) error {
	var req dto.ClassChangeRequest
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

	userID := c.Get("user_id").(uint)
	if err := h.academicService.ProcessClassChange(userID, req); err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Proses pindah rombel berhasil",
	})
}

// TransferIn godoc
// @Summary      Process transfer in
// @Description  Process transfer in (mutasi masuk) for a student
// @Tags         academic-events
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        request  body      dto.TransferInRequest  true  "Transfer in data"
// @Success      200      {object}  dto.SuccessResponse
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Failure      422      {object}  dto.ErrorResponse
// @Failure      500      {object}  dto.ErrorResponse
// @Router       /v1/academic-events/transfers [post]
func (h *AcademicEventHandler) TransferIn(c echo.Context) error {
	var req dto.TransferInRequest
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

	userID := c.Get("user_id").(uint)
	if err := h.academicService.ProcessTransferIn(userID, req); err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		if err.Error() == "Mutasi hanya diperbolehkan ke jenjang intan" || err.Error() == "Mutasi hanya diperbolehkan ke Intan 1 atau Intan 8" {
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
		Message: "Proses mutasi masuk berhasil",
	})
}

// Withdrawal godoc
// @Summary      Process withdrawal
// @Description  Process withdrawal (pindah/keluar sekolah) for a student
// @Tags         academic-events
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        request  body      dto.WithdrawalRequest  true  "Withdrawal data"
// @Success      200      {object}  dto.SuccessResponse
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Failure      500      {object}  dto.ErrorResponse
// @Router       /v1/academic-events/withdrawals [post]
func (h *AcademicEventHandler) Withdrawal(c echo.Context) error {
	var req dto.WithdrawalRequest
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

	userID := c.Get("user_id").(uint)
	if err := h.academicService.ProcessWithdrawal(userID, req); err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Proses pengeluaran/pindah sekolah siswa berhasil",
	})
}

