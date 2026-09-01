package master

import (
	"net/http"
	"strconv"

	"api/dto"
	"api/utility"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

// New merangkai repository → service → handler untuk fitur master.
func New(db *gorm.DB) *Handler {
	return NewHandler(NewService(NewRepository(db)))
}

// RegisterRoutes mendaftarkan route master HR di bawah grup /sdm.
func (h *Handler) RegisterRoutes(g *echo.Group, mw ...echo.MiddlewareFunc) {
	// Golongan pokok
	g.GET("/golongan", h.ListGolongan, mw...)
	g.POST("/golongan", h.CreateGolongan, mw...)
	g.PUT("/golongan/:id", h.UpdateGolongan, mw...)
	g.DELETE("/golongan/:id", h.DeleteGolongan, mw...)

	// Tarif kehadiran (single row)
	g.GET("/kehadiran", h.GetKehadiran, mw...)
	g.PUT("/kehadiran", h.UpdateKehadiran, mw...)

	// Kedisiplinan
	g.GET("/kedisiplinan", h.ListKedisiplinan, mw...)
	g.POST("/kedisiplinan", h.CreateKedisiplinan, mw...)
	g.PUT("/kedisiplinan/:id", h.UpdateKedisiplinan, mw...)
	g.DELETE("/kedisiplinan/:id", h.DeleteKedisiplinan, mw...)

	// Fungsional
	g.GET("/fungsional", h.ListFungsional, mw...)
	g.POST("/fungsional", h.CreateFungsional, mw...)
	g.PUT("/fungsional/:id", h.UpdateFungsional, mw...)
	g.DELETE("/fungsional/:id", h.DeleteFungsional, mw...)

	// Tugas tambahan
	g.GET("/tugas-tambahan", h.ListTugasTambahan, mw...)
	g.POST("/tugas-tambahan", h.CreateTugasTambahan, mw...)
	g.PUT("/tugas-tambahan/:id", h.UpdateTugasTambahan, mw...)
	g.DELETE("/tugas-tambahan/:id", h.DeleteTugasTambahan, mw...)

	// Penanggung jawab
	g.GET("/penanggung-jawab", h.ListPenanggungJawab, mw...)
	g.POST("/penanggung-jawab", h.CreatePenanggungJawab, mw...)
	g.PUT("/penanggung-jawab/:id", h.UpdatePenanggungJawab, mw...)
	g.DELETE("/penanggung-jawab/:id", h.DeletePenanggungJawab, mw...)

	// Lain-lain (master dibuat on-the-fly saat dilampirkan)
	g.GET("/lainlain", h.ListLainlain, mw...)
	g.POST("/lainlain", h.CreateLainlain, mw...)
}

func bindAndValidate(c echo.Context, req any) error {
	if err := c.Bind(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}
	return nil
}

func parseID(c echo.Context) (uint, error) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		return 0, echo.NewHTTPError(http.StatusBadRequest, "ID tidak valid")
	}
	return uint(id), nil
}

// ── Golongan ──

// ListGolongan godoc
// @Summary Daftar golongan gaji pokok
// @Tags sdm-master
// @Security ApiKeyAuth
// @Success 200 {object} dto.SuccessResponse{data=[]master.GolonganResponse}
// @Router /v1/sdm/golongan [get]
func (h *Handler) ListGolongan(c echo.Context) error {
	items, err := h.svc.ListGolongan()
	if err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil daftar golongan", Data: items})
}

// CreateGolongan godoc
// @Summary Tambah golongan gaji pokok
// @Tags sdm-master
// @Security ApiKeyAuth
// @Param request body master.GolonganRequest true "Data golongan"
// @Success 201 {object} dto.SuccessResponse{data=master.GolonganResponse}
// @Router /v1/sdm/golongan [post]
func (h *Handler) CreateGolongan(c echo.Context) error {
	var req GolonganRequest
	if err := bindAndValidate(c, &req); err != nil {
		return err
	}
	item, err := h.svc.CreateGolongan(req)
	if err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusCreated, dto.SuccessResponse{Message: "Berhasil menambah golongan", Data: item})
}

// UpdateGolongan godoc
// @Summary Perbarui golongan gaji pokok
// @Tags sdm-master
// @Security ApiKeyAuth
// @Param id path int true "Golongan ID"
// @Param request body master.GolonganRequest true "Data golongan"
// @Success 200 {object} dto.SuccessResponse{data=master.GolonganResponse}
// @Router /v1/sdm/golongan/{id} [put]
func (h *Handler) UpdateGolongan(c echo.Context) error {
	id, err := parseID(c)
	if err != nil {
		return err
	}
	var req GolonganRequest
	if err := bindAndValidate(c, &req); err != nil {
		return err
	}
	item, err := h.svc.UpdateGolongan(id, req)
	if err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil memperbarui golongan", Data: item})
}

// DeleteGolongan godoc
// @Summary Hapus golongan gaji pokok
// @Tags sdm-master
// @Security ApiKeyAuth
// @Param id path int true "Golongan ID"
// @Success 200 {object} dto.SuccessResponse
// @Router /v1/sdm/golongan/{id} [delete]
func (h *Handler) DeleteGolongan(c echo.Context) error {
	id, err := parseID(c)
	if err != nil {
		return err
	}
	if err := h.svc.DeleteGolongan(id); err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil menghapus golongan"})
}

// ── Kehadiran ──

// GetKehadiran godoc
// @Summary Ambil tarif kehadiran
// @Tags sdm-master
// @Security ApiKeyAuth
// @Success 200 {object} dto.SuccessResponse{data=master.KehadiranResponse}
// @Router /v1/sdm/kehadiran [get]
func (h *Handler) GetKehadiran(c echo.Context) error {
	item, err := h.svc.GetKehadiran()
	if err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil tarif kehadiran", Data: item})
}

// UpdateKehadiran godoc
// @Summary Perbarui tarif kehadiran
// @Tags sdm-master
// @Security ApiKeyAuth
// @Param request body master.KehadiranRequest true "Data tarif"
// @Success 200 {object} dto.SuccessResponse{data=master.KehadiranResponse}
// @Router /v1/sdm/kehadiran [put]
func (h *Handler) UpdateKehadiran(c echo.Context) error {
	var req KehadiranRequest
	if err := bindAndValidate(c, &req); err != nil {
		return err
	}
	item, err := h.svc.UpdateKehadiran(req)
	if err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil memperbarui tarif kehadiran", Data: item})
}

// ── Kedisiplinan ──

// ListKedisiplinan godoc
// @Summary Daftar item kedisiplinan
// @Tags sdm-master
// @Security ApiKeyAuth
// @Success 200 {object} dto.SuccessResponse{data=[]master.KedisiplinanResponse}
// @Router /v1/sdm/kedisiplinan [get]
func (h *Handler) ListKedisiplinan(c echo.Context) error {
	items, err := h.svc.ListKedisiplinan()
	if err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil daftar kedisiplinan", Data: items})
}

// CreateKedisiplinan godoc
// @Summary Tambah item kedisiplinan
// @Tags sdm-master
// @Security ApiKeyAuth
// @Param request body master.KedisiplinanRequest true "Data kedisiplinan"
// @Success 201 {object} dto.SuccessResponse{data=master.KedisiplinanResponse}
// @Router /v1/sdm/kedisiplinan [post]
func (h *Handler) CreateKedisiplinan(c echo.Context) error {
	var req KedisiplinanRequest
	if err := bindAndValidate(c, &req); err != nil {
		return err
	}
	item, err := h.svc.CreateKedisiplinan(req)
	if err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusCreated, dto.SuccessResponse{Message: "Berhasil menambah kedisiplinan", Data: item})
}

// UpdateKedisiplinan godoc
// @Summary Perbarui item kedisiplinan
// @Tags sdm-master
// @Security ApiKeyAuth
// @Param id path int true "Kedisiplinan ID"
// @Param request body master.KedisiplinanRequest true "Data kedisiplinan"
// @Success 200 {object} dto.SuccessResponse{data=master.KedisiplinanResponse}
// @Router /v1/sdm/kedisiplinan/{id} [put]
func (h *Handler) UpdateKedisiplinan(c echo.Context) error {
	id, err := parseID(c)
	if err != nil {
		return err
	}
	var req KedisiplinanRequest
	if err := bindAndValidate(c, &req); err != nil {
		return err
	}
	item, err := h.svc.UpdateKedisiplinan(id, req)
	if err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil memperbarui kedisiplinan", Data: item})
}

// DeleteKedisiplinan godoc
// @Summary Hapus item kedisiplinan
// @Tags sdm-master
// @Security ApiKeyAuth
// @Param id path int true "Kedisiplinan ID"
// @Success 200 {object} dto.SuccessResponse
// @Router /v1/sdm/kedisiplinan/{id} [delete]
func (h *Handler) DeleteKedisiplinan(c echo.Context) error {
	id, err := parseID(c)
	if err != nil {
		return err
	}
	if err := h.svc.DeleteKedisiplinan(id); err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil menghapus kedisiplinan"})
}

// ── Fungsional ──

func (h *Handler) ListFungsional(c echo.Context) error {
	items, err := h.svc.ListFungsional()
	if err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil daftar fungsional", Data: items})
}

func (h *Handler) CreateFungsional(c echo.Context) error {
	var req ItemRequest
	if err := bindAndValidate(c, &req); err != nil {
		return err
	}
	item, err := h.svc.CreateFungsional(req)
	if err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusCreated, dto.SuccessResponse{Message: "Berhasil menambah fungsional", Data: item})
}

func (h *Handler) UpdateFungsional(c echo.Context) error {
	id, err := parseID(c)
	if err != nil {
		return err
	}
	var req ItemRequest
	if err := bindAndValidate(c, &req); err != nil {
		return err
	}
	item, err := h.svc.UpdateFungsional(id, req)
	if err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil memperbarui fungsional", Data: item})
}

func (h *Handler) DeleteFungsional(c echo.Context) error {
	id, err := parseID(c)
	if err != nil {
		return err
	}
	if err := h.svc.DeleteFungsional(id); err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil menghapus fungsional"})
}

// ── Tugas Tambahan ──

func (h *Handler) ListTugasTambahan(c echo.Context) error {
	items, err := h.svc.ListTugasTambahan()
	if err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil daftar tugas tambahan", Data: items})
}

func (h *Handler) CreateTugasTambahan(c echo.Context) error {
	var req ItemRequest
	if err := bindAndValidate(c, &req); err != nil {
		return err
	}
	item, err := h.svc.CreateTugasTambahan(req)
	if err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusCreated, dto.SuccessResponse{Message: "Berhasil menambah tugas tambahan", Data: item})
}

func (h *Handler) UpdateTugasTambahan(c echo.Context) error {
	id, err := parseID(c)
	if err != nil {
		return err
	}
	var req ItemRequest
	if err := bindAndValidate(c, &req); err != nil {
		return err
	}
	item, err := h.svc.UpdateTugasTambahan(id, req)
	if err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil memperbarui tugas tambahan", Data: item})
}

func (h *Handler) DeleteTugasTambahan(c echo.Context) error {
	id, err := parseID(c)
	if err != nil {
		return err
	}
	if err := h.svc.DeleteTugasTambahan(id); err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil menghapus tugas tambahan"})
}

// ── Penanggung Jawab ──

func (h *Handler) ListPenanggungJawab(c echo.Context) error {
	items, err := h.svc.ListPenanggungJawab()
	if err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil daftar penanggung jawab", Data: items})
}

func (h *Handler) CreatePenanggungJawab(c echo.Context) error {
	var req ItemRequest
	if err := bindAndValidate(c, &req); err != nil {
		return err
	}
	item, err := h.svc.CreatePenanggungJawab(req)
	if err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusCreated, dto.SuccessResponse{Message: "Berhasil menambah penanggung jawab", Data: item})
}

func (h *Handler) UpdatePenanggungJawab(c echo.Context) error {
	id, err := parseID(c)
	if err != nil {
		return err
	}
	var req ItemRequest
	if err := bindAndValidate(c, &req); err != nil {
		return err
	}
	item, err := h.svc.UpdatePenanggungJawab(id, req)
	if err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil memperbarui penanggung jawab", Data: item})
}

func (h *Handler) DeletePenanggungJawab(c echo.Context) error {
	id, err := parseID(c)
	if err != nil {
		return err
	}
	if err := h.svc.DeletePenanggungJawab(id); err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil menghapus penanggung jawab"})
}

// ── Lain-lain ──

// ListLainlain godoc
// @Summary Daftar master lain-lain
// @Tags sdm-master
// @Security ApiKeyAuth
// @Success 200 {object} dto.SuccessResponse{data=[]master.ItemResponse}
// @Router /v1/sdm/lainlain [get]
func (h *Handler) ListLainlain(c echo.Context) error {
	items, err := h.svc.ListLainlain()
	if err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil daftar lain-lain", Data: items})
}

// CreateLainlain godoc
// @Summary Buat master lain-lain
// @Tags sdm-master
// @Security ApiKeyAuth
// @Param request body master.LainlainRequest true "Data lain-lain"
// @Success 201 {object} dto.SuccessResponse{data=master.ItemResponse}
// @Router /v1/sdm/lainlain [post]
func (h *Handler) CreateLainlain(c echo.Context) error {
	var req LainlainRequest
	if err := bindAndValidate(c, &req); err != nil {
		return err
	}
	item, err := h.svc.GetOrCreateLainlain(req.Nama)
	if err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusCreated, dto.SuccessResponse{Message: "Berhasil menambah lain-lain", Data: toItemResponse(item.ID, item.Nama, nil)})
}
