package handler

import (
	"api/dto"
	"api/service"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
)

type GuardianHandler struct {
	guardianService service.GuardianService
}

func NewGuardianHandler(guardianService service.GuardianService) *GuardianHandler {
	return &GuardianHandler{guardianService: guardianService}
}

// Create godoc
// @Summary      Create a new guardian
// @Description  Create a standalone guardian (unlinked to any student yet)
// @Tags         guardians
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        request  body      dto.CreateGuardianRequest  true  "Guardian data"
// @Success      201      {object}  dto.SuccessResponse{data=dto.GuardianResponse}
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Router       /v1/guardians [post]
func (h *GuardianHandler) Create(c echo.Context) error {
	var req dto.CreateGuardianRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Format request tidak valid")
	}
	if err := c.Validate(&req); err != nil {
		return err
	}

	guardian, err := h.guardianService.Create(req)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusCreated, dto.SuccessResponse{
		Message: "Wali berhasil dibuat",
		Data:    guardian,
	})
}

// Get godoc
// @Summary      Get guardian by ID
// @Description  Get a single guardian's detail and their linked students
// @Tags         guardians
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id   path      int  true  "Guardian ID"
// @Success      200  {object}  dto.SuccessResponse{data=dto.GuardianResponse}
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Failure      404  {object}  dto.ErrorResponse
// @Router       /v1/guardians/{id} [get]
func (h *GuardianHandler) Get(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "ID tidak valid")
	}

	guardian, err := h.guardianService.GetByID(uint(id))
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Data retrieved successfully",
		Data:    guardian,
	})
}

// Update godoc
// @Summary      Update a guardian
// @Description  Update guardian data
// @Tags         guardians
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id       path      int                        true  "Guardian ID"
// @Param        request  body      dto.CreateGuardianRequest  true  "Updated guardian data"
// @Success      200      {object}  dto.SuccessResponse{data=dto.GuardianResponse}
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Failure      404      {object}  dto.ErrorResponse
// @Router       /v1/guardians/{id} [put]
func (h *GuardianHandler) Update(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "ID tidak valid")
	}

	var req dto.CreateGuardianRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Format request tidak valid")
	}
	if err := c.Validate(&req); err != nil {
		return err
	}

	guardian, err := h.guardianService.Update(uint(id), req)
	if err != nil {
		if err.Error() == "Wali tidak ditemukan" {
			return echo.NewHTTPError(http.StatusNotFound, err.Error())
		}
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Wali berhasil diperbarui",
		Data:    guardian,
	})
}

// Nested Endpoints under Students

// GetByStudent godoc
// @Summary      Get guardians by student
// @Description  List all guardians linked to a specific student
// @Tags         students
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id   path      int  true  "Student ID"
// @Success      200  {object}  dto.SuccessResponse{data=[]dto.GuardianBriefResponse}
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Failure      404  {object}  dto.ErrorResponse
// @Router       /v1/students/{id}/guardians [get]
func (h *GuardianHandler) GetByStudent(c echo.Context) error {
	studentID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "ID Siswa tidak valid")
	}

	guardians, err := h.guardianService.GetByStudentID(uint(studentID))
	if err != nil {
		if err.Error() == "Siswa tidak ditemukan" {
			return echo.NewHTTPError(http.StatusNotFound, err.Error())
		}
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Data retrieved successfully",
		Data:    guardians,
	})
}

// LinkToStudent godoc
// @Summary      Link a guardian to a student
// @Description  Link an existing guardian to a student
// @Tags         students
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id       path      int                      true  "Student ID"
// @Param        request  body      dto.LinkGuardianRequest  true  "Guardian linkage data"
// @Success      201      {object}  dto.SuccessResponse
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Failure      404      {object}  dto.ErrorResponse
// @Router       /v1/students/{id}/guardians [post]
func (h *GuardianHandler) LinkToStudent(c echo.Context) error {
	studentID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "ID Siswa tidak valid")
	}

	var req dto.LinkGuardianRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Format request tidak valid")
	}
	if err := c.Validate(&req); err != nil {
		return err
	}

	err = h.guardianService.LinkToStudent(uint(studentID), req)
	if err != nil {
		switch err.Error() {
		case "Siswa tidak ditemukan", "Wali tidak ditemukan":
			return echo.NewHTTPError(http.StatusNotFound, err.Error())
		default:
			return echo.NewHTTPError(http.StatusBadRequest, err.Error())
		}
	}

	return c.JSON(http.StatusCreated, dto.SuccessResponse{
		Message: "Wali berhasil dihubungkan ke siswa",
	})
}

// UnlinkFromStudent godoc
// @Summary      Unlink a guardian from a student
// @Description  Remove the relationship between a guardian and a student (fails if it's the last guardian)
// @Tags         students
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id          path      int  true  "Student ID"
// @Param        guardian_id path      int  true  "Guardian ID"
// @Success      200         {object}  dto.SuccessResponse
// @Failure      400         {object}  dto.ErrorResponse
// @Failure      401         {object}  dto.ErrorResponse
// @Failure      403         {object}  dto.ErrorResponse
// @Failure      422         {object}  dto.ErrorResponse
// @Router       /v1/students/{id}/guardians/{guardian_id} [delete]
func (h *GuardianHandler) UnlinkFromStudent(c echo.Context) error {
	studentID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "ID Siswa tidak valid")
	}
	guardianID, err := strconv.ParseUint(c.Param("guardian_id"), 10, 32)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "ID Wali tidak valid")
	}

	err = h.guardianService.UnlinkFromStudent(uint(studentID), uint(guardianID))
	if err != nil {
		if err.Error() == "Tidak bisa menghapus wali jika hanya tersisa satu wali" {
			return echo.NewHTTPError(http.StatusUnprocessableEntity, err.Error())
		}
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Wali berhasil dilepas dari siswa",
	})
}

// SetPrimary godoc
// @Summary      Set guardian as primary
// @Description  Set a specific guardian as the primary guardian for a student
// @Tags         students
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id          path      int  true  "Student ID"
// @Param        guardian_id path      int  true  "Guardian ID"
// @Success      200         {object}  dto.SuccessResponse
// @Failure      400         {object}  dto.ErrorResponse
// @Failure      401         {object}  dto.ErrorResponse
// @Failure      403         {object}  dto.ErrorResponse
// @Failure      404         {object}  dto.ErrorResponse
// @Router       /v1/students/{id}/guardians/{guardian_id}/primary [patch]
func (h *GuardianHandler) SetPrimary(c echo.Context) error {
	studentID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "ID Siswa tidak valid")
	}
	guardianID, err := strconv.ParseUint(c.Param("guardian_id"), 10, 32)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "ID Wali tidak valid")
	}

	err = h.guardianService.SetPrimary(uint(studentID), uint(guardianID))
	if err != nil {
		if err.Error() == "Wali tidak terhubung dengan siswa ini" {
			return echo.NewHTTPError(http.StatusNotFound, err.Error())
		}
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Wali berhasil diatur sebagai wali utama",
	})
}
