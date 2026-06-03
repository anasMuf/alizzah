package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"errors"

	"gorm.io/gorm"
)

type StudentEnrollmentService interface {
	GetByStudentID(studentID uint, params dto.EnrollmentQueryParams) ([]dto.EnrollmentDetailResponse, error)
	GetStudentsByClassGroup(classGroupID uint) ([]dto.StudentListResponse, error)
	ActivateEnrollment(enrollmentID uint) error
}

type studentEnrollmentService struct {
	enrollmentRepo repository.StudentEnrollmentRepository
	studentRepo    repository.StudentRepository
	classGroupRepo repository.ClassGroupRepository
}

func NewStudentEnrollmentService(enrollmentRepo repository.StudentEnrollmentRepository, studentRepo repository.StudentRepository, classGroupRepo repository.ClassGroupRepository) StudentEnrollmentService {
	return &studentEnrollmentService{
		enrollmentRepo: enrollmentRepo,
		studentRepo:    studentRepo,
		classGroupRepo: classGroupRepo,
	}
}

func (s *studentEnrollmentService) GetByStudentID(studentID uint, params dto.EnrollmentQueryParams) ([]dto.EnrollmentDetailResponse, error) {
	_, err := s.studentRepo.FindByID(studentID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("Siswa tidak ditemukan")
		}
		return nil, err
	}

	enrollments, err := s.enrollmentRepo.FindByStudentID(studentID, params)
	if err != nil {
		return nil, err
	}

	var responses []dto.EnrollmentDetailResponse
	for _, e := range enrollments {
		responses = append(responses, *mapEnrollmentToDetailResponse(e))
	}

	return responses, nil
}

func (s *studentEnrollmentService) GetStudentsByClassGroup(classGroupID uint) ([]dto.StudentListResponse, error) {
	_, err := s.classGroupRepo.FindByID(classGroupID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("Rombel tidak ditemukan")
		}
		return nil, err
	}

	enrollments, err := s.enrollmentRepo.FindActiveByClassGroupID(classGroupID)
	if err != nil {
		return nil, err
	}

	var responses []dto.StudentListResponse
	for _, e := range enrollments {
		var currentEnrollment *dto.EnrollmentBriefResponse
		currentEnrollment = &dto.EnrollmentBriefResponse{
			ID:             e.ID,
			ClassGroupID:   e.ClassGroupID,
			ClassGroupName: e.ClassGroup.Name,
			ClassGroup: dto.ClassGroupBriefResponse{
				ID:    e.ClassGroup.ID,
				Name:  e.ClassGroup.Name,
				Level: e.ClassGroup.Level,
			},
			Level:            e.ClassGroup.Level,
			AcademicYearID:   e.AcademicYearID,
			AcademicYearName: e.AcademicYear.Name,
			StartDate:        e.StartDate.Format("2006-01-02"),
			Status:           e.Status,
		}

		responses = append(responses, dto.StudentListResponse{
			ID:                e.Student.ID,
			FullName:          e.Student.FullName,
			Gender:            e.Student.Gender,
			BirthDate:         e.Student.BirthDate.Format("2006-01-02"),
			Status:            e.Student.Status,
			IsDaycareOnly:     e.Student.IsDaycareOnly,
			CurrentEnrollment: currentEnrollment,
		})
	}

	return responses, nil
}

func (s *studentEnrollmentService) ActivateEnrollment(enrollmentID uint) error {
	enrollments, err := s.enrollmentRepo.FindByID(enrollmentID)
	if err != nil {
		return errors.New("Enrollment tidak ditemukan")
	}

	if enrollments.Status != "pending" {
		return errors.New("Hanya enrollment berstatus 'pending' yang bisa diaktifkan")
	}

	// Check no other active enrollment for this student in same year
	exists, _ := s.enrollmentRepo.ExistsByStudentAndYear(enrollments.StudentID, enrollments.AcademicYearID)
	if exists {
		return errors.New("Siswa sudah memiliki enrollment aktif di tahun ajaran ini")
	}

	return s.enrollmentRepo.UpdateStatus(enrollmentID, "active", nil)
}

func mapEnrollmentToDetailResponse(e model.StudentEnrollment) *dto.EnrollmentDetailResponse {
	var endDateStr *string
	if e.EndDate != nil {
		ed := e.EndDate.Format("2006-01-02")
		endDateStr = &ed
	}

	var notesStr *string
	if e.Notes != "" {
		notesStr = &e.Notes
	}

	return &dto.EnrollmentDetailResponse{
		ID: e.ID,
		AcademicYear: dto.AcademicYearBriefResponse{
			ID:   e.AcademicYear.ID,
			Name: e.AcademicYear.Name,
		},
		ClassGroup: dto.ClassGroupBriefResponse{
			ID:    e.ClassGroup.ID,
			Name:  e.ClassGroup.Name,
			Level: e.ClassGroup.Level,
		},
		StartDate:      e.StartDate.Format("2006-01-02"),
		EndDate:        endDateStr,
		Status:         e.Status,
		EnrollmentType: e.EnrollmentType,
		Notes:          notesStr,
	}
}
