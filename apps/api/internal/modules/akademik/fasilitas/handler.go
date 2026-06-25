package fasilitas

import (
	"api/dto"
	"api/middleware"
	"api/model"
	"api/repository"
	"api/service"
	"errors"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
)

// Model alias — tetap di flat model.Facility
func Models() []any { return []any{&model.Facility{}} }

// --- Service (master CRUD only) ---

type Service interface {
	GetAll() ([]dto.FacilityResponse, error)
	Create(req dto.CreateFacilityRequest) (*dto.FacilityResponse, error)
	Update(id uint, req dto.CreateFacilityRequest) (*dto.FacilityResponse, error)
	Delete(id uint) error
}

func NewService(repo repository.FacilityRepository) Service {
	return &svc{repo: repo}
}

type svc struct{ repo repository.FacilityRepository }

func (s *svc) GetAll() ([]dto.FacilityResponse, error) {
	facilities, err := s.repo.FindAll()
	if err != nil {
		return nil, err
	}
	resps := make([]dto.FacilityResponse, len(facilities))
	for i, f := range facilities {
		resps[i] = dto.FacilityResponse{ID: f.ID, Name: f.Name, Description: f.Description, IsActive: f.IsActive}
	}
	return resps, nil
}

func (s *svc) Create(req dto.CreateFacilityRequest) (*dto.FacilityResponse, error) {
	f := &model.Facility{Name: req.Name, Description: req.Description, IsActive: true}
	if err := s.repo.Create(f); err != nil {
		return nil, err
	}
	return &dto.FacilityResponse{ID: f.ID, Name: f.Name, Description: f.Description, IsActive: true}, nil
}

func (s *svc) Update(id uint, req dto.CreateFacilityRequest) (*dto.FacilityResponse, error) {
	f, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.New("Fasilitas tidak ditemukan")
	}
	f.Name = req.Name
	f.Description = req.Description
	if err := s.repo.Update(f); err != nil {
		return nil, err
	}
	return &dto.FacilityResponse{ID: f.ID, Name: f.Name, Description: f.Description, IsActive: f.IsActive}, nil
}

func (s *svc) Delete(id uint) error {
	if _, err := s.repo.FindByID(id); err != nil {
		return errors.New("Fasilitas tidak ditemukan")
	}
	return s.repo.Delete(id)
}

// --- Handler (master + nested student facility via flat) ---

type Handler struct {
	svc      Service
	sfSvc    service.StudentFacilityService // thin wrapper — butuh invoiceGen
}

func New(repo repository.FacilityRepository, sfSvc service.StudentFacilityService) *Handler {
	return &Handler{svc: NewService(repo), sfSvc: sfSvc}
}

func (h *Handler) Models() []any { return Models() }

func (h *Handler) RegisterRoutes(api *echo.Group, jwt echo.MiddlewareFunc, guard *middleware.ModuleGuard) {
	adm := guard.RequireModule(middleware.ModuleAdministrasi)
	f := api.Group("/facilities", jwt)
	f.GET("", h.List, adm)
	f.POST("", h.Create, adm)
	f.PUT("/:id", h.Update, adm)
	f.DELETE("/:id", h.Delete, adm)
}

func (h *Handler) RegisterNested(students *echo.Group, guard *middleware.ModuleGuard) {
	adm := guard.RequireModule(middleware.ModuleAdministrasi)
	students.GET("/:id/facilities", h.ListByStudent, adm)
	students.POST("/:id/facilities", h.Enroll, adm)
	students.DELETE("/:id/facilities/:facilityId", h.Unenroll, adm)
}

func (h *Handler) List(c echo.Context) error {
	facilities, err := h.svc.GetAll()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, dto.ErrorResponse{Status: http.StatusInternalServerError, Code: "INTERNAL", Message: err.Error()})
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil", Data: facilities})
}

func (h *Handler) Create(c echo.Context) error {
	var req dto.CreateFacilityRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}
	f, err := h.svc.Create(req)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, dto.ErrorResponse{Status: http.StatusInternalServerError, Code: "INTERNAL", Message: err.Error()})
	}
	return c.JSON(http.StatusCreated, dto.SuccessResponse{Message: "Berhasil menambah fasilitas", Data: f})
}

func (h *Handler) Update(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	var req dto.CreateFacilityRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}
	f, err := h.svc.Update(uint(id), req)
	if err != nil {
		return c.JSON(http.StatusNotFound, dto.ErrorResponse{Status: http.StatusNotFound, Code: "NOT_FOUND", Message: err.Error()})
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil memperbarui fasilitas", Data: f})
}

func (h *Handler) Delete(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := h.svc.Delete(uint(id)); err != nil {
		return c.JSON(http.StatusNotFound, dto.ErrorResponse{Status: http.StatusNotFound, Code: "NOT_FOUND", Message: err.Error()})
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil menghapus fasilitas"})
}

func (h *Handler) ListByStudent(c echo.Context) error {
	studentID, _ := strconv.Atoi(c.Param("id"))
	ayID, _ := strconv.Atoi(c.QueryParam("academic_year_id"))
	sfs, err := h.sfSvc.GetByStudentID(uint(studentID), dto.StudentFacilityQueryParams{AcademicYearID: uint(ayID)})
	if err != nil {
		return c.JSON(http.StatusInternalServerError, dto.ErrorResponse{Status: http.StatusInternalServerError, Code: "INTERNAL", Message: err.Error()})
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil", Data: sfs})
}

func (h *Handler) Enroll(c echo.Context) error {
	studentID, _ := strconv.Atoi(c.Param("id"))
	var req dto.EnrollFacilityRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}
	sf, err := h.sfSvc.Enroll(uint(studentID), req)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, dto.ErrorResponse{Status: http.StatusInternalServerError, Code: "INTERNAL", Message: err.Error()})
	}
	return c.JSON(http.StatusCreated, dto.SuccessResponse{Message: "Berhasil mendaftarkan siswa ke fasilitas", Data: sf})
}

func (h *Handler) Unenroll(c echo.Context) error {
	studentID, _ := strconv.Atoi(c.Param("id"))
	sfID, _ := strconv.Atoi(c.Param("facilityId"))
	if err := h.sfSvc.Unenroll(uint(studentID), uint(sfID)); err != nil {
		return c.JSON(http.StatusInternalServerError, dto.ErrorResponse{Status: http.StatusInternalServerError, Code: "INTERNAL", Message: err.Error()})
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil melepas siswa dari fasilitas"})
}
