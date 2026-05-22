package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"errors"

	"gorm.io/gorm"
)

type ExtracurricularService interface {
	GetAll(params dto.ExtracurricularQueryParams) ([]dto.ExtracurricularResponse, error)
	Create(req dto.CreateExtracurricularRequest) (*dto.ExtracurricularResponse, error)
	Update(id uint, req dto.CreateExtracurricularRequest) (*dto.ExtracurricularResponse, error)
	Delete(id uint) error
}

type extracurricularService struct {
	extracurricularRepo repository.ExtracurricularRepository
}

func NewExtracurricularService(extracurricularRepo repository.ExtracurricularRepository) ExtracurricularService {
	return &extracurricularService{extracurricularRepo: extracurricularRepo}
}

func (s *extracurricularService) GetAll(params dto.ExtracurricularQueryParams) ([]dto.ExtracurricularResponse, error) {
	exs, err := s.extracurricularRepo.FindAll(params)
	if err != nil {
		return nil, err
	}

	var responses []dto.ExtracurricularResponse
	for _, ex := range exs {
		responses = append(responses, dto.ExtracurricularResponse{
			ID:   ex.ID,
			Name: ex.Name,
			Type: ex.Type,
		})
	}
	return responses, nil
}

func (s *extracurricularService) Create(req dto.CreateExtracurricularRequest) (*dto.ExtracurricularResponse, error) {
	ex := &model.Extracurricular{
		Name: req.Name,
		Type: req.Type,
	}

	if err := s.extracurricularRepo.Create(ex); err != nil {
		return nil, err
	}

	return &dto.ExtracurricularResponse{
		ID:   ex.ID,
		Name: ex.Name,
		Type: ex.Type,
	}, nil
}

func (s *extracurricularService) Update(id uint, req dto.CreateExtracurricularRequest) (*dto.ExtracurricularResponse, error) {
	ex, err := s.extracurricularRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("Ekstrakurikuler tidak ditemukan")
		}
		return nil, err
	}

	ex.Name = req.Name
	ex.Type = req.Type

	if err := s.extracurricularRepo.Update(ex); err != nil {
		return nil, err
	}

	return &dto.ExtracurricularResponse{
		ID:   ex.ID,
		Name: ex.Name,
		Type: ex.Type,
	}, nil
}

func (s *extracurricularService) Delete(id uint) error {
	isUsed, err := s.extracurricularRepo.IsUsedByStudents(id)
	if err != nil {
		return err
	}
	if isUsed {
		return errors.New("Tidak bisa menghapus ekstrakurikuler karena masih diikuti oleh siswa")
	}

	_, err = s.extracurricularRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("Ekstrakurikuler tidak ditemukan")
		}
		return err
	}

	return s.extracurricularRepo.Delete(id)
}
