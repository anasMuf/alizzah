package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"api/utility"
	"fmt"
	"log"
	"strings"
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
	GenerateDaycareMonthlyInvoices(params dto.GenerateDaycareMonthlyParams) error
	GenerateDaycareMonthlyBulk(params dto.GenerateDaycareMonthlyParams) (*dto.DaycareSyncResult, error)
	InjectPremiumDaycareToMonthlyInvoices(de model.DaycareEnrollment) error
	RemoveDaycareFromFutureInvoices(studentID uint, fromMonth, fromYear uint) error
	SyncDaycareMonthlyInvoices() (*dto.DaycareSyncResult, error)
	RecalculateInfaqHarian(classGroupID, month, year uint) error
	AddExtracurricularToMonthlyRange(studentID, extracurricularID, academicYearID uint) error
	RemoveExtracurricularFromFutureInvoices(studentID, extracurricularID, academicYearID uint) error
	SyncExtracurricularMonthlyInvoices() (*dto.ExtracurricularSyncResult, error)
	AddFacilityToMonthlyRange(studentID, facilityID, academicYearID uint) error
	RemoveFacilityFromFutureInvoices(studentID, facilityID, academicYearID uint) error
	ApplyDispensationToExistingInvoices(studentID, academicYearID uint) error
	// RegenerateForStudent menghapus semua invoice (initial, registration, monthly)
	// untuk student di tahun ajaran aktif lalu generate ulang dengan data terbaru.
	RegenerateForStudent(studentID uint) error
	// WithTx returns an instance whose write-transactions run within tx (as savepoints),
	// so invoice generation can participate in a larger atomic operation.
	WithTx(tx *gorm.DB) InvoiceGenerateService
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
	facilityRepo        repository.FacilityRepository
	sfRepo              repository.StudentFacilityRepository
	dispensationRepo    repository.DispensationRepository
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
	facilityRepo repository.FacilityRepository,
	sfRepo repository.StudentFacilityRepository,
	dispensationRepo repository.DispensationRepository,
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
		facilityRepo:        facilityRepo,
		sfRepo:              sfRepo,
		dispensationRepo:    dispensationRepo,
	}
}

func (s *invoiceGenerateService) WithTx(tx *gorm.DB) InvoiceGenerateService {
	if tx == nil {
		return s
	}
	clone := *s
	clone.db = tx
	return &clone
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

	// Hari efektif: cek per rombel dulu, fallback ke per jenjang
	effectiveDays, _ := s.effectiveDayRepo.FindByClassGroupMonthYear(
		params.ClassGroupID, params.Month, params.Year,
	)
	if effectiveDays == nil || effectiveDays.ID == 0 {
		effectiveDays, _ = s.effectiveDayRepo.FindByLevelMonthYear(
			params.Level, params.Month, params.Year,
		)
	}

	var invoiceItems []model.InvoiceItem

	// SPP — pilih item berdasarkan semester: sem1 (Jul-Des) vs sem2 (Jan-Jun)
	// Item dengan suffix _sem1/_sem2 difilter per semester; item tanpa suffix
	// (format lama) tetap dipakai untuk backward compatibility.
	sppItems, _ := s.feeConfigItemRepo.FindByStudentForCategory(feeConfig.ID, "monthly_spp", params.Level, params.Gender)
	sppSemester := "sem1"
	if params.Month >= 1 && params.Month <= 6 {
		sppSemester = "sem2"
	}
	for _, item := range sppItems {
		keyLower := strings.ToLower(item.ItemKey)
		hasSemesterSuffix := strings.HasSuffix(keyLower, "_sem1") || strings.HasSuffix(keyLower, "_sem2")
		if hasSemesterSuffix && !strings.HasSuffix(keyLower, "_"+sppSemester) {
			continue
		}
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

	// Pasta: mandatory (is_mandatory=true, ex: Aslin) dan opsional
	// Filter by levels: levels kosong = semua, atau mengandung level siswa
	for _, exID := range params.ExtracurricularIDs {
		ex, err := s.extracurricularRepo.FindByID(exID)
		if err != nil {
			continue
		}
		if ex.Levels != "" && !strings.Contains(","+ex.Levels+",", ","+params.Level+",") {
			continue
		}
		feeItems, _ := s.feeConfigItemRepo.FindByExtracurricular(feeConfig.ID, ex.Type, ex.Name)
		for _, feeItem := range feeItems {
			// Skip jika item ini sudah masuk sebagai mandatory (di-bypass untuk pasta)
			if feeItem.IsMandatory {
				continue
			}
			// Skip jika level fee item tidak cocok dengan level siswa
			if feeItem.Level != "all" && feeItem.Level != params.Level {
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

	// Tabungan Wajib (Berlian: per Senin, Mutiara: per bulan flat)
	if params.Level == "berlian" || params.Level == "mutiara" {
		mandatoryItems, _ := s.feeConfigItemRepo.FindByStudentForCategory(feeConfig.ID, "savings_mandatory", params.Level, params.Gender)
		for _, item := range mandatoryItems {
			amount := item.Amount
			name := item.Name
			var quantity *uint
			var unitPrice *float64

			if item.Unit == "per_monday" {
				totalMondays := uint(0)
				if effectiveDays != nil {
					totalMondays = effectiveDays.TotalMondays
					amount = item.Amount * float64(totalMondays)
				}
				quantity = &totalMondays
				up := item.Amount
				unitPrice = &up
				name = fmt.Sprintf("%s (%d Senin)", item.Name, totalMondays)
			}

			invoiceItems = append(invoiceItems, model.InvoiceItem{
				Name:        name,
				Category:    "savings_mandatory",
				Amount:      amount,
				Quantity:    quantity,
				UnitPrice:   unitPrice,
				IsMandatory: true,
			})
		}
	}

	// Fasilitas opsional (antar jemput, dll)
	if s.sfRepo != nil {
		activeFacilities, _ := s.sfRepo.FindActiveByStudentID(params.StudentID, params.AcademicYearID)
		for _, sf := range activeFacilities {
			facilityFeeItems, _ := s.feeConfigItemRepo.FindByItemKeys(feeConfig.ID, []string{facilityItemKey(sf.Facility.Name)})
			for _, feeItem := range facilityFeeItems {
				amount := feeItem.Amount
				itemName := feeItem.Name
				var qty *uint
				var unitPx *float64

				if feeItem.Unit == "per_day" && effectiveDays != nil {
					totalDays := effectiveDays.TotalDays
					amount = feeItem.Amount * float64(totalDays)
					itemName = fmt.Sprintf("%s (%d hari)", feeItem.Name, totalDays)
					qty = &totalDays
					up := feeItem.Amount
					unitPx = &up
				}

				invoiceItems = append(invoiceItems, model.InvoiceItem{
					Name:        itemName,
					Category:    "facility",
					Amount:      amount,
					Quantity:    qty,
					UnitPrice:   unitPx,
					IsMandatory: true,
				})
			}
		}
	}

	// Dispensasi SPP — item potongan dengan amount negatif
	if s.dispensationRepo != nil {
		dispensations, _ := s.dispensationRepo.FindActiveForStudentMonth(
			params.StudentID, params.AcademicYearID,
			params.Month, params.Year, "monthly_spp",
		)

		if len(dispensations) > 0 {
			sppOriginalAmount := float64(0)
			for _, item := range invoiceItems {
				if item.Category == "monthly_spp" {
					sppOriginalAmount += item.Amount
				}
			}

			if sppOriginalAmount > 0 {
				totalDiscount := CalculateTotalDiscount(sppOriginalAmount, dispensations)
				remainingDiscount := totalDiscount

				for _, d := range dispensations {
					discountForThis := float64(0)
					if d.DiscountType == "percent" {
						discountForThis = sppOriginalAmount * d.DiscountValue / 100
					} else {
						discountForThis = d.DiscountValue
					}
					if discountForThis > remainingDiscount {
						discountForThis = remainingDiscount
					}
					remainingDiscount -= discountForThis

					if discountForThis > 0 {
						label := fmt.Sprintf("Dispensasi: %s", d.Reason)
						if d.DiscountType == "percent" {
							label = fmt.Sprintf("Dispensasi: %s (%.0f%%)", d.Reason, d.DiscountValue)
						}
						invoiceItems = append(invoiceItems, model.InvoiceItem{
							Name:        label,
							Category:    "dispensation",
							Amount:      -discountForThis,
							IsMandatory: true,
							Notes:       d.Notes,
						})
					}
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
	// Idempotency: cek apakah sudah ada item daycare di invoice type=initial atau type=daycare_initial
	var count int64
	s.db.Table("invoice_items").
		Joins("JOIN invoices ON invoices.id = invoice_items.invoice_id").
		Where("invoices.student_id = ? AND invoices.academic_year_id = ? AND invoice_items.category = ?",
			params.StudentID, params.AcademicYearID, "daycare").
		Count(&count)
	if count > 0 {
		return nil // idempotent
	}

	feeConfig, err := s.feeConfigRepo.FindByAcademicYearID(params.AcademicYearID)
	if err != nil {
		return nil
	}

	// Biaya Awal daycare: item_key = "daycare_premium_initial" (category = "daycare")
	biayaAwal, err := s.feeConfigItemRepo.FindByItemKey(feeConfig.ID, "daycare_premium_initial", "all", "all")
	if err != nil || biayaAwal == nil {
		return nil
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		invoice := &model.Invoice{
			StudentID:      params.StudentID,
			AcademicYearID: params.AcademicYearID,
			Type:           "daycare_initial",
			Status:         "unpaid",
			TotalAmount:    biayaAwal.Amount,
			Notes:          "Biaya awal pendaftaran daycare",
		}
		if err := s.invoiceRepo.WithTx(tx).Create(invoice); err != nil {
			return err
		}
		return s.invoiceItemRepo.WithTx(tx).Create(&model.InvoiceItem{
			InvoiceID:   invoice.ID,
			Name:        biayaAwal.Name,
			Category:    "daycare",
			Amount:      biayaAwal.Amount,
			IsMandatory: false,
		})
	})
}

func (s *invoiceGenerateService) RecalculateInfaqHarian(classGroupID, month, year uint) error {
	// Cek per rombel dulu, fallback ke per jenjang
	effectiveDays, _ := s.effectiveDayRepo.FindByClassGroupMonthYear(classGroupID, month, year)
	if effectiveDays == nil || effectiveDays.ID == 0 {
		var level string
		s.db.Table("class_groups").Select("level").Where("id = ?", classGroupID).Scan(&level)
		if level != "" {
			effectiveDays, _ = s.effectiveDayRepo.FindByLevelMonthYear(level, month, year)
		}
	}
	if effectiveDays == nil || effectiveDays.ID == 0 {
		return nil // no effective days at all
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

		// Bungkus update per-invoice dalam transaksi agar atomic
		err = s.db.Transaction(func(tx *gorm.DB) error {
			txItemRepo := s.invoiceItemRepo.WithTx(tx)

			items, err := txItemRepo.FindByInvoiceID(invoice.ID)
			if err != nil {
				return err
			}

			needsRecalc := false
			for _, item := range items {
				if item.Category == "monthly_infaq" {
					// Skip item yang sudah di-override manual per siswa
					if item.Quantity != nil && *item.Quantity != effectiveDays.TotalDays {
						continue
					}

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
						txItemRepo.Update(&item)
						needsRecalc = true
					} else if newAmount >= item.PaidAmount {
						item.Amount = newAmount
						item.Quantity = &newQuantity
						item.UnitPrice = &unitPrice
						item.Name = fmt.Sprintf("%s (%d hari)", infaqFeeItems[0].Name, effectiveDays.TotalDays)
						txItemRepo.Update(&item)
						needsRecalc = true
					}
				}

				if item.Category == "savings_mandatory" && enrollment.ClassGroup.Level == "berlian" {
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
						txItemRepo.Update(&item)
						needsRecalc = true
					} else if newAmount >= item.PaidAmount {
						item.Amount = newAmount
						item.Quantity = &newQuantity
						item.UnitPrice = &unitPrice
						item.Name = fmt.Sprintf("%s (%d Senin)", mandatoryItems[0].Name, effectiveDays.TotalMondays)
						txItemRepo.Update(&item)
						needsRecalc = true
					}
				}
			}

			if needsRecalc {
				return s.recalculateInvoiceTotalWithTx(tx, invoice.ID)
			}
			return nil
		})
		if err != nil {
			continue // log error silently, lanjut ke siswa berikutnya
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

func (s *invoiceGenerateService) recalculateInvoiceTotalWithTx(tx *gorm.DB, invoiceID uint) error {
	txItemRepo := s.invoiceItemRepo.WithTx(tx)
	txInvoiceRepo := s.invoiceRepo.WithTx(tx)

	items, err := txItemRepo.FindByInvoiceID(invoiceID)
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
	if err := txInvoiceRepo.UpdateTotalAmount(invoiceID, total); err != nil {
		return err
	}
	return txInvoiceRepo.UpdateStatus(invoiceID, status, paid)
}

// ═══ Daycare Invoice Generation ═══

// buildDaycareSPDKey builds the item_key for SPD fee lookup.
func buildDaycareSPDKey(category, timeSlot, ageGroup string) string {
	slug := strings.ReplaceAll(timeSlot, "-", "")
	if category == "premium" {
		return fmt.Sprintf("daycare_premium_%s_%s_spd", slug, ageGroup)
	}
	return fmt.Sprintf("daycare_regular_%s_%s_daily", slug, ageGroup)
}

// addDaycareItemToInvoice adds a daycare invoice item with idempotency check by name.
// Use for FIXED items (Premium SPD) where name never changes.
func (s *invoiceGenerateService) addDaycareItemToInvoice(invoiceID uint, name string, amount float64, quantity *uint, unitPrice *float64) error {
	items, err := s.invoiceItemRepo.FindByInvoiceID(invoiceID)
	if err != nil {
		return err
	}
	for _, item := range items {
		if item.Category == "daycare" && item.Name == name {
			return nil // idempotent
		}
	}

	it := &model.InvoiceItem{
		InvoiceID: invoiceID,
		Name:      name,
		Category:  "daycare",
		Amount:    amount,
		Quantity:  quantity,
		UnitPrice: unitPrice,
	}
	return s.invoiceItemRepo.Create(it)
}

// upsertDaycareAttendanceItem handles attendance-based daycare items.
// Keeps paid items untouched. Deletes old unpaid items, creates one new unpaid
// item with the remaining amount (total - totalPaid).
func (s *invoiceGenerateService) upsertDaycareAttendanceItem(invoiceID uint, namePrefix string, name string, amount float64, quantity *uint, unitPrice *float64) error {
	items, _ := s.invoiceItemRepo.FindByInvoiceID(invoiceID)

	var totalPaidAmount float64
	var totalPaidQty uint

	for _, item := range items {
		if item.Category == "daycare" && strings.HasPrefix(item.Name, namePrefix) {
			totalPaidAmount += item.PaidAmount
			if item.Quantity != nil && item.PaidAmount > 0 {
				totalPaidQty += *item.Quantity
			}
			// Hapus item unpaid (akan diganti dengan yg baru)
			if item.PaidAmount == 0 {
				s.invoiceItemRepo.Delete(item.ID)
			}
		}
	}

	// Hitung sisa yang belum dibayar
	unpaidAmount := amount - totalPaidAmount
	unpaidQty := uint(0)
	if quantity != nil {
		unpaidQty = *quantity - totalPaidQty
	}

	if unpaidAmount <= 0 {
		return nil // sudah lunas semua
	}

	// Nama item: kalau ada yg paid, pakai "+X hari", kalau tidak pakai full name
	itemName := name
	if totalPaidAmount > 0 {
		itemName = fmt.Sprintf("%s (+%d hari)", namePrefix, unpaidQty)
	}

	return s.invoiceItemRepo.Create(&model.InvoiceItem{
		InvoiceID: invoiceID, Name: itemName, Category: "daycare",
		Amount: unpaidAmount, Quantity: &unpaidQty, UnitPrice: unitPrice,
	})
}

// InjectPremiumDaycareToMonthlyInvoices injects flat SPD + optional meal + optional TPQ
// into all monthly invoices from enrollment start month to end of academic year.
func (s *invoiceGenerateService) InjectPremiumDaycareToMonthlyInvoices(de model.DaycareEnrollment) error {
	feeConfig, err := s.feeConfigRepo.FindByAcademicYearID(de.AcademicYearID)
	if err != nil || feeConfig == nil {
		log.Printf("[Daycare SPD] InjectPremium: fee config tidak ditemukan untuk ay=%d: %v", de.AcademicYearID, err)
		return fmt.Errorf("fee config tidak ditemukan")
	}

	spdKey := buildDaycareSPDKey("premium", de.TimeSlot, de.AgeGroup)
	spdItem, err := s.feeConfigItemRepo.FindByItemKey(feeConfig.ID, spdKey, "all", "all")
	if err != nil || spdItem == nil {
		log.Printf("[Daycare SPD] InjectPremium: fee item SPD tidak ditemukan key=%s err=%v", spdKey, err)
		return fmt.Errorf("fee item SPD tidak ditemukan: %s", spdKey)
	}

	// Get all monthly invoices for this student in this academic year
	invoices, err := s.invoiceRepo.FindMonthlyByStudentAcademicYear(de.StudentID, de.AcademicYearID)
	if err != nil {
		return err
	}

	log.Printf("[Daycare SPD] InjectPremium: ditemukan %d monthly invoice untuk student=%d", len(invoices), de.StudentID)

	startMonth := uint(de.StartDate.Month())
	startYear := uint(de.StartDate.Year())

	for _, inv := range invoices {
		if inv.Month == nil || inv.Year == nil {
			continue
		}
		// Skip months before enrollment start
		if *inv.Year < startYear || (*inv.Year == startYear && *inv.Month < startMonth) {
			continue
		}

		// SPD (flat dari enrollment)
		if err := s.addDaycareItemToInvoice(inv.ID, spdItem.Name, spdItem.Amount, nil, nil); err != nil {
			return err
		}

		if err := s.recalculateInvoiceTotal(inv.ID); err != nil {
			return err
		}
	}

	return nil
}

// GenerateDaycareMonthlyInvoices generates SPD items for a specific month.
func (s *invoiceGenerateService) GenerateDaycareMonthlyInvoices(params dto.GenerateDaycareMonthlyParams) error {
	de, err := s.daycareRepo.FindActiveByStudentID(params.StudentID, params.AcademicYearID)
	if err != nil {
		return fmt.Errorf("pendaftaran daycare tidak ditemukan")
	}

	log.Printf("[Daycare SPD] Generate untuk student=%d month=%d/%d category=%s slot=%s age=%s",
		params.StudentID, params.Month, params.Year, de.Category, de.TimeSlot, de.AgeGroup)

	// Inject flat SPD untuk Premium
	if de.Category == "premium" {
		_, err := s.invoiceRepo.FindMonthlyByStudent(params.StudentID, params.Month, params.Year)
		if err != nil {
			log.Printf("[Daycare SPD] Premium: membuat invoice bulanan baru untuk %d/%d", params.Month, params.Year)
			invoice := &model.Invoice{
				StudentID:      params.StudentID,
				AcademicYearID: params.AcademicYearID,
				Type:           "monthly",
				Month:          &params.Month,
				Year:           &params.Year,
				Status:         "unpaid",
				TotalAmount:    0,
			}
			if err := s.invoiceRepo.Create(invoice); err != nil {
				return err
			}
		}
		if err := s.InjectPremiumDaycareToMonthlyInvoices(*de); err != nil {
			log.Printf("[Daycare SPD] Premium: gagal inject SPD: %v", err)
			return err
		}
		log.Printf("[Daycare SPD] Premium: SPD flat injected")
	}

	// ─── Attendance-based: SPD Regular + Meal/TPQ (both categories) ───
	feeConfig, err := s.feeConfigRepo.FindByAcademicYearID(params.AcademicYearID)
	if err != nil || feeConfig == nil {
		log.Printf("[Daycare SPD] fee config tidak ditemukan untuk ay=%d: %v", params.AcademicYearID, err)
		return nil
	}

	start := time.Date(int(params.Year), time.Month(params.Month), 1, 0, 0, 0, 0, time.UTC)
	end := start.AddDate(0, 1, 0)

	var atts []model.DaycareAttendance
	s.db.Where("student_id = ? AND date >= ? AND date < ? AND time_slot != ''", params.StudentID, start, end).
		Order("date ASC").Find(&atts)

	if len(atts) == 0 {
		log.Printf("[Daycare SPD] tidak ada attendance untuk %d/%d", params.Month, params.Year)
		return nil
	}

	// Hitung per slot (untuk Regular SPD) + meal/tpq days (untuk keduanya)
	slotCount := make(map[string]int)
	mealDays, tpqDays := 0, 0
	for _, a := range atts {
		if a.TimeSlot != "" {
			slotCount[a.TimeSlot]++
		}
		if a.WithMeal {
			mealDays++
		}
		if a.WithTpq {
			tpqDays++
		}
	}

	// Find or create monthly invoice
	invoice, err := s.invoiceRepo.FindMonthlyByStudent(params.StudentID, params.Month, params.Year)
	if err != nil {
		invoice = &model.Invoice{
			StudentID:      params.StudentID,
			AcademicYearID: params.AcademicYearID,
			Type:           "monthly",
			Month:          &params.Month,
			Year:           &params.Year,
			Status:         "unpaid",
			TotalAmount:    0,
		}
		if err := s.invoiceRepo.Create(invoice); err != nil {
			return err
		}
	}

	// Regular: SPD per time slot
	if de.Category == "regular" {
		for slot, count := range slotCount {
			spdKey := buildDaycareSPDKey("regular", slot, de.AgeGroup)
			spdItem, err := s.feeConfigItemRepo.FindByItemKey(feeConfig.ID, spdKey, "all", "all")
			if err != nil || spdItem == nil {
				log.Printf("[Daycare SPD] Regular: fee item tidak ditemukan key=%s err=%v", spdKey, err)
				continue
			}
			dailyRate := spdItem.Amount
			qty := uint(count)
			name := fmt.Sprintf("%s (%d hari)", spdItem.Name, count)
			log.Printf("[Daycare SPD] Regular: tambah item %s = %d x %.0f = %.0f", name, count, dailyRate, dailyRate*float64(count))
			if err := s.upsertDaycareAttendanceItem(invoice.ID, spdItem.Name, name, dailyRate*float64(count), &qty, &dailyRate); err != nil {
				return err
			}
		}
	}

	// Meal (kedua kategori: dari attendance)
	if mealDays > 0 {
		mealItem, err := s.feeConfigItemRepo.FindByItemKey(feeConfig.ID, "daycare_regular_meal", "all", "all")
		if err == nil && mealItem != nil {
			dailyRate := mealItem.Amount
			qty := uint(mealDays)
			name := fmt.Sprintf("%s (%d hari)", mealItem.Name, mealDays)
			log.Printf("[Daycare SPD] Meal: %d hari x %.0f = %.0f", mealDays, dailyRate, dailyRate*float64(mealDays))
			if err := s.upsertDaycareAttendanceItem(invoice.ID, mealItem.Name, name, dailyRate*float64(mealDays), &qty, &dailyRate); err != nil {
				return err
			}
		}
	}

	// TPQ (kedua kategori: dari attendance)
	if tpqDays > 0 {
		tpqItem, err := s.feeConfigItemRepo.FindByItemKey(feeConfig.ID, "daycare_regular_tpq", "all", "all")
		if err == nil && tpqItem != nil {
			dailyRate := tpqItem.Amount
			qty := uint(tpqDays)
			name := fmt.Sprintf("%s (%d hari)", tpqItem.Name, tpqDays)
			log.Printf("[Daycare SPD] TPQ: %d hari x %.0f = %.0f", tpqDays, dailyRate, dailyRate*float64(tpqDays))
			if err := s.upsertDaycareAttendanceItem(invoice.ID, tpqItem.Name, name, dailyRate*float64(tpqDays), &qty, &dailyRate); err != nil {
				return err
			}
		}
	}

	return s.recalculateInvoiceTotal(invoice.ID)
}

// GenerateDaycareMonthlyBulk generates SPD for all active daycare students in a given month.
func (s *invoiceGenerateService) GenerateDaycareMonthlyBulk(params dto.GenerateDaycareMonthlyParams) (*dto.DaycareSyncResult, error) {
	enrollments, err := s.daycareRepo.FindAllActive()
	if err != nil {
		return nil, fmt.Errorf("gagal mengambil data daycare: %v", err)
	}

	result := &dto.DaycareSyncResult{TotalEnrollments: len(enrollments)}

	for _, de := range enrollments {
		genParams := params
		genParams.StudentID = de.StudentID

		err := s.GenerateDaycareMonthlyInvoices(genParams)
		if err != nil {
			result.Errors = append(result.Errors, dto.DaycareSyncError{
				StudentID: de.StudentID,
				Message:   err.Error(),
			})
			continue
		}
		result.TotalSynced++
	}

	result.TotalSkipped = len(result.Errors)
	log.Printf("[Daycare SPD] Bulk: %d berhasil, %d error dari %d enrollment", result.TotalSynced, result.TotalSkipped, result.TotalEnrollments)
	return result, nil
}

// RemoveDaycareFromFutureInvoices removes all unpaid daycare items from monthly invoices
// starting from fromMonth/fromYear (used when daycare enrollment is deactivated).
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

// SyncDaycareMonthlyInvoices syncs daycare SPD items for all active enrollments.
// For Premium: injects SPD into future invoices.
// For Regular: skips (handled per-month via attendance).
func (s *invoiceGenerateService) SyncDaycareMonthlyInvoices() (*dto.DaycareSyncResult, error) {
	enrollments, err := s.daycareRepo.FindAllActive()
	if err != nil {
		return nil, fmt.Errorf("gagal mengambil data daycare: %v", err)
	}

	result := &dto.DaycareSyncResult{
		TotalEnrollments: len(enrollments),
	}

	for _, de := range enrollments {
		if de.Category != "premium" {
			result.TotalSkipped++
			continue
		}

		err := s.InjectPremiumDaycareToMonthlyInvoices(de)
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

// ─── Facility Methods ────────────────────────────────────────────────

func facilityItemKey(facilityName string) string {
	slug := strings.ToLower(strings.ReplaceAll(facilityName, " ", "_"))
	return "facility_" + slug
}

func (s *invoiceGenerateService) AddFacilityToMonthlyRange(studentID, facilityID, academicYearID uint) error {
	facility, err := s.facilityRepo.FindByID(facilityID)
	if err != nil {
		return err
	}

	feeConfig, err := s.feeConfigRepo.FindByAcademicYearID(academicYearID)
	if err != nil {
		return nil
	}

	itemKey := facilityItemKey(facility.Name)
	feeItems, _ := s.feeConfigItemRepo.FindByItemKeys(feeConfig.ID, []string{itemKey})
	if len(feeItems) == 0 {
		return nil
	}

	ay, err := s.acRepo.FindByID(academicYearID)
	if err != nil {
		return nil
	}

	allSF, _ := s.sfRepo.FindActiveByStudentID(studentID, academicYearID)
	var startDate time.Time
	for _, enrollment := range allSF {
		if enrollment.FacilityID == facilityID {
			startDate = enrollment.StartDate
			break
		}
	}
	if startDate.IsZero() {
		return nil
	}

	months := utility.MonthRangeFromDate(startDate, ay.EndDate)

	for _, m := range months {
		invoice, err := s.invoiceRepo.FindMonthlyByStudent(studentID, m.Month, m.Year)
		if err != nil {
			continue
		}

		existingItems, _ := s.invoiceItemRepo.FindByInvoiceID(invoice.ID)
		for _, feeItem := range feeItems {
			alreadyExists := false
			for _, existing := range existingItems {
				if existing.Category == "facility" && strings.Contains(existing.Name, facility.Name) {
					alreadyExists = true
					break
				}
			}
			if alreadyExists {
				continue
			}

			amount := feeItem.Amount
			itemName := feeItem.Name
			var qty *uint
			var unitPx *float64

			if feeItem.Unit == "per_day" {
				enrollment, _ := s.enrollmentRepo.FindActiveByStudentID(studentID)
				if enrollment != nil {
					ed, _ := s.effectiveDayRepo.FindByClassGroupMonthYear(enrollment.ClassGroupID, m.Month, m.Year)
					if ed != nil {
						totalDays := ed.TotalDays
						amount = feeItem.Amount * float64(totalDays)
						itemName = fmt.Sprintf("%s (%d hari)", feeItem.Name, totalDays)
						qty = &totalDays
						up := feeItem.Amount
						unitPx = &up
					}
				}
			}

			item := &model.InvoiceItem{
				InvoiceID:   invoice.ID,
				Name:        itemName,
				Category:    "facility",
				Amount:      amount,
				Quantity:    qty,
				UnitPrice:   unitPx,
				IsMandatory: true,
			}
			s.invoiceItemRepo.Create(item)
		}

		s.recalculateInvoiceTotal(invoice.ID)
	}

	return nil
}

func (s *invoiceGenerateService) RemoveFacilityFromFutureInvoices(studentID, facilityID, academicYearID uint) error {
	facility, err := s.facilityRepo.FindByID(facilityID)
	if err != nil {
		return err
	}

	now := time.Now()
	curMonth := uint(now.Month())
	curYear := uint(now.Year())

	invoices, _ := s.invoiceRepo.FindMonthlyByStudentFromMonth(studentID, curMonth, curYear)

	for _, inv := range invoices {
		items, _ := s.invoiceItemRepo.FindByInvoiceID(inv.ID)
		deleted := false
		for _, item := range items {
			if item.Category == "facility" && strings.Contains(item.Name, facility.Name) && item.PaidAmount == 0 {
				s.invoiceItemRepo.Delete(item.ID)
				deleted = true
			}
		}
		if deleted {
			s.recalculateInvoiceTotal(inv.ID)
		}
	}

	return nil
}

// ─── Dispensation Methods ────────────────────────────────────────────

// ApplyDispensationToExistingInvoices recalculates dispensation items on all
// unpaid/partial monthly invoices for the student in the given academic year.
// It removes old dispensation items and re-applies based on current active dispensations.
func (s *invoiceGenerateService) ApplyDispensationToExistingInvoices(studentID, academicYearID uint) error {
	if s.dispensationRepo == nil {
		return nil
	}

	// Get all monthly invoices for this student in this academic year
	invoices, err := s.invoiceRepo.FindMonthlyByStudentAcademicYear(studentID, academicYearID)
	if err != nil {
		return nil
	}

	for _, inv := range invoices {
		if inv.Status == "paid" {
			continue // skip fully paid invoices
		}
		month := uint(0)
		year := uint(0)
		if inv.Month != nil {
			month = *inv.Month
		}
		if inv.Year != nil {
			year = *inv.Year
		}
		if month == 0 || year == 0 {
			continue
		}

		items, _ := s.invoiceItemRepo.FindByInvoiceID(inv.ID)

		// 1. Remove existing dispensation items that haven't been paid
		for _, item := range items {
			if item.Category == "dispensation" && item.PaidAmount == 0 {
				s.invoiceItemRepo.Delete(item.ID)
			}
		}

		// 2. Calculate SPP amount (original, without dispensation)
		sppAmount := float64(0)
		for _, item := range items {
			if item.Category == "monthly_spp" {
				sppAmount += item.Amount
			}
		}
		if sppAmount <= 0 {
			s.recalculateInvoiceTotal(inv.ID)
			continue
		}

		// 3. Find active dispensations for this month
		dispensations, _ := s.dispensationRepo.FindActiveForStudentMonth(
			studentID, academicYearID, month, year, "monthly_spp",
		)

		if len(dispensations) == 0 {
			s.recalculateInvoiceTotal(inv.ID)
			continue
		}

		// 4. Apply dispensation items
		totalDiscount := CalculateTotalDiscount(sppAmount, dispensations)
		remainingDiscount := totalDiscount

		for _, d := range dispensations {
			discountForThis := float64(0)
			if d.DiscountType == "percent" {
				discountForThis = sppAmount * d.DiscountValue / 100
			} else {
				discountForThis = d.DiscountValue
			}
			if discountForThis > remainingDiscount {
				discountForThis = remainingDiscount
			}
			remainingDiscount -= discountForThis

			if discountForThis > 0 {
				label := fmt.Sprintf("Dispensasi: %s", d.Reason)
				if d.DiscountType == "percent" {
					label = fmt.Sprintf("Dispensasi: %s (%.0f%%)", d.Reason, d.DiscountValue)
				}
				newItem := &model.InvoiceItem{
					InvoiceID:   inv.ID,
					Name:        label,
					Category:    "dispensation",
					Amount:      -discountForThis,
					IsMandatory: true,
					Notes:       d.Notes,
				}
				s.invoiceItemRepo.Create(newItem)
			}
		}

		s.recalculateInvoiceTotal(inv.ID)
	}

	return nil
}

// RegenerateForStudent menghapus semua invoice (initial, registration, monthly)
// untuk student di tahun ajaran aktif lalu generate ulang dengan data terbaru.
func (s *invoiceGenerateService) RegenerateForStudent(studentID uint) error {
	// 1. Cari enrollment aktif untuk mendapatkan AcademicYearID, Level, ClassGroupID
	enrollment, err := s.enrollmentRepo.FindActiveByStudentID(studentID)
	if err != nil {
		return fmt.Errorf("gagal menemukan enrollment aktif: %w", err)
	}

	academicYearID := enrollment.AcademicYearID
	classGroupID := enrollment.ClassGroupID
	level := enrollment.ClassGroup.Level

	// 2. Ambil gender siswa saat ini
	var student model.Student
	if err := s.db.First(&student, studentID).Error; err != nil {
		return fmt.Errorf("gagal menemukan data siswa: %w", err)
	}
	gender := student.Gender

	// 3. Ambil tahun ajaran untuk EndDate
	ay, err := s.acRepo.FindByID(academicYearID)
	if err != nil {
		return fmt.Errorf("gagal menemukan tahun ajaran: %w", err)
	}

	// 4. Hapus semua invoice (initial, registration, monthly) untuk student+academic_year
	//    Urutan: invoice_installments → invoice_items → invoices (FK constraint)
	var invoiceIDs []uint
	if err := s.db.Model(&model.Invoice{}).
		Where("student_id = ? AND academic_year_id = ?", studentID, academicYearID).
		Pluck("id", &invoiceIDs).Error; err != nil {
		return fmt.Errorf("gagal mengambil daftar invoice: %w", err)
	}

	// 4. Hard-delete semua invoice lama (iterate satu per satu untuk pastikan DELETE sungguhan)
	for _, invID := range invoiceIDs {
		if err := s.db.Exec("DELETE FROM payment_items WHERE invoice_item_id IN (SELECT id FROM invoice_items WHERE invoice_id = ?)", invID).Error; err != nil {
			return fmt.Errorf("gagal menghapus payment items untuk invoice %d: %w", invID, err)
		}
		if err := s.db.Exec("DELETE FROM invoice_installments WHERE invoice_id = ?", invID).Error; err != nil {
			return fmt.Errorf("gagal menghapus invoice installments untuk invoice %d: %w", invID, err)
		}
		if err := s.db.Exec("DELETE FROM invoice_items WHERE invoice_id = ?", invID).Error; err != nil {
			return fmt.Errorf("gagal menghapus invoice items untuk invoice %d: %w", invID, err)
		}
		if err := s.db.Exec("DELETE FROM invoices WHERE id = ?", invID).Error; err != nil {
			return fmt.Errorf("gagal menghapus invoice %d: %w", invID, err)
		}
	}

	// 5. Generate ulang invoice initial (hanya untuk new & mutation)
	if enrollment.EnrollmentType == "new" || enrollment.EnrollmentType == "mutation" {
		if err := s.GenerateInitial(dto.GenerateInitialInvoiceParams{
			StudentID:      studentID,
			AcademicYearID: academicYearID,
			Level:          level,
			Gender:         gender,
			CreatedBy:      1,
		}); err != nil {
			return fmt.Errorf("gagal generate invoice initial: %w", err)
		}
	}

	// 6. Generate ulang invoice registration
	if err := s.GenerateRegistration(dto.GenerateRegistrationInvoiceParams{
		StudentID:      studentID,
		AcademicYearID: academicYearID,
		Level:          level,
		Gender:         gender,
		CreatedBy:      1,
	}); err != nil {
		return fmt.Errorf("gagal generate invoice registration: %w", err)
	}

	// 7. Generate ulang invoice bulanan dari start_date enrollment sampai end_date tahun ajaran
	if err := s.GenerateMonthlyRange(
		studentID, academicYearID, classGroupID,
		level, gender,
		enrollment.StartDate, ay.EndDate,
		1,
	); err != nil {
		return fmt.Errorf("gagal generate invoice bulanan: %w", err)
	}

	return nil
}
