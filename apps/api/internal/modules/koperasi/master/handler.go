package master

import (
	"net/http"
	"strconv"

	"api/dto"
	"api/utility"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type Handler struct{ svc Service }

func NewHandler(svc Service) *Handler { return &Handler{svc: svc} }

// New merangkai repository → service → handler untuk master data koperasi.
func New(db *gorm.DB) *Handler { return NewHandler(NewService(NewRepository(db))) }

// RegisterRoutes mendaftarkan master kategori (/categories) & satuan (/units) barang.
// Keduanya CRUD ringkas di atas satu tabel generik (dibedakan kolom kind).
func (h *Handler) RegisterRoutes(g *echo.Group, mw ...echo.MiddlewareFunc) {
	h.registerKind(g, "categories", KindCategory, mw...)
	h.registerKind(g, "units", KindUnit, mw...)
}

func (h *Handler) registerKind(g *echo.Group, path, kind string, mw ...echo.MiddlewareFunc) {
	g.GET("/"+path, h.list(kind), mw...)
	g.POST("/"+path, h.create(kind), mw...)
	g.PUT("/"+path+"/:id", h.update(kind), mw...)
	g.DELETE("/"+path+"/:id", h.delete(kind), mw...)
}

func fail(c echo.Context, err error) error {
	status, code := utility.GetErrorStatusAndCode(err)
	return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
}

func badRequest(c echo.Context, msg string) error {
	return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: msg})
}

func (h *Handler) list(kind string) echo.HandlerFunc {
	return func(c echo.Context) error {
		items, err := h.svc.List(kind, c.QueryParam("search"))
		if err != nil {
			return fail(c, err)
		}
		return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil daftar master", Data: items})
	}
}

func (h *Handler) create(kind string) echo.HandlerFunc {
	return func(c echo.Context) error {
		var req CreateRequest
		if err := c.Bind(&req); err != nil {
			return badRequest(c, err.Error())
		}
		if err := c.Validate(req); err != nil {
			return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
		}
		item, err := h.svc.Create(kind, req)
		if err != nil {
			return fail(c, err)
		}
		return c.JSON(http.StatusCreated, dto.SuccessResponse{Message: "Berhasil menambah master", Data: item})
	}
}

func (h *Handler) update(kind string) echo.HandlerFunc {
	return func(c echo.Context) error {
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			return badRequest(c, "ID tidak valid")
		}
		var req CreateRequest
		if err := c.Bind(&req); err != nil {
			return badRequest(c, err.Error())
		}
		if err := c.Validate(req); err != nil {
			return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
		}
		item, err := h.svc.Update(kind, uint(id), req)
		if err != nil {
			return fail(c, err)
		}
		return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil memperbarui master", Data: item})
	}
}

func (h *Handler) delete(kind string) echo.HandlerFunc {
	return func(c echo.Context) error {
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			return badRequest(c, "ID tidak valid")
		}
		if err := h.svc.Delete(kind, uint(id)); err != nil {
			return fail(c, err)
		}
		return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil menghapus master"})
	}
}
