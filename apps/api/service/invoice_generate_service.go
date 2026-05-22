package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"api/utility"
	"fmt"
	"time"

	"gorm.io/gorm"
)

type InvoiceGenerateService interface {
	GenerateInitial(params dto.GenerateInitialInvoiceParams) error
	GenerateRegistration(params dto.GenerateRegistrationInvoiceParams) error
	GenerateMonthly(params dto.GenerateMonthlyInvoiceParams) error
	GenerateGraduation(params dto.GenerateGraduationInvoiceParams) (*model.Invoice, error)
	RecalculateInfaqHarian(classGroupID, month, year uint) error
	AddExtracurricularToNextMonthly(studentID, extracurricularID, academicYearID uint) error
	RemoveExtracurricularFromNextMonthly(studentID, extracurricularID, academicYearID uint) error
}

type invoiceGenerateService struct {
	db                *gorm.DB
	invoiceRepo       repository.InvoiceRepository
	invoiceItemRepo   repository.InvoiceItemRepository
	feeConfigRepo     repository.FeeConfigRepository
	feeConfigItemRepo repository.FeeConfigItemRepository
	effectiveDayRepo  repository.EffectiveDayRepository
	enrollmentRepo    repository.StudentEnrollmentRepository
	extracurricularRepo repository.ExtracurricularRepository
	seRepo            repository.StudentExtracurricularRepository
}

func NewInvoiceGenerateService(
	db *gorm.DB,
	invoiceRepo repository.InvoiceRepository,
	invoiceItemRepo repository.InvoiceItemRepository,
	feeConfigRepo repository.FeeConfigRepository,
	feeConfigItemRepo repository.FeeConfigItemRepository,
	effectiveDayRepo repository.EffectiveDayRepository,
	enrollmentRepo repository.StudentEnrollmentRepository,
	extracurricularRepo repository.ExtracurricularRepository,
	seRepo repository.StudentExtracurricularRepository,
) InvoiceGenerateService {
	return &invoiceGenerateService{
		db:                  db,
		invoiceRepo:         invoiceRepo,
		invoiceItemRepo:     invoiceItemRepo,
		feeConfigRepo:       feeConfigRepo,
		feeConfigItemRepo:   feeConfigItemRepo,
		effectiveDayRepo:    effectiveDayRepo,
		enrollmentRepo:      enrollmentRepo,
		extracurricularRepo: extracurricularRepo,
		seRepo:              seRepo,
	}
}

func (s *invoiceGenerateService) GenerateInitial(params dto.GenerateInitialInvoiceParams) error {
	exists, _ := s.invoiceRepo.ExistsInitialByStudent(params.StudentID, params.AcademicYearID)
	if exists {
		return nil // idempotent
	}

	feeConfig, err := s.feeConfigRepo.FindByAcademicYearID(params.AcademicYearID)
	if err != nil {
		return fmt.Errorf("fee config tidak ditemukan untuk tahun ajaran ini")
	}

	items, err := s.feeConfigItemRepo.FindByStudentForCategory(feeConfig.ID, "initial", params.Level, params.Gender)
	if err != nil {
		return err
	}

	if len(items) == 0 {
		return nil // no initial fees configured
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		invoice := &model.Invoice{
			StudentID:      params.StudentID,
			AcademicYearID: params.AcademicYearID,
			Type:           "initial",
			Status:         "unpaid",
			TotalAmount:    utility.SumFeeConfigItems(items),
		}
		if err := s.invoiceRepo.WithTx(tx).Create(invoice); err != nil {
			return err
		}
		return s.invoiceItemRepo.WithTx(tx).BulkCreate(
			utility.MapFeeItemsToInvoiceItems(invoice.ID, items),
		)
	})
}

func (s *invoiceGenerateService) GenerateRegistration(params dto.GenerateRegistrationInvoiceParams) error {
	exists, _ := s.invoiceRepo.ExistsRegistrationByStudent(params.StudentID, params.AcademicYearID)
	if exists {
		return nil // idempotent
	}

	feeConfig, err := s.feeConfigRepo.FindByAcademicYearID(params.AcademicYearID)
	if err != nil {
		return fmt.Errorf("fee config tidak ditemukan untuk tahun ajaran ini")
	}

	items, err := s.feeConfigItemRepo.FindByStudentForCategory(feeConfig.ID, "registration", params.Level, params.Gender)
	if err != nil {
		return err
	}

	if len(items) == 0 {
		return nil
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		invoice := &model.Invoice{
			StudentID:      params.StudentID,
			AcademicYearID: params.AcademicYearID,
			Type:           "registration",
			Status:         "unpaid",
			TotalAmount:    utility.SumFeeConfigItems(items),
		}
		if err := s.invoiceRepo.WithTx(tx).Create(invoice); err != nil {
			return err
		}
		return s.invoiceItemRepo.WithTx(tx).BulkCreate(
			utility.MapFeeItemsToInvoiceItems(invoice.ID, items),
		)
	})
}

func (s *invoiceGenerateService) GenerateMonthly(params dto.GenerateMonthlyInvoiceParams) error {
	exists, _ := s.invoiceRepo.ExistsMonthlyByStudent(params.StudentID, params.Month, params.Year)
	if exists {
		return nil // idempotent
	}

	feeConfig, err := s.feeConfigRepo.FindByAcademicYearID(params.AcademicYearID)
	if err != nil {
		return fmt.Errorf("fee config tidak ditemukan")
	}

	effectiveDays, _ := s.effectiveDayRepo.FindByClassGroupMonthYear(
		params.ClassGroupID, params.Month, params.Year,
	)

	var invoiceItems []model.InvoiceItem

	// SPP
	sppItems, _ := s.feeConfigItemRepo.FindByStudentForCategory(feeConfig.ID, "monthly_spp", params.Level, params.Gender)
	for _, item := range sppItems {
		invoiceItems = append(invoiceItems, model.InvoiceItem{
			Name:        item.Name,
			Category:    item.Category,
			Amount:      item.Amount,
			IsMandatory: true,
		})
	}

	// Infaq harian
	infaqItems, _ := s.feeConfigItemRepo.FindByStudentForCategory(feeConfig.ID, "monthly_infaq", params.Level, params.Gender)
	for _, item := range infaqItems {
		amount := item.Amount
		notes := ""
		totalDays := uint(0)
		if effectiveDays != nil {
			totalDays = effectiveDays.TotalDays
			amount = item.Amount * float64(totalDays)
		} else {
			amount = 0
			notes = "Menunggu input hari efektif"
		}
		invoiceItems = append(invoiceItems, model.InvoiceItem{
			Name:        fmt.Sprintf("%s (%d hari)", item.Name, totalDays),
			Category:    item.Category,
			Amount:      amount,
			IsMandatory: true,
			Notes:       notes,
		})
	}

	// Pasta / Calisan / Ekskul
	for _, exID := range params.ExtracurricularIDs {
		ex, err := s.extracurricularRepo.FindByID(exID)
		if err != nil {
			continue
		}
		feeItems, _ := s.feeConfigItemRepo.FindByExtracurricular(feeConfig.ID, ex.Type, ex.Name)
		for _, feeItem := range feeItems {
			invoiceItems = append(invoiceItems, model.InvoiceItem{
				Name:        feeItem.Name,
				Category:    feeItem.Category,
				Amount:      feeItem.Amount,
				IsMandatory: true,
			})
		}
	}

	// Tabungan Wajib Berlian
	if params.Level == "berlian" {
		mandatoryItems, _ := s.feeConfigItemRepo.FindByStudentForCategory(feeConfig.ID, "savings_mandatory", params.Level, params.Gender)
		for _, item := range mandatoryItems {
			amount := float64(0)
			totalMondays := uint(0)
			if effectiveDays != nil {
				totalMondays = effectiveDays.TotalMondays
				amount = item.Amount * float64(totalMondays)
			}
			invoiceItems = append(invoiceItems, model.InvoiceItem{
				Name:        fmt.Sprintf("%s (%d Senin)", item.Name, totalMondays),
				Category:    "savings_mandatory",
				Amount:      amount,
				IsMandatory: true,
			})
		}
	}

	totalAmount := utility.SumInvoiceItems(invoiceItems)

	return s.db.Transaction(func(tx *gorm.DB) error {
		invoice := &model.Invoice{
			StudentID:      params.StudentID,
			AcademicYearID: params.AcademicYearID,
			Type:           "monthly",
			Month:          &params.Month,
			Year:           &params.Year,
			Status:         "unpaid",
			TotalAmount:    totalAmount,
		}
		if err := s.invoiceRepo.WithTx(tx).Create(invoice); err != nil {
			return err
		}
		for i := range invoiceItems {
			invoiceItems[i].InvoiceID = invoice.ID
		}
		return s.invoiceItemRepo.WithTx(tx).BulkCreate(invoiceItems)
	})
}

func (s *invoiceGenerateService) GenerateGraduation(params dto.GenerateGraduationInvoiceParams) (*model.Invoice, error) {
	feeConfig, err := s.feeConfigRepo.FindByAcademicYearID(params.AcademicYearID)
	if err != nil {
		return nil, fmt.Errorf("fee config tidak ditemukan untuk tahun ajaran ini")
	}

	items, _ := s.feeConfigItemRepo.FindByCategory(feeConfig.ID, "graduation")
	if len(items) == 0 {
		return nil, fmt.Errorf("tidak ada item tarif kelulusan di fee config")
	}

	totalAmount := utility.SumFeeConfigItems(items)

	var invoice *model.Invoice
	err = s.db.Transaction(func(tx *gorm.DB) error {
		invoice = &model.Invoice{
			StudentID:      params.StudentID,
			AcademicYearID: params.AcademicYearID,
			Type:           "graduation",
			Status:         "unpaid",
			TotalAmount:    totalAmount,
		}
		if err := s.invoiceRepo.WithTx(tx).Create(invoice); err != nil {
			return err
		}
		return s.invoiceItemRepo.WithTx(tx).BulkCreate(
			utility.MapFeeItemsToInvoiceItems(invoice.ID, items),
		)
	})

	return invoice, err
}

func (s *invoiceGenerateService) RecalculateInfaqHarian(classGroupID, month, year uint) error {
	effectiveDays, err := s.effectiveDayRepo.FindByClassGroupMonthYear(classGroupID, month, year)
	if err != nil {
		return nil // no effective days yet
	}

	// Get all active students in this class group
	enrollments, err := s.enrollmentRepo.FindActiveByClassGroupID(classGroupID)
	if err != nil {
		return err
	}

	for _, enrollment := range enrollments {
		invoice, err := s.invoiceRepo.FindMonthlyByStudent(enrollment.StudentID, month, year)
		if err != nil {
			continue // no monthly invoice for this student yet
		}

		items, _ := s.invoiceItemRepo.FindByInvoiceID(invoice.ID)

		needsRecalc := false
		for _, item := range items {
			if item.Category == "monthly_infaq" {
				// Get the infaq rate from fee config
				feeConfig, _ := s.feeConfigRepo.FindByAcademicYearID(invoice.AcademicYearID)
				if feeConfig == nil {
					continue
				}
				infaqFeeItems, _ := s.feeConfigItemRepo.FindByStudentForCategory(feeConfig.ID, "monthly_infaq", enrollment.ClassGroup.Level, enrollment.Student.Gender)
				if len(infaqFeeItems) == 0 {
					continue
				}

				newAmount := infaqFeeItems[0].Amount * float64(effectiveDays.TotalDays)

				if item.PaidAmount == 0 {
					item.Amount = newAmount
					item.Name = fmt.Sprintf("%s (%d hari)", infaqFeeItems[0].Name, effectiveDays.TotalDays)
					item.Notes = ""
					s.invoiceItemRepo.Update(&item)
					needsRecalc = true
				} else if newAmount >= item.PaidAmount {
					item.Amount = newAmount
					item.Name = fmt.Sprintf("%s (%d hari)", infaqFeeItems[0].Name, effectiveDays.TotalDays)
					s.invoiceItemRepo.Update(&item)
					needsRecalc = true
				}
				// else: skip, amount baru < paid_amount
			}

			if item.Category == "savings_mandatory" && enrollment.ClassGroup.Level == "berlian" {
				feeConfig, _ := s.feeConfigRepo.FindByAcademicYearID(invoice.AcademicYearID)
				if feeConfig == nil {
					continue
				}
				mandatoryItems, _ := s.feeConfigItemRepo.FindByStudentForCategory(feeConfig.ID, "savings_mandatory", "berlian", enrollment.Student.Gender)
				if len(mandatoryItems) == 0 {
					continue
				}

				newAmount := mandatoryItems[0].Amount * float64(effectiveDays.TotalMondays)

				if item.PaidAmount == 0 {
					item.Amount = newAmount
					item.Name = fmt.Sprintf("%s (%d Senin)", mandatoryItems[0].Name, effectiveDays.TotalMondays)
					s.invoiceItemRepo.Update(&item)
					needsRecalc = true
				} else if newAmount >= item.PaidAmount {
					item.Amount = newAmount
					item.Name = fmt.Sprintf("%s (%d Senin)", mandatoryItems[0].Name, effectiveDays.TotalMondays)
					s.invoiceItemRepo.Update(&item)
					needsRecalc = true
				}
			}
		}

		if needsRecalc {
			s.recalculateInvoiceTotal(invoice.ID)
		}
	}

	return nil
}

func (s *invoiceGenerateService) AddExtracurricularToNextMonthly(studentID, extracurricularID, academicYearID uint) error {
	ex, err := s.extracurricularRepo.FindByID(extracurricularID)
	if err != nil {
		return err
	}

	feeConfig, err := s.feeConfigRepo.FindByAcademicYearID(academicYearID)
	if err != nil {
		return nil // no fee config, nothing to do
	}

	feeItems, _ := s.feeConfigItemRepo.FindByExtracurricular(feeConfig.ID, ex.Type, ex.Name)
	if len(feeItems) == 0 {
		return nil // no fee configured for this extracurricular
	}

	// Determine next month
	nextMonth, nextYear := getNextMonth()

	invoice, err := s.invoiceRepo.FindMonthlyByStudent(studentID, nextMonth, nextYear)
	if err != nil {
		return nil // no monthly invoice for next month yet
	}

	// Add items
	for _, feeItem := range feeItems {
		item := &model.InvoiceItem{
			InvoiceID:   invoice.ID,
			Name:        feeItem.Name,
			Category:    feeItem.Category,
			Amount:      feeItem.Amount,
			IsMandatory: true,
		}
		if err := s.invoiceItemRepo.Create(item); err != nil {
			return err
		}
	}

	return s.recalculateInvoiceTotal(invoice.ID)
}

func (s *invoiceGenerateService) RemoveExtracurricularFromNextMonthly(studentID, extracurricularID, academicYearID uint) error {
	ex, err := s.extracurricularRepo.FindByID(extracurricularID)
	if err != nil {
		return err
	}

	feeConfig, err := s.feeConfigRepo.FindByAcademicYearID(academicYearID)
	if err != nil {
		return nil
	}

	feeItems, _ := s.feeConfigItemRepo.FindByExtracurricular(feeConfig.ID, ex.Type, ex.Name)
	if len(feeItems) == 0 {
		return nil
	}

	nextMonth, nextYear := getNextMonth()

	invoice, err := s.invoiceRepo.FindMonthlyByStudent(studentID, nextMonth, nextYear)
	if err != nil {
		return nil
	}

	// Find and delete unpaid items matching this extracurricular
	items, _ := s.invoiceItemRepo.FindByInvoiceID(invoice.ID)
	for _, item := range items {
		for _, feeItem := range feeItems {
			if item.Name == feeItem.Name && item.Category == feeItem.Category && item.PaidAmount == 0 {
				s.invoiceItemRepo.Delete(item.ID)
			}
		}
	}

	return s.recalculateInvoiceTotal(invoice.ID)
}

// GenerateMonthlyRange generates monthly invoices for a date range (called from enrollment service).
func (s *invoiceGenerateService) GenerateMonthlyRange(
	studentID, academicYearID, classGroupID uint,
	level, gender string,
	startDate, endDate time.Time,
	createdBy uint,
) error {
	months := utility.MonthRangeFromDate(startDate, endDate)
	return s.generateMonthlyRangeInternal(studentID, academicYearID, classGroupID, level, gender, months, createdBy)
}

// generateMonthlyRangeInternal generates monthly invoices from start to end.
func (s *invoiceGenerateService) generateMonthlyRangeInternal(
	studentID, academicYearID, classGroupID uint,
	level, gender string,
	months []utility.MonthYear,
	createdBy uint,
) error {
	extracurricularIDs := s.getActiveExtracurricularsForStudent(studentID, academicYearID)
	for _, m := range months {
		err := s.GenerateMonthly(dto.GenerateMonthlyInvoiceParams{
			StudentID:          studentID,
			AcademicYearID:     academicYearID,
			ClassGroupID:       classGroupID,
			Level:              level,
			Gender:             gender,
			Month:              m.Month,
			Year:               m.Year,
			ExtracurricularIDs: extracurricularIDs,
			CreatedBy:          createdBy,
		})
		if err != nil {
			return err
		}
	}
	return nil
}

func (s *invoiceGenerateService) getActiveExtracurricularsForStudent(studentID, academicYearID uint) []uint {
	ses, err := s.seRepo.FindActiveByStudentID(studentID, academicYearID)
	if err != nil {
		return nil
	}
	var ids []uint
	for _, se := range ses {
		ids = append(ids, se.ExtracurricularID)
	}
	return ids
}

func (s *invoiceGenerateService) recalculateInvoiceTotal(invoiceID uint) error {
	items, err := s.invoiceItemRepo.FindByInvoiceID(invoiceID)
	if err != nil {
		return err
	}

	total := float64(0)
	paid := float64(0)
	for _, item := range items {
		total += item.Amount
		paid += item.PaidAmount
	}

	status := utility.CalculateInvoiceStatus(total, paid)
	if err := s.invoiceRepo.UpdateTotalAmount(invoiceID, total); err != nil {
		return err
	}
	return s.invoiceRepo.UpdateStatus(invoiceID, status, paid)
}

func getNextMonth() (uint, uint) {
	now := time.Now()
	nextMonth := uint(now.Month()) + 1
	nextYear := uint(now.Year())
	if nextMonth > 12 {
		nextMonth = 1
		nextYear++
	}
	return nextMonth, nextYear
}
