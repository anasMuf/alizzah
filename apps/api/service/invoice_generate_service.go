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
	GenerateMonthlyRange(studentID, academicYearID, classGroupID uint, level, gender string, startDate, endDate time.Time, createdBy uint) error
	GenerateGraduation(params dto.GenerateGraduationInvoiceParams) (*model.Invoice, error)
	GenerateDaycareInitial(params dto.GenerateInitialInvoiceParams) error
	GenerateDaycareMonthlyRange(params dto.GenerateDaycareMonthlyParams) error
	RemoveDaycareFromFutureInvoices(studentID uint, fromMonth, fromYear uint) error
	SyncDaycareMonthlyInvoices() (*dto.DaycareSyncResult, error)
	RecalculateInfaqHarian(classGroupID, month, year uint) error
	AddExtracurricularToMonthlyRange(studentID, extracurricularID, academicYearID uint) error
	RemoveExtracurricularFromFutureInvoices(studentID, extracurricularID, academicYearID uint) error
	SyncExtracurricularMonthlyInvoices() (*dto.ExtracurricularSyncResult, error)
}

type invoiceGenerateService struct {
	db                  *gorm.DB
	invoiceRepo         repository.InvoiceRepository
	invoiceItemRepo     repository.InvoiceItemRepository
	feeConfigRepo       repository.FeeConfigRepository
	feeConfigItemRepo   repository.FeeConfigItemRepository
	effectiveDayRepo    repository.EffectiveDayRepository
	enrollmentRepo      repository.StudentEnrollmentRepository
	extracurricularRepo repository.ExtracurricularRepository
	seRepo              repository.StudentExtracurricularRepository
	acRepo              repository.AcademicYearRepository
	daycareRepo         repository.DaycareEnrollmentRepository
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
	acRepo repository.AcademicYearRepository,
	daycareRepo repository.DaycareEnrollmentRepository,
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
		acRepo:              acRepo,
		daycareRepo:         daycareRepo,
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
		unitPrice := item.Amount
		invoiceItems = append(invoiceItems, model.InvoiceItem{
			Name:        fmt.Sprintf("%s (%d hari)", item.Name, totalDays),
			Category:    item.Category,
			Amount:      amount,
			Quantity:    &totalDays,
			UnitPrice:   &unitPrice,
			IsMandatory: true,
			Notes:       notes,
		})
	}

	// Item wajib otomatis (is_mandatory=true di fee config): Calisan, Aslin, dll
	mandatoryExtras, _ := s.feeConfigItemRepo.FindMandatoryByStudent(feeConfig.ID, params.Level, params.Gender)
	for _, item := range mandatoryExtras {
		invoiceItems = append(invoiceItems, model.InvoiceItem{
			Name:        item.Name,
			Category:    item.Category,
			Amount:      item.Amount,
			IsMandatory: true,
		})
	}

	// Pasta opsional (hanya jika siswa terdaftar via enrollment manual)
	for _, exID := range params.ExtracurricularIDs {
		ex, err := s.extracurricularRepo.FindByID(exID)
		if err != nil {
			continue
		}
		feeItems, _ := s.feeConfigItemRepo.FindByExtracurricular(feeConfig.ID, ex.Type, ex.Name)
		for _, feeItem := range feeItems {
			// Skip jika item ini sudah masuk sebagai mandatory
			if feeItem.IsMandatory {
				continue
			}
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
			unitPrice := item.Amount
			invoiceItems = append(invoiceItems, model.InvoiceItem{
				Name:        fmt.Sprintf("%s (%d Senin)", item.Name, totalMondays),
				Category:    "savings_mandatory",
				Amount:      amount,
				Quantity:    &totalMondays,
				UnitPrice:   &unitPrice,
				IsMandatory: true,
			})
		}
	}

	// Daycare bulanan
	if s.daycareRepo != nil {
		de, err := s.daycareRepo.FindActiveByStudentID(params.StudentID, params.AcademicYearID)
		if err == nil && de != nil {
			if itemKey, ok := daycarePackageToItemKey[de.PackageType]; ok {
				feeItems, _ := s.feeConfigItemRepo.FindByItemKeys(feeConfig.ID, []string{itemKey})
				if len(feeItems) > 0 {
					invoiceItems = append(invoiceItems, model.InvoiceItem{
						Name:        feeItems[0].Name,
						Category:    "daycare",
						Amount:      feeItems[0].Amount,
						IsMandatory: true,
					})
				}
			}
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

func (s *invoiceGenerateService) GenerateDaycareInitial(params dto.GenerateInitialInvoiceParams) error {
	feeConfig, err := s.feeConfigRepo.FindByAcademicYearID(params.AcademicYearID)
	if err != nil {
		return nil
	}

	items, err := s.feeConfigItemRepo.FindByStudentForCategory(feeConfig.ID, "daycare_initial", params.Level, params.Gender)
	if err != nil || len(items) == 0 {
		return nil
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		invoice := &model.Invoice{
			StudentID:      params.StudentID,
			AcademicYearID: params.AcademicYearID,
			Type:           "initial",
			Status:         "unpaid",
			TotalAmount:    utility.SumFeeConfigItems(items),
			Notes:          "Biaya awal pendaftaran daycare",
		}
		if err := s.invoiceRepo.WithTx(tx).Create(invoice); err != nil {
			return err
		}
		return s.invoiceItemRepo.WithTx(tx).BulkCreate(
			utility.MapFeeItemsToInvoiceItems(invoice.ID, items),
		)
	})
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
				// Skip item yang sudah di-override manual per siswa
				// Override terdeteksi jika quantity berbeda dari effective_days.TotalDays
				if item.Quantity != nil && *item.Quantity != effectiveDays.TotalDays {
					continue
				}

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
				newQuantity := effectiveDays.TotalDays
				unitPrice := infaqFeeItems[0].Amount

				if item.PaidAmount == 0 {
					item.Amount = newAmount
					item.Quantity = &newQuantity
					item.UnitPrice = &unitPrice
					item.Name = fmt.Sprintf("%s (%d hari)", infaqFeeItems[0].Name, effectiveDays.TotalDays)
					item.Notes = ""
					s.invoiceItemRepo.Update(&item)
					needsRecalc = true
				} else if newAmount >= item.PaidAmount {
					item.Amount = newAmount
					item.Quantity = &newQuantity
					item.UnitPrice = &unitPrice
					item.Name = fmt.Sprintf("%s (%d hari)", infaqFeeItems[0].Name, effectiveDays.TotalDays)
					s.invoiceItemRepo.Update(&item)
					needsRecalc = true
				}
				// else: skip, amount baru < paid_amount
			}

			if item.Category == "savings_mandatory" && enrollment.ClassGroup.Level == "berlian" {
				// Skip item yang sudah di-override manual per siswa
				if item.Quantity != nil && *item.Quantity != effectiveDays.TotalMondays {
					continue
				}

				feeConfig, _ := s.feeConfigRepo.FindByAcademicYearID(invoice.AcademicYearID)
				if feeConfig == nil {
					continue
				}
				mandatoryItems, _ := s.feeConfigItemRepo.FindByStudentForCategory(feeConfig.ID, "savings_mandatory", "berlian", enrollment.Student.Gender)
				if len(mandatoryItems) == 0 {
					continue
				}

				newAmount := mandatoryItems[0].Amount * float64(effectiveDays.TotalMondays)
				newQuantity := effectiveDays.TotalMondays
				unitPrice := mandatoryItems[0].Amount

				if item.PaidAmount == 0 {
					item.Amount = newAmount
					item.Quantity = &newQuantity
					item.UnitPrice = &unitPrice
					item.Name = fmt.Sprintf("%s (%d Senin)", mandatoryItems[0].Name, effectiveDays.TotalMondays)
					s.invoiceItemRepo.Update(&item)
					needsRecalc = true
				} else if newAmount >= item.PaidAmount {
					item.Amount = newAmount
					item.Quantity = &newQuantity
					item.UnitPrice = &unitPrice
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

func (s *invoiceGenerateService) AddExtracurricularToMonthlyRange(studentID, extracurricularID, academicYearID uint) error {
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

	ay, err := s.acRepo.FindByID(academicYearID)
	if err != nil {
		return nil
	}

	// Get the student's extracurricular enrollment to determine start date
	se, _ := s.seRepo.FindActiveByStudentAndExtracurricular(studentID, extracurricularID, academicYearID)
	if se == nil {
		return nil
	}

	months := utility.MonthRangeFromDate(se.StartDate, ay.EndDate)

	for _, m := range months {
		if err := s.addExtracurricularItemToMonthly(studentID, academicYearID, m.Month, m.Year, feeItems); err != nil {
			return err
		}
	}

	return nil
}

func (s *invoiceGenerateService) addExtracurricularItemToMonthly(studentID, academicYearID, month, year uint, feeItems []model.FeeConfigItem) error {
	invoice, err := s.invoiceRepo.FindMonthlyByStudent(studentID, month, year)
	if err != nil {
		return nil // no monthly invoice for this month yet, skip
	}

	// Check idempotency: if any of these fee items already exist on this invoice, skip
	existingItems, _ := s.invoiceItemRepo.FindByInvoiceID(invoice.ID)
	for _, feeItem := range feeItems {
		alreadyExists := false
		for _, existing := range existingItems {
			if existing.Name == feeItem.Name && existing.Category == feeItem.Category {
				alreadyExists = true
				break
			}
		}
		if alreadyExists {
			continue
		}

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

func (s *invoiceGenerateService) RemoveExtracurricularFromFutureInvoices(studentID, extracurricularID, academicYearID uint) error {
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

	// Get current month onwards
	now := time.Now()
	curMonth := uint(now.Month())
	curYear := uint(now.Year())

	invoices, err := s.invoiceRepo.FindMonthlyByStudentFromMonth(studentID, curMonth, curYear)
	if err != nil {
		return nil
	}

	for _, inv := range invoices {
		items, _ := s.invoiceItemRepo.FindByInvoiceID(inv.ID)
		deleted := false
		for _, item := range items {
			for _, feeItem := range feeItems {
				if item.Name == feeItem.Name && item.Category == feeItem.Category && item.PaidAmount == 0 {
					s.invoiceItemRepo.Delete(item.ID)
					deleted = true
				}
			}
		}
		if deleted {
			s.recalculateInvoiceTotal(inv.ID)
		}
	}

	return nil
}

// SyncExtracurricularMonthlyInvoices backfills extracurricular items into existing monthly invoices.
func (s *invoiceGenerateService) SyncExtracurricularMonthlyInvoices() (*dto.ExtracurricularSyncResult, error) {
	ay, err := s.acRepo.FindActive()
	if err != nil {
		return nil, fmt.Errorf("tahun ajaran aktif tidak ditemukan")
	}

	// Get all active student extracurriculars for this academic year
	allSE, err := s.seRepo.FindAllActiveByAcademicYear(ay.ID)
	if err != nil {
		return nil, fmt.Errorf("gagal mengambil data ekskul: %v", err)
	}

	result := &dto.ExtracurricularSyncResult{
		TotalEnrollments: len(allSE),
	}

	for _, se := range allSE {
		err := s.AddExtracurricularToMonthlyRange(se.StudentID, se.ExtracurricularID, se.AcademicYearID)
		if err != nil {
			result.Errors = append(result.Errors, dto.ExtracurricularSyncError{
				StudentID:         se.StudentID,
				ExtracurricularID: se.ExtracurricularID,
				Message:           err.Error(),
			})
			continue
		}
		result.TotalSynced++
	}

	result.TotalSkipped = len(result.Errors)
	return result, nil
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

var daycarePackageToItemKey = map[string]string{
	"monthly_kb":         "daycare_spd_kb",
	"monthly_tk":         "daycare_spd_tk",
	"monthly_package_kb": "daycare_paket_kb",
	"monthly_package_tk": "daycare_paket_tk",
}

func (s *invoiceGenerateService) GenerateDaycareMonthlyRange(params dto.GenerateDaycareMonthlyParams) error {
	itemKey, ok := daycarePackageToItemKey[params.PackageType]
	if !ok {
		return nil
	}

	startDate, err := utility.ParseDate(params.StartDate)
	if err != nil {
		return fmt.Errorf("format start_date tidak valid")
	}

	ay, err := s.acRepo.FindByID(params.AcademicYearID)
	if err != nil {
		return fmt.Errorf("tahun ajaran tidak ditemukan")
	}

	feeConfig, err := s.feeConfigRepo.FindByAcademicYearID(params.AcademicYearID)
	if err != nil {
		return nil
	}

	feeItems, err := s.feeConfigItemRepo.FindByItemKeys(feeConfig.ID, []string{itemKey})
	if err != nil || len(feeItems) == 0 {
		return nil
	}
	feeItem := feeItems[0]

	months := utility.MonthRangeFromDate(startDate, ay.EndDate)

	for _, m := range months {
		if err := s.addDaycareItemToMonthly(params.StudentID, params.AcademicYearID, m.Month, m.Year, feeItem); err != nil {
			return err
		}
	}

	return nil
}

func (s *invoiceGenerateService) addDaycareItemToMonthly(studentID, academicYearID, month, year uint, feeItem model.FeeConfigItem) error {
	invoice, err := s.invoiceRepo.FindMonthlyByStudent(studentID, month, year)
	if err != nil {
		invoice = &model.Invoice{
			StudentID:      studentID,
			AcademicYearID: academicYearID,
			Type:           "monthly",
			Month:          &month,
			Year:           &year,
			Status:         "unpaid",
			TotalAmount:    0,
		}
		if err := s.invoiceRepo.Create(invoice); err != nil {
			return err
		}
	}

	_, err = s.invoiceItemRepo.FindByInvoiceAndCategory(invoice.ID, "daycare")
	if err == nil {
		return nil // sudah ada item daycare, skip
	}

	item := &model.InvoiceItem{
		InvoiceID:   invoice.ID,
		Name:        feeItem.Name,
		Category:    "daycare",
		Amount:      feeItem.Amount,
		IsMandatory: true,
	}
	if err := s.invoiceItemRepo.Create(item); err != nil {
		return err
	}

	return s.recalculateInvoiceTotal(invoice.ID)
}

func (s *invoiceGenerateService) SyncDaycareMonthlyInvoices() (*dto.DaycareSyncResult, error) {
	enrollments, err := s.daycareRepo.FindAllActive()
	if err != nil {
		return nil, fmt.Errorf("gagal mengambil data daycare: %v", err)
	}

	result := &dto.DaycareSyncResult{
		TotalEnrollments: len(enrollments),
	}

	for _, de := range enrollments {
		if _, ok := daycarePackageToItemKey[de.PackageType]; !ok {
			result.TotalSkipped++
			continue
		}

		err := s.GenerateDaycareMonthlyRange(dto.GenerateDaycareMonthlyParams{
			StudentID:      de.StudentID,
			AcademicYearID: de.AcademicYearID,
			PackageType:    de.PackageType,
			StartDate:      de.StartDate.Format("2006-01-02"),
		})
		if err != nil {
			result.Errors = append(result.Errors, dto.DaycareSyncError{
				StudentID: de.StudentID,
				Message:   err.Error(),
			})
			continue
		}
		result.TotalSynced++
	}

	result.TotalSkipped += len(result.Errors)
	return result, nil
}

func (s *invoiceGenerateService) RemoveDaycareFromFutureInvoices(studentID uint, fromMonth, fromYear uint) error {
	invoices, err := s.invoiceRepo.FindMonthlyByStudentFromMonth(studentID, fromMonth, fromYear)
	if err != nil {
		return err
	}

	for _, inv := range invoices {
		deleted, err := s.invoiceItemRepo.DeleteUnpaidByInvoiceAndCategory(inv.ID, "daycare")
		if err != nil {
			return err
		}
		if deleted > 0 {
			if err := s.recalculateInvoiceTotal(inv.ID); err != nil {
				return err
			}
		}
	}

	return nil
}

