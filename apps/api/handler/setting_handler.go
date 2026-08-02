package handler

import (
	"api/dto"
	"api/service"
	"net/http"

	"github.com/labstack/echo/v4"
)

type SettingHandler struct {
	settingService service.SettingService
}

func NewSettingHandler(settingService service.SettingService) *SettingHandler {
	return &SettingHandler{settingService: settingService}
}

// GetAll mengembalikan semua settings.
func (h *SettingHandler) GetAll(c echo.Context) error {
	settings, err := h.settingService.GetAll()
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Gagal mengambil pengaturan")
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Pengaturan berhasil diambil",
		Data:    settings,
	})
}

// Update menerima map settings untuk di-update.
func (h *SettingHandler) Update(c echo.Context) error {
	var body map[string]string
	if err := c.Bind(&body); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Format data tidak valid")
	}
	if len(body) == 0 {
		return echo.NewHTTPError(http.StatusBadRequest, "Data pengaturan kosong")
	}
	if err := h.settingService.Update(body); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Gagal menyimpan pengaturan")
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Pengaturan berhasil disimpan",
	})
}

// Upload menerima file gambar (logo / ttd) dan menyimpannya.
func (h *SettingHandler) Upload(c echo.Context) error {
	prefix := c.FormValue("prefix") // "logo" atau "ttd-yayasan"
	if prefix == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "Parameter 'prefix' diperlukan")
	}

	file, err := c.FormFile("file")
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "File diperlukan: "+err.Error())
	}

	url, err := h.settingService.Upload(file, prefix)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Gagal upload file: "+err.Error())
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "File berhasil diupload",
		Data:    map[string]string{"url": url},
	})
}
