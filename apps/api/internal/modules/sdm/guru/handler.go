package guru

import (
	"net/http"
	"strconv"

	"api/dto"
	"api/internal/modules/sdm/master"
	"api/middleware"
	"api/utility"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

func bindAndValidate(c echo.Context, req any) error {
	if err := c.Bind(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}
	return nil
}

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

// New merangkai repository → service → handler untuk fitur karyawan.
func New(db *gorm.DB, masterRepo *master.Repository) *Handler {
	return NewHandler(NewService(NewRepository(db), masterRepo))
}

func (h *Handler) RegisterRoutes(g *echo.Group, mw ...echo.MiddlewareFunc) {
	g.GET("/employees", h.List, mw...)
	g.POST("/employees", h.Create, mw...)
	g.POST("/employees/import", h.Import, mw...)
	g.GET("/employees/:id", h.Get, mw...)
	g.PUT("/employees/:id", h.Update, mw...)
	g.DELETE("/employees/:id", h.Delete, mw...)

	// Lampiran HR per karyawan
	g.GET("/employees/:id/hr", h.GetHR, mw...)
	g.POST("/employees/:id/fungsional", h.AttachFungsional, mw...)
	g.DELETE("/employees/:id/fungsional/:detail_id", h.DetachFungsional, mw...)
	g.POST("/employees/:id/tugas-tambahan", h.AttachTugasTambahan, mw...)
	g.DELETE("/employees/:id/tugas-tambahan/:detail_id", h.DetachTugasTambahan, mw...)
	g.POST("/employees/:id/penanggung-jawab", h.AttachPenanggungJawab, mw...)
	g.DELETE("/employees/:id/penanggung-jawab/:detail_id", h.DetachPenanggungJawab, mw...)
	g.POST("/employees/:id/lainlain", h.AttachLainlain, mw...)
	g.DELETE("/employees/:id/lainlain/:detail_id", h.DetachLainlain, mw...)

	// Riwayat golongan (penugasan effective-dated)
	g.GET("/employees/:id/golongan-history", h.ListGolonganHistory, mw...)
	g.POST("/employees/:id/golongan-history", h.AddGolonganHistory, mw...)
	g.DELETE("/employees/:id/golongan-history/:history_id", h.DeleteGolonganHistory, mw...)
}

func parseUintParam(c echo.Context, name string) (uint, error) {
	v, err := strconv.Atoi(c.Param(name))
	if err != nil || v <= 0 {
		return 0, echo.NewHTTPError(http.StatusBadRequest, "ID tidak valid")
	}
	return uint(v), nil
}

// List godoc
// @Summary Daftar karyawan (urut id)
// @Tags sdm-guru
// @Security ApiKeyAuth
// @Param search query string false "Cari nama"
// @Param golongan_id query int false "Filter golongan"
// @Param active query bool false "Hanya yang aktif"
// @Param all query bool false "true = seluruh data (tanpa pagination, untuk dropdown)"
// @Param page query int false "Halaman (default 1)"
// @Param limit query int false "Per halaman (default 20)"
// @Success 200 {object} dto.PaginatedResponse{data=[]guru.EmployeeItem}
// @Router /v1/sdm/employees [get]
func (h *Handler) List(c echo.Context) error {
	var golonganID *uint
	if v := c.QueryParam("golongan_id"); v != "" {
		id, err := strconv.Atoi(v)
		if err != nil || id <= 0 {
			return echo.NewHTTPError(http.StatusBadRequest, "golongan_id tidak valid")
		}
		u := uint(id)
		golonganID = &u
	}
	search := c.QueryParam("search")
	activeOnly := c.QueryParam("active") == "true"

	// Mode "all": seluruh karyawan tanpa pagination (dropdown/absensi).
	if c.QueryParam("all") == "true" {
		items, err := h.svc.List(search, golonganID, activeOnly)
		if err != nil {
			return utility.Fail(c, err)
		}
		return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil daftar karyawan", Data: items})
	}

	// Mode default: pagination (infinite scroll daftar karyawan).
	page, limit := utility.ParsePagination(c)
	items, total, err := h.svc.ListPaged(search, golonganID, activeOnly, page, limit)
	if err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.PaginatedResponse{
		Message: "Berhasil mengambil daftar karyawan",
		Data:    items,
		Meta:    dto.Meta{Page: page, Limit: limit, Total: total},
	})
}

// Create godoc
// @Summary Tambah karyawan
// @Tags sdm-guru
// @Security ApiKeyAuth
// @Param request body guru.EmployeeRequest true "Data karyawan"
// @Success 201 {object} dto.SuccessResponse{data=guru.EmployeeItem}
// @Router /v1/sdm/employees [post]
func (h *Handler) Create(c echo.Context) error {
	var req EmployeeRequest
	if err := bindAndValidate(c, &req); err != nil {
		return err
	}
	item, err := h.svc.Create(req)
	if err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusCreated, dto.SuccessResponse{Message: "Berhasil menambah karyawan", Data: item})
}

// Import godoc
// @Summary Import karyawan (bulk): tambah baru / update existing (oleh ID)
// @Tags sdm-guru
// @Security ApiKeyAuth
// @Param request body guru.ImportRequest true "Baris karyawan"
// @Success 200 {object} dto.SuccessResponse{data=guru.ImportResult}
// @Router /v1/sdm/employees/import [post]
func (h *Handler) Import(c echo.Context) error {
	var req ImportRequest
	if err := bindAndValidate(c, &req); err != nil {
		return err
	}
	res, err := h.svc.Import(req.Rows)
	if err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Import karyawan selesai", Data: res})
}

// Get godoc
// @Summary Detail karyawan + lampiran HR
// @Tags sdm-guru
// @Security ApiKeyAuth
// @Param id path int true "Employee ID"
// @Success 200 {object} dto.SuccessResponse{data=guru.EmployeeDetail}
// @Router /v1/sdm/employees/{id} [get]
func (h *Handler) Get(c echo.Context) error {
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	item, err := h.svc.Get(id)
	if err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil detail karyawan", Data: item})
}

// GetHR godoc
// @Summary Lampiran HR milik karyawan
// @Tags sdm-guru
// @Security ApiKeyAuth
// @Param id path int true "Employee ID"
// @Success 200 {object} dto.SuccessResponse{data=guru.HRBundle}
// @Router /v1/sdm/employees/{id}/hr [get]
func (h *Handler) GetHR(c echo.Context) error {
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	bundle, err := h.svc.repo.GetHRBundle(id)
	if err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil lampiran HR", Data: bundle})
}

// Update godoc
// @Summary Perbarui karyawan
// @Tags sdm-guru
// @Security ApiKeyAuth
// @Param id path int true "Employee ID"
// @Param request body guru.EmployeeRequest true "Data karyawan"
// @Success 200 {object} dto.SuccessResponse{data=guru.EmployeeItem}
// @Router /v1/sdm/employees/{id} [put]
func (h *Handler) Update(c echo.Context) error {
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	var req EmployeeRequest
	if err := bindAndValidate(c, &req); err != nil {
		return err
	}
	item, err := h.svc.Update(id, req)
	if err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil memperbarui karyawan", Data: item})
}

// Delete godoc
// @Summary Hapus karyawan
// @Tags sdm-guru
// @Security ApiKeyAuth
// @Param id path int true "Employee ID"
// @Success 200 {object} dto.SuccessResponse
// @Router /v1/sdm/employees/{id} [delete]
func (h *Handler) Delete(c echo.Context) error {
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	if err := h.svc.Delete(id); err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil menghapus karyawan"})
}

// ── Lampiran HR ──

func (h *Handler) AttachFungsional(c echo.Context) error {
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	var req AttachFungsionalRequest
	if err := bindAndValidate(c, &req); err != nil {
		return err
	}
	if err := h.svc.AttachFungsional(id, req); err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusCreated, dto.SuccessResponse{Message: "Berhasil melampirkan fungsional"})
}

func (h *Handler) DetachFungsional(c echo.Context) error {
	id, _ := parseUintParam(c, "id")
	detailID, err := parseUintParam(c, "detail_id")
	if err != nil {
		return err
	}
	if err := h.svc.DetachFungsional(id, detailID); err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil melepas fungsional"})
}

func (h *Handler) AttachTugasTambahan(c echo.Context) error {
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	var req AttachTugasTambahanRequest
	if err := bindAndValidate(c, &req); err != nil {
		return err
	}
	if err := h.svc.AttachTugasTambahan(id, req); err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusCreated, dto.SuccessResponse{Message: "Berhasil melampirkan tugas tambahan"})
}

func (h *Handler) DetachTugasTambahan(c echo.Context) error {
	id, _ := parseUintParam(c, "id")
	detailID, err := parseUintParam(c, "detail_id")
	if err != nil {
		return err
	}
	if err := h.svc.DetachTugasTambahan(id, detailID); err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil melepas tugas tambahan"})
}

func (h *Handler) AttachPenanggungJawab(c echo.Context) error {
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	var req AttachPenanggungJawabRequest
	if err := bindAndValidate(c, &req); err != nil {
		return err
	}
	if err := h.svc.AttachPenanggungJawab(id, req); err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusCreated, dto.SuccessResponse{Message: "Berhasil melampirkan penanggung jawab"})
}

func (h *Handler) DetachPenanggungJawab(c echo.Context) error {
	id, _ := parseUintParam(c, "id")
	detailID, err := parseUintParam(c, "detail_id")
	if err != nil {
		return err
	}
	if err := h.svc.DetachPenanggungJawab(id, detailID); err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil melepas penanggung jawab"})
}

func (h *Handler) AttachLainlain(c echo.Context) error {
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	var req AttachLainlainRequest
	if err := bindAndValidate(c, &req); err != nil {
		return err
	}
	if err := h.svc.AttachLainlain(id, req); err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusCreated, dto.SuccessResponse{Message: "Berhasil melampirkan lain-lain"})
}

func (h *Handler) DetachLainlain(c echo.Context) error {
	id, _ := parseUintParam(c, "id")
	detailID, err := parseUintParam(c, "detail_id")
	if err != nil {
		return err
	}
	if err := h.svc.DetachLainlain(id, detailID); err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil melepas lain-lain"})
}

// ── Riwayat golongan ──

// ListGolonganHistory godoc
// @Summary Riwayat penugasan golongan karyawan
// @Tags sdm-guru
// @Security ApiKeyAuth
// @Param id path int true "Employee ID"
// @Success 200 {object} dto.SuccessResponse{data=[]guru.GolonganHistoryItem}
// @Router /v1/sdm/employees/{id}/golongan-history [get]
func (h *Handler) ListGolonganHistory(c echo.Context) error {
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	items, err := h.svc.ListGolonganHistory(id)
	if err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil riwayat golongan", Data: items})
}

// AddGolonganHistory godoc
// @Summary Tambah/perbarui penugasan golongan (effective date)
// @Tags sdm-guru
// @Security ApiKeyAuth
// @Param id path int true "Employee ID"
// @Param request body guru.GolonganHistoryRequest true "Data riwayat golongan"
// @Success 201 {object} dto.SuccessResponse{data=guru.GolonganHistoryItem}
// @Router /v1/sdm/employees/{id}/golongan-history [post]
func (h *Handler) AddGolonganHistory(c echo.Context) error {
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	var req GolonganHistoryRequest
	if err := bindAndValidate(c, &req); err != nil {
		return err
	}
	userID := middleware.GetCurrentUserID(c)
	var uid *uint
	if userID > 0 {
		uid = &userID
	}
	item, err := h.svc.AddGolonganHistory(id, req, uid)
	if err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusCreated, dto.SuccessResponse{Message: "Berhasil menyimpan riwayat golongan", Data: item})
}

// DeleteGolonganHistory godoc
// @Summary Hapus baris riwayat golongan
// @Tags sdm-guru
// @Security ApiKeyAuth
// @Param id path int true "Employee ID"
// @Param history_id path int true "Riwayat ID"
// @Success 200 {object} dto.SuccessResponse
// @Router /v1/sdm/employees/{id}/golongan-history/{history_id} [delete]
func (h *Handler) DeleteGolonganHistory(c echo.Context) error {
	id, _ := parseUintParam(c, "id")
	historyID, err := parseUintParam(c, "history_id")
	if err != nil {
		return err
	}
	if err := h.svc.DeleteGolonganHistory(id, historyID); err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil menghapus riwayat golongan"})
}
