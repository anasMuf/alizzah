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
	DeleteDaycareInitial(studentID, academicYearID uint) error
	SyncDaycareMonthlyInvoices() (*dto.DaycareSyncResult, error)
	RecalculateInfaqHarian(classGroupID, month, year uint) error
	AddExtracurricularToMonthlyRange(studentID, extracurricularID, academicYearID uint) error
	// RemoveExtracurricularInvoices menghapus item unpaid ekskul dari invoice mulai
	// bulan startDate ke depan (Aturan B: berhenti PASTA = semua item unpaid PASTA
	// dibersihkan, termasuk bulan sebelum end_date).
	RemoveExtracurricularInvoices(studentID, extracurricularID, academicYearID uint, startDate time.Time) error
	CleanupExtracurricularInvoices(studentID, extracurricularID uint) error
	// PlanExtracurricularCleanupInvoices menghitung (dry-run) item yang akan dihapus
	// oleh CleanupExtracurricularInvoices — read-only, untuk preview UI.
	PlanExtracurricularCleanupInvoices(studentID, extracurricularID uint) (*dto.ExtracurricularCleanupPreviewResponse, error)
	SyncExtracurricularMonthlyInvoices() (*dto.ExtracurricularSyncResult, error)
	// PlanExtracurricularSync menghitung rencana sync (dry-run, read-only).
	PlanExtracurricularSync() (*dto.ExtracurricularPreviewResponse, error)
	// PlanDaycareSync menghitung rencana sync daycare (dry-run, read-only).
	PlanDaycareSync() (*dto.DaycarePreviewResponse, error)
	AddFacilityToMonthlyRange(studentID, facilityID, academicYearID uint) error
	RemoveFacilityFromFutureInvoices(studentID, facilityID, academicYearID uint, extraZoneNames ...string) error
	// RemoveFacilityInvoices menghapus item unpaid fasilitas dari invoice mulai
	// bulan startDate ke depan (Aturan B saat Unenroll) — termasuk bulan-bulan
	// sebelum hari ini. Jalur ganti zona TETAP pakai RemoveFacilityFromFutureInvoices.
	RemoveFacilityInvoices(studentID, facilityID, academicYearID uint, startDate time.Time, extraZoneNames ...string) error
	// RewriteFacilityMonthItem menulis ulang item fasilitas pada invoice bulan
	// tertentu milik siswa sesuai zona feeItem — dipakai semantik zona default &
	// override per bulan (epic zona-bulanan). Quantity (hari) & paid_amount
	// dipertahankan; item paid hanya ditulis bila allowPaid=true.
	RewriteFacilityMonthItem(studentID, facilityID, month, year uint, feeItem *model.FeeConfigItem, allowPaid bool) (*dto.FacilityMonthRewriteResult, error)
	// Billing month exclusions (skip tagihan bulanan)
	// RemoveExtracurricularItemFromMonthly menghapus item unpaid ekstrakurikuler
	// dari invoice bulan tertentu (saat bulan ditandai skip).
	RemoveExtracurricularItemFromMonthly(studentID, extracurricularID, month, year uint) error
	// RestoreExtracurricularItemToMonthly menambahkan kembali item ekstrakurikuler
	// ke invoice bulan tertentu (saat skip dicabut).
	RestoreExtracurricularItemToMonthly(studentID, extracurricularID, academicYearID, month, year uint) error
	// RemoveFacilityItemFromMonthly menghapus item unpaid fasilitas dari invoice
	// bulan tertentu (saat bulan ditandai skip).
	RemoveFacilityItemFromMonthly(studentID, facilityID, month, year uint) error
	// RestoreFacilityItemToMonthly menambahkan kembali item fasilitas ke invoice
	// bulan tertentu (saat skip dicabut).
	RestoreFacilityItemToMonthly(studentID, facilityID, academicYearID, month, year uint) error
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
	billingExclusionRepo  repository.BillingMonthExclusionRepository
	sfMonthZoneRepo       repository.StudentFacilityMonthZoneRepository
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
	billingExclusionRepo repository.BillingMonthExclusionRepository,
	sfMonthZoneRepo repository.StudentFacilityMonthZoneRepository,
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
		billingExclusionRepo:  billingExclusionRepo,
		sfMonthZoneRepo:       sfMonthZoneRepo,
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
							Name:           label,
							Category:       "dispensation",
							OffsetCategory: d.FeeCategory,
							Amount:         -discountForThis,
							Status:         "paid",
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
		// Skip bulan yang di-exclude (skip tagihan bulanan)
		if s.isMonthExcluded(params.StudentID, "extracurricular", exID, params.Month, params.Year) {
			continue
		}
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
			// Skip bulan yang di-exclude (skip tagihan bulanan)
			if s.isMonthExcluded(params.StudentID, "facility", sf.FacilityID, params.Month, params.Year) {
				continue
			}
			// Prioritas: zona/paket yang dipilih siswa saat enroll (konsisten
			// dengan AddFacilityToMonthlyRange); fallback ke item dasar fasilitas.
			var facilityFeeItems []model.FeeConfigItem
			if sf.FeeConfigItemID != nil {
				item, err := s.feeConfigItemRepo.FindByID(*sf.FeeConfigItemID)
				// Hanya pakai zona jika masih milik fee config tahun ajaran yang sama.
				if err == nil && item != nil && item.FeeConfigID == feeConfig.ID {
					facilityFeeItems = []model.FeeConfigItem{*item}
				}
			}
			if len(facilityFeeItems) == 0 {
				facilityFeeItems, _ = s.feeConfigItemRepo.FindByItemKeys(feeConfig.ID, []string{facilityItemKey(sf.Facility.Name)})
			}
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
					FacilityID:  &sf.FacilityID,
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
							Name:           label,
							Category:       "dispensation",
							OffsetCategory: d.FeeCategory,
							Amount:         -discountForThis,
							IsMandatory:    true,
							Status:         "paid",
							Notes:          d.Notes,
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

	// Defensive: pastikan enrollment daycare benar-benar premium
	de, err := s.daycareRepo.FindActiveByStudentID(params.StudentID, params.AcademicYearID)
	if err != nil || de == nil || de.Category != "premium" {
		log.Printf("[Daycare] GenerateDaycareInitial: skip student=%d (bukan premium)", params.StudentID)
		return nil
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

				// Item fasilitas per-hari (per_day): hari efektif berubah → jumlah
				// hari ikut di-update. Tanpa ini, item fasilitas yang dibuat sebelum
				// hari efektif diset akan tertulis 0 hari selamanya (tidak ada recalc
				// lain utk fasilitas). Item flat (quantity NULL) tidak disentuh.
				if item.Category == "facility" && item.Quantity != nil && item.UnitPrice != nil {
					newQuantity := effectiveDays.TotalDays
					newAmount := *item.UnitPrice * float64(newQuantity)

					// Nama dasar tanpa suffix " (N hari)" — ambil dari nama item saat ini
					baseName := item.Name
					if idx := strings.LastIndex(item.Name, " ("); idx > 0 {
						baseName = item.Name[:idx]
					}
					newName := fmt.Sprintf("%s (%d hari)", baseName, newQuantity)

					if item.PaidAmount == 0 {
						item.Amount = newAmount
						item.Quantity = &newQuantity
						item.Name = newName
						item.Status = "unpaid"
						txItemRepo.Update(&item)
						needsRecalc = true
					} else if newAmount >= item.PaidAmount {
						item.Amount = newAmount
						item.Quantity = &newQuantity
						item.Name = newName
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
		// Skip bulan yang di-exclude (skip tagihan bulanan)
		if s.isMonthExcluded(studentID, "extracurricular", extracurricularID, m.Month, m.Year) {
			continue
		}
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

	toAdd := s.feeItemsToAddForMonth(invoice.ID, month, level, feeItems)
	for _, feeItem := range toAdd {
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

// feeItemsToAddForMonth memfilter feeItems yang AKAN dibuat untuk bulan ini:
// belum ada di invoice (name+category), level cocok, dan startMonth terpenuhi.
// Read-only — dipakai bersama oleh addExtracurricularItemToMonthly (apply) dan
// preview sync (dry-run) agar logika filter tidak terduplikasi.
func (s *invoiceGenerateService) feeItemsToAddForMonth(invoiceID, month uint, level string, feeItems []model.FeeConfigItem) []model.FeeConfigItem {
	existingItems, _ := s.invoiceItemRepo.FindByInvoiceID(invoiceID)
	existingKeys := make(map[string]bool)
	for _, existing := range existingItems {
		existingKeys[existing.Name+"|"+existing.Category] = true
	}

	var toAdd []model.FeeConfigItem
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
		toAdd = append(toAdd, feeItem)
		existingKeys[key] = true // prevent fee items dengan nama sama terduplikasi
	}
	return toAdd
}

// extracurricularRemovalCandidate — item ekskul yang akan diproses cleanup beserta
// bulan invoice-nya. Action "remove" = item unpaid dihapus (hard delete);
// "writeoff" = sisa item partial dibebaskan (item dipertahankan, nominal
// diturunkan ke jumlah yang sudah dibayar). Dipakai bersama
// RemoveExtracurricularInvoices (apply) dan PlanExtracurricularCleanupInvoices
// (preview) agar keduanya tidak pernah divergen.
type extracurricularRemovalCandidate struct {
	Item   model.InvoiceItem
	Month  uint
	Year   uint
	Action string // "remove" | "writeoff"
}

// extracurricularItemsToRemove mengumpulkan item ekskul yang cocok
// (name+category fee config, bulan >= startDate) dari invoice bulanan siswa:
// - unpaid → Action "remove" (akan dihapus)
// - partial (sudah dibayar sebagian) → Action "writeoff" (sisa dibebaskan)
// Item lunas tidak ikut diproses (integritas pembayaran).
// Perilaku error meniru implementasi lama: fee config tidak ditemukan / query
// invoice gagal → kandidat kosong (no-op), bukan error.
func (s *invoiceGenerateService) extracurricularItemsToRemove(studentID, extracurricularID, academicYearID uint, startDate time.Time) ([]extracurricularRemovalCandidate, error) {
	ex, err := s.extracurricularRepo.FindByID(extracurricularID)
	if err != nil {
		return nil, err
	}

	feeConfig, err := s.feeConfigRepo.FindByAcademicYearID(academicYearID)
	if err != nil {
		return nil, nil
	}

	feeItems, _ := s.feeConfigItemRepo.FindByExtracurricular(feeConfig.ID, ex.Type, ex.Name)
	if len(feeItems) == 0 {
		return nil, nil
	}

	// Lower bound = bulan MULAI enrollment: item hanya dibuat mulai bulan itu
	// (AddExtracurricularToMonthlyRange memakai MonthRangeFromDate(start, endTA)),
	// jadi item unpaid bulan sebelum end_date (mis. Agustus saat berhenti di
	// September) ikut dibersihkan — Aturan B, bukan hanya "bulan berjalan ke depan".
	fromMonth := uint(startDate.Month())
	fromYear := uint(startDate.Year())

	invoices, err := s.invoiceRepo.FindMonthlyByStudentFromMonth(studentID, fromMonth, fromYear)
	if err != nil {
		return nil, nil
	}

	var candidates []extracurricularRemovalCandidate
	for _, inv := range invoices {
		if inv.Month == nil || inv.Year == nil {
			continue
		}
		items, _ := s.invoiceItemRepo.FindByInvoiceID(inv.ID)
		for _, item := range items {
			for _, feeItem := range feeItems {
				if item.Name != feeItem.Name || item.Category != feeItem.Category {
					continue
				}
				switch {
				case item.PaidAmount == 0:
					candidates = append(candidates, extracurricularRemovalCandidate{
						Item: item, Month: *inv.Month, Year: *inv.Year, Action: "remove",
					})
				case item.PaidAmount < item.Amount:
					// Sudah dibayar sebagian — sisa dibebaskan (write-off), item
					// dipertahankan agar riwayat pembayaran tetap utuh.
					candidates = append(candidates, extracurricularRemovalCandidate{
						Item: item, Month: *inv.Month, Year: *inv.Year, Action: "writeoff",
					})
				}
				break
			}
		}
	}
	return candidates, nil
}

func (s *invoiceGenerateService) RemoveExtracurricularInvoices(studentID, extracurricularID, academicYearID uint, startDate time.Time) error {
	candidates, err := s.extracurricularItemsToRemove(studentID, extracurricularID, academicYearID, startDate)
	if err != nil || len(candidates) == 0 {
		return err
	}

	changed := make(map[uint]bool)
	for _, c := range candidates {
		switch c.Action {
		case "writeoff":
			// Sisa dibebaskan: nominal item diturunkan ke jumlah yang sudah
			// dibayar & status jadi lunas, disertai catatan agar traceable.
			if err := s.db.Model(&model.InvoiceItem{}).Where("id = ?", c.Item.ID).Updates(map[string]interface{}{
				"amount": c.Item.PaidAmount,
				"status": "paid",
				"notes":  fmt.Sprintf("Sisa dibebaskan — siswa berhenti mengikuti (%d/%d)", c.Month, c.Year),
			}).Error; err != nil {
				return err
			}
		default:
			// Hard delete — hindari soft-delete agar tidak menyebabkan duplikat saat enrollment ulang.
			s.db.Unscoped().Delete(&model.InvoiceItem{}, c.Item.ID)
		}
		changed[c.Item.InvoiceID] = true
	}
	// Selalu recalculate jika ada perubahan — mencegah total mismatch
	for invoiceID := range changed {
		s.recalculateInvoiceTotal(invoiceID)
	}

	return nil
}

// isMonthExcluded mengembalikan true jika bulan (month, year) di-skip tagihannya
// untuk (student, entity_type, entity_ref). Safe default: false saat lookup gagal
// (jangan skip — tagihan tetap jalan).
func (s *invoiceGenerateService) isMonthExcluded(studentID uint, entityType string, entityRefID, month, year uint) bool {
	if s.billingExclusionRepo == nil {
		return false
	}
	excluded, err := s.billingExclusionRepo.Exists(studentID, entityType, entityRefID, month, year)
	if err != nil {
		return false
	}
	return excluded
}

// RemoveExtracurricularItemFromMonthly menghapus item unpaid ekstrakurikuler dari
// invoice bulan tertentu (saat bulan ditandai skip). Item yang sudah dibayar tidak
// dihapus (integritas pembayaran).
func (s *invoiceGenerateService) RemoveExtracurricularItemFromMonthly(studentID, extracurricularID, month, year uint) error {
	ex, err := s.extracurricularRepo.FindByID(extracurricularID)
	if err != nil {
		return err
	}

	invoice, err := s.invoiceRepo.FindMonthlyByStudent(studentID, month, year)
	if err != nil {
		return nil // invoice bulan tsb belum ada — tidak ada yang dihapus
	}

	enr, err := s.enrollmentRepo.FindActiveByStudentID(studentID)
	if err != nil {
		return nil
	}
	feeConfig, _ := s.feeConfigRepo.FindByAcademicYearID(enr.AcademicYearID)
	if feeConfig == nil || feeConfig.ID == 0 {
		return nil
	}
	feeItems, _ := s.feeConfigItemRepo.FindByExtracurricular(feeConfig.ID, ex.Type, ex.Name)
	if len(feeItems) == 0 {
		return nil
	}

	items, _ := s.invoiceItemRepo.FindByInvoiceID(invoice.ID)
	anyChange := false
	for _, item := range items {
		for _, feeItem := range feeItems {
			if item.Name == feeItem.Name && item.Category == feeItem.Category && item.PaidAmount == 0 {
				s.db.Unscoped().Delete(&model.InvoiceItem{}, item.ID)
				anyChange = true
			}
		}
	}
	if anyChange {
		s.recalculateInvoiceTotal(invoice.ID)
	}
	return nil
}

// RestoreExtracurricularItemToMonthly menambahkan kembali item ekstrakurikuler ke
// invoice bulan tertentu (saat skip dicabut). Idempotent — bulan yang sudah punya
// item tidak diduplikasi.
func (s *invoiceGenerateService) RestoreExtracurricularItemToMonthly(studentID, extracurricularID, academicYearID, month, year uint) error {
	ex, err := s.extracurricularRepo.FindByID(extracurricularID)
	if err != nil {
		return err
	}

	feeConfig, _ := s.feeConfigRepo.FindByAcademicYearID(academicYearID)
	if feeConfig == nil || feeConfig.ID == 0 {
		return nil
	}
	feeItems, _ := s.feeConfigItemRepo.FindByExtracurricular(feeConfig.ID, ex.Type, ex.Name)
	if len(feeItems) == 0 {
		return nil
	}

	level := ""
	enr, _ := s.enrollmentRepo.FindActiveByStudentID(studentID)
	if enr != nil {
		level = enr.ClassGroup.Level
	}

	return s.addExtracurricularItemToMonthly(studentID, academicYearID, month, year, level, feeItems)
}

// RemoveFacilityItemFromMonthly menghapus item unpaid fasilitas dari invoice bulan
// tertentu (saat bulan ditandai skip). Item yang sudah dibayar tidak dihapus.
func (s *invoiceGenerateService) RemoveFacilityItemFromMonthly(studentID, facilityID, month, year uint) error {
	facility, err := s.facilityRepo.FindByID(facilityID)
	if err != nil {
		return err
	}

	invoice, err := s.invoiceRepo.FindMonthlyByStudent(studentID, month, year)
	if err != nil {
		return nil // invoice bulan tsb belum ada — tidak ada yang dihapus
	}

	// Zone names untuk pencocokan legacy (item tanpa facility_id)
	zoneNames := []string{}
	if enr, err := s.enrollmentRepo.FindActiveByStudentID(studentID); err == nil {
		if feeConfig, err := s.feeConfigRepo.FindByAcademicYearID(enr.AcademicYearID); err == nil && feeConfig != nil {
			if items, err := s.feeConfigItemRepo.FindByItemKeys(feeConfig.ID, []string{facilityItemKey(facility.Name)}); err == nil {
				for _, fi := range items {
					zoneNames = append(zoneNames, fi.Name)
				}
			}
		}
	}

	items, _ := s.invoiceItemRepo.FindByInvoiceID(invoice.ID)
	anyChange := false
	for _, item := range items {
		if item.Category != "facility" || item.PaidAmount != 0 {
			continue
		}
		isMatch := false
		if item.FacilityID != nil {
			isMatch = *item.FacilityID == facility.ID
		} else {
			isMatch = facilityItemNameMatches(item.Name, facility.Name, zoneNames...)
		}
		if isMatch {
			s.db.Unscoped().Delete(&model.InvoiceItem{}, item.ID)
			anyChange = true
		}
	}
	if anyChange {
		s.recalculateInvoiceTotal(invoice.ID)
	}
	return nil
}

// RestoreFacilityItemToMonthly menambahkan kembali item fasilitas ke invoice bulan
// tertentu (saat skip dicabut). Idempotent — bulan yang sudah punya item tidak
// diduplikasi.
func (s *invoiceGenerateService) RestoreFacilityItemToMonthly(studentID, facilityID, academicYearID, month, year uint) error {
	facility, err := s.facilityRepo.FindByID(facilityID)
	if err != nil {
		return err
	}

	invoice, err := s.invoiceRepo.FindMonthlyByStudent(studentID, month, year)
	if err != nil {
		return nil // invoice bulan tsb belum ada — tidak ada yang di-restore
	}

	feeConfig, _ := s.feeConfigRepo.FindByAcademicYearID(academicYearID)
	if feeConfig == nil || feeConfig.ID == 0 {
		return nil
	}
	feeItems := s.facilityFeeItemsForMonth(studentID, facilityID, academicYearID, month, year, facility, feeConfig)
	if len(feeItems) == 0 {
		return nil
	}

	zoneNames := make([]string, 0, len(feeItems))
	for _, fi := range feeItems {
		zoneNames = append(zoneNames, fi.Name)
	}
	return s.addFacilityItemToMonthly(studentID, month, year, invoice, facility, feeItems, zoneNames)
}

// CleanupExtracurricularInvoices adalah recovery endpoint untuk admin.
// Menghapus item unpaid ekskul dari invoice mulai bulan mulai mengikuti (start_date)
// tanpa harus regenerate seluruh invoice (yang akan menghapus riwayat pembayaran).
func (s *invoiceGenerateService) CleanupExtracurricularInvoices(studentID, extracurricularID uint) error {
	// Cari tahun ajaran aktif dari enrollment
	enr, err := s.enrollmentRepo.FindActiveByStudentID(studentID)
	if err != nil {
		return fmt.Errorf("enrollment aktif tidak ditemukan untuk siswa %d: %w", studentID, err)
	}
	// Ambil record enrollment ekskul (aktif ataupun sudah nonaktif) untuk
	// menentukan start_date — cleanup harus membersihkan dari bulan mulai
	// mengikuti, bukan dari bulan berjalan.
	startDate := time.Now()
	if se, err := s.seRepo.FindByStudentAndExtracurricular(studentID, extracurricularID, enr.AcademicYearID); err == nil && se != nil {
		startDate = se.StartDate
	}
	return s.RemoveExtracurricularInvoices(
		studentID, extracurricularID, enr.AcademicYearID, startDate,
	)
}

// PlanExtracurricularCleanupInvoices menghitung (dry-run) item unpaid ekskul yang
// akan dihapus oleh CleanupExtracurricularInvoices, tanpa mengubah data apa pun.
// Resolusi tahun ajaran & start_date serta logika pemilihan item IDENTIK dengan
// jalur eksekusi agar preview selalu akurat (lihat extracurricularItemsToRemove).
func (s *invoiceGenerateService) PlanExtracurricularCleanupInvoices(studentID, extracurricularID uint) (*dto.ExtracurricularCleanupPreviewResponse, error) {
	// Cari tahun ajaran aktif dari enrollment (sama seperti CleanupExtracurricularInvoices)
	enr, err := s.enrollmentRepo.FindActiveByStudentID(studentID)
	if err != nil {
		return nil, fmt.Errorf("enrollment aktif tidak ditemukan untuk siswa %d: %w", studentID, err)
	}

	startDate := time.Now()
	exName := ""
	if se, err := s.seRepo.FindByStudentAndExtracurricular(studentID, extracurricularID, enr.AcademicYearID); err == nil && se != nil {
		startDate = se.StartDate
		if se.Extracurricular.Name != "" {
			exName = se.Extracurricular.Name
		}
	}
	if exName == "" {
		if ex, err := s.extracurricularRepo.FindByID(extracurricularID); err == nil {
			exName = ex.Name
		}
	}

	candidates, err := s.extracurricularItemsToRemove(studentID, extracurricularID, enr.AcademicYearID, startDate)
	if err != nil {
		return nil, err
	}

	resp := &dto.ExtracurricularCleanupPreviewResponse{
		StudentID:           studentID,
		ExtracurricularID:   extracurricularID,
		ExtracurricularName: exName,
		StartDate:           startDate.Format("2006-01-02"),
		Items:               make([]dto.ExtracurricularCleanupPreviewItem, 0, len(candidates)),
	}
	for _, c := range candidates {
		// Untuk write-off, nilai yang dipengaruhi adalah SISA yang dibebaskan
		// (bukan seluruh nominal item) — preview harus persis dengan eksekusi.
		affected := c.Item.Amount
		if c.Action == "writeoff" {
			affected = c.Item.Amount - c.Item.PaidAmount
		}
		resp.Items = append(resp.Items, dto.ExtracurricularCleanupPreviewItem{
			InvoiceID: c.Item.InvoiceID,
			Month:     c.Month,
			Year:      c.Year,
			ItemID:    c.Item.ID,
			ItemName:  c.Item.Name,
			Action:    c.Action,
			Amount:    affected,
		})
		resp.TotalAmount += affected
	}
	resp.TotalItems = len(resp.Items)
	return resp, nil
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

// PlanExtracurricularSync menghitung rencana sinkronisasi PASTA/ekskul (dry-run,
// read-only) — bulan mana yang akan ditambah item dan alasan bulan dilewati
// (exclusion / sudah ada / invoice belum ada). Tidak menulis apa pun ke DB.
func (s *invoiceGenerateService) PlanExtracurricularSync() (*dto.ExtracurricularPreviewResponse, error) {
	ay, err := s.acRepo.FindActive()
	if err != nil {
		return nil, fmt.Errorf("tahun ajaran aktif tidak ditemukan")
	}

	allSE, err := s.seRepo.FindAllActiveByAcademicYear(ay.ID)
	if err != nil {
		return nil, fmt.Errorf("gagal mengambil data ekskul: %v", err)
	}

	resp := &dto.ExtracurricularPreviewResponse{
		TotalEnrollments: len(allSE),
		Items:            make([]dto.ExtracurricularPreviewItem, 0, len(allSE)),
	}

	for _, se := range allSE {
		resp.Items = append(resp.Items, s.planExtracurricularForEnrollment(se, ay))
	}
	return resp, nil
}

// planExtracurricularForEnrollment mengklasifikasikan tiap bulan dalam rentang
// enrollment (startDate..akhir tahun ajaran) menjadi: akan ditambah / skip.
func (s *invoiceGenerateService) planExtracurricularForEnrollment(se model.StudentExtracurricular, ay *model.AcademicYear) dto.ExtracurricularPreviewItem {
	item := dto.ExtracurricularPreviewItem{
		StudentID:           se.StudentID,
		StudentName:         se.Student.FullName,
		ExtracurricularID:   se.ExtracurricularID,
		ExtracurricularName: se.Extracurricular.Name,
		MonthsToAdd:         []dto.MonthYearBrief{},
	}

	feeConfig, _ := s.feeConfigRepo.FindByAcademicYearID(se.AcademicYearID)
	if feeConfig == nil || feeConfig.ID == 0 {
		return item // tidak ada tarif → tidak ada yang bisa ditambahkan
	}
	feeItems, _ := s.feeConfigItemRepo.FindByExtracurricular(feeConfig.ID, se.Extracurricular.Type, se.Extracurricular.Name)
	if len(feeItems) == 0 {
		return item
	}

	level := ""
	enr, _ := s.enrollmentRepo.FindActiveByStudentID(se.StudentID)
	if enr != nil {
		level = enr.ClassGroup.Level
	}

	for _, m := range utility.MonthRangeFromDate(se.StartDate, ay.EndDate) {
		if s.isMonthExcluded(se.StudentID, "extracurricular", se.ExtracurricularID, m.Month, m.Year) {
			item.SkippedExcluded++
			continue
		}
		invoice, err := s.invoiceRepo.FindMonthlyByStudent(se.StudentID, m.Month, m.Year)
		if err != nil {
			item.SkippedNoInvoice++
			continue
		}
		toAdd := s.feeItemsToAddForMonth(invoice.ID, m.Month, level, feeItems)
		if len(toAdd) == 0 {
			item.SkippedExists++
			continue
		}
		item.MonthsToAdd = append(item.MonthsToAdd, dto.MonthYearBrief{Month: m.Month, Year: m.Year})
	}
	return item
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
// unitLabel is used for partial-payment suffix (e.g. "hari", "unit").
func (s *invoiceGenerateService) upsertDaycareAttendanceItem(invoiceID uint, namePrefix string, name string, amount float64, quantity *uint, unitPrice *float64, itemCategory string, unitLabel string) error {
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

	// Nama item: kalau ada yg paid, pakai "+X <unit>", kalau tidak pakai full name
	itemName := name
	if totalPaidAmount > 0 {
		itemName = fmt.Sprintf("%s (+%d %s)", namePrefix, unpaidQty, unitLabel)
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
		// Catatan: daycare_meal TIDAK dihapus di sini karena meal diregenerasi via attendance
		// processing di GenerateDaycareMonthlyInvoices, bukan di Sync.
		s.invoiceItemRepo.DeleteUnpaidByInvoiceAndCategory(inv.ID, "daycare")
		s.invoiceItemRepo.DeleteUnpaidByInvoiceAndCategory(inv.ID, "daycare_overtime")

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

	var spdDays, mealDays, overtimeMinutes uint

	if monthlyAtt != nil && (monthlyAtt.SPDDays > 0 || monthlyAtt.MealDays > 0 || monthlyAtt.OvertimeMinutes > 0) {
		spdDays = monthlyAtt.SPDDays
		mealDays = monthlyAtt.MealDays
		overtimeMinutes = monthlyAtt.OvertimeMinutes
		log.Printf("[Daycare SPD] Menggunakan data kehadiran bulanan: spd=%d meal=%d overtime=%d", spdDays, mealDays, overtimeMinutes)
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
				if err := s.upsertDaycareAttendanceItem(invoice.ID, spdItem.Name, name, dailyRate*float64(count), &qty, &dailyRate, "daycare", "hari"); err != nil {
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
				if err := s.upsertDaycareAttendanceItem(invoice.ID, mealItem.Name, name, dailyRate*float64(mealDays), &qty, &dailyRate, "daycare_meal", "hari"); err != nil {
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
			if err := s.upsertDaycareAttendanceItem(invoice.ID, spdItem.Name, name, dailyRate*float64(spdDays), &qty, &dailyRate, "daycare", "hari"); err != nil {
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
			if err := s.upsertDaycareAttendanceItem(invoice.ID, mealItem.Name, name, dailyRate*float64(mealDays), &qty, &dailyRate, "daycare_meal", "hari"); err != nil {
				return err
			}
		} else {
			log.Printf("[Daycare SPD] Meal: fee item daycare_regular_meal tidak ditemukan")
		}
	}

	// Overtime (both categories: monthly overtime × per-30min rate)
	if overtimeMinutes > 0 {
		overtimeItem, err := s.feeConfigItemRepo.FindByItemKey(feeConfig.ID, "daycare_overtime", "all", "all")
		if err == nil && overtimeItem != nil {
			overtimeUnits := overtimeMinutes / 30 // pembulatan ke bawah
			if overtimeUnits > 0 {
				rate := overtimeItem.Amount
				name := fmt.Sprintf("%s (%d unit)", overtimeItem.Name, overtimeUnits)
				log.Printf("[Daycare SPD] Overtime: %d menit = %d unit x %.0f = %.0f", overtimeMinutes, overtimeUnits, rate, rate*float64(overtimeUnits))
				if err := s.upsertDaycareAttendanceItem(invoice.ID, overtimeItem.Name, name, rate*float64(overtimeUnits), &overtimeUnits, &rate, "daycare_overtime", "unit"); err != nil {
					return err
				}
			}
		} else {
			log.Printf("[Daycare SPD] Overtime: fee item daycare_overtime tidak ditemukan")
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

	// Dedupe: kumpulkan kunci item dispensasi yang SUDAH ADA (termasuk yang
	// sudah mendapat alokasi negatif dari payment, karena item seperti itu
	// tidak dihapus oleh DeleteUnpaidByInvoiceAndCategory di atas). Tanpa ini,
	// setiap pemanggilan ulang fungsi akan menambah item dispensasi baru yang
	// identik → potongan bertumpuk → total invoice bisa menjadi negatif.
	existingDispensation := make(map[string]bool)
	for _, item := range items {
		if item.Category == "dispensation" {
			existingDispensation[dispensationItemKey(item.Name, item.Amount)] = true
		}
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
					InvoiceID:      invoice.ID,
					Name:           label,
					Category:       "dispensation",
					OffsetCategory: d.FeeCategory,
					Amount:         -discountForThis,
					IsMandatory:    true,
					Status:         "paid",
					Notes:          d.Notes,
				})
			}
		}

		for i := range newItems {
			if existingDispensation[dispensationItemKey(newItems[i].Name, newItems[i].Amount)] {
				// Item dispensasi identik sudah ada (mis. sudah mendapat alokasi
				// negatif dari pembayaran) — jangan buat duplikat.
				continue
			}
			if err := s.invoiceItemRepo.Create(&newItems[i]); err != nil {
				return err
			}
		}
	}

	return nil
}

// dispensationItemKey menghasilkan kunci unik untuk item dispensasi
// berdasarkan nama dan jumlah, dipakai untuk mencegah duplikat saat
// dispensasi diterapkan ulang ke invoice yang sudah ada.
func dispensationItemKey(name string, amount float64) string {
	return fmt.Sprintf("%s|%.2f", name, amount)
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
		anyChange := false
		for _, cat := range []string{"daycare", "daycare_meal", "daycare_overtime"} {
			deleted, err := s.invoiceItemRepo.DeleteUnpaidByInvoiceAndCategory(inv.ID, cat)
			if err != nil {
				return err
			}
			if deleted > 0 {
				anyChange = true
			}
		}
		// Selalu recalculate total untuk memastikan konsistensi data
		if anyChange {
			if err := s.recalculateInvoiceTotal(inv.ID); err != nil {
				return err
			}
		}
	}
	return nil
}

// DeleteDaycareInitial menghapus invoice daycare_initial beserta item-nya.
// Dipanggil saat enrollment daycare di-downgrade dari premium ke regular.
func (s *invoiceGenerateService) DeleteDaycareInitial(studentID, academicYearID uint) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		// Hapus invoice items dulu
		if err := tx.Where("invoice_id IN (SELECT id FROM invoices WHERE student_id = ? AND academic_year_id = ? AND type = ?)",
			studentID, academicYearID, "daycare_initial").
			Delete(&model.InvoiceItem{}).Error; err != nil {
			return err
		}
		// Hapus invoice
		if err := tx.Where("student_id = ? AND academic_year_id = ? AND type = ?",
			studentID, academicYearID, "daycare_initial").
			Delete(&model.Invoice{}).Error; err != nil {
			return err
		}
		log.Printf("[Daycare] DeleteDaycareInitial: student=%d ay=%d", studentID, academicYearID)
		return nil
	})
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

// PlanDaycareSync menghitung rencana sinkronisasi invoice daycare (dry-run,
// read-only): per enrollment, premium = akan diproses, regular = dilewati.
// Tidak memanggil Inject* dan tidak menulis apa pun ke DB.
func (s *invoiceGenerateService) PlanDaycareSync() (*dto.DaycarePreviewResponse, error) {
	enrollments, err := s.daycareRepo.FindAllActive()
	if err != nil {
		return nil, fmt.Errorf("gagal mengambil data daycare: %v", err)
	}

	resp := &dto.DaycarePreviewResponse{
		TotalEnrollments: len(enrollments),
		Items:            make([]dto.DaycarePreviewItem, 0, len(enrollments)),
	}

	for _, de := range enrollments {
		item := dto.DaycarePreviewItem{
			StudentID:   de.StudentID,
			StudentName: de.Student.FullName,
			Category:    de.Category,
		}
		if de.Category == "premium" {
			item.WillSync = true
			item.Reason = "Item bulanan akan disinkronkan"
		} else {
			item.WillSync = false
			item.Reason = "Kategori regular dilewati"
		}
		resp.Items = append(resp.Items, item)
	}
	return resp, nil
}

// ─── Facility Methods ────────────────────────────────────────────────

func facilityItemKey(facilityName string) string {
	slug := strings.ToLower(strings.ReplaceAll(facilityName, " ", "_"))
	return "facility_" + slug
}

// facilityItemNameCondition membuat kondisi SQL untuk mencocokkan item
// fasilitas di invoice berdasarkan nama fasilitas ATAU nama zona/paket.
// Format nama item: "<nama> (N hari)" atau persis "<nama>", jadi pencocokan
// dilakukan pada nama dasar (bukan substring) supaya "ZONA 1" tidak ikut
// cocok dengan item "ZONA 10 (24 hari)".
func facilityItemNameCondition(facilityName string, zoneNames []string) (string, []any) {
	parts := []string{}
	args := []any{}
	for _, base := range append([]string{facilityName}, zoneNames...) {
		if base == "" {
			continue
		}
		escaped := utility.EscapeLikePattern(base)
		// ILIKE: pencocokan case-insensitive (konsisten dengan perilaku lama);
		// pola pertama tanpa wildcard = kesetaraan, pola kedua format "<base> (N hari)".
		parts = append(parts, "name ILIKE ?", "name ILIKE ?")
		args = append(args, escaped, escaped+" (%")
	}
	if len(parts) == 0 {
		return "1=0", nil
	}
	return "(" + strings.Join(parts, " OR ") + ")", args
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
	for _, enrollment := range allSF {
		if enrollment.FacilityID == facilityID {
			startDate = enrollment.StartDate
			break
		}
	}
	if startDate.IsZero() {
		return nil
	}

	feeItems := s.resolveFacilityFeeItems(studentID, facilityID, academicYearID, facility, feeConfig)
	if len(feeItems) == 0 {
		return nil
	}

	// Item fasilitas di invoice dinamai sesuai nama fasilitas ATAU nama
	// zona/paket, jadi pencocokan legacy (facility_id NULL) harus mencakup
	// keduanya. Baris baru dicocokkan langsung via facility_id.
	zoneNames := make([]string, 0, len(feeItems))
	for _, fi := range feeItems {
		zoneNames = append(zoneNames, fi.Name)
	}
	nameCond, nameArgs := facilityItemNameCondition(facility.Name, zoneNames)
	facilityCond := "(facility_id = ? OR (facility_id IS NULL AND " + nameCond + "))"
	facilityArgs := append([]any{facility.ID}, nameArgs...)

	// Bersihkan item fasilitas yang sudah soft-deleted (defense in depth)
	s.db.Unscoped().
		Where("category = ? AND "+facilityCond+" AND deleted_at IS NOT NULL", append([]any{"facility"}, facilityArgs...)...).
		Where("invoice_id IN (SELECT id FROM invoices WHERE student_id = ? AND type = 'monthly' AND academic_year_id = ?)", studentID, academicYearID).
		Delete(&model.InvoiceItem{})

	// Hapus item fasilitas (unpaid) di bulan SEBELUM start_date —
	// menangani kasus start_date berubah mundur (misal Juli → Agustus)
	s.db.Unscoped().
		Where("category = ? AND "+facilityCond+" AND paid_amount = 0 AND deleted_at IS NULL", append([]any{"facility"}, facilityArgs...)...).
		Where("invoice_id IN (SELECT id FROM invoices WHERE student_id = ? AND type = 'monthly' AND academic_year_id = ? AND ((year < ?) OR (year = ? AND month < ?)))",
			studentID, academicYearID, uint(startDate.Year()), uint(startDate.Year()), uint(startDate.Month())).
		Delete(&model.InvoiceItem{})

	months := utility.MonthRangeFromDate(startDate, ay.EndDate)

	for _, m := range months {
		// Skip bulan yang di-exclude (skip tagihan bulanan)
		if s.isMonthExcluded(studentID, "facility", facilityID, m.Month, m.Year) {
			continue
		}
		invoice, err := s.invoiceRepo.FindMonthlyByStudent(studentID, m.Month, m.Year)
		if err != nil {
			continue
		}
		// Zona EFEKTIF bulan tsb (override ?: default) — override per bulan yang
		// di-set lewat month-zone ikut dipakai saat item bulan dibuat ulang.
		monthFeeItems := s.facilityFeeItemsForMonth(studentID, facilityID, academicYearID, m.Month, m.Year, facility, feeConfig)
		if len(monthFeeItems) == 0 {
			continue
		}
		monthZoneNames := make([]string, 0, len(monthFeeItems))
		for _, fi := range monthFeeItems {
			monthZoneNames = append(monthZoneNames, fi.Name)
		}
		if err := s.addFacilityItemToMonthly(studentID, m.Month, m.Year, invoice, facility, monthFeeItems, monthZoneNames); err != nil {
			return err
		}
	}

	return nil
}

// facilityFeeItemsForMonth me-resolve zona EFEKTIF bulan utk pendaftaran
// fasilitas saat item ditambahkan ke invoice (jalur reaktivasi & restore skip):
// override per bulan (month-zone) bila ada, fallback ke zona default enrollment.
func (s *invoiceGenerateService) facilityFeeItemsForMonth(studentID, facilityID, academicYearID, month, year uint, facility *model.Facility, feeConfig *model.FeeConfig) []model.FeeConfigItem {
	if s.sfMonthZoneRepo != nil {
		var sfID uint
		if allSF, err := s.sfRepo.FindActiveByStudentID(studentID, academicYearID); err == nil {
			for _, en := range allSF {
				if en.FacilityID == facilityID {
					sfID = en.ID
					break
				}
			}
		}
		if sfID > 0 {
			if zones, err := s.sfMonthZoneRepo.FindBySFIDsAndMonth([]uint{sfID}, month, year); err == nil && len(zones) == 1 {
				z := zones[0]
				if z.FeeConfigItemID != nil {
					if item, err := s.feeConfigItemRepo.FindByID(*z.FeeConfigItemID); err == nil && item != nil && item.FeeConfigID == feeConfig.ID {
						return []model.FeeConfigItem{*item}
					}
				} else if base, err := s.feeConfigItemRepo.FindByItemKeys(feeConfig.ID, []string{facilityItemKey(facility.Name)}); err == nil && len(base) > 0 {
					// Override "tanpa zona" → item dasar nama fasilitas.
					return []model.FeeConfigItem{base[0]}
				}
			}
		}
	}
	return s.resolveFacilityFeeItems(studentID, facilityID, academicYearID, facility, feeConfig)
}

// resolveFacilityFeeItems menentukan fee items untuk fasilitas: pakai zona/paket
// yang dipilih siswa saat enroll (FeeConfigItemID), fallback ke item dasar
// berdasarkan nama fasilitas. Hanya item milik fee config tahun ajaran yang sama.
func (s *invoiceGenerateService) resolveFacilityFeeItems(studentID, facilityID, academicYearID uint, facility *model.Facility, feeConfig *model.FeeConfig) []model.FeeConfigItem {
	var feeItems []model.FeeConfigItem
	if allSF, err := s.sfRepo.FindActiveByStudentID(studentID, academicYearID); err == nil {
		for _, sf := range allSF {
			if sf.FacilityID != facilityID || sf.FeeConfigItemID == nil {
				continue
			}
			item, err := s.feeConfigItemRepo.FindByID(*sf.FeeConfigItemID)
			if err == nil && item != nil && item.FeeConfigID == feeConfig.ID {
				feeItems = []model.FeeConfigItem{*item}
			}
			break
		}
	}
	if len(feeItems) == 0 {
		feeItems, _ = s.feeConfigItemRepo.FindByItemKeys(feeConfig.ID, []string{facilityItemKey(facility.Name)})
	}
	return feeItems
}

// addFacilityItemToMonthly menambahkan item fasilitas ke invoice bulan tertentu
// jika belum ada (idempotent). Dipakai oleh AddFacilityToMonthlyRange dan
// RestoreFacilityItemToMonthly.
func (s *invoiceGenerateService) addFacilityItemToMonthly(studentID, month, year uint, invoice *model.Invoice, facility *model.Facility, feeItems []model.FeeConfigItem, zoneNames []string) error {
	existingItems, _ := s.invoiceItemRepo.FindByInvoiceID(invoice.ID)
	facilityExists := false
	for _, existing := range existingItems {
		if existing.Category != "facility" {
			continue
		}
		if existing.FacilityID != nil {
			if *existing.FacilityID == facility.ID {
				facilityExists = true
				break
			}
			continue
		}
		// Baris legacy tanpa facility_id → fallback nama
		if facilityItemNameMatches(existing.Name, facility.Name, zoneNames...) {
			facilityExists = true
			break
		}
	}
	if facilityExists {
		return nil
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
				ed, _ := s.effectiveDayRepo.FindByClassGroupMonthYear(enrollment.ClassGroupID, month, year)
				if ed == nil || ed.ID == 0 {
					ed, _ = s.effectiveDayRepo.FindByLevelMonthYear(enrollment.ClassGroup.Level, month, year)
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
			FacilityID:  &facility.ID,
		}
		if err := s.invoiceItemRepo.Create(item); err != nil {
			return err
		}
	}

	return s.recalculateInvoiceTotal(invoice.ID)
}

// RemoveFacilityFromFutureInvoices menghapus item unpaid fasilitas dari invoice
// bulan berjalan ke depan — dipakai jalur GANTI ZONA (Enroll reactivation &
// UpdateEnrollment): item zona lama bulan-bulan sebelumnya adalah piutang sah
// dan tidak boleh dihapus.
func (s *invoiceGenerateService) RemoveFacilityFromFutureInvoices(studentID, facilityID, academicYearID uint, extraZoneNames ...string) error {
	now := time.Now()
	return s.removeFacilityItemsFromInvoices(studentID, facilityID, academicYearID, uint(now.Month()), uint(now.Year()), extraZoneNames...)
}

// RemoveFacilityInvoices menghapus item unpaid fasilitas dari invoice mulai bulan
// startDate ke depan — dipakai jalur Unenroll (Aturan B): berhenti fasilitas =
// semua item unpaid fasilitas itu dibersihkan, termasuk bulan-bulan sebelum hari
// ini. Item yang sudah dibayar dipertahankan (integritas pembayaran).
func (s *invoiceGenerateService) RemoveFacilityInvoices(studentID, facilityID, academicYearID uint, startDate time.Time, extraZoneNames ...string) error {
	return s.removeFacilityItemsFromInvoices(studentID, facilityID, academicYearID, uint(startDate.Month()), uint(startDate.Year()), extraZoneNames...)
}

// removeFacilityItemsFromInvoices adalah inti pembersihan item fasilitas:
// menghapus item unpaid (category=facility, paid_amount=0) yang cocok dengan
// fasilitas/zona pada invoice bulan >= (fromMonth, fromYear) dalam tahun ajaran
// yang sama, lalu recalculate total invoice yang berubah.
func (s *invoiceGenerateService) removeFacilityItemsFromInvoices(studentID, facilityID, academicYearID, fromMonth, fromYear uint, extraZoneNames ...string) error {
	facility, err := s.facilityRepo.FindByID(facilityID)
	if err != nil {
		return err
	}

	// Item fasilitas di invoice bisa dinamai sesuai zona/paket. Enrollment
	// bisa saja sudah non-aktif saat fungsi ini dipanggil (alur unenroll),
	// jadi ambil record apa pun (unscoped), lalu gabung dengan nama zona
	// lama yang dikirim pemanggil (alur ganti zona).
	zoneNames := append([]string{}, extraZoneNames...)
	if en, err := s.sfRepo.FindByStudentFacilityAcademicYear(studentID, facilityID, academicYearID); err == nil && en != nil && en.FeeConfigItemID != nil {
		if item, err := s.feeConfigItemRepo.FindByIDIncludingDeleted(*en.FeeConfigItemID); err == nil && item != nil {
			zoneNames = append(zoneNames, item.Name)
		}
	}

	// Scope ke TAHUN AJARAN yang sama — jangan sampai unenroll fasilitas di
	// tahun ajaran lama menghapus item fasilitas di invoice tahun ajaran baru.
	allInvoices, _ := s.invoiceRepo.FindMonthlyByStudentAcademicYear(studentID, academicYearID)
	invoices := make([]model.Invoice, 0, len(allInvoices))
	for _, inv := range allInvoices {
		if inv.Month == nil || inv.Year == nil {
			continue
		}
		if *inv.Year > fromYear || (*inv.Year == fromYear && *inv.Month >= fromMonth) {
			invoices = append(invoices, inv)
		}
	}

	for _, inv := range invoices {
		items, _ := s.invoiceItemRepo.FindByInvoiceID(inv.ID)
		anyChange := false
		for _, item := range items {
			if item.Category != "facility" || item.PaidAmount != 0 {
				continue
			}
			isMatch := false
			if item.FacilityID != nil {
				isMatch = *item.FacilityID == facility.ID
			} else {
				// Baris legacy tanpa facility_id → fallback nama
				isMatch = facilityItemNameMatches(item.Name, facility.Name, zoneNames...)
			}
			if isMatch {
				// Hard delete — hindari soft-delete agar item benar-benar hilang
				// dan tidak menyebabkan duplikat saat enrollment ulang.
				s.db.Unscoped().Delete(&model.InvoiceItem{}, item.ID)
				anyChange = true
			}
		}
		// Selalu recalculate jika ada perubahan — mencegah total mismatch
		if anyChange {
			s.recalculateInvoiceTotal(inv.ID)
		}
	}

	return nil
}

// RewriteFacilityMonthItem menulis ulang item fasilitas (category=facility) pada
// invoice bulan tertentu milik siswa: nama & harga satuan mengikuti zona feeItem,
// quantity (jumlah hari) dipertahankan, amount = quantity × unit price. Item yang
// sudah dibayar hanya ditulis bila allowPaid=true (paid_amount dipertahankan;
// selisih jadi sisa tagihan/kelebihan bayar). Bulan tanpa invoice/item fasilitas
// → InvoiceItemUpdated=false (bukan error). Item legacy tanpa facility_id
// dicocokkan via nama fasilitas/zona.
func (s *invoiceGenerateService) RewriteFacilityMonthItem(studentID, facilityID, month, year uint, feeItem *model.FeeConfigItem, allowPaid bool) (*dto.FacilityMonthRewriteResult, error) {
	result := &dto.FacilityMonthRewriteResult{}
	if feeItem == nil {
		return result, fmt.Errorf("Item tarif fasilitas tidak ditemukan")
	}

	invoice, err := s.invoiceRepo.FindMonthlyByStudent(studentID, month, year)
	if err != nil {
		return result, nil // invoice bulan tsb belum ada — tidak ada item utk ditulis
	}

	facility, err := s.facilityRepo.FindByID(facilityID)
	if err != nil {
		return result, err
	}

	items, err := s.invoiceItemRepo.FindByInvoiceID(invoice.ID)
	if err != nil {
		return result, err
	}

	names := s.facilityItemLegacyNames(invoice.AcademicYearID, facility, feeItem)

	var target *model.InvoiceItem
	for i := range items {
		it := &items[i]
		if it.Category != "facility" {
			continue
		}
		if it.FacilityID != nil {
			if *it.FacilityID != facilityID {
				continue
			}
			target = it
			break
		}
		// Baris legacy tanpa facility_id → fallback nama fasilitas/zona.
		if facilityItemNameMatches(it.Name, facility.Name, names...) {
			target = it
			break
		}
	}
	if target == nil {
		return result, nil
	}

	if target.PaidAmount > 0 && !allowPaid {
		result.BlockedByPayment = true
		result.ItemPaidAmount = target.PaidAmount
		return result, nil
	}

	// Quantity (jumlah hari) dipertahankan — koreksi manual per bulan tidak hilang.
	qty := target.Quantity
	target.Name = feeItem.Name
	amount := feeItem.Amount
	if feeItem.Unit == "per_day" && qty != nil {
		target.Name = fmt.Sprintf("%s (%d hari)", feeItem.Name, *qty)
		amount = feeItem.Amount * float64(*qty)
	}
	unitPrice := feeItem.Amount
	target.UnitPrice = &unitPrice
	target.Amount = amount
	target.Status = facilityItemStatusFromPaid(target.PaidAmount, target.Amount)
	if err := s.invoiceItemRepo.Update(target); err != nil {
		return result, err
	}
	if err := s.recalculateInvoiceTotal(invoice.ID); err != nil {
		return result, err
	}

	result.InvoiceItemUpdated = true
	result.ItemPaidAmount = target.PaidAmount
	result.RemainingOrExcess = target.Amount - target.PaidAmount
	return result, nil
}

// facilityItemLegacyNames mengumpulkan nama dasar yang mungkin dipakai item
// fasilitas legacy (tanpa facility_id) utk fasilitas tsb: nama fasilitas, nama
// zona target, dan semua nama zona/item milik fasilitas pada fee config tahun
// ajaran yang sama (mis. item lama bernama ZONA 2 saat default sudah ZONA 1).
func (s *invoiceGenerateService) facilityItemLegacyNames(academicYearID uint, facility *model.Facility, feeItem *model.FeeConfigItem) []string {
	names := []string{facility.Name}
	if feeItem != nil {
		names = append(names, feeItem.Name)
	}

	feeConfig, err := s.feeConfigRepo.FindByAcademicYearID(academicYearID)
	if err != nil || feeConfig == nil {
		return names
	}
	items, err := s.feeConfigItemRepo.FindByCategory(feeConfig.ID, "facility")
	if err != nil {
		return names
	}
	baseKey := facilityItemKey(facility.Name)
	for i := range items {
		if items[i].ItemKey == baseKey || strings.HasPrefix(items[i].ItemKey, baseKey+"_") {
			names = append(names, items[i].Name)
		}
	}
	return names
}

// facilityItemStatusFromPaid menentukan status item berdasarkan paid_amount
// terhadap amount terbaru (dipakai setelah rewrite harga item).
func facilityItemStatusFromPaid(paid, amount float64) string {
	if paid <= 0 {
		return "unpaid"
	}
	if paid >= amount {
		return "paid"
	}
	return "partial"
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
