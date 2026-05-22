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

// GetByStudent handles GET /api/v1/students/:id/academic-events
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

