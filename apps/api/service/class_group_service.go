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
	CloneToYear(req dto.CloneClassGroupsRequest) (*dto.CloneClassGroupsResult, error)
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
		IsMutation:     req.IsMutation,
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
	cg.IsMutation = req.IsMutation

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

func (s *classGroupService) CloneToYear(req dto.CloneClassGroupsRequest) (*dto.CloneClassGroupsResult, error) {
	if req.FromAcademicYearID == req.ToAcademicYearID {
		return nil, errors.New("Tahun ajaran asal dan tujuan tidak boleh sama")
	}

	sourceCGs, err := s.classGroupRepo.FindAll(dto.ClassGroupQueryParams{AcademicYearID: req.FromAcademicYearID})
	if err != nil {
		return nil, err
	}
	if len(sourceCGs) == 0 {
		return nil, errors.New("Tidak ada rombel di tahun ajaran asal")
	}

	existingCGs, err := s.classGroupRepo.FindAll(dto.ClassGroupQueryParams{AcademicYearID: req.ToAcademicYearID})
	if err != nil {
		return nil, err
	}
	existingNames := make(map[string]bool)
	for _, cg := range existingCGs {
		existingNames[cg.Name] = true
	}

	result := &dto.CloneClassGroupsResult{
		Groups: []dto.ClassGroupResponse{},
	}

	for _, src := range sourceCGs {
		if existingNames[src.Name] {
			result.Skipped++
			continue
		}

		newCG := &model.ClassGroup{
			AcademicYearID: req.ToAcademicYearID,
			Name:           src.Name,
			Level:          src.Level,
			Schedule:       src.Schedule,
			IsMutation:     src.IsMutation,
		}
		if err := s.classGroupRepo.Create(newCG); err != nil {
			return nil, err
		}

		result.Groups = append(result.Groups, *mapClassGroupToResponse(*newCG, 0))
		result.Created++
	}

	return result, nil
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
		IsMutation:     cg.IsMutation,
		StudentCount:   studentCount,
	}
}
