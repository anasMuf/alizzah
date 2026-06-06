package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"errors"

	"gorm.io/gorm"
)

type GuardianService interface {
	Create(req dto.CreateGuardianRequest) (*dto.GuardianResponse, error)
	GetByID(id uint) (*dto.GuardianResponse, error)
	Update(id uint, req dto.CreateGuardianRequest) (*dto.GuardianResponse, error)
	GetByStudentID(studentID uint) ([]dto.GuardianBriefResponse, error)
	LinkToStudent(studentID uint, req dto.LinkGuardianRequest) error
	UnlinkFromStudent(studentID, guardianID uint) error
	SetPrimary(studentID, guardianID uint) error
}

type guardianService struct {
	guardianRepo repository.GuardianRepository
	studentRepo  repository.StudentRepository
}

func NewGuardianService(guardianRepo repository.GuardianRepository, studentRepo repository.StudentRepository) GuardianService {
	return &guardianService{guardianRepo: guardianRepo, studentRepo: studentRepo}
}

func (s *guardianService) Create(req dto.CreateGuardianRequest) (*dto.GuardianResponse, error) {
	guardian := &model.Guardian{
		FullName:     req.FullName,
		Relationship: req.Relationship,
		Phone:        req.Phone,
		Address:      req.Address,
	}

	if err := s.guardianRepo.Create(guardian); err != nil {
		return nil, err
	}

	return mapGuardianToResponse(*guardian), nil
}

func (s *guardianService) GetByID(id uint) (*dto.GuardianResponse, error) {
	guardian, err := s.guardianRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("Wali tidak ditemukan")
		}
		return nil, err
	}

	return mapGuardianToResponse(*guardian), nil
}

func (s *guardianService) Update(id uint, req dto.CreateGuardianRequest) (*dto.GuardianResponse, error) {
	guardian, err := s.guardianRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("Wali tidak ditemukan")
		}
		return nil, err
	}

	guardian.FullName = req.FullName
	guardian.Relationship = req.Relationship
	guardian.Phone = req.Phone
	guardian.Address = req.Address

	if err := s.guardianRepo.Update(guardian); err != nil {
		return nil, err
	}

	return mapGuardianToResponse(*guardian), nil
}

func (s *guardianService) GetByStudentID(studentID uint) ([]dto.GuardianBriefResponse, error) {
	_, err := s.studentRepo.FindByID(studentID)
	if err != nil {
		return nil, errors.New("Siswa tidak ditemukan")
	}

	sgs, err := s.guardianRepo.FindByStudentID(studentID)
	if err != nil {
		return nil, err
	}

	var responses []dto.GuardianBriefResponse
	for _, sg := range sgs {
		responses = append(responses, dto.GuardianBriefResponse{
			ID:           sg.Guardian.ID,
			FullName:     sg.Guardian.FullName,
			Relationship: sg.Guardian.Relationship,
			Phone:        sg.Guardian.Phone,
			Address:      sg.Guardian.Address,
			IsPrimary:    sg.IsPrimary,
		})
	}
	return responses, nil
}

func (s *guardianService) LinkToStudent(studentID uint, req dto.LinkGuardianRequest) error {
	_, err := s.studentRepo.FindByID(studentID)
	if err != nil {
		return errors.New("Siswa tidak ditemukan")
	}
	_, err = s.guardianRepo.FindByID(req.GuardianID)
	if err != nil {
		return errors.New("Wali tidak ditemukan")
	}

	linked, _ := s.guardianRepo.IsLinkedToStudent(studentID, req.GuardianID)
	if linked {
		return errors.New("Wali sudah terhubung dengan siswa ini")
	}

	return s.guardianRepo.LinkToStudent(studentID, req.GuardianID, req.IsPrimary)
}

func (s *guardianService) UnlinkFromStudent(studentID, guardianID uint) error {
	sgs, err := s.guardianRepo.FindByStudentID(studentID)
	if err != nil {
		return err
	}
	if len(sgs) <= 1 {
		return errors.New("Tidak bisa menghapus wali jika hanya tersisa satu wali")
	}

	linked, _ := s.guardianRepo.IsLinkedToStudent(studentID, guardianID)
	if !linked {
		return errors.New("Wali tidak terhubung dengan siswa ini")
	}

	return s.guardianRepo.UnlinkFromStudent(studentID, guardianID)
}

func (s *guardianService) SetPrimary(studentID, guardianID uint) error {
	return s.guardianRepo.SetPrimary(studentID, guardianID)
}

func mapGuardianToResponse(g model.Guardian) *dto.GuardianResponse {
	var sbriefs []dto.StudentBriefResponse
	for _, st := range g.Students {
		sbriefs = append(sbriefs, dto.StudentBriefResponse{
			ID:       st.ID,
			FullName: st.FullName,
			Gender:   st.Gender,
			Status:   st.Status,
		})
	}

	return &dto.GuardianResponse{
		ID:           g.ID,
		FullName:     g.FullName,
		Relationship: g.Relationship,
		Phone:        g.Phone,
		Address:      g.Address,
		Students:     sbriefs,
	}
}
