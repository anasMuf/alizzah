package tahunajaran

import (
	"api/dto"
	"api/middleware"
	"api/model"
	"api/repository"
	"api/utility"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

const dateFormat = "2006-01-02"

// --- Model alias (tetap di flat model.AcademicYear) ---
func Models() []any { return []any{&model.AcademicYear{}} }

// --- Service ---

type Service interface {
	GetAll() ([]dto.AcademicYearResponse, error)
	GetByID(id uint) (*dto.AcademicYearResponse, error)
	Create(req dto.CreateAcademicYearRequest) (*dto.AcademicYearResponse, error)
	Update(id uint, req dto.CreateAcademicYearRequest) (*dto.AcademicYearResponse, error)
	Activate(id uint) error
}

func NewService(ayRepo repository.AcademicYearRepository) Service {
	return &svc{ayRepo: ayRepo}
}

type svc struct{ ayRepo repository.AcademicYearRepository }

func (s *svc) GetAll() ([]dto.AcademicYearResponse, error) {
	years, err := s.ayRepo.FindAll()
	if err != nil {
		return nil, err
	}
	resps := make([]dto.AcademicYearResponse, len(years))
	for i, ay := range years {
		resps[i] = dto.AcademicYearResponse{
			ID: ay.ID, Name: ay.Name,
			StartDate: ay.StartDate.Format(dateFormat),
			EndDate:   ay.EndDate.Format(dateFormat),
			IsActive:  ay.IsActive,
			CreatedAt: ay.CreatedAt.Format(time.RFC3339),
		}
	}
	return resps, nil
}

func (s *svc) GetByID(id uint) (*dto.AcademicYearResponse, error) {
	ay, err := s.ayRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("Tahun ajaran tidak ditemukan")
		}
		return nil, err
	}
	r := dto.AcademicYearResponse{
		ID: ay.ID, Name: ay.Name,
		StartDate: ay.StartDate.Format(dateFormat),
		EndDate:   ay.EndDate.Format(dateFormat),
		IsActive:  ay.IsActive,
		CreatedAt: ay.CreatedAt.Format(time.RFC3339),
	}
	return &r, nil
}

func (s *svc) Create(req dto.CreateAcademicYearRequest) (*dto.AcademicYearResponse, error) {
	startDate, err := time.Parse(dateFormat, req.StartDate)
	if err != nil {
		return nil, errors.New("Format start_date tidak valid (YYYY-MM-DD)")
	}
	endDate, err := time.Parse(dateFormat, req.EndDate)
	if err != nil {
		return nil, errors.New("Format end_date tidak valid (YYYY-MM-DD)")
	}
	if !endDate.After(startDate) {
		return nil, errors.New("end_date harus setelah start_date")
	}
	if _, err := s.ayRepo.FindByName(req.Name); err == nil {
		return nil, errors.New("Nama tahun ajaran sudah digunakan")
	}
	overlapping, _ := s.ayRepo.FindOverlapping(startDate, endDate, 0)
	if overlapping.ID > 0 {
		return nil, fmt.Errorf("Rentang tanggal overlap dengan tahun ajaran '%s'", overlapping.Name)
	}
	ay := &model.AcademicYear{Name: req.Name, StartDate: startDate, EndDate: endDate, IsActive: false}
	if err := s.ayRepo.Create(ay); err != nil {
		return nil, err
	}
	r, _ := s.GetByID(ay.ID)
	return r, nil
}

func (s *svc) Update(id uint, req dto.CreateAcademicYearRequest) (*dto.AcademicYearResponse, error) {
	ay, err := s.ayRepo.FindByID(id)
	if err != nil {
		return nil, errors.New("Tahun ajaran tidak ditemukan")
	}
	startDate, _ := time.Parse(dateFormat, req.StartDate)
	endDate, _ := time.Parse(dateFormat, req.EndDate)
	if !endDate.After(startDate) {
		return nil, errors.New("end_date harus setelah start_date")
	}
	if ay.Name != req.Name {
		if existing, _ := s.ayRepo.FindByName(req.Name); existing.ID != id {
			return nil, errors.New("Nama tahun ajaran sudah digunakan")
		}
	}
	overlapping, _ := s.ayRepo.FindOverlapping(startDate, endDate, id)
	if overlapping.ID > 0 {
		return nil, fmt.Errorf("Rentang tanggal overlap dengan tahun ajaran '%s'", overlapping.Name)
	}
	ay.Name = req.Name
	ay.StartDate = startDate
	ay.EndDate = endDate
	if err := s.ayRepo.Update(ay); err != nil {
		return nil, err
	}
	r, _ := s.GetByID(id)
	return r, nil
}

func (s *svc) Activate(id uint) error {
	ay, err := s.ayRepo.FindByID(id)
	if err != nil {
		return errors.New("Tahun ajaran tidak ditemukan")
	}
	if ay.IsActive {
		return fmt.Errorf("Tahun ajaran %s sudah aktif", ay.Name)
	}
	return s.ayRepo.SetActive(id)
}

// --- Handler ---

type Handler struct{ svc Service }

func New(ayRepo repository.AcademicYearRepository) *Handler {
	return &Handler{svc: NewService(ayRepo)}
}

func (h *Handler) Models() []any { return Models() }

func (h *Handler) RegisterRoutes(api *echo.Group, jwt echo.MiddlewareFunc, guard *middleware.ModuleGuard) {
	read := guard.RequireModule(middleware.ModuleAdministrasi, middleware.ModuleKeuangan, middleware.ModuleKoperasi, middleware.ModuleLaporan)
	write := guard.RequireModule(middleware.ModuleAdministrasi)
	ay := api.Group("/academic-years", jwt)
	ay.GET("", h.List, read)
	ay.POST("", h.Create, write)
	ay.GET("/:id", h.Get, read)
	ay.PUT("/:id", h.Update, write)
	ay.PATCH("/:id/activate", h.Activate, write)
}

func (h *Handler) List(c echo.Context) error {
	years, err := h.svc.GetAll()
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Data retrieved successfully", Data: years})
}

func (h *Handler) Create(c echo.Context) error {
	var req dto.CreateAcademicYearRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}
	ay, err := h.svc.Create(req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}
	return c.JSON(http.StatusCreated, dto.SuccessResponse{Message: "Tahun ajaran berhasil dibuat", Data: ay})
}

func (h *Handler) Get(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	ay, err := h.svc.GetByID(uint(id))
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Data retrieved successfully", Data: ay})
}

func (h *Handler) Update(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	var req dto.CreateAcademicYearRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}
	ay, err := h.svc.Update(uint(id), req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Tahun ajaran berhasil diperbarui", Data: ay})
}

func (h *Handler) Activate(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := h.svc.Activate(uint(id)); err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Tahun ajaran berhasil diaktifkan"})
}
