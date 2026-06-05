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
	PreviewPromotion(req dto.PromotionRequest) (*dto.PromotionPreviewResult, error)
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

func (s *academicEventService) PreviewPromotion(req dto.PromotionRequest) (*dto.PromotionPreviewResult, error) {
	if req.FromAcademicYearID == req.ToAcademicYearID {
		return nil, errors.New("Tahun ajaran asal dan tujuan tidak boleh sama")
	}

	_, err := s.academicYearRepo.FindByID(req.ToAcademicYearID)
	if err != nil {
		return nil, errors.New("Tahun ajaran tujuan tidak ditemukan")
	}

	enrollments, err := s.enrollmentRepo.FindAllActiveByAcademicYear(req.FromAcademicYearID)
	if err != nil {
		return nil, err
	}

	targetClassGroups, err := s.classGroupRepo.FindAll(dto.ClassGroupQueryParams{AcademicYearID: req.ToAcademicYearID})
	if err != nil {
		return nil, err
	}

	targetCGByID := make(map[uint]*model.ClassGroup)
	for i := range targetClassGroups {
		targetCGByID[targetClassGroups[i].ID] = &targetClassGroups[i]
	}

	explicitMapping := make(map[uint]*model.ClassGroup)
	for _, m := range req.Mappings {
		if tCG, ok := targetCGByID[m.ToClassGroupID]; ok {
			explicitMapping[m.FromClassGroupID] = tCG
		}
	}

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

	result := &dto.PromotionPreviewResult{
		Students: []dto.PromotionPreviewStudent{},
		Errors:   []dto.EventError{},
	}

	for _, enrollment := range enrollments {
		studentLevel := enrollment.ClassGroup.Level
		isRetained := retainedMap[enrollment.StudentID]

		if !isRetained && studentLevel == "berlian" {
			result.Students = append(result.Students, dto.PromotionPreviewStudent{
				StudentID:   enrollment.StudentID,
				StudentName: enrollment.Student.FullName,
				FromClass:   enrollment.ClassGroup.Name,
				ToClass:     "-",
				Action:      "skipped_berlian",
			})
			result.Skipped++
			continue
		}

		var newLevel string
		var action string
		if isRetained {
			newLevel = studentLevel
			action = "retained"
		} else {
			if studentLevel == "mutiara" {
				newLevel = "intan"
			} else if studentLevel == "intan" {
				newLevel = "berlian"
			}
			action = "promotion"
		}

		exists, _ := s.enrollmentRepo.ExistsByStudentAndYear(enrollment.StudentID, req.ToAcademicYearID)
		if exists {
			result.Errors = append(result.Errors, dto.EventError{
				StudentID:   enrollment.StudentID,
				StudentName: enrollment.Student.FullName,
				Message:     "Sudah diproses untuk tahun ajaran tujuan",
			})
			continue
		}

		targetCG := explicitMapping[enrollment.ClassGroupID]
		if targetCG == nil {
			targetCG = firstClassGroupByLevel[newLevel]
		}

		toClassName := "(tidak ada rombel " + newLevel + ")"
		if targetCG != nil {
			toClassName = targetCG.Name
		} else {
			result.Errors = append(result.Errors, dto.EventError{
				StudentID:   enrollment.StudentID,
				StudentName: enrollment.Student.FullName,
				Message:     "Tidak ada rombel " + newLevel + " di tahun ajaran tujuan",
			})
		}

		result.Students = append(result.Students, dto.PromotionPreviewStudent{
			StudentID:   enrollment.StudentID,
			StudentName: enrollment.Student.FullName,
			FromClass:   enrollment.ClassGroup.Name,
			ToClass:     toClassName,
			Action:      action,
		})

		if action == "retained" {
			result.ToRetain++
		} else {
			result.ToPromote++
		}
	}

	result.TotalStudents = len(enrollments)
	return result, nil
}

func (s *academicEventService) ProcessPromotion(createdBy uint, req dto.PromotionRequest) (*dto.PromotionResult, error) {
	if req.FromAcademicYearID == req.ToAcademicYearID {
		return nil, errors.New("Tahun ajaran asal dan tujuan tidak boleh sama")
	}

	_, err := s.academicYearRepo.FindByID(req.ToAcademicYearID)
	if err != nil {
		return nil, errors.New("Tahun ajaran tujuan tidak ditemukan")
	}

	eventDate, err := utility.ParseDate( req.EventDate)
	if err != nil {
		return nil, fmt.Errorf("Format event_date tidak valid (gunakan YYYY-MM-DD): %s", req.EventDate)
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

		// Pre-fetch all class groups for target academic year
		targetClassGroups, err := s.classGroupRepo.WithTx(tx).FindAll(dto.ClassGroupQueryParams{AcademicYearID: req.ToAcademicYearID})
		if err != nil {
			return err
		}

		// Build target class group lookup by ID
		targetCGByID := make(map[uint]*model.ClassGroup)
		for i := range targetClassGroups {
			targetCGByID[targetClassGroups[i].ID] = &targetClassGroups[i]
		}

		// Build explicit mapping: source class group ID → target class group
		explicitMapping := make(map[uint]*model.ClassGroup)
		for _, m := range req.Mappings {
			tCG, ok := targetCGByID[m.ToClassGroupID]
			if !ok {
				return fmt.Errorf("Rombel tujuan ID %d tidak ditemukan di tahun ajaran tujuan", m.ToClassGroupID)
			}
			explicitMapping[m.FromClassGroupID] = tCG
		}

		// Fallback: first class group per level (used when no explicit mapping)
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

			// Prefer explicit mapping, fall back to first class group per level
			targetCG := explicitMapping[enrollment.ClassGroupID]
			if targetCG == nil {
				targetCG = firstClassGroupByLevel[newLevel]
			}
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
				CreatedBy:      createdBy,
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
				if err := s.invoiceGen.GenerateRegistration(dto.GenerateRegistrationInvoiceParams{
					StudentID:      enrollment.StudentID,
					AcademicYearID: req.ToAcademicYearID,
					Level:          newLevel,
					Gender:         enrollment.Student.Gender,
					CreatedBy:      createdBy,
				}); err != nil {
					result.Errors = append(result.Errors, dto.EventError{
						StudentID:   enrollment.StudentID,
						StudentName: enrollment.Student.FullName,
						Message:     fmt.Sprintf("Gagal generate invoice registrasi: %v", err),
					})
				}
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

	eventDate, err := utility.ParseDate( req.EventDate)
	if err != nil {
		return nil, fmt.Errorf("Format event_date tidak valid (gunakan YYYY-MM-DD): %s", req.EventDate)
	}

	result := &dto.GraduationResult{
		Results: []dto.GraduationStudentResult{},
	}

	err = s.db.Transaction(func(tx *gorm.DB) error {
		for _, studentID := range req.StudentIDs {
			studentResult, err := s.processOneGraduation(tx, studentID, req.AcademicYearID, eventDate, req.Notes, createdBy)
			if err != nil {
				result.Errors = append(result.Errors, dto.EventError{
					StudentID: studentID,
					Message:   err.Error(),
				})
				continue
			}
			result.Results = append(result.Results, *studentResult)
			result.Total++
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	return result, nil
}

func (s *academicEventService) processOneGraduation(tx *gorm.DB, studentID, academicYearID uint, eventDate time.Time, notes string, createdBy uint) (*dto.GraduationStudentResult, error) {
	txStudentRepo := s.studentRepo.WithTx(tx)
	txEnrollmentRepo := s.enrollmentRepo.WithTx(tx)
	txEventRepo := s.academicEventRepo.WithTx(tx)

	student, err := txStudentRepo.FindByID(studentID)
	if err != nil || student.Status != "active" {
		return nil, errors.New("Siswa tidak ditemukan atau tidak aktif")
	}

	activeEnrollment, err := txEnrollmentRepo.FindActiveByStudentID(studentID)
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

		if err := s.savingsManager.DebitMandatory(studentID, mandatoryBalance, "graduation", invoice.ID, createdBy); err != nil {
			return nil, fmt.Errorf("gagal debit tabungan wajib: %w", err)
		}
		if err := s.invoiceCreator.FullyPayInvoice(invoice.ID, graduationAmount); err != nil {
			return nil, fmt.Errorf("gagal melunasi invoice kelulusan: %w", err)
		}

		if surplus > 0 {
			if err := s.savingsManager.CreditGeneral(studentID, surplus, "graduation_surplus", invoice.ID, createdBy); err != nil {
				return nil, fmt.Errorf("gagal credit surplus ke tabungan umum: %w", err)
			}
		}
	} else {
		mandatorySavingsUsed = mandatoryBalance
		remainingDebt = graduationAmount - mandatoryBalance

		if mandatoryBalance > 0 {
			if err := s.savingsManager.DebitMandatory(studentID, mandatoryBalance, "graduation", invoice.ID, createdBy); err != nil {
				return nil, fmt.Errorf("gagal debit tabungan wajib: %w", err)
			}
			if err := s.invoiceCreator.PartialPayInvoice(invoice.ID, mandatoryBalance); err != nil {
				return nil, fmt.Errorf("gagal partial pay invoice kelulusan: %w", err)
			}
		}
	}

	if err := txEnrollmentRepo.CloseEnrollment(activeEnrollment.ID, eventDate, "completed"); err != nil {
		return nil, err
	}

	if err := txStudentRepo.UpdateStatus(studentID, "graduated"); err != nil {
		return nil, err
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
	if err := txEventRepo.Create(event); err != nil {
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

	eventDate, err := utility.ParseDate( req.EventDate)
	if err != nil {
		return fmt.Errorf("Format event_date tidak valid (gunakan YYYY-MM-DD): %s", req.EventDate)
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

		if err := txEnrollmentRepo.CloseEnrollment(activeEnrollment.ID, eventDate, "completed"); err != nil {
			return err
		}

		newEnrollment := &model.StudentEnrollment{
			StudentID:      req.StudentID,
			ClassGroupID:   toCG.ID,
			AcademicYearID: activeEnrollment.AcademicYearID,
			EnrollmentType: "class_change",
			StartDate:      eventDate,
			Status:         "active",
			CreatedBy:      createdBy,
		}
		if err := txEnrollmentRepo.Create(newEnrollment); err != nil {
			return err
		}

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

	startDate, err := utility.ParseDate( req.StartDate)
	if err != nil {
		return fmt.Errorf("Format start_date tidak valid (gunakan YYYY-MM-DD): %s", req.StartDate)
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

		newEnrollment := &model.StudentEnrollment{
			StudentID:      req.StudentID,
			ClassGroupID:   req.ToClassGroupID,
			AcademicYearID: req.AcademicYearID,
			EnrollmentType: "mutation",
			StartDate:      startDate,
			Status:         "active",
			CreatedBy:      createdBy,
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
			if err := s.invoiceGen.GenerateInitial(dto.GenerateInitialInvoiceParams{
				StudentID:      req.StudentID,
				AcademicYearID: req.AcademicYearID,
				Level:          level,
				Gender:         gender,
				CreatedBy:      createdBy,
			}); err != nil {
				return fmt.Errorf("gagal generate invoice biaya awal: %w", err)
			}

			// 2. Registrasi Tahunan
			if err := s.invoiceGen.GenerateRegistration(dto.GenerateRegistrationInvoiceParams{
				StudentID:      req.StudentID,
				AcademicYearID: req.AcademicYearID,
				Level:          level,
				Gender:         gender,
				CreatedBy:      createdBy,
			}); err != nil {
				return fmt.Errorf("gagal generate invoice registrasi: %w", err)
			}

			// 3. Tagihan Bulanan mulai dari bulan masuk sampai akhir tahun ajaran
			ay, ayErr := s.academicYearRepo.FindByID(req.AcademicYearID)
			if ayErr != nil {
				return fmt.Errorf("gagal mengambil data tahun ajaran: %w", ayErr)
			}
			if err := s.invoiceGen.GenerateMonthlyRange(
				req.StudentID, req.AcademicYearID, req.ToClassGroupID,
				level, gender,
				startDate, ay.EndDate,
				createdBy,
			); err != nil {
				return fmt.Errorf("gagal generate invoice bulanan: %w", err)
			}
		}

		return nil
	})
}

func (s *academicEventService) ProcessWithdrawal(createdBy uint, req dto.WithdrawalRequest) error {
	eventDate, err := utility.ParseDate( req.EventDate)
	if err != nil {
		return fmt.Errorf("Format event_date tidak valid (gunakan YYYY-MM-DD): %s", req.EventDate)
	}

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

		if err := txEnrollmentRepo.CloseEnrollment(activeEnrollment.ID, eventDate, "dropped"); err != nil {
			return err
		}

		newStatus := "transferred"
		if req.EventType == "dropout" {
			newStatus = "dropped"
		}
		if err := txStudentRepo.UpdateStatus(req.StudentID, newStatus); err != nil {
			return err
		}

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

		if err := tx.Model(&model.Invoice{}).
			Where("student_id = ? AND status != ?", req.StudentID, "paid").
			Update("notes", "[DIBEKUKAN] Tagihan dibekukan karena siswa keluar/pindah").Error; err != nil {
			return fmt.Errorf("gagal membekukan tagihan: %w", err)
		}

		return nil
	})
}
