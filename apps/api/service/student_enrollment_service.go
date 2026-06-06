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
	db                  *gorm.DB
	enrollmentRepo      repository.StudentEnrollmentRepository
	studentRepo         repository.StudentRepository
	classGroupRepo      repository.ClassGroupRepository
	extracurricularRepo repository.ExtracurricularRepository
	seRepo              repository.StudentExtracurricularRepository
	feeConfigRepo       repository.FeeConfigRepository
	feeConfigItemRepo   repository.FeeConfigItemRepository
	invoiceGen          InvoiceGenerateService
	savingsService      SavingsService
}

func NewStudentEnrollmentService(
	db *gorm.DB,
	enrollmentRepo repository.StudentEnrollmentRepository,
	studentRepo repository.StudentRepository,
	classGroupRepo repository.ClassGroupRepository,
	extracurricularRepo repository.ExtracurricularRepository,
	seRepo repository.StudentExtracurricularRepository,
	feeConfigRepo repository.FeeConfigRepository,
	feeConfigItemRepo repository.FeeConfigItemRepository,
	invoiceGen InvoiceGenerateService,
	savingsService SavingsService,
) StudentEnrollmentService {
	return &studentEnrollmentService{
		db:                  db,
		enrollmentRepo:      enrollmentRepo,
		studentRepo:         studentRepo,
		classGroupRepo:      classGroupRepo,
		extracurricularRepo: extracurricularRepo,
		seRepo:              seRepo,
		feeConfigRepo:       feeConfigRepo,
		feeConfigItemRepo:   feeConfigItemRepo,
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

	level := cg.Level
	gender := student.Gender

	// Semua operasi dalam SATU transaksi: enrollment, tabungan, auto-enroll ekskul,
	// dan generate invoice. Jika ada satu langkah gagal, semuanya rollback sehingga
	// siswa tidak akan muncul di rombel tanpa tagihan yang lengkap.
	var enrollmentID uint
	txErr := s.db.Transaction(func(tx *gorm.DB) error {
		enrollment := &model.StudentEnrollment{
			StudentID:      studentID,
			ClassGroupID:   req.ClassGroupID,
			AcademicYearID: req.AcademicYearID,
			EnrollmentType: enrollmentType,
			StartDate:      startDate,
			Status:         "active",
			CreatedBy:      createdBy,
		}
		if err := s.enrollmentRepo.WithTx(tx).Create(enrollment); err != nil {
			return fmt.Errorf("gagal membuat enrollment: %w", err)
		}
		enrollmentID = enrollment.ID

		// Init tabungan
		if s.savingsService != nil {
			if err := s.savingsService.InitForNewStudent(studentID, level, tx); err != nil {
				return fmt.Errorf("gagal inisialisasi tabungan: %w", err)
			}
		}

		// Auto-enroll ekskul wajib sesuai jenjang
		if s.seRepo != nil {
			if err := s.autoEnrollExtracurriculars(tx, studentID, req.AcademicYearID, level, gender, startDate); err != nil {
				return fmt.Errorf("gagal mendaftarkan ekskul wajib: %w", err)
			}
		}

		// Generate invoice (berjalan sebagai savepoint di dalam transaksi ini)
		if s.invoiceGen != nil {
			ig := s.invoiceGen.WithTx(tx)
			if err := ig.GenerateInitial(dto.GenerateInitialInvoiceParams{
				StudentID: studentID, AcademicYearID: req.AcademicYearID,
				Level: level, Gender: gender, CreatedBy: createdBy,
			}); err != nil {
				return fmt.Errorf("gagal generate invoice biaya awal: %w", err)
			}

			if err := ig.GenerateRegistration(dto.GenerateRegistrationInvoiceParams{
				StudentID: studentID, AcademicYearID: req.AcademicYearID,
				Level: level, Gender: gender, CreatedBy: createdBy,
			}); err != nil {
				return fmt.Errorf("gagal generate invoice registrasi: %w", err)
			}

			if err := ig.GenerateMonthlyRange(
				studentID, req.AcademicYearID, req.ClassGroupID,
				level, gender, startDate, cg.AcademicYear.EndDate, createdBy,
			); err != nil {
				return fmt.Errorf("gagal generate invoice bulanan: %w", err)
			}
		}
		return nil
	})
	if txErr != nil {
		return nil, txErr
	}

	// Fetch result
	saved, err := s.enrollmentRepo.FindByID(enrollmentID)
	if err != nil {
		return nil, fmt.Errorf("gagal mengambil data enrollment: %w", err)
	}

	return mapEnrollmentToDetailResponse(*saved), nil
}

// autoEnrollExtracurriculars mendaftarkan siswa ke ekskul wajib (is_mandatory=true di
// fee config) sesuai jenjang & gender. Berjalan di dalam tx agar atomik dengan enrollment.
func (s *studentEnrollmentService) autoEnrollExtracurriculars(tx *gorm.DB, studentID, academicYearID uint, level, gender string, startDate time.Time) error {
	if s.feeConfigRepo == nil || s.feeConfigItemRepo == nil {
		return nil
	}

	fc, err := s.feeConfigRepo.FindByAcademicYearID(academicYearID)
	if err != nil {
		return nil
	}

	mandatoryItems, err := s.feeConfigItemRepo.FindMandatoryByStudent(fc.ID, level, gender)
	if err != nil || len(mandatoryItems) == 0 {
		return nil
	}

	mandatoryNames := make(map[string]bool)
	for _, item := range mandatoryItems {
		mandatoryNames[item.Name] = true
	}

	extracurriculars, err := s.extracurricularRepo.FindAll(dto.ExtracurricularQueryParams{})
	if err != nil {
		return nil
	}

	seRepo := s.seRepo.WithTx(tx)
	for _, ex := range extracurriculars {
		if !mandatoryNames[ex.Name] {
			continue
		}
		existing, _ := seRepo.FindActiveByStudentAndExtracurricular(studentID, ex.ID, academicYearID)
		if existing != nil {
			continue
		}
		se := &model.StudentExtracurricular{
			StudentID:         studentID,
			ExtracurricularID: ex.ID,
			AcademicYearID:    academicYearID,
			StartDate:         startDate,
		}
		if err := seRepo.Create(se); err != nil {
			return err
		}
	}
	return nil
}
