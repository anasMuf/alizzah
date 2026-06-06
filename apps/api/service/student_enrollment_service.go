package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"api/utility"
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"
)

type StudentEnrollmentService interface {
	GetByStudentID(studentID uint, params dto.EnrollmentQueryParams) ([]dto.EnrollmentDetailResponse, error)
	GetStudentsByClassGroup(classGroupID uint) ([]dto.StudentListResponse, error)
	ActivateEnrollment(enrollmentID uint) error
	EnrollStudent(studentID, createdBy uint, req dto.CreateEnrollmentRequest) (*dto.EnrollmentDetailResponse, error)
}

type studentEnrollmentService struct {
	enrollmentRepo     repository.StudentEnrollmentRepository
	studentRepo        repository.StudentRepository
	classGroupRepo     repository.ClassGroupRepository
	extracurricularRepo repository.ExtracurricularRepository
	seRepo             repository.StudentExtracurricularRepository
	invoiceGen         InvoiceGenerateService
	savingsService     SavingsService
}

func NewStudentEnrollmentService(
	enrollmentRepo repository.StudentEnrollmentRepository,
	studentRepo repository.StudentRepository,
	classGroupRepo repository.ClassGroupRepository,
	extracurricularRepo repository.ExtracurricularRepository,
	seRepo repository.StudentExtracurricularRepository,
	invoiceGen InvoiceGenerateService,
	savingsService SavingsService,
) StudentEnrollmentService {
	return &studentEnrollmentService{
		enrollmentRepo:      enrollmentRepo,
		studentRepo:         studentRepo,
		classGroupRepo:      classGroupRepo,
		extracurricularRepo: extracurricularRepo,
		seRepo:              seRepo,
		invoiceGen:          invoiceGen,
		savingsService:      savingsService,
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

func (s *studentEnrollmentService) EnrollStudent(studentID, createdBy uint, req dto.CreateEnrollmentRequest) (*dto.EnrollmentDetailResponse, error) {
	// Validasi siswa
	student, err := s.studentRepo.FindByID(studentID)
	if err != nil || student.Status != "active" {
		return nil, errors.New("Siswa tidak ditemukan atau tidak aktif")
	}

	// Validasi rombel
	cg, err := s.classGroupRepo.FindByID(req.ClassGroupID)
	if err != nil {
		return nil, errors.New("Rombel tidak ditemukan")
	}
	if cg.AcademicYearID != req.AcademicYearID {
		return nil, errors.New("Rombel tidak termasuk dalam tahun ajaran yang dipilih")
	}

	// Cek duplikasi
	exists, _ := s.enrollmentRepo.ExistsByStudentAndYear(studentID, req.AcademicYearID)
	if exists {
		return nil, errors.New("Siswa sudah memiliki enrollment di tahun ajaran ini")
	}

	startDate, err := utility.ParseDate(req.StartDate)
	if err != nil {
		return nil, fmt.Errorf("Format start_date tidak valid (YYYY-MM-DD): %w", err)
	}

	enrollmentType := req.EnrollmentType
	if enrollmentType == "" {
		enrollmentType = "new"
	}

	// Buat enrollment
	enrollment := &model.StudentEnrollment{
		StudentID:      studentID,
		ClassGroupID:   req.ClassGroupID,
		AcademicYearID: req.AcademicYearID,
		EnrollmentType: enrollmentType,
		StartDate:      startDate,
		Status:         "active",
		CreatedBy:      createdBy,
	}
	if err := s.enrollmentRepo.Create(enrollment); err != nil {
		return nil, fmt.Errorf("gagal membuat enrollment: %w", err)
	}

	// Generate invoice
	if s.invoiceGen != nil {
		level := cg.Level
		gender := student.Gender

		// Biaya awal
		if err := s.invoiceGen.GenerateInitial(dto.GenerateInitialInvoiceParams{
			StudentID: studentID, AcademicYearID: req.AcademicYearID,
			Level: level, Gender: gender, CreatedBy: createdBy,
		}); err != nil {
			return nil, fmt.Errorf("gagal generate invoice biaya awal: %w", err)
		}

		// Registrasi tahunan
		if err := s.invoiceGen.GenerateRegistration(dto.GenerateRegistrationInvoiceParams{
			StudentID: studentID, AcademicYearID: req.AcademicYearID,
			Level: level, Gender: gender, CreatedBy: createdBy,
		}); err != nil {
			return nil, fmt.Errorf("gagal generate invoice registrasi: %w", err)
		}

		// Bulanan (dari start_date sampai akhir TA)
		if err := s.invoiceGen.GenerateMonthlyRange(
			studentID, req.AcademicYearID, req.ClassGroupID,
			level, gender, startDate, cg.AcademicYear.EndDate, createdBy,
		); err != nil {
			return nil, fmt.Errorf("gagal generate invoice bulanan: %w", err)
		}
	}

	// Init tabungan
	if s.savingsService != nil {
		_ = s.savingsService.InitForNewStudent(studentID, cg.Level, nil)
	}

	// Auto-enroll semua ekskul untuk level ini
	if s.seRepo != nil {
		s.autoEnrollExtracurriculars(studentID, req.AcademicYearID, startDate)
	}

	// Fetch result
	saved, err := s.enrollmentRepo.FindByID(enrollment.ID)
	if err != nil {
		return nil, fmt.Errorf("gagal mengambil data enrollment: %w", err)
	}

	return mapEnrollmentToDetailResponse(*saved), nil
}

// autoEnrollExtracurriculars looks up all extracurriculars for this student's level
// and auto-creates StudentExtracurricular enrollments for ones that have fee config items
// matching the student's level and gender.
func (s *studentEnrollmentService) autoEnrollExtracurriculars(studentID, academicYearID uint, startDate time.Time) {
	extracurriculars, err := s.extracurricularRepo.FindAll(dto.ExtracurricularQueryParams{})
	if err != nil {
		return
	}
	for _, ex := range extracurriculars {
		existing, _ := s.seRepo.FindActiveByStudentAndExtracurricular(studentID, ex.ID, academicYearID)
		if existing != nil {
			continue
		}
		se := &model.StudentExtracurricular{
			StudentID:         studentID,
			ExtracurricularID: ex.ID,
			AcademicYearID:    academicYearID,
			StartDate:         startDate,
		}
		_ = s.seRepo.Create(se)
	}
}
