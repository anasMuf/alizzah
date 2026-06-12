package modal

import (
	"net/http"
	"strconv"

	"api/dto"
	"api/internal/modules/koperasi/kas"
	"api/middleware"
	"api/repository"
	"api/service"
	"api/utility"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type Handler struct{ svc Service }

func NewHandler(svc Service) *Handler { return &Handler{svc: svc} }

// New merangkai seam modal: writer kas sekolah (TransactionWriterService) + writer
// kas koperasi (dibagikan modul) + repo tahun ajaran.
func New(db *gorm.DB, koperasiWriter kas.Writer) *Handler {
	schoolWriter := service.NewTransactionWriterService(
		repository.NewCashTransactionRepository(db),
		repository.NewVaultTransactionRepository(db),
	)
	ayRepo := repository.NewAcademicYearRepository(db)
	return NewHandler(NewService(db, NewRepository(db), schoolWriter, koperasiWriter, ayRepo))
}

func (h *Handler) RegisterRoutes(g *echo.Group, disburseMW, viewMW echo.MiddlewareFunc) {
	g.POST("/capital-injections", h.Create, disburseMW)
	g.GET("/capital-injections", h.List, viewMW)
	g.GET("/capital-injections/:id", h.Get, viewMW)
}

func fail(c echo.Context, err error) error {
	status, code := utility.GetErrorStatusAndCode(err)
	return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
}

// Create godoc
// @Summary Penyaluran modal koperasi (seam ke keuangan sekolah)
// @Tags koperasi-modal
// @Security ApiKeyAuth
// @Param request body modal.CreateRequest true "Data modal"
// @Success 201 {object} dto.SuccessResponse{data=modal.Response}
// @Router /v1/koperasi/capital-injections [post]
func (h *Handler) Create(c echo.Context) error {
	var req CreateRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}
	createdBy, err := middleware.GetUserID(c)
	if err != nil {
		return err
	}
	item, err := h.svc.Create(req, createdBy)
	if err != nil {
		return fail(c, err)
	}
	return c.JSON(http.StatusCreated, dto.SuccessResponse{Message: "Modal berhasil disalurkan", Data: item})
}

// List godoc
// @Summary Daftar penyaluran modal
// @Tags koperasi-modal
// @Security ApiKeyAuth
// @Param academic_year_id query int false "Tahun ajaran"
// @Success 200 {object} dto.SuccessResponse{data=[]modal.Response}
// @Router /v1/koperasi/capital-injections [get]
func (h *Handler) List(c echo.Context) error {
	ayID, _ := strconv.Atoi(c.QueryParam("academic_year_id"))
	items, err := h.svc.List(uint(ayID))
	if err != nil {
		return fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Daftar penyaluran modal", Data: items})
}

// Get godoc
// @Summary Detail penyaluran modal
// @Tags koperasi-modal
// @Security ApiKeyAuth
// @Param id path int true "Capital Injection ID"
// @Success 200 {object} dto.SuccessResponse{data=modal.Response}
// @Router /v1/koperasi/capital-injections/{id} [get]
func (h *Handler) Get(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}
	item, err := h.svc.Get(uint(id))
	if err != nil {
		return fail(c, err)
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Detail penyaluran modal", Data: item})
}
