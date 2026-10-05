package publik

import (
	"net/http"
	"strconv"
	"time"

	"api/dto"
	"api/internal/modules/sdm/guru"
	"api/internal/modules/sdm/penggajian"
	"api/utility"

	"github.com/labstack/echo/v4"
	echomw "github.com/labstack/echo/v4/middleware"
)

// Handler menyediakan endpoint publik (token) + endpoint admin pembuat tautan.
type Handler struct {
	guru *guru.Service
	peng *penggajian.Service
}

func New(guruSvc *guru.Service, pengSvc *penggajian.Service) *Handler {
	return &Handler{guru: guruSvc, peng: pengSvc}
}

// RegisterPublicRoutes mendaftarkan endpoint TANPA JWT; dibatasi rate-limit.
func (h *Handler) RegisterPublicRoutes(api *echo.Group) {
	p := api.Group("/public", echomw.RateLimiter(echomw.NewRateLimiterMemoryStore(10)))
	p.GET("/slip", h.GetSlip)
	p.GET("/slip/detail", h.GetSlipDetail)
}

// RegisterAdminRoutes mendaftarkan endpoint pembuat tautan (di bawah JWT+modul).
func (h *Handler) RegisterAdminRoutes(g *echo.Group, mw ...echo.MiddlewareFunc) {
	g.GET("/employees/:id/share-link", h.ShareLink, mw...)
}

func errResp(c echo.Context, status int, code, msg string) error {
	return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: msg})
}

// ShareLink godoc
// @Summary Buat tautan publik slip gaji karyawan (berlaku sementara)
// @Tags sdm-publik
// @Security ApiKeyAuth
// @Param id path int true "Employee ID"
// @Success 200 {object} dto.SuccessResponse{data=publik.ShareLinkResponse}
// @Router /v1/sdm/employees/{id}/share-link [get]
func (h *Handler) ShareLink(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		return errResp(c, http.StatusBadRequest, "BAD_REQUEST", "ID karyawan tidak valid")
	}
	if _, err := h.guru.Get(uint(id)); err != nil {
		return utility.Fail(c, err)
	}
	token, exp := Sign(uint(id))
	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Berhasil membuat tautan",
		Data:    ShareLinkResponse{URL: PublicURL(token), ExpiresAt: exp.Format(time.RFC3339)},
	})
}

// GetSlip godoc
// @Summary Profil + riwayat gaji 1 karyawan lewat token publik
// @Tags sdm-publik
// @Param token query string true "Token publik"
// @Success 200 {object} dto.SuccessResponse{data=publik.PublicSlipResponse}
// @Router /v1/public/slip [get]
func (h *Handler) GetSlip(c echo.Context) error {
	empID, err := Verify(c.QueryParam("token"))
	if err != nil {
		return errResp(c, http.StatusUnauthorized, "UNAUTHORIZED", err.Error())
	}
	det, err := h.guru.Get(empID)
	if err != nil {
		return utility.Fail(c, err)
	}
	riwayat, err := h.peng.RiwayatPeriods(empID)
	if err != nil {
		return utility.Fail(c, err)
	}
	emp := EmployeePublic{
		ID:          det.ID,
		Nama:        det.Nama,
		TglMasuk:    det.TglMasuk,
		Sertifikasi: det.Sertifikasi,
		Impasing:    det.Impasing,
	}
	if det.Golongan != nil {
		emp.GolonganKode = det.Golongan.Kode
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Berhasil mengambil data slip",
		Data:    PublicSlipResponse{Employee: emp, Riwayat: riwayat},
	})
}

// GetSlipDetail godoc
// @Summary Slip gaji detail 1 periode lewat token publik
// @Tags sdm-publik
// @Param token query string true "Token publik"
// @Param periode query string true "Periode YYYY-MM"
// @Success 200 {object} dto.SuccessResponse{data=penggajian.SlipResponse}
// @Router /v1/public/slip/detail [get]
func (h *Handler) GetSlipDetail(c echo.Context) error {
	empID, err := Verify(c.QueryParam("token"))
	if err != nil {
		return errResp(c, http.StatusUnauthorized, "UNAUTHORIZED", err.Error())
	}
	periode := c.QueryParam("periode")
	if periode == "" {
		return errResp(c, http.StatusBadRequest, "VALIDATION_ERROR", "Periode wajib diisi")
	}
	slip, err := h.peng.Slip(periode, empID)
	if err != nil {
		return utility.Fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Berhasil mengambil slip gaji",
		Data:    slip,
	})
}
