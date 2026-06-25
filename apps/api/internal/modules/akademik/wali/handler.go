package wali

import (
	"api/dto"
	"api/middleware"
	"api/model"
	"api/repository"
	"errors"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

func Models() []any { return []any{&model.Guardian{}, &model.StudentGuardian{}} }

// --- Service ---

type Service interface {
	Create(req dto.CreateGuardianRequest) (*dto.GuardianResponse, error)
	GetByID(id uint) (*dto.GuardianResponse, error)
	Update(id uint, req dto.CreateGuardianRequest) (*dto.GuardianResponse, error)
	GetByStudentID(studentID uint) ([]dto.GuardianBriefResponse, error)
	LinkToStudent(studentID uint, req dto.LinkGuardianRequest) error
	UnlinkFromStudent(studentID, guardianID uint) error
	SetPrimary(studentID, guardianID uint) error
}

func NewService(guardianRepo repository.GuardianRepository, studentRepo repository.StudentRepository) Service {
	return &svc{guardianRepo: guardianRepo, studentRepo: studentRepo}
}

type svc struct {
	guardianRepo repository.GuardianRepository
	studentRepo  repository.StudentRepository
}

func (s *svc) Create(req dto.CreateGuardianRequest) (*dto.GuardianResponse, error) {
	g := &model.Guardian{FullName: req.FullName, Relationship: req.Relationship, Phone: req.Phone, Address: req.Address}
	if err := s.guardianRepo.Create(g); err != nil {
		return nil, err
	}
	return mapGuardianToResponse(*g), nil
}

func (s *svc) GetByID(id uint) (*dto.GuardianResponse, error) {
	g, err := s.guardianRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("Wali tidak ditemukan")
		}
		return nil, err
	}
	return mapGuardianToResponse(*g), nil
}

func (s *svc) Update(id uint, req dto.CreateGuardianRequest) (*dto.GuardianResponse, error) {
	g, err := s.guardianRepo.FindByID(id)
	if err != nil {
		return nil, errors.New("Wali tidak ditemukan")
	}
	g.FullName = req.FullName
	g.Relationship = req.Relationship
	g.Phone = req.Phone
	g.Address = req.Address
	if err := s.guardianRepo.Update(g); err != nil {
		return nil, err
	}
	return mapGuardianToResponse(*g), nil
}

func (s *svc) GetByStudentID(studentID uint) ([]dto.GuardianBriefResponse, error) {
	if _, err := s.studentRepo.FindByID(studentID); err != nil {
		return nil, errors.New("Siswa tidak ditemukan")
	}
	sgs, err := s.guardianRepo.FindByStudentID(studentID)
	if err != nil {
		return nil, err
	}
	var resps []dto.GuardianBriefResponse
	for _, sg := range sgs {
		resps = append(resps, dto.GuardianBriefResponse{
			ID: sg.Guardian.ID, FullName: sg.Guardian.FullName,
			Relationship: sg.Guardian.Relationship, Phone: sg.Guardian.Phone,
			Address: sg.Guardian.Address, IsPrimary: sg.IsPrimary,
		})
	}
	return resps, nil
}

func (s *svc) LinkToStudent(studentID uint, req dto.LinkGuardianRequest) error {
	if _, err := s.studentRepo.FindByID(studentID); err != nil {
		return errors.New("Siswa tidak ditemukan")
	}
	if _, err := s.guardianRepo.FindByID(req.GuardianID); err != nil {
		return errors.New("Wali tidak ditemukan")
	}
	if linked, _ := s.guardianRepo.IsLinkedToStudent(studentID, req.GuardianID); linked {
		return errors.New("Wali sudah terhubung dengan siswa ini")
	}
	return s.guardianRepo.LinkToStudent(studentID, req.GuardianID, req.IsPrimary)
}

func (s *svc) UnlinkFromStudent(studentID, guardianID uint) error {
	sgs, _ := s.guardianRepo.FindByStudentID(studentID)
	if len(sgs) <= 1 {
		return errors.New("Tidak bisa menghapus wali jika hanya tersisa satu wali")
	}
	return s.guardianRepo.UnlinkFromStudent(studentID, guardianID)
}

func (s *svc) SetPrimary(studentID, guardianID uint) error {
	return s.guardianRepo.SetPrimary(studentID, guardianID)
}

func mapGuardianToResponse(g model.Guardian) *dto.GuardianResponse {
	var sbriefs []dto.StudentBriefResponse
	for _, st := range g.Students {
		sbriefs = append(sbriefs, dto.StudentBriefResponse{ID: st.ID, FullName: st.FullName, Gender: st.Gender, Status: st.Status})
	}
	return &dto.GuardianResponse{ID: g.ID, FullName: g.FullName, Relationship: g.Relationship, Phone: g.Phone, Address: g.Address, Students: sbriefs}
}

// --- Handler ---

type Handler struct{ svc Service }

func New(guardianRepo repository.GuardianRepository, studentRepo repository.StudentRepository) *Handler {
	return &Handler{svc: NewService(guardianRepo, studentRepo)}
}

func (h *Handler) Models() []any { return Models() }

func (h *Handler) RegisterRoutes(api *echo.Group, jwt echo.MiddlewareFunc, guard *middleware.ModuleGuard) {
	g := api.Group("/guardians", jwt, guard.RequireModule(middleware.ModuleAdministrasi))
	g.POST("", h.Create)
	g.GET("/:id", h.Get)
	g.PUT("/:id", h.Update)
}

func (h *Handler) RegisterNested(students *echo.Group, guard *middleware.ModuleGuard) {
	adm := guard.RequireModule(middleware.ModuleAdministrasi)
	students.GET("/:id/guardians", h.GetByStudent, adm)
	students.POST("/:id/guardians", h.LinkToStudent, adm)
	students.DELETE("/:id/guardians/:guardian_id", h.UnlinkFromStudent, adm)
	students.PATCH("/:id/guardians/:guardian_id/primary", h.SetPrimary, adm)
}

func (h *Handler) Create(c echo.Context) error {
	var req dto.CreateGuardianRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}
	g, err := h.svc.Create(req)
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}
	return c.JSON(http.StatusCreated, dto.SuccessResponse{Message: "Wali berhasil dibuat", Data: g})
}

func (h *Handler) Get(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	g, err := h.svc.GetByID(uint(id))
	if err != nil {
		return c.JSON(http.StatusNotFound, dto.ErrorResponse{Status: http.StatusNotFound, Code: "NOT_FOUND", Message: err.Error()})
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "OK", Data: g})
}

func (h *Handler) Update(c echo.Context) error {
	id, _ := strconv.Atoi(c.Param("id"))
	var req dto.CreateGuardianRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}
	g, err := h.svc.Update(uint(id), req)
	if err != nil {
		return c.JSON(http.StatusNotFound, dto.ErrorResponse{Status: http.StatusNotFound, Code: "NOT_FOUND", Message: err.Error()})
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Wali berhasil diperbarui", Data: g})
}

func (h *Handler) GetByStudent(c echo.Context) error {
	studentID, _ := strconv.Atoi(c.Param("id"))
	gs, err := h.svc.GetByStudentID(uint(studentID))
	if err != nil {
		return c.JSON(http.StatusNotFound, dto.ErrorResponse{Status: http.StatusNotFound, Code: "NOT_FOUND", Message: err.Error()})
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "OK", Data: gs})
}

func (h *Handler) LinkToStudent(c echo.Context) error {
	studentID, _ := strconv.Atoi(c.Param("id"))
	var req dto.LinkGuardianRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := h.svc.LinkToStudent(uint(studentID), req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}
	return c.JSON(http.StatusCreated, dto.SuccessResponse{Message: "Wali berhasil dihubungkan"})
}

func (h *Handler) UnlinkFromStudent(c echo.Context) error {
	studentID, _ := strconv.Atoi(c.Param("id"))
	guardianID, _ := strconv.Atoi(c.Param("guardian_id"))
	if err := h.svc.UnlinkFromStudent(uint(studentID), uint(guardianID)); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, dto.ErrorResponse{Status: http.StatusUnprocessableEntity, Code: "UNPROCESSABLE", Message: err.Error()})
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Wali berhasil dilepas"})
}

func (h *Handler) SetPrimary(c echo.Context) error {
	studentID, _ := strconv.Atoi(c.Param("id"))
	guardianID, _ := strconv.Atoi(c.Param("guardian_id"))
	if err := h.svc.SetPrimary(uint(studentID), uint(guardianID)); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}
	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Wali utama berhasil diatur"})
}
