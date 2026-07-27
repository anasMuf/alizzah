package handler

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"

	"api/dto"
	"api/service"

	"github.com/labstack/echo/v4"
)

// BackupHandler handles backup operations: create, list, download.
type BackupHandler struct {
	backupSvc *service.BackupService
}

func NewBackupHandler(backupSvc *service.BackupService) *BackupHandler {
	return &BackupHandler{backupSvc: backupSvc}
}

// List godoc
// @Summary      List backup files
// @Description  Menampilkan semua file backup yang tersedia di direktori backup VPS.
// @Tags         backup
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Success      200  {object}  dto.SuccessResponse{data=[]service.BackupFileInfo}
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Router       /v1/backups [get]
func (h *BackupHandler) List(c echo.Context) error {
	files, err := h.backupSvc.List()
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Gagal membaca daftar backup: "+err.Error())
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: fmt.Sprintf("Ditemukan %d file backup", len(files)),
		Data:    files,
	})
}

// Create godoc
// @Summary      Buat backup database manual
// @Description  Trigger full database backup. Format: dump (custom -Fc), sql (plain -Fp), sql-compat (plain tanpa restrict/unrestrict). Default: dump.
// @Tags         backup
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        format  query     string  false  "Format backup: dump, sql, sql-compat"
// @Success      201     {object}  dto.SuccessResponse{data=service.BackupResult}
// @Failure      400     {object}  dto.ErrorResponse
// @Failure      401     {object}  dto.ErrorResponse
// @Failure      403     {object}  dto.ErrorResponse
// @Failure      500     {object}  dto.ErrorResponse
// @Router       /v1/backups [post]
func (h *BackupHandler) Create(c echo.Context) error {
	format := c.QueryParam("format")
	if format == "" {
		format = "dump"
	}
	if format != "dump" && format != "sql" && format != "sql-compat" {
		return echo.NewHTTPError(http.StatusBadRequest, "Format tidak valid. Gunakan: dump, sql, sql-compat")
	}

	result, err := h.backupSvc.Create(c.Request().Context(), format)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Backup gagal: "+err.Error())
	}

	return c.JSON(http.StatusCreated, dto.SuccessResponse{
		Message: fmt.Sprintf("Backup berhasil (%s)", result.SizeHuman),
		Data:    result,
	})
}

// Download godoc
// @Summary      Download backup file
// @Description  Download file backup berdasarkan nama file. Hanya superadmin.
// @Tags         backup
// @Accept       json
// @Produce      application/octet-stream
// @Security     ApiKeyAuth
// @Param        filename  path      string  true  "Nama file backup"
// @Success      200       {file}    binary
// @Failure      401       {object}  dto.ErrorResponse
// @Failure      403       {object}  dto.ErrorResponse
// @Failure      404       {object}  dto.ErrorResponse
// @Router       /v1/backups/{filename} [get]
func (h *BackupHandler) Download(c echo.Context) error {
	filename := c.Param("filename")
	if filename == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "Nama file diperlukan")
	}

	path, err := h.backupSvc.GetPath(filename)
	if err != nil {
		if err == service.ErrFileNotFound {
			return echo.NewHTTPError(http.StatusNotFound, "File backup tidak ditemukan")
		}
		if err == service.ErrPathTraversal {
			return echo.NewHTTPError(http.StatusBadRequest, "Nama file tidak valid")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Gagal mengakses file: "+err.Error())
	}

	return c.Attachment(path, filepath.Base(path))
}

// Preview godoc
// @Summary      Preview isi file backup
// @Description  Upload file backup (.dump/.sql) untuk melihat daftar tabel dan schema yang akan direstore.
// @Tags         backup
// @Accept       multipart/form-data
// @Produce      json
// @Security     ApiKeyAuth
// @Param        file  formData  file    true  "File backup (.dump atau .sql)"
// @Success      200   {object}  dto.SuccessResponse{data=service.RestorePreview}
// @Failure      400   {object}  dto.ErrorResponse
// @Failure      401   {object}  dto.ErrorResponse
// @Failure      403   {object}  dto.ErrorResponse
// @Failure      500   {object}  dto.ErrorResponse
// @Router       /v1/backups/preview [post]
func (h *BackupHandler) Preview(c echo.Context) error {
	file, err := c.FormFile("file")
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "File backup diperlukan: "+err.Error())
	}

	// Validate extension
	ext := filepath.Ext(file.Filename)
	switch ext {
	case ".dump", ".sql":
		// valid
	default:
		return echo.NewHTTPError(http.StatusBadRequest, "Format file tidak didukung. Gunakan .dump atau .sql")
	}

	// Open uploaded file
	src, err := file.Open()
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Gagal membaca file: "+err.Error())
	}
	defer src.Close()

	// Save to temp file
	tmpFile, err := os.CreateTemp("", "alizzah-preview-*"+ext)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Gagal membuat file temporary: "+err.Error())
	}
	defer os.Remove(tmpFile.Name())

	if _, err := io.Copy(tmpFile, src); err != nil {
		tmpFile.Close()
		return echo.NewHTTPError(http.StatusInternalServerError, "Gagal menyimpan file: "+err.Error())
	}
	tmpFile.Close()

	// Run preview
	preview, err := h.backupSvc.Preview(tmpFile.Name())
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Preview gagal: "+err.Error())
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Preview berhasil",
		Data:    preview,
	})
}

// Restore godoc
// @Summary      Restore database dari file backup
// @Description  Upload file backup (.dump/.sql), drop database, create ulang, import. Hanya superadmin + APP_ENV=local.
// @Tags         backup
// @Accept       multipart/form-data
// @Produce      json
// @Security     ApiKeyAuth
// @Param        file  formData  file    true  "File backup (.dump atau .sql)"
// @Success      200   {object}  dto.SuccessResponse
// @Failure      400   {object}  dto.ErrorResponse
// @Failure      401   {object}  dto.ErrorResponse
// @Failure      403   {object}  dto.ErrorResponse
// @Failure      500   {object}  dto.ErrorResponse
// @Router       /v1/backups/restore [post]
func (h *BackupHandler) Restore(c echo.Context) error {
	file, err := c.FormFile("file")
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "File backup diperlukan: "+err.Error())
	}

	// Validate extension
	ext := filepath.Ext(file.Filename)
	var format string
	switch ext {
	case ".dump":
		format = "dump"
	case ".sql":
		format = "sql"
	default:
		return echo.NewHTTPError(http.StatusBadRequest, "Format file tidak didukung. Gunakan .dump atau .sql")
	}

	// Open uploaded file
	src, err := file.Open()
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Gagal membaca file: "+err.Error())
	}
	defer src.Close()

	// Save to temp file
	tmpFile, err := os.CreateTemp("", "alizzah-restore-*"+ext)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Gagal membuat file temporary: "+err.Error())
	}
	defer os.Remove(tmpFile.Name())

	if _, err := io.Copy(tmpFile, src); err != nil {
		tmpFile.Close()
		return echo.NewHTTPError(http.StatusInternalServerError, "Gagal menyimpan file: "+err.Error())
	}
	tmpFile.Close()

	// Run restore
	if err := h.backupSvc.Restore(c.Request().Context(), tmpFile.Name(), format); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Restore gagal: "+err.Error())
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Restore berhasil. Database telah di-reset dengan data dari " + file.Filename,
	})
}
