package handler

import (
	"net/http"

	"api/dto"
	"api/service"

	"github.com/labstack/echo/v4"
)

// BackupHandler handles manual backup trigger via POST /v1/backups.
type BackupHandler struct {
	backupSvc *service.BackupService
}

func NewBackupHandler(backupSvc *service.BackupService) *BackupHandler {
	return &BackupHandler{backupSvc: backupSvc}
}

// Create godoc
// @Summary      Buat backup database manual
// @Description  Trigger full database backup (pg_dump -Fc). Hanya superadmin / admin dengan modul keuangan.
// @Tags         backup
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Success      201  {object}  dto.SuccessResponse{data=service.BackupResult}
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Failure      500  {object}  dto.ErrorResponse
// @Router       /v1/backups [post]
func (h *BackupHandler) Create(c echo.Context) error {
	result, err := h.backupSvc.Create(c.Request().Context())
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Backup gagal: "+err.Error())
	}

	return c.JSON(http.StatusCreated, dto.SuccessResponse{
		Message: "Backup berhasil",
		Data:    result,
	})
}
