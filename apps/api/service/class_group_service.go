package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"encoding/json"
	"errors"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type ClassGroupService interface {
	GetAll(params dto.ClassGroupQueryParams) ([]dto.ClassGroupResponse, error)
	GetByID(id uint) (*dto.ClassGroupResponse, error)
	Create(req dto.CreateClassGroupRequest) (*dto.ClassGroupResponse, error)
	Update(id uint, req dto.CreateClassGroupRequest) (*dto.ClassGroupResponse, error)
	Delete(id uint) error
}

type classGroupService struct {
	classGroupRepo repository.ClassGroupRepository
}

func NewClassGroupService(classGroupRepo repository.ClassGroupRepository) ClassGroupService {
	return &classGroupService{classGroupRepo: classGroupRepo}
}

func (s *classGroupService) GetAll(params dto.ClassGroupQueryParams) ([]dto.ClassGroupResponse, error) {
	cgs, err := s.classGroupRepo.FindAll(params)
	if err != nil {
		return nil, err
	}

	var responses []dto.ClassGroupResponse
	for _, cg := range cgs {
		count, _ := s.classGroupRepo.CountStudents(cg.ID)
		responses = append(responses, *mapClassGroupToResponse(cg, count))
	}
	return responses, nil
}

func (s *classGroupService) GetByID(id uint) (*dto.ClassGroupResponse, error) {
	cg, err := s.classGroupRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("Rombel tidak ditemukan")
		}
		return nil, err
	}
	count, _ := s.classGroupRepo.CountStudents(cg.ID)
	return mapClassGroupToResponse(*cg, count), nil
}

func (s *classGroupService) Create(req dto.CreateClassGroupRequest) (*dto.ClassGroupResponse, error) {
	scheduleBytes, err := json.Marshal(req.Schedule)
	if err != nil {
		return nil, errors.New("Gagal memproses schedule rombel")
	}

	cg := &model.ClassGroup{
		AcademicYearID: req.AcademicYearID,
		Name:           req.Name,
		Level:          req.Level,
		Schedule:       datatypes.JSON(scheduleBytes),
	}

	if err := s.classGroupRepo.Create(cg); err != nil {
		return nil, err
	}

	return mapClassGroupToResponse(*cg, 0), nil
}

func (s *classGroupService) Update(id uint, req dto.CreateClassGroupRequest) (*dto.ClassGroupResponse, error) {
	cg, err := s.classGroupRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("Rombel tidak ditemukan")
		}
		return nil, err
	}

	scheduleBytes, err := json.Marshal(req.Schedule)
	if err != nil {
		return nil, errors.New("Gagal memproses schedule rombel")
	}

	cg.AcademicYearID = req.AcademicYearID
	cg.Name = req.Name
	cg.Level = req.Level
	cg.Schedule = datatypes.JSON(scheduleBytes)

	if err := s.classGroupRepo.Update(cg); err != nil {
		return nil, err
	}

	return mapClassGroupToResponse(*cg, 0), nil
}

func (s *classGroupService) Delete(id uint) error {
	hasActive, err := s.classGroupRepo.HasActiveStudents(id)
	if err != nil {
		return err
	}
	if hasActive {
		return errors.New("Tidak bisa menghapus rombel yang masih memiliki siswa aktif")
	}

	_, err = s.classGroupRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("Rombel tidak ditemukan")
		}
		return err
	}

	return s.classGroupRepo.Delete(id)
}

func mapClassGroupToResponse(cg model.ClassGroup, studentCount int) *dto.ClassGroupResponse {
	var schedule dto.ClassGroupSchedule
	_ = json.Unmarshal(cg.Schedule, &schedule)

	return &dto.ClassGroupResponse{
		ID:             cg.ID,
		AcademicYearID: cg.AcademicYearID,
		Name:           cg.Name,
		Level:          cg.Level,
		Schedule:       schedule,
		StudentCount:   studentCount,
	}
}
