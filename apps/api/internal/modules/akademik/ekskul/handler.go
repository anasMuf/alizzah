package ekskul

import (
	"api/dto"
	"api/middleware"
	"api/model"
	"api/utility"
	"errors"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

// --- Model ---

type Extracurricular struct {
	model.PrimaryKey
	Name string `gorm:"size:100;not null;uniqueIndex"`
	Type string `gorm:"size:20;not null"` // pasta | calisan | ekskul
	model.BaseModelTimeAt
}

func (Extracurricular) TableName() string { return "extracurriculars" }
func Models() []any                      { return []any{&Extracurricular{}} }

// --- DTO ---

type CreateRequest struct {
	Name string `json:"name" validate:"required,max=100"`
	Type string `json:"type" validate:"required,oneof=pasta calisan ekskul"`
}

type Response struct {
	ID   uint   `json:"id"`
	Name string `json:"name"`
	Type string `json:"type"`
}

type QueryParams struct{ Type string }

// --- Repository ---

type Repository interface {
	FindAll(params QueryParams) ([]Extracurricular, error)
	FindByID(id uint) (*Extracurricular, error)
	Create(ex *Extracurricular) error
	Update(ex *Extracurricular) error
	Delete(id uint) error
	IsUsedByStudents(id uint) (bool, error)
}

func NewRepository(db *gorm.DB) Repository { return &repo{db: db} }

type repo struct{ db *gorm.DB }

func (r *repo) FindAll(params QueryParams) ([]Extracurricular, error) {
	var exs []Extracurricular
	q := r.db.Model(&Extracurricular{})
	if params.Type != "" {
		q = q.Where("type = ?", params.Type)
	}
	err := q.Order("name ASC").Find(&exs).Error
	return exs, err
}

func (r *repo) FindByID(id uint) (*Extracurricular, error) {
	var ex Extracurricular
	err := r.db.First(&ex, id).Error
	return &ex, err
}
func (r *repo) Create(ex *Extracurricular) error { return r.db.Create(ex).Error }
func (r *repo) Update(ex *Extracurricular) error  { return r.db.Save(ex).Error }
func (r *repo) Delete(id uint) error               { return r.db.Delete(&Extracurricular{}, id).Error }
func (r *repo) IsUsedByStudents(id uint) (bool, error) {
	var count int64
	err := r.db.Table("student_extracurriculars").Where("extracurricular_id = ? AND end_date IS NULL", id).Count(&count).Error
	return count > 0, err
}

// --- Service ---

type Service interface {
	GetAll(params QueryParams) ([]Response, error)
	Create(req CreateRequest) (*Response, error)
	Update(id uint, req CreateRequest) (*Response, error)
	Delete(id uint) error
}

func NewService(repo Repository) Service { return &svc{repo: repo} }

type svc struct{ repo Repository }

func (s *svc) GetAll(params QueryParams) ([]Response, error) {
	exs, err := s.repo.FindAll(params)
	if err != nil {
		return nil, err
	}
	resps := make([]Response, len(exs))
	for i, ex := range exs {
		resps[i] = Response{ID: ex.ID, Name: ex.Name, Type: ex.Type}
	}
	return resps, nil
}

func (s *svc) Create(req CreateRequest) (*Response, error) {
	ex := &Extracurricular{Name: req.Name, Type: req.Type}
	if err := s.repo.Create(ex); err != nil {
		return nil, err
	}
	return &Response{ID: ex.ID, Name: ex.Name, Type: ex.Type}, nil
}

func (s *svc) Update(id uint, req CreateRequest) (*Response, error) {
	ex, err := s.repo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("Ekstrakurikuler tidak ditemukan")
		}
		return nil, err
	}
	ex.Name = req.Name
	ex.Type = req.Type
	if err := s.repo.Update(ex); err != nil {
		return nil, err
	}
	return &Response{ID: ex.ID, Name: ex.Name, Type: ex.Type}, nil
}

func (s *svc) Delete(id uint) error {
	isUsed, err := s.repo.IsUsedByStudents(id)
	if err != nil {
		return err
	}
	if isUsed {
		return utility.NewUnprocessableError("Tidak bisa menghapus ekstrakurikuler karena masih diikuti oleh siswa")
	}
	if _, err := s.repo.FindByID(id); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("Ekstrakurikuler tidak ditemukan")
		}
		return err
	}
	return s.repo.Delete(id)
}

// --- Handler ---

type Handler struct{ svc Service }

func New(db *gorm.DB) *Handler {
	return &Handler{svc: NewService(NewRepository(db))}
}

func (h *Handler) Models() []any { return Models() }

func (h *Handler) RegisterRoutes(api *echo.Group, jwt echo.MiddlewareFunc, guard *middleware.ModuleGuard) {
	g := api.Group("/extracurriculars", jwt, guard.RequireModule(middleware.ModuleAdministrasi))
	g.GET("", h.List)
	g.POST("", h.Create)
	g.PUT("/:id", h.Update)
	g.DELETE("/:id", h.Delete)
}

func (h *Handler) List(c echo.Context) error {
	exs, err := h.svc.GetAll(QueryParams{Type: c.QueryParam("type")})
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil daftar ekstrakurikuler", Data: exs})
}

func (h *Handler) Create(c echo.Context) error {
	var req CreateRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}
	ex, err := h.svc.Create(req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}
	return c.JSON(http.StatusCreated, dto.SuccessResponse{Message: "Berhasil membuat ekstrakurikuler", Data: ex})
}

func (h *Handler) Update(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	var req CreateRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}
	ex, err := h.svc.Update(uint(id), req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil memperbarui ekstrakurikuler", Data: ex})
}

func (h *Handler) Delete(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := h.svc.Delete(uint(id)); err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil menghapus ekstrakurikuler"})
}
