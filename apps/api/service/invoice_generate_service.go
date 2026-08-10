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
	RemoveExtracurricularFromFutureInvoices(studentID, extracurricularID, academicYearID uint, endDate time.Time) error
	CleanupExtracurricularInvoices(studentID, extracurricularID uint) error
	SyncExtracurricularMonthlyInvoices() (*dto.ExtracurricularSyncResult, error)
	AddFacilityToMonthlyRange(studentID, facilityID, academicYearID uint) error
	RemoveFacilityFromFutureInvoices(studentID, facilityID, academicYearID uint) error
	ApplyDispensationToExistingInvoices(studentID, academicYearID uint) error
	// RegenerateForStudent menghapus semua invoice (initial, registration, monthly)
	// untuk student di tahun ajaran aktif lalu generate ulang dengan data terbaru.
	RegenerateForStudent(studentID uint) error
	// SyncSavingsMandatoryToMonthlyInvoices menambahkan item tabungan wajib
	// (savings_mandatory) ke invoice bulanan yang belum memilikinya.
	SyncSavingsMandatoryToMonthlyInvoices() (*dto.SavingsMandatorySyncResult, error)
	// WithTx returns an instance whose write-transactions run within tx (as savepoints),
	// so invoice generation can participate in a larger atomic operation.
	WithTx(tx *gorm.DB) InvoiceGenerateService
}

type invoiceGenerateService struct {
	db                    *gorm.DB
	invoiceRepo           repository.InvoiceRepository
	invoiceItemRepo       repository.InvoiceItemRepository
	feeConfigRepo         repository.FeeConfigRepository
	feeConfigItemRepo     repository.FeeConfigItemRepository
	effectiveDayRepo      repository.EffectiveDayRepository
	enrollmentRepo        repository.StudentEnrollmentRepository
	extracurricularRepo   repository.ExtracurricularRepository
	seRepo                repository.StudentExtracurricularRepository
	acRepo                repository.AcademicYearRepository
	daycareRepo           repository.DaycareEnrollmentRepository
	daycareMonthlyAttRepo repository.DaycareMonthlyAttendanceRepository
	facilityRepo          repository.FacilityRepository
	sfRepo                repository.StudentFacilityRepository
	dispensationRepo      repository.DispensationRepository
	exceptionalityRepo    repository.StudentExceptionalityRepository
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
	exceptionalityRepo repository.StudentExceptionalityRepository,
	daycareMonthlyAttRepo repository.DaycareMonthlyAttendanceRepository,
) InvoiceGenerateService {
	return &invoiceGenerateService{
		db:                    db,
		invoiceRepo:           invoiceRepo,
		invoiceItemRepo:       invoiceItemRepo,
		feeConfigRepo:         feeConfigRepo,
		feeConfigItemRepo:     feeConfigItemRepo,
		effectiveDayRepo:      effectiveDayRepo,
		enrollmentRepo:        enrollmentRepo,
		extracurricularRepo:   extracurricularRepo,
		seRepo:                seRepo,
		acRepo:                acRepo,
		daycareRepo:           daycareRepo,
		daycareMonthlyAttRepo: daycareMonthlyAttRepo,
		facilityRepo:          facilityRepo,
		sfRepo:                sfRepo,
		dispensationRepo:      dispensationRepo,
		exceptionalityRepo:    exceptionalityRepo,
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
		initialAmount := utility.SumFeeConfigItems(items)
		var dispensationItems []model.InvoiceItem

		// Apply initial dispensations
		if s.dispensationRepo != nil {
			now := time.Now()
			month := uint(now.Month())
			year := uint(now.Year())
			dispensations, _ := s.dispensationRepo.FindActiveForStudentMonth(
				params.StudentID, params.AcademicYearID, month, year, "initial",
			)
			if len(dispensations) > 0 {
				totalDiscount := CalculateTotalDiscount(initialAmount, dispensations)
				remainingDiscount := totalDiscount
				for _, d := range dispensations {
					discountForThis := float64(0)
					if d.DiscountType == "percent" {
						discountForThis = initialAmount * d.DiscountValue / 100
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
						dispensationItems = append(dispensationItems, model.InvoiceItem{
							Name:     label,
							Category: "dispensation",
							Amount:   -discountForThis,
							Status:   "paid",
						})
					}
				}
			}
		}

		totalAmount := initialAmount
		for _, di := range dispensationItems {
			totalAmount += di.Amount
		}

		invoice := &model.Invoice{
			StudentID:      params.StudentID,
			AcademicYearID: params.AcademicYearID,
			Type:           "initial",
			Status:         "unpaid",
			TotalAmount:    totalAmount,
		}
		if err := s.invoiceRepo.WithTx(tx).Create(invoice); err != nil {
			return err
		}

		allItems := utility.MapFeeItemsToInvoiceItems(invoice.ID, items)
		for i := range dispensationItems {
			dispensationItems[i].InvoiceID = invoice.ID
			allItems = append(allItems, dispensationItems[i])
		}
		return s.invoiceItemRepo.WithTx(tx).BulkCreate(allItems)
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

	// Cek apakah siswa exceptional (ABK) — SPP akan dikalikan 2
	isExceptional := false
	if s.exceptionalityRepo != nil {
		_, err := s.exceptionalityRepo.FindActiveByStudentID(params.StudentID)
		isExceptional = err == nil
	}

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
		amount := item.Amount
		name := item.Name
		if isExceptional {
			amount = amount * 2
			name = name + " (ABK)"
		}
		invoiceItems = append(invoiceItems, model.InvoiceItem{
			Name:        name,
			Category:    item.Category,
			Amount:      amount,
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
		// Skip jika item punya start_month dan bulan ini belum mencapai start_month
		if item.StartMonth != nil && params.Month < *item.StartMonth {
			continue
		}
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
							Status:      "paid",
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
		Where("invoices.student_id = ? AND invoices.academic_year_id = ? AND invoice_items.category = ? AND invoices.type IN ?",
			params.StudentID, params.AcademicYearID, "daycare", []string{"initial", "daycare_initial"}).
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
	log.Printf("[RecalculateInfaqHarian] START classGroupID=%d month=%d year=%d", classGroupID, month, year)
	// Cek per rombel dulu, fallback ke per jenjang
	effectiveDays, _ := s.effectiveDayRepo.FindByClassGroupMonthYear(classGroupID, month, year)
	if effectiveDays == nil || effectiveDays.ID == 0 {
		var level string
		s.db.Table("class_groups").Select("level").Where("id = ?", classGroupID).Scan(&level)
		log.Printf("[RecalculateInfaqHarian] no per-rombel ED, fallback level=%s", level)
		if level != "" {
			effectiveDays, _ = s.effectiveDayRepo.FindByLevelMonthYear(level, month, year)
		}
	}
	if effectiveDays == nil || effectiveDays.ID == 0 {
		log.Printf("[RecalculateInfaqHarian] no effective days found, abort")
		return nil // no effective days at all
	}
	log.Printf("[RecalculateInfaqHarian] effectiveDays found: id=%d totalDays=%d totalMondays=%d", effectiveDays.ID, effectiveDays.TotalDays, effectiveDays.TotalMondays)

	// Get all active students in this class group
	enrollments, err := s.enrollmentRepo.FindActiveByClassGroupID(classGroupID)
	if err != nil {
		log.Printf("[RecalculateInfaqHarian] error FindActiveByClassGroupID: %v", err)
		return err
	}
	log.Printf("[RecalculateInfaqHarian] found %d active enrollments", len(enrollments))

	for _, enrollment := range enrollments {
		invoice, err := s.invoiceRepo.FindMonthlyByStudent(enrollment.StudentID, month, year)
		if err != nil {
			log.Printf("[RecalculateInfaqHarian] studentID=%d no monthly invoice for month=%d year=%d: %v", enrollment.StudentID, month, year, err)
			continue // no monthly invoice for this student yet
		}
		log.Printf("[RecalculateInfaqHarian] studentID=%d invoiceID=%d found, items count will be processed", enrollment.StudentID, invoice.ID)

		// Bungkus update per-invoice dalam transaksi agar atomic
		err = s.db.Transaction(func(tx *gorm.DB) error {
			txItemRepo := s.invoiceItemRepo.WithTx(tx)

			items, err := txItemRepo.FindByInvoiceID(invoice.ID)
			if err != nil {
				log.Printf("[RecalculateInfaqHarian] error FindByInvoiceID invoiceID=%d: %v", invoice.ID, err)
				return err
			}
			log.Printf("[RecalculateInfaqHarian] invoiceID=%d has %d items", invoice.ID, len(items))

			needsRecalc := false
			for _, item := range items {
				if item.Category == "monthly_infaq" {
					log.Printf("[RecalculateInfaqHarian] processing monthly_infaq item id=%d name=%s quantity=%v", item.ID, item.Name, item.Quantity)
					// Catatan: override manual quantity saat ini tidak ditracking secara eksplisit.
					// RecalculateInfaqHarian dipanggil khusus saat hari efektif berubah,
					// jadi semua item harus diupdate. Jika nanti perlu tracking manual override,
					// tambahkan kolom is_quantity_overridden di invoice_items.

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
					log.Printf("[RecalculateInfaqHarian] will update item %d: quantity %d->%d, amount %.0f->%.0f", item.ID, item.Quantity, newQuantity, item.Amount, newAmount)

					if item.PaidAmount == 0 {
						item.Amount = newAmount
						item.Quantity = &newQuantity
						item.UnitPrice = &unitPrice
						item.Name = fmt.Sprintf("%s (%d hari)", infaqFeeItems[0].Name, effectiveDays.TotalDays)
						item.Notes = ""
						item.Status = "unpaid"
						txItemRepo.Update(&item)
						needsRecalc = true
					} else if newAmount >= item.PaidAmount {
						item.Amount = newAmount
						item.Quantity = &newQuantity
						item.UnitPrice = &unitPrice
						item.Name = fmt.Sprintf("%s (%d hari)", infaqFeeItems[0].Name, effectiveDays.TotalDays)
						// Recalculate status berdasarkan paid_amount vs amount baru
						if item.PaidAmount >= newAmount {
							item.Status = "paid"
						} else {
							item.Status = "partial"
						}
						txItemRepo.Update(&item)
						needsRecalc = true
					}
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
					newQuantity := effectiveDays.TotalMondays
					unitPrice := mandatoryItems[0].Amount

					if item.PaidAmount == 0 {
						item.Amount = newAmount
						item.Quantity = &newQuantity
						item.UnitPrice = &unitPrice
						item.Name = fmt.Sprintf("%s (%d Senin)", mandatoryItems[0].Name, effectiveDays.TotalMondays)
						item.Status = "unpaid"
						txItemRepo.Update(&item)
						needsRecalc = true
					} else if newAmount >= item.PaidAmount {
						item.Amount = newAmount
						item.Quantity = &newQuantity
						item.UnitPrice = &unitPrice
						item.Name = fmt.Sprintf("%s (%d Senin)", mandatoryItems[0].Name, effectiveDays.TotalMondays)
						// Recalculate status berdasarkan paid_amount vs amount baru
						if item.PaidAmount >= newAmount {
							item.Status = "paid"
						} else {
							item.Status = "partial"
						}
						txItemRepo.Update(&item)
						needsRecalc = true
					}
				}
			}

			if needsRecalc {
				log.Printf("[RecalculateInfaqHarian] recalculating total for invoiceID=%d", invoice.ID)
				return s.recalculateInvoiceTotalWithTx(tx, invoice.ID)
			}
			log.Printf("[RecalculateInfaqHarian] no recalc needed for invoiceID=%d", invoice.ID)
			return nil
		})
		if err != nil {
			log.Printf("[RecalculateInfaqHarian] transaction error for studentID=%d: %v", enrollment.StudentID, err)
			continue // log error silently, lanjut ke siswa berikutnya
		}
	}

	log.Printf("[RecalculateInfaqHarian] DONE classGroupID=%d month=%d year=%d", classGroupID, month, year)
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

	// Get student's level for per-level fee item filtering
	level := ""
	enr, _ := s.enrollmentRepo.FindActiveByStudentID(studentID)
	if enr != nil {
		level = enr.ClassGroup.Level
	}

	months := utility.MonthRangeFromDate(se.StartDate, ay.EndDate)

	for _, m := range months {
		if err := s.addExtracurricularItemToMonthly(studentID, academicYearID, m.Month, m.Year, level, feeItems); err != nil {
			return err
		}
	}

	return nil
}

func (s *invoiceGenerateService) addExtracurricularItemToMonthly(studentID, academicYearID, month, year uint, level string, feeItems []model.FeeConfigItem) error {
	invoice, err := s.invoiceRepo.FindMonthlyByStudent(studentID, month, year)
	if err != nil {
		return fmt.Errorf("monthly invoice not found for student %d month %d/%d", studentID, month, year)
	}

	// Check idempotency: skip fee items that already exist on this invoice.
	// Use a set keyed by name+category + append after each create so that
	// fee items with identical name (per-level variants) don't duplicate.
	existingItems, _ := s.invoiceItemRepo.FindByInvoiceID(invoice.ID)
	existingKeys := make(map[string]bool)
	for _, existing := range existingItems {
		existingKeys[existing.Name+"|"+existing.Category] = true
	}
	for _, feeItem := range feeItems {
		key := feeItem.Name + "|" + feeItem.Category
		if existingKeys[key] {
			continue
		}

		// Skip jika level fee item tidak cocok dengan level siswa
		if level != "" && feeItem.Level != "all" && feeItem.Level != level {
			continue
		}

		// Skip jika item punya start_month dan bulan ini belum mencapai start_month
		if feeItem.StartMonth != nil && month < *feeItem.StartMonth {
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
		existingKeys[key] = true // prevent subsequent fee items with same name from duplicating
	}

	return s.recalculateInvoiceTotal(invoice.ID)
}

func (s *invoiceGenerateService) RemoveExtracurricularFromFutureInvoices(studentID, extracurricularID, academicYearID uint, endDate time.Time) error {
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

	// Gunakan end_date (bukan time.Now()) agar akurat meskipun di-backdate
	fromMonth := uint(endDate.Month())
	fromYear := uint(endDate.Year())

	invoices, err := s.invoiceRepo.FindMonthlyByStudentFromMonth(studentID, fromMonth, fromYear)
	if err != nil {
		return nil
	}

	for _, inv := range invoices {
		items, _ := s.invoiceItemRepo.FindByInvoiceID(inv.ID)
		deleted := false
		for _, item := range items {
			for _, feeItem := range feeItems {
				if item.Name == feeItem.Name && item.Category == feeItem.Category && item.PaidAmount == 0 {
					// Hard delete — hindari soft-delete agar tidak menyebabkan duplikat saat enrollment ulang.
					s.db.Unscoped().Delete(&model.InvoiceItem{}, item.ID)
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

// CleanupExtracurricularInvoices adalah recovery endpoint untuk admin.
// Menghapus item ekskul dari invoice bulan ini dan seterusnya tanpa harus
// regenerate seluruh invoice (yang akan menghapus riwayat pembayaran).
func (s *invoiceGenerateService) CleanupExtracurricularInvoices(studentID, extracurricularID uint) error {
	// Cari tahun ajaran aktif dari enrollment
	enr, err := s.enrollmentRepo.FindActiveByStudentID(studentID)
	if err != nil {
		return fmt.Errorf("enrollment aktif tidak ditemukan untuk siswa %d: %w", studentID, err)
	}
	return s.RemoveExtracurricularFromFutureInvoices(
		studentID, extracurricularID, enr.AcademicYearID, time.Now(),
	)
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
	allPaid := true
	for _, item := range items {
		total += item.Amount
		paid += item.PaidAmount
		if item.Status != "paid" {
			allPaid = false
		}
	}

	// Invoice lunas hanya jika seluruh item lunas, bukan berdasarkan jumlah
	status := "unpaid"
	if paid > 0 {
		if allPaid {
			status = "paid"
		} else {
			status = "partial"
		}
	}
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
	allPaid := true
	for _, item := range items {
		total += item.Amount
		paid += item.PaidAmount
		if item.Status != "paid" {
			allPaid = false
		}
	}

	// Invoice lunas hanya jika seluruh item lunas, bukan berdasarkan jumlah
	status := "unpaid"
	if paid > 0 {
		if allPaid {
			status = "paid"
		} else {
			status = "partial"
		}
	}
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
// itemCategory allows distinguishing SPD ("daycare") from konsumsi ("daycare_meal").
func (s *invoiceGenerateService) upsertDaycareAttendanceItem(invoiceID uint, namePrefix string, name string, amount float64, quantity *uint, unitPrice *float64, itemCategory string) error {
	items, _ := s.invoiceItemRepo.FindByInvoiceID(invoiceID)

	var totalPaidAmount float64
	var totalPaidQty uint

	// Determine which categories to clean up: the target category, plus
	// the legacy "daycare" category when writing "daycare_meal" (migration).
	matchCategories := []string{itemCategory}
	if itemCategory == "daycare_meal" {
		matchCategories = append(matchCategories, "daycare")
	}

	for _, item := range items {
		matched := false
		for _, mc := range matchCategories {
			if item.Category == mc && strings.HasPrefix(item.Name, namePrefix) {
				matched = true
				break
			}
		}
		if !matched {
			continue
		}

		totalPaidAmount += item.PaidAmount
		if item.Quantity != nil && item.PaidAmount > 0 {
			totalPaidQty += *item.Quantity
		}
		// Hapus item unpaid (akan diganti dengan yg baru)
		if item.PaidAmount == 0 {
			s.invoiceItemRepo.Delete(item.ID)
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
		InvoiceID: invoiceID, Name: itemName, Category: itemCategory,
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

		// Hapus item daycare lama (unpaid) sebelum inject SPD baru — mencegah akumulasi
		// jika time_slot/age_group berubah tanpa melalui Update (misal: SyncDaycareMonthlyInvoices)
		s.invoiceItemRepo.DeleteUnpaidByInvoiceAndCategory(inv.ID, "daycare")

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

	// ─── Monthly attendance (primary) or fallback to daily attendance ───
	feeConfig, err := s.feeConfigRepo.FindByAcademicYearID(params.AcademicYearID)
	if err != nil || feeConfig == nil {
		log.Printf("[Daycare SPD] fee config tidak ditemukan untuk ay=%d: %v", params.AcademicYearID, err)
		return nil
	}

	// Try monthly attendance first
	monthlyAtt, _ := s.daycareMonthlyAttRepo.FindByStudentMonthYear(params.StudentID, params.Month, params.Year)

	var spdDays, mealDays uint

	if monthlyAtt != nil && (monthlyAtt.SPDDays > 0 || monthlyAtt.MealDays > 0) {
		spdDays = monthlyAtt.SPDDays
		mealDays = monthlyAtt.MealDays
		log.Printf("[Daycare SPD] Menggunakan data kehadiran bulanan: spd=%d meal=%d", spdDays, mealDays)
	} else {
		// Fallback: hitung dari absensi harian
		start := time.Date(int(params.Year), time.Month(params.Month), 1, 0, 0, 0, 0, time.UTC)
		end := start.AddDate(0, 1, 0)

		var atts []model.DaycareAttendance
		s.db.Where("student_id = ? AND date >= ? AND date < ? AND time_slot != ''", params.StudentID, start, end).
			Order("date ASC").Find(&atts)

		if len(atts) == 0 {
			log.Printf("[Daycare SPD] tidak ada attendance atau data bulanan untuk %d/%d", params.Month, params.Year)
			return nil
		}

		// Hitung per slot (untuk Regular SPD) + meal days
		slotCount := make(map[string]int)
		for _, a := range atts {
			if a.TimeSlot != "" {
				slotCount[a.TimeSlot]++
			}
			if a.WithMeal {
				mealDays++
			}
		}

		log.Printf("[Daycare SPD] Fallback absensi harian: slotCount=%v mealDays=%d", slotCount, mealDays)

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

		// Regular: SPD per time slot (fallback)
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
				log.Printf("[Daycare SPD] Regular fallback: %s = %d x %.0f", name, count, dailyRate)
				if err := s.upsertDaycareAttendanceItem(invoice.ID, spdItem.Name, name, dailyRate*float64(count), &qty, &dailyRate, "daycare"); err != nil {
					return err
				}
			}
		}

		// Meal fallback
		if mealDays > 0 {
			mealItem, err := s.feeConfigItemRepo.FindByItemKey(feeConfig.ID, "daycare_regular_meal", "all", "all")
			if err == nil && mealItem != nil {
				dailyRate := mealItem.Amount
				qty := uint(mealDays)
				name := fmt.Sprintf("%s (%d hari)", mealItem.Name, mealDays)
				log.Printf("[Daycare SPD] Meal fallback: %d hari x %.0f", mealDays, dailyRate)
				if err := s.upsertDaycareAttendanceItem(invoice.ID, mealItem.Name, name, dailyRate*float64(mealDays), &qty, &dailyRate, "daycare_meal"); err != nil {
					return err
				}
			}
		}

		// Recalculate + apply daycare dispensations
		if err := s.recalculateInvoiceTotal(invoice.ID); err != nil {
			return err
		}
		if err := s.applyDispensationToInvoice(invoice, "monthly_spp", "daycare"); err != nil {
			log.Printf("[Daycare SPD] Gagal apply dispensasi: %v", err)
		}
		return s.recalculateInvoiceTotal(invoice.ID)
	}

	// ─── Monthly attendance path ───
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

	// Regular SPD: spd_days × daily SPD rate
	if de.Category == "regular" && spdDays > 0 {
		spdKey := buildDaycareSPDKey("regular", de.TimeSlot, de.AgeGroup)
		spdItem, err := s.feeConfigItemRepo.FindByItemKey(feeConfig.ID, spdKey, "all", "all")
		if err != nil || spdItem == nil {
			log.Printf("[Daycare SPD] Regular: fee item tidak ditemukan key=%s err=%v", spdKey, err)
		} else {
			dailyRate := spdItem.Amount
			qty := spdDays
			name := fmt.Sprintf("%s (%d hari)", spdItem.Name, spdDays)
			log.Printf("[Daycare SPD] Regular monthly: %s = %d x %.0f = %.0f", name, spdDays, dailyRate, dailyRate*float64(spdDays))
			if err := s.upsertDaycareAttendanceItem(invoice.ID, spdItem.Name, name, dailyRate*float64(spdDays), &qty, &dailyRate, "daycare"); err != nil {
				return err
			}
		}
	}

	// Meal (both categories: monthly attendance × daily meal rate)
	if mealDays > 0 {
		mealItem, err := s.feeConfigItemRepo.FindByItemKey(feeConfig.ID, "daycare_regular_meal", "all", "all")
		if err == nil && mealItem != nil {
			dailyRate := mealItem.Amount
			qty := mealDays
			name := fmt.Sprintf("%s (%d hari)", mealItem.Name, mealDays)
			log.Printf("[Daycare SPD] Meal monthly: %d hari x %.0f = %.0f", mealDays, dailyRate, dailyRate*float64(mealDays))
			if err := s.upsertDaycareAttendanceItem(invoice.ID, mealItem.Name, name, dailyRate*float64(mealDays), &qty, &dailyRate, "daycare_meal"); err != nil {
				return err
			}
		} else {
			log.Printf("[Daycare SPD] Meal: fee item daycare_regular_meal tidak ditemukan")
		}
	}

	// Recalculate + apply daycare dispensations
	if err := s.recalculateInvoiceTotal(invoice.ID); err != nil {
		return err
	}
	if err := s.applyDispensationToInvoice(invoice, "monthly_spp", "daycare"); err != nil {
		log.Printf("[Daycare SPD] Gagal apply dispensasi: %v", err)
	}
	return s.recalculateInvoiceTotal(invoice.ID)
}

// applyDispensationToInvoice removes old unpaid dispensation items for the given
// fee categories and re-applies active dispensations. For "daycare" the fixed
// discount value is multiplied by total attendance days (Quantity sum).
func (s *invoiceGenerateService) applyDispensationToInvoice(invoice *model.Invoice, categories ...string) error {
	if s.dispensationRepo == nil {
		return nil
	}

	// Gunakan bulan/tahun saat ini sebagai fallback untuk invoice non-bulanan
	// (initial, registration) yang tidak memiliki Month/Year.
	month := uint(time.Now().Month())
	year := uint(time.Now().Year())
	if invoice.Month != nil && invoice.Year != nil {
		month = *invoice.Month
		year = *invoice.Year
	}

	// Hapus semua item dispensasi lama yang belum dibayar agar tidak menumpuk
	// saat fungsi ini dipanggil berulang (misal dari GenerateDaycareMonthlyInvoices).
	if _, err := s.invoiceItemRepo.DeleteUnpaidByInvoiceAndCategory(invoice.ID, "dispensation"); err != nil {
		return err
	}

	items, err := s.invoiceItemRepo.FindByInvoiceID(invoice.ID)
	if err != nil {
		return err
	}

	for _, cat := range categories {
		// Map dispensation fee_category to the invoice item category it affects.
		// "daycare" dispensation only targets konsumsi ("daycare_meal"), not SPD.
		itemCat := cat
		if cat == "daycare" {
			itemCat = "daycare_meal"
		}

		// 2. Calculate the base amount for this category
		baseAmount := float64(0)
		attendanceDays := uint(0)
		for _, item := range items {
			if item.Category == itemCat {
				baseAmount += item.Amount
				if item.Quantity != nil {
					attendanceDays += *item.Quantity
				}
			}
		}

		if baseAmount <= 0 {
			continue
		}

		// 3. Find active dispensations for this month + category
		dispensations, _ := s.dispensationRepo.FindActiveForStudentMonth(
			invoice.StudentID, invoice.AcademicYearID, month, year, cat,
		)

		if len(dispensations) == 0 {
			continue
		}

		// 4. Calculate total discount
		var totalDiscount float64
		for _, d := range dispensations {
			var disc float64
			if d.DiscountType == "percent" {
				disc = baseAmount * d.DiscountValue / 100
			} else {
				// Fixed: for daycare, multiply by attendance days; for SPP/initial, flat
				if cat == "daycare" && attendanceDays > 0 {
					disc = d.DiscountValue * float64(attendanceDays)
				} else {
					disc = d.DiscountValue
				}
			}
			totalDiscount += disc
		}
		if totalDiscount > baseAmount {
			totalDiscount = baseAmount
		}

		// 5. Create dispensation line items (one per dispensation record)
		remainingDiscount := totalDiscount
		var newItems []model.InvoiceItem
		for _, d := range dispensations {
			discountForThis := float64(0)
			if d.DiscountType == "percent" {
				discountForThis = baseAmount * d.DiscountValue / 100
			} else {
				if cat == "daycare" && attendanceDays > 0 {
					discountForThis = d.DiscountValue * float64(attendanceDays)
				} else {
					discountForThis = d.DiscountValue
				}
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
				newItems = append(newItems, model.InvoiceItem{
					InvoiceID:   invoice.ID,
					Name:        label,
					Category:    "dispensation",
					Amount:      -discountForThis,
					IsMandatory: true,
					Status:      "paid",
					Notes:       d.Notes,
				})
			}
		}

		for i := range newItems {
			if err := s.invoiceItemRepo.Create(&newItems[i]); err != nil {
				return err
			}
		}
	}

	return nil
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
		for _, cat := range []string{"daycare", "daycare_meal"} {
			deleted, err := s.invoiceItemRepo.DeleteUnpaidByInvoiceAndCategory(inv.ID, cat)
			if err != nil {
				return err
			}
			if deleted > 0 {
				if err := s.recalculateInvoiceTotal(inv.ID); err != nil {
					return err
				}
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

	ay, err := s.acRepo.FindByID(academicYearID)
	if err != nil {
		return nil
	}

	allSF, _ := s.sfRepo.FindActiveByStudentID(studentID, academicYearID)
	var startDate time.Time
	var feeConfigItemID *uint
	for _, enrollment := range allSF {
		if enrollment.FacilityID == facilityID {
			startDate = enrollment.StartDate
			feeConfigItemID = enrollment.FeeConfigItemID
			break
		}
	}
	if startDate.IsZero() {
		return nil
	}

	// Use specific FeeConfigItem if student enrolled with one; fallback to all items matching facility name
	var feeItems []model.FeeConfigItem
	if feeConfigItemID != nil {
		item, err := s.feeConfigItemRepo.FindByID(*feeConfigItemID)
		if err == nil && item != nil {
			feeItems = []model.FeeConfigItem{*item}
		}
	}
	if len(feeItems) == 0 {
		itemKey := facilityItemKey(facility.Name)
		feeItems, _ = s.feeConfigItemRepo.FindByItemKeys(feeConfig.ID, []string{itemKey})
		if len(feeItems) == 0 {
			return nil
		}
	}

	// Bersihkan item fasilitas yang sudah soft-deleted (defense in depth)
	s.db.Unscoped().
		Where("category = ? AND name ILIKE ? AND deleted_at IS NOT NULL", "facility", "%"+facility.Name+"%").
		Where("invoice_id IN (SELECT id FROM invoices WHERE student_id = ? AND type = 'monthly' AND academic_year_id = ?)", studentID, academicYearID).
		Delete(&model.InvoiceItem{})

	// Hapus item fasilitas (unpaid) di bulan SEBELUM start_date —
	// menangani kasus start_date berubah mundur (misal Juli → Agustus)
	s.db.
		Where("category = ? AND name ILIKE ? AND paid_amount = 0 AND deleted_at IS NULL", "facility", "%"+facility.Name+"%").
		Where("invoice_id IN (SELECT id FROM invoices WHERE student_id = ? AND type = 'monthly' AND academic_year_id = ? AND ((year < ?) OR (year = ? AND month < ?)))",
			studentID, academicYearID, uint(startDate.Year()), uint(startDate.Year()), uint(startDate.Month())).
		Delete(&model.InvoiceItem{})

	months := utility.MonthRangeFromDate(startDate, ay.EndDate)

	for _, m := range months {
		invoice, err := s.invoiceRepo.FindMonthlyByStudent(studentID, m.Month, m.Year)
		if err != nil {
			continue
		}

		existingItems, _ := s.invoiceItemRepo.FindByInvoiceID(invoice.ID)
		facilityExists := false
		for _, existing := range existingItems {
			if existing.Category == "facility" && strings.Contains(existing.Name, facility.Name) {
				facilityExists = true
				break
			}
		}
		if facilityExists {
			continue
		}

		for _, feeItem := range feeItems {
			amount := feeItem.Amount
			itemName := feeItem.Name
			var qty *uint
			var unitPx *float64

			if feeItem.Unit == "per_day" {
				enrollment, _ := s.enrollmentRepo.FindActiveByStudentID(studentID)
				if enrollment != nil {
					// Cek per rombel dulu, fallback ke per jenjang
					ed, _ := s.effectiveDayRepo.FindByClassGroupMonthYear(enrollment.ClassGroupID, m.Month, m.Year)
					if ed == nil || ed.ID == 0 {
						ed, _ = s.effectiveDayRepo.FindByLevelMonthYear(enrollment.ClassGroup.Level, m.Month, m.Year)
					}
					if ed != nil && ed.ID != 0 {
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
				// Hard delete — hindari soft-delete agar item benar-benar hilang
				// dan tidak menyebabkan duplikat saat enrollment ulang.
				s.db.Unscoped().Delete(&model.InvoiceItem{}, item.ID)
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
// It removes old unpaid dispensation items and re-applies based on current
// active dispensations for all supported categories (monthly_spp, daycare).
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
		if inv.Month == nil || inv.Year == nil {
			continue
		}

		// Remove existing unpaid dispensation items
		items, _ := s.invoiceItemRepo.FindByInvoiceID(inv.ID)
		for _, item := range items {
			if item.Category == "dispensation" && item.PaidAmount == 0 {
				s.invoiceItemRepo.Delete(item.ID)
			}
		}

		// Re-apply dispensations for all relevant categories
		if err := s.applyDispensationToInvoice(&inv, "monthly_spp", "daycare"); err != nil {
			log.Printf("[Dispensasi] Gagal apply ke invoice %d: %v", inv.ID, err)
		}

		s.recalculateInvoiceTotal(inv.ID)
	}

	// Also apply to initial invoices (biaya awal pendidikan) — one-time, non-monthly
	initialInvoices, _ := s.invoiceRepo.FindByStudentID(studentID, "initial", "", academicYearID, true)
	for _, inv := range initialInvoices {
		if inv.Status == "paid" {
			continue // skip fully paid invoices
		}

		// Remove existing unpaid dispensation items
		items, _ := s.invoiceItemRepo.FindByInvoiceID(inv.ID)
		for _, item := range items {
			if item.Category == "dispensation" && item.PaidAmount == 0 {
				s.invoiceItemRepo.Delete(item.ID)
			}
		}

		if err := s.applyDispensationToInvoice(&inv, "initial"); err != nil {
			log.Printf("[Dispensasi] Gagal apply ke invoice initial %d: %v", inv.ID, err)
		}

		s.recalculateInvoiceTotal(inv.ID)
	}

	return nil
}

// SyncSavingsMandatoryToMonthlyInvoices menambahkan item tabungan wajib ke
// invoice bulanan yang belum memilikinya. Berguna saat item fee config baru
// ditambahkan (mis. tabungan_wajib_mutiara) ke database yang sudah memiliki
// invoice existing.
func (s *invoiceGenerateService) SyncSavingsMandatoryToMonthlyInvoices() (*dto.SavingsMandatorySyncResult, error) {
	ay, err := s.acRepo.FindActive()
	if err != nil {
		return nil, fmt.Errorf("tahun ajaran aktif tidak ditemukan")
	}

	// Ambil semua enrollment aktif untuk level yang memiliki tabungan wajib
	berlianEnrollments, _ := s.enrollmentRepo.FindAllActiveByLevel(ay.ID, "berlian")
	mutiaraEnrollments, _ := s.enrollmentRepo.FindAllActiveByLevel(ay.ID, "mutiara")
	allEnrollments := append(berlianEnrollments, mutiaraEnrollments...)

	result := &dto.SavingsMandatorySyncResult{
		TotalStudents: len(allEnrollments),
	}

	feeConfig, err := s.feeConfigRepo.FindByAcademicYearID(ay.ID)
	if err != nil || feeConfig == nil {
		return nil, fmt.Errorf("fee config tidak ditemukan untuk tahun ajaran aktif")
	}

	for _, enr := range allEnrollments {
		invoices, err := s.invoiceRepo.FindMonthlyByStudentAcademicYear(enr.StudentID, ay.ID)
		if err != nil {
			result.Errors = append(result.Errors, dto.SavingsMandatorySyncError{
				StudentID: enr.StudentID,
				Message:   fmt.Sprintf("gagal mengambil invoice: %v", err),
			})
			continue
		}

		result.TotalInvoices += len(invoices)

		for _, inv := range invoices {
			// Cek apakah invoice ini sudah punya item savings_mandatory
			existing, _ := s.invoiceItemRepo.FindByInvoiceAndCategory(inv.ID, "savings_mandatory")
			if existing != nil && existing.ID != 0 {
				result.TotalSkipped++
				continue
			}

			// Jangan tambahkan item ke invoice yang sudah lunas — tidak adil
			// untuk orang tua yang sudah membayar penuh sebelum item fee config ada.
			if inv.Status == "paid" {
				result.TotalSkipped++
				continue
			}

			// Ambil item fee config savings_mandatory untuk level & gender siswa
			mandatoryItems, _ := s.feeConfigItemRepo.FindByStudentForCategory(
				feeConfig.ID, "savings_mandatory", enr.ClassGroup.Level, enr.Student.Gender,
			)
			if len(mandatoryItems) == 0 {
				result.TotalSkipped++
				continue
			}

			// Ambil effective days untuk perhitungan per_monday (berlian)
			effectiveDays, _ := s.effectiveDayRepo.FindByClassGroupMonthYear(
				enr.ClassGroupID, *inv.Month, *inv.Year,
			)
			if effectiveDays == nil || effectiveDays.ID == 0 {
				effectiveDays, _ = s.effectiveDayRepo.FindByLevelMonthYear(
					enr.ClassGroup.Level, *inv.Month, *inv.Year,
				)
			}

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

				newItem := &model.InvoiceItem{
					InvoiceID:   inv.ID,
					Name:        name,
					Category:    "savings_mandatory",
					Amount:      amount,
					Quantity:    quantity,
					UnitPrice:   unitPrice,
					IsMandatory: true,
				}
				if err := s.invoiceItemRepo.Create(newItem); err != nil {
					result.Errors = append(result.Errors, dto.SavingsMandatorySyncError{
						StudentID: enr.StudentID,
						InvoiceID: inv.ID,
						Message:   fmt.Sprintf("gagal membuat item: %v", err),
					})
					continue
				}
			}

			if err := s.recalculateInvoiceTotal(inv.ID); err != nil {
				result.Errors = append(result.Errors, dto.SavingsMandatorySyncError{
					StudentID: enr.StudentID,
					InvoiceID: inv.ID,
					Message:   fmt.Sprintf("gagal rekalkulasi total: %v", err),
				})
				continue
			}

			result.TotalSynced++
		}
	}

	return result, nil
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
