package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"errors"
	"time"

	"gorm.io/gorm"
)

// Interface lokal — akan di-fulfill oleh implementasi Batch 5
type InvoiceCreator interface {
	CreateGraduationInvoice(studentID, academicYearID uint, amount float64, createdBy uint) (uint, error)
	FullyPayInvoice(invoiceID uint, amount float64) error
	PartialPayInvoice(invoiceID uint, amount float64) error
}

type SavingsManager interface {
	GetMandatoryBalance(studentID uint) (float64, error)
	DebitMandatory(studentID uint, amount float64, sourceType string, sourceID uint, createdBy uint) error
	CreditGeneral(studentID uint, amount float64, sourceType string, sourceID uint, createdBy uint) error
}

type AcademicEventService interface {
	ProcessPromotion(createdBy uint, req dto.PromotionRequest) (*dto.PromotionResult, error)
	ProcessGraduation(createdBy uint, req dto.GraduationRequest) (*dto.GraduationResult, error)
	ProcessClassChange(createdBy uint, req dto.ClassChangeRequest) error
	ProcessTransferIn(createdBy uint, req dto.TransferInRequest) error
	ProcessWithdrawal(createdBy uint, req dto.WithdrawalRequest) error
}

type academicEventService struct {
	db                *gorm.DB
	enrollmentRepo    repository.StudentEnrollmentRepository
	studentRepo       repository.StudentRepository
	academicEventRepo repository.StudentAcademicEventRepository
	classGroupRepo    repository.ClassGroupRepository
	academicYearRepo  repository.AcademicYearRepository

	// Batch 5 Dependencies
	invoiceCreator InvoiceCreator
	savingsManager SavingsManager
	invoiceGen     InvoiceGenerateService
}

func NewAcademicEventService(
	db *gorm.DB,
	enrollmentRepo repository.StudentEnrollmentRepository,
	studentRepo repository.StudentRepository,
	academicEventRepo repository.StudentAcademicEventRepository,
	classGroupRepo repository.ClassGroupRepository,
	academicYearRepo repository.AcademicYearRepository,
	invoiceCreator InvoiceCreator,
	savingsManager SavingsManager,
	invoiceGen InvoiceGenerateService,
) AcademicEventService {
	return &academicEventService{
		db:                db,
		enrollmentRepo:    enrollmentRepo,
		studentRepo:       studentRepo,
		academicEventRepo: academicEventRepo,
		classGroupRepo:    classGroupRepo,
		academicYearRepo:  academicYearRepo,
		invoiceCreator:    invoiceCreator,
		savingsManager:    savingsManager,
		invoiceGen:        invoiceGen,
	}
}

func (s *academicEventService) ProcessPromotion(createdBy uint, req dto.PromotionRequest) (*dto.PromotionResult, error) {
	if req.FromAcademicYearID == req.ToAcademicYearID {
		return nil, errors.New("Tahun ajaran asal dan tujuan tidak boleh sama")
	}

	_, err := s.academicYearRepo.FindByID(req.ToAcademicYearID)
	if err != nil {
		return nil, errors.New("Tahun ajaran tujuan tidak ditemukan")
	}

	result := &dto.PromotionResult{
		Errors: []dto.EventError{},
	}

	err = s.db.Transaction(func(tx *gorm.DB) error {
		txEnrollmentRepo := s.enrollmentRepo.WithTx(tx)
		txEventRepo := s.academicEventRepo.WithTx(tx)

		// Get all active enrollments from the source academic year
		enrollments, err := txEnrollmentRepo.FindAllActiveByAcademicYear(req.FromAcademicYearID)
		if err != nil {
			return err
		}

		// Pre-fetch all class groups for target academic year to find default assignments
		targetClassGroups, err := s.classGroupRepo.WithTx(tx).FindAll(dto.ClassGroupQueryParams{AcademicYearID: req.ToAcademicYearID})
		if err != nil {
			return err
		}

		// Map to quickly find first class group per level
		firstClassGroupByLevel := make(map[string]*model.ClassGroup)
		for i, cg := range targetClassGroups {
			if _, exists := firstClassGroupByLevel[cg.Level]; !exists {
				firstClassGroupByLevel[cg.Level] = &targetClassGroups[i]
			}
		}

		retainedMap := make(map[uint]bool)
		for _, id := range req.RetainedStudentIDs {
			retainedMap[id] = true
		}

		eventDate, _ := time.Parse("2006-01-02", req.EventDate)

		for _, enrollment := range enrollments {
			studentLevel := enrollment.ClassGroup.Level
			isRetained := retainedMap[enrollment.StudentID]

			var newLevel string
			var eventType string

			if isRetained {
				newLevel = studentLevel
				eventType = "retained"
			} else {
				if studentLevel == "mutiara" {
					newLevel = "intan"
				} else if studentLevel == "intan" {
					newLevel = "berlian"
				} else {
					// "berlian" students who are not retained must be processed via graduation
					continue
				}
				eventType = "promotion"
			}

			// Check if target enrollment already exists to prevent duplicate processing
			exists, _ := txEnrollmentRepo.ExistsByStudentAndYear(enrollment.StudentID, req.ToAcademicYearID)
			if exists {
				result.Errors = append(result.Errors, dto.EventError{
					StudentID:   enrollment.StudentID,
					StudentName: enrollment.Student.FullName,
					Message:     "Sudah diproses untuk tahun ajaran tujuan",
				})
				continue
			}

			targetCG := firstClassGroupByLevel[newLevel]
			if targetCG == nil {
				result.Errors = append(result.Errors, dto.EventError{
					StudentID:   enrollment.StudentID,
					StudentName: enrollment.Student.FullName,
					Message:     "Tidak ada rombel " + newLevel + " di tahun ajaran tujuan",
				})
				continue
			}

			// 1. Close old enrollment
			if err := txEnrollmentRepo.CloseEnrollment(enrollment.ID, eventDate, "completed"); err != nil {
				return err
			}

			// 2. Create new enrollment
			newEnrollment := &model.StudentEnrollment{
				StudentID:      enrollment.StudentID,
				ClassGroupID:   targetCG.ID,
				AcademicYearID: req.ToAcademicYearID,
				EnrollmentType: eventType,
				StartDate:      eventDate,
				Status:         "active",
				Notes:          "Auto-assigned saat kenaikan kelas. Mohon sesuaikan via pindah rombel.",
			}
			if err := txEnrollmentRepo.Create(newEnrollment); err != nil {
				return err
			}

			// 3. Log event
			event := &model.StudentAcademicEvent{
				StudentID:        enrollment.StudentID,
				AcademicYearID:   req.FromAcademicYearID,
				FromClassGroupID: &enrollment.ClassGroupID,
				ToClassGroupID:   &targetCG.ID,
				EventType:        eventType,
				EventDate:        eventDate,
				Notes:            req.Notes,
				CreatedBy:        createdBy,
			}
			if err := txEventRepo.Create(event); err != nil {
				return err
			}

			if isRetained {
				result.Retained++
			} else {
				result.Promoted++
			}

			// Generate tagihan registrasi tahunan untuk tahun ajaran baru
			if s.invoiceGen != nil {
				_ = s.invoiceGen.GenerateRegistration(dto.GenerateRegistrationInvoiceParams{
					StudentID:      enrollment.StudentID,
					AcademicYearID: req.ToAcademicYearID,
					Level:          newLevel,
					Gender:         enrollment.Student.Gender,
					CreatedBy:      createdBy,
				})
			}
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return result, nil
}

func (s *academicEventService) ProcessGraduation(createdBy uint, req dto.GraduationRequest) (*dto.GraduationResult, error) {
	if s.invoiceCreator == nil || s.savingsManager == nil {
		return nil, errors.New("Fitur kelulusan belum dikonfigurasi")
	}

	_, err := s.academicYearRepo.FindByID(req.AcademicYearID)
	if err != nil {
		return nil, errors.New("Tahun ajaran tidak ditemukan")
	}

	eventDate, _ := time.Parse("2006-01-02", req.EventDate)

	result := &dto.GraduationResult{
		Results: []dto.GraduationStudentResult{},
	}

	for _, studentID := range req.StudentIDs {
		studentResult, err := s.processOneGraduation(studentID, req.AcademicYearID, eventDate, req.Notes, createdBy)
		if err != nil {
			continue
		}
		result.Results = append(result.Results, *studentResult)
		result.Total++
	}

	return result, nil
}

func (s *academicEventService) processOneGraduation(studentID, academicYearID uint, eventDate time.Time, notes string, createdBy uint) (*dto.GraduationStudentResult, error) {
	student, err := s.studentRepo.FindByID(studentID)
	if err != nil || student.Status != "active" {
		return nil, errors.New("Siswa tidak ditemukan atau tidak aktif")
	}

	activeEnrollment, err := s.enrollmentRepo.FindActiveByStudentID(studentID)
	if err != nil {
		return nil, errors.New("Siswa tidak memiliki pendaftaran aktif")
	}

	if activeEnrollment.ClassGroup.Level != "berlian" {
		return nil, errors.New("Kelulusan hanya untuk siswa level berlian")
	}

	invoice, err := s.invoiceGen.GenerateGraduation(dto.GenerateGraduationInvoiceParams{
		StudentID:      studentID,
		AcademicYearID: academicYearID,
		CreatedBy:      createdBy,
	})
	if err != nil {
		return nil, err
	}

	graduationAmount := invoice.TotalAmount
	mandatoryBalance, _ := s.savingsManager.GetMandatoryBalance(studentID)

	var mandatorySavingsUsed, remainingDebt, surplus float64

	if mandatoryBalance >= graduationAmount {
		mandatorySavingsUsed = graduationAmount
		surplus = mandatoryBalance - graduationAmount

		s.savingsManager.DebitMandatory(studentID, mandatoryBalance, "graduation", invoice.ID, createdBy)
		s.invoiceCreator.FullyPayInvoice(invoice.ID, graduationAmount)

		if surplus > 0 {
			s.savingsManager.CreditGeneral(studentID, surplus, "graduation_surplus", invoice.ID, createdBy)
		}
	} else {
		mandatorySavingsUsed = mandatoryBalance
		remainingDebt = graduationAmount - mandatoryBalance

		if mandatoryBalance > 0 {
			s.savingsManager.DebitMandatory(studentID, mandatoryBalance, "graduation", invoice.ID, createdBy)
			s.invoiceCreator.PartialPayInvoice(invoice.ID, mandatoryBalance)
		}
	}

	err = s.db.Transaction(func(tx *gorm.DB) error {
		txEnrollmentRepo := s.enrollmentRepo.WithTx(tx)
		txStudentRepo := s.studentRepo.WithTx(tx)
		txEventRepo := s.academicEventRepo.WithTx(tx)

		if err := txEnrollmentRepo.CloseEnrollment(activeEnrollment.ID, eventDate, "completed"); err != nil {
			return err
		}

		if err := txStudentRepo.UpdateStatus(studentID, "graduated"); err != nil {
			return err
		}

		event := &model.StudentAcademicEvent{
			StudentID:        studentID,
			AcademicYearID:   academicYearID,
			FromClassGroupID: &activeEnrollment.ClassGroupID,
			ToClassGroupID:   nil,
			EventType:        "graduation",
			EventDate:        eventDate,
			Notes:            notes,
			CreatedBy:        createdBy,
		}
		return txEventRepo.Create(event)
	})

	if err != nil {
		return nil, err
	}

	return &dto.GraduationStudentResult{
		StudentID:                studentID,
		StudentName:              student.FullName,
		GraduationInvoiceID:      invoice.ID,
		GraduationAmount:         graduationAmount,
		MandatorySavingsUsed:     mandatorySavingsUsed,
		RemainingDebt:            remainingDebt,
		SurplusReturnedToGeneral: surplus,
	}, nil
}

func (s *academicEventService) ProcessClassChange(createdBy uint, req dto.ClassChangeRequest) error {
	if req.FromClassGroupID == req.ToClassGroupID {
		return errors.New("Rombel asal dan tujuan tidak boleh sama")
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		txEnrollmentRepo := s.enrollmentRepo.WithTx(tx)
		txEventRepo := s.academicEventRepo.WithTx(tx)

		student, err := s.studentRepo.WithTx(tx).FindByID(req.StudentID)
		if err != nil || student.Status != "active" {
			return errors.New("Siswa tidak ditemukan atau tidak aktif")
		}

		fromCG, err := s.classGroupRepo.WithTx(tx).FindByID(req.FromClassGroupID)
		if err != nil {
			return errors.New("Rombel asal tidak ditemukan")
		}

		toCG, err := s.classGroupRepo.WithTx(tx).FindByID(req.ToClassGroupID)
		if err != nil {
			return errors.New("Rombel tujuan tidak ditemukan")
		}

		if fromCG.Level != toCG.Level {
			return errors.New("Pindah rombel hanya diperbolehkan pada level yang sama")
		}

		activeEnrollment, err := txEnrollmentRepo.FindActiveByStudentID(req.StudentID)
		if err != nil || activeEnrollment.ClassGroupID != req.FromClassGroupID {
			return errors.New("Siswa tidak terdaftar aktif di rombel asal")
		}

		eventDate, _ := time.Parse("2006-01-02", req.EventDate)

		// 1. Close old enrollment
		if err := txEnrollmentRepo.CloseEnrollment(activeEnrollment.ID, eventDate, "completed"); err != nil {
			return err
		}

		// 2. Create new enrollment
		newEnrollment := &model.StudentEnrollment{
			StudentID:      req.StudentID,
			ClassGroupID:   toCG.ID,
			AcademicYearID: activeEnrollment.AcademicYearID,
			EnrollmentType: "class_change",
			StartDate:      eventDate,
			Status:         "active",
		}
		if err := txEnrollmentRepo.Create(newEnrollment); err != nil {
			return err
		}

		// 3. Log event
		event := &model.StudentAcademicEvent{
			StudentID:        req.StudentID,
			AcademicYearID:   activeEnrollment.AcademicYearID,
			FromClassGroupID: &fromCG.ID,
			ToClassGroupID:   &toCG.ID,
			EventType:        "class_change",
			EventDate:        eventDate,
			Notes:            req.Notes,
			CreatedBy:        createdBy,
		}
		return txEventRepo.Create(event)
	})
}

func (s *academicEventService) ProcessTransferIn(createdBy uint, req dto.TransferInRequest) error {
	classGroup, err := s.classGroupRepo.FindByID(req.ToClassGroupID)
	if err != nil {
		return errors.New("Rombel tujuan tidak ditemukan")
	}

	if classGroup.Level != "intan" {
		return errors.New("Mutasi hanya diperbolehkan ke jenjang intan")
	}
	if classGroup.Name != "Intan 1" && classGroup.Name != "Intan 8" {
		return errors.New("Mutasi hanya diperbolehkan ke Intan 1 atau Intan 8")
	}

	_, err = s.academicYearRepo.FindByID(req.AcademicYearID)
	if err != nil {
		return errors.New("Tahun ajaran tidak ditemukan")
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		txEnrollmentRepo := s.enrollmentRepo.WithTx(tx)
		txStudentRepo := s.studentRepo.WithTx(tx)
		txEventRepo := s.academicEventRepo.WithTx(tx)

		student, err := txStudentRepo.FindByID(req.StudentID)
		if err != nil {
			return errors.New("Siswa tidak ditemukan")
		}

		exists, _ := txEnrollmentRepo.ExistsByStudentAndYear(req.StudentID, req.AcademicYearID)
		if exists {
			return errors.New("Siswa sudah memiliki enrollment di tahun ajaran ini")
		}

		startDate, _ := time.Parse("2006-01-02", req.StartDate)

		newEnrollment := &model.StudentEnrollment{
			StudentID:      req.StudentID,
			ClassGroupID:   req.ToClassGroupID,
			AcademicYearID: req.AcademicYearID,
			EnrollmentType: "mutation",
			StartDate:      startDate,
			Status:         "active",
		}
		if err := txEnrollmentRepo.Create(newEnrollment); err != nil {
			return err
		}

		if student.Status != "active" {
			if err := txStudentRepo.UpdateStatus(student.ID, "active"); err != nil {
				return err
			}
		}

		event := &model.StudentAcademicEvent{
			StudentID:        req.StudentID,
			AcademicYearID:   req.AcademicYearID,
			FromClassGroupID: nil,
			ToClassGroupID:   &req.ToClassGroupID,
			EventType:        "transfer_in",
			EventDate:        startDate,
			Notes:            req.Notes,
			CreatedBy:        createdBy,
		}
		if err := txEventRepo.Create(event); err != nil {
			return err
		}

		// Generate tagihan untuk siswa mutasi masuk
		if s.invoiceGen != nil {
			level := classGroup.Level
			gender := student.Gender

			// 1. Biaya Awal (initial)
			_ = s.invoiceGen.GenerateInitial(dto.GenerateInitialInvoiceParams{
				StudentID:      req.StudentID,
				AcademicYearID: req.AcademicYearID,
				Level:          level,
				Gender:         gender,
				CreatedBy:      createdBy,
			})

			// 2. Registrasi Tahunan
			_ = s.invoiceGen.GenerateRegistration(dto.GenerateRegistrationInvoiceParams{
				StudentID:      req.StudentID,
				AcademicYearID: req.AcademicYearID,
				Level:          level,
				Gender:         gender,
				CreatedBy:      createdBy,
			})

			// 3. Tagihan Bulanan mulai dari bulan masuk sampai akhir tahun ajaran
			ay, ayErr := s.academicYearRepo.FindByID(req.AcademicYearID)
			if ayErr == nil {
				_ = s.invoiceGen.GenerateMonthlyRange(
					req.StudentID, req.AcademicYearID, req.ToClassGroupID,
					level, gender,
					startDate, ay.EndDate,
					createdBy,
				)
			}
		}

		return nil
	})
}

func (s *academicEventService) ProcessWithdrawal(createdBy uint, req dto.WithdrawalRequest) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		txEnrollmentRepo := s.enrollmentRepo.WithTx(tx)
		txStudentRepo := s.studentRepo.WithTx(tx)
		txEventRepo := s.academicEventRepo.WithTx(tx)

		student, err := txStudentRepo.FindByID(req.StudentID)
		if err != nil || student.Status != "active" {
			return errors.New("Siswa tidak ditemukan atau tidak aktif")
		}

		activeEnrollment, err := txEnrollmentRepo.FindActiveByStudentID(req.StudentID)
		if err != nil {
			return errors.New("Siswa tidak memiliki pendaftaran aktif")
		}

		eventDate, _ := time.Parse("2006-01-02", req.EventDate)

		// 1. Close enrollment
		if err := txEnrollmentRepo.CloseEnrollment(activeEnrollment.ID, eventDate, "dropped"); err != nil {
			return err
		}

		// 2. Update student status
		newStatus := "transferred"
		if req.EventType == "dropout" {
			newStatus = "dropped"
		}
		if err := txStudentRepo.UpdateStatus(req.StudentID, newStatus); err != nil {
			return err
		}

		// 3. Log event
		event := &model.StudentAcademicEvent{
			StudentID:        req.StudentID,
			AcademicYearID:   activeEnrollment.AcademicYearID,
			FromClassGroupID: &activeEnrollment.ClassGroupID,
			ToClassGroupID:   nil,
			EventType:        req.EventType,
			EventDate:        eventDate,
			Notes:            req.Notes,
			CreatedBy:        createdBy,
		}
		if err := txEventRepo.Create(event); err != nil {
			return err
		}

		tx.Model(&model.Invoice{}).
			Where("student_id = ? AND status != ?", req.StudentID, "paid").
			Update("notes", "[DIBEKUKAN] Tagihan dibekukan karena siswa keluar/pindah")

		return nil
	})
}
