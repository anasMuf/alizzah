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
	eventService service.StudentAcademicEventService
}

func NewAcademicEventHandler(eventService service.StudentAcademicEventService) *AcademicEventHandler {
	return &AcademicEventHandler{eventService: eventService}
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
