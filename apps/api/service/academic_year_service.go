package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"
)

const dateFormat = "2006-01-02"

type AcademicYearService interface {
	GetAll() ([]dto.AcademicYearResponse, error)
	GetByID(id uint) (*dto.AcademicYearResponse, error)
	Create(req dto.CreateAcademicYearRequest) (*dto.AcademicYearResponse, error)
	Update(id uint, req dto.CreateAcademicYearRequest) (*dto.AcademicYearResponse, error)
	Activate(id uint) error
}

type academicYearService struct {
	ayRepo repository.AcademicYearRepository
}

func NewAcademicYearService(ayRepo repository.AcademicYearRepository) AcademicYearService {
	return &academicYearService{ayRepo: ayRepo}
}

func (s *academicYearService) GetAll() ([]dto.AcademicYearResponse, error) {
	years, err := s.ayRepo.FindAll()
	if err != nil {
		return nil, err
	}

	responses := make([]dto.AcademicYearResponse, len(years))
	for i, ay := range years {
		responses[i] = mapAcademicYearToResponse(ay)
	}
	return responses, nil
}

func (s *academicYearService) GetByID(id uint) (*dto.AcademicYearResponse, error) {
	ay, err := s.ayRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("Tahun ajaran tidak ditemukan")
		}
		return nil, err
	}

	response := mapAcademicYearToResponse(*ay)
	return &response, nil
}

func (s *academicYearService) Create(req dto.CreateAcademicYearRequest) (*dto.AcademicYearResponse, error) {
	// Parse dates
	startDate, err := time.Parse(dateFormat, req.StartDate)
	if err != nil {
		return nil, errors.New("Format start_date tidak valid (gunakan YYYY-MM-DD)")
	}
	endDate, err := time.Parse(dateFormat, req.EndDate)
	if err != nil {
		return nil, errors.New("Format end_date tidak valid (gunakan YYYY-MM-DD)")
	}

	// Validate end_date > start_date
	if !endDate.After(startDate) {
		return nil, errors.New("end_date harus setelah start_date")
	}

	// Check name uniqueness
	_, err = s.ayRepo.FindByName(req.Name)
	if err == nil {
		return nil, errors.New("Nama tahun ajaran sudah digunakan")
	}

	ay := &model.AcademicYear{
		Name:      req.Name,
		StartDate: startDate,
		EndDate:   endDate,
		IsActive:  false,
	}

	if err := s.ayRepo.Create(ay); err != nil {
		return nil, err
	}

	response := mapAcademicYearToResponse(*ay)
	return &response, nil
}

func (s *academicYearService) Update(id uint, req dto.CreateAcademicYearRequest) (*dto.AcademicYearResponse, error) {
	ay, err := s.ayRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("Tahun ajaran tidak ditemukan")
		}
		return nil, err
	}

	// Parse dates
	startDate, err := time.Parse(dateFormat, req.StartDate)
	if err != nil {
		return nil, errors.New("Format start_date tidak valid (gunakan YYYY-MM-DD)")
	}
	endDate, err := time.Parse(dateFormat, req.EndDate)
	if err != nil {
		return nil, errors.New("Format end_date tidak valid (gunakan YYYY-MM-DD)")
	}

	if !endDate.After(startDate) {
		return nil, errors.New("end_date harus setelah start_date")
	}

	// Check name uniqueness if changed
	if ay.Name != req.Name {
		existing, err := s.ayRepo.FindByName(req.Name)
		if err == nil && existing.ID != id {
			return nil, errors.New("Nama tahun ajaran sudah digunakan")
		}
	}

	ay.Name = req.Name
	ay.StartDate = startDate
	ay.EndDate = endDate

	if err := s.ayRepo.Update(ay); err != nil {
		return nil, err
	}

	response := mapAcademicYearToResponse(*ay)
	return &response, nil
}

func (s *academicYearService) Activate(id uint) error {
	ay, err := s.ayRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("Tahun ajaran tidak ditemukan")
		}
		return err
	}

	if ay.IsActive {
		return fmt.Errorf("Tahun ajaran %s sudah aktif", ay.Name)
	}

	return s.ayRepo.SetActive(id)
}

func mapAcademicYearToResponse(ay model.AcademicYear) dto.AcademicYearResponse {
	return dto.AcademicYearResponse{
		ID:        ay.ID,
		Name:      ay.Name,
		StartDate: ay.StartDate.Format(dateFormat),
		EndDate:   ay.EndDate.Format(dateFormat),
		IsActive:  ay.IsActive,
		CreatedAt: ay.CreatedAt.Format(time.RFC3339),
	}
}
