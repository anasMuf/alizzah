package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"errors"

	"gorm.io/gorm"
)

type StudentAcademicEventService interface {
	GetByStudentID(studentID uint) ([]dto.AcademicEventResponse, error)
}

type studentAcademicEventService struct {
	eventRepo   repository.StudentAcademicEventRepository
	studentRepo repository.StudentRepository
}

func NewStudentAcademicEventService(eventRepo repository.StudentAcademicEventRepository, studentRepo repository.StudentRepository) StudentAcademicEventService {
	return &studentAcademicEventService{
		eventRepo:   eventRepo,
		studentRepo: studentRepo,
	}
}

func (s *studentAcademicEventService) GetByStudentID(studentID uint) ([]dto.AcademicEventResponse, error) {
	_, err := s.studentRepo.FindByID(studentID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("Siswa tidak ditemukan")
		}
		return nil, err
	}

	events, err := s.eventRepo.FindByStudentID(studentID)
	if err != nil {
		return nil, err
	}

	var responses []dto.AcademicEventResponse
	for _, ev := range events {
		responses = append(responses, *mapAcademicEventToResponse(ev))
	}

	return responses, nil
}

func mapAcademicEventToResponse(ev model.StudentAcademicEvent) *dto.AcademicEventResponse {
	var notes *string
	if ev.Notes != "" {
		notes = &ev.Notes
	}

	var fromClassGroup *dto.ClassGroupBriefResponse
	if ev.FromClassGroup != nil {
		fromClassGroup = &dto.ClassGroupBriefResponse{
			ID:    ev.FromClassGroup.ID,
			Name:  ev.FromClassGroup.Name,
			Level: ev.FromClassGroup.Level,
		}
	}

	var toClassGroup *dto.ClassGroupBriefResponse
	if ev.ToClassGroup != nil {
		toClassGroup = &dto.ClassGroupBriefResponse{
			ID:    ev.ToClassGroup.ID,
			Name:  ev.ToClassGroup.Name,
			Level: ev.ToClassGroup.Level,
		}
	}

	return &dto.AcademicEventResponse{
		ID: ev.ID,
		AcademicYear: dto.AcademicYearBriefResponse{
			ID:   ev.AcademicYear.ID,
			Name: ev.AcademicYear.Name,
		},
		FromClassGroup: fromClassGroup,
		ToClassGroup:   toClassGroup,
		EventType:      ev.EventType,
		EventDate:      ev.EventDate.Format("2006-01-02"),
		Notes:          notes,
		CreatedBy: dto.UserBriefResponse{
			ID:       ev.Creator.ID,
			FullName: ev.Creator.FullName,
		},
		CreatedAt: ev.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}
