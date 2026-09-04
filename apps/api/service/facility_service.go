package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"api/utility"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"gorm.io/gorm"
)

type FacilityService interface {
	GetAll() ([]dto.FacilityResponse, error)
	GetByID(id uint) (*dto.FacilityResponse, error)
	Create(req dto.CreateFacilityRequest) (*dto.FacilityResponse, error)
	Update(id uint, req dto.CreateFacilityRequest) (*dto.FacilityResponse, error)
	Delete(id uint) error
}

type StudentFacilityService interface {
	GetByStudentID(studentID uint, params dto.StudentFacilityQueryParams) ([]dto.StudentFacilityResponse, error)
	GetStudentsByFacility(facilityID uint, params dto.FacilityStudentQueryParams) (*dto.PaginatedFacilityStudentResponse, error)
	GetCurrentMonthDays(studentID, sfID uint) (*dto.FacilityCurrentMonthDaysResponse, error)
	Enroll(studentID uint, req dto.EnrollFacilityRequest) (*dto.StudentFacilityResponse, error)
	// UpdateEnrollment mengubah zona DEFAULT pendaftaran lalu menyelaraskan item
	// invoice fasilitas pada semua bulan unpaid tanpa override (epic zona-bulanan).
	UpdateEnrollment(studentID, sfID uint, req dto.UpdateStudentFacilityRequest) (*dto.StudentFacilityResponse, *dto.FacilityDefaultZoneSummary, error)
	Unenroll(studentID, sfID uint) error
	// SetMonthZone menetapkan override zona utk satu bulan (PUT month-zone).
	SetMonthZone(studentID, sfID uint, req dto.UpdateStudentFacilityMonthZoneRequest) (*dto.FacilityMonthZoneResponse, error)
	// ClearMonthZone menghapus override zona utk satu bulan → ikut default (DELETE month-zone).
	ClearMonthZone(studentID, sfID uint, month, year uint, force bool) (*dto.FacilityMonthZoneResponse, error)
}

// ─── Master Facility Service ─────────────────────────────────────────

type facilityService struct {
	repo              repository.FacilityRepository
	feeConfigRepo     repository.FeeConfigRepository
	feeConfigItemRepo repository.FeeConfigItemRepository
}

func NewFacilityService(repo repository.FacilityRepository, feeConfigRepo repository.FeeConfigRepository, feeConfigItemRepo repository.FeeConfigItemRepository) FacilityService {
	return &facilityService{
		repo:              repo,
		feeConfigRepo:     feeConfigRepo,
		feeConfigItemRepo: feeConfigItemRepo,
	}
}

func (s *facilityService) GetAll() ([]dto.FacilityResponse, error) {
	facilities, err := s.repo.FindAll()
	if err != nil {
		return nil, err
	}
	var responses []dto.FacilityResponse
	for _, f := range facilities {
		responses = append(responses, mapFacilityToResponse(f))
	}
	return responses, nil
}

func (s *facilityService) GetByID(id uint) (*dto.FacilityResponse, error) {
	f, err := s.repo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("Fasilitas tidak ditemukan")
		}
		return nil, err
	}
	resp := mapFacilityToResponse(*f)
	return &resp, nil
}

func (s *facilityService) Create(req dto.CreateFacilityRequest) (*dto.FacilityResponse, error) {
	f := &model.Facility{
		Name:        req.Name,
		Description: req.Description,
		IsActive:    true,
	}
	if err := s.repo.Create(f); err != nil {
		return nil, err
	}

	// Auto-create fee config item Rp 0 (admin tinggal isi nominal di halaman Tarif)
	feeConfig, _ := s.feeConfigRepo.FindActive()
	if feeConfig != nil && feeConfig.ID > 0 {
		slug := strings.ToLower(strings.ReplaceAll(req.Name, " ", "_"))
		itemKey := "facility_" + slug
		existing, _ := s.feeConfigItemRepo.FindByItemKeys(feeConfig.ID, []string{itemKey})
		if len(existing) == 0 {
			s.feeConfigItemRepo.Create(&model.FeeConfigItem{
				FeeConfigID: feeConfig.ID,
				Category:    "facility",
				ItemKey:     itemKey,
				Name:        req.Name,
				Level:       "all",
				Gender:      "all",
				Amount:      0,
				Unit:        "per_day",
			})
		}
	}

	resp := mapFacilityToResponse(*f)
	return &resp, nil
}

func (s *facilityService) Update(id uint, req dto.CreateFacilityRequest) (*dto.FacilityResponse, error) {
	f, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.New("Fasilitas tidak ditemukan")
	}

	oldName := f.Name
	f.Name = req.Name
	f.Description = req.Description
	if err := s.repo.Update(f); err != nil {
		return nil, err
	}

	// Sync fee item name jika berubah
	if oldName != req.Name {
		oldSlug := strings.ToLower(strings.ReplaceAll(oldName, " ", "_"))
		newSlug := strings.ToLower(strings.ReplaceAll(req.Name, " ", "_"))
		oldKey := "facility_" + oldSlug
		newKey := "facility_" + newSlug

		feeConfig, _ := s.feeConfigRepo.FindActive()
		if feeConfig != nil && feeConfig.ID > 0 {
			item, err := s.feeConfigItemRepo.FindByItemKey(feeConfig.ID, oldKey, "all", "all")
			if err == nil && item != nil {
				item.ItemKey = newKey
				item.Name = req.Name
				s.feeConfigItemRepo.Update(item)
			}
		}
	}

	resp := mapFacilityToResponse(*f)
	return &resp, nil
}

func (s *facilityService) Delete(id uint) error {
	f, err := s.repo.FindByID(id)
	if err != nil {
		return errors.New("Fasilitas tidak ditemukan")
	}

	// Hapus fee config item terkait
	slug := strings.ToLower(strings.ReplaceAll(f.Name, " ", "_"))
	itemKey := "facility_" + slug
	feeConfig, _ := s.feeConfigRepo.FindActive()
	if feeConfig != nil && feeConfig.ID > 0 {
		items, _ := s.feeConfigItemRepo.FindByItemKeys(feeConfig.ID, []string{itemKey})
		for _, item := range items {
			s.feeConfigItemRepo.Delete(item.ID)
		}
	}

	return s.repo.Delete(id)
}

func mapFacilityToResponse(f model.Facility) dto.FacilityResponse {
	return dto.FacilityResponse{
		ID:          f.ID,
		Name:        f.Name,
		Description: f.Description,
		IsActive:    f.IsActive,
	}
}

// ─── Student Facility Service ────────────────────────────────────────

type studentFacilityService struct {
	sfRepo            repository.StudentFacilityRepository
	studentRepo       repository.StudentRepository
	facilityRepo      repository.FacilityRepository
	acRepo            repository.AcademicYearRepository
	feeConfigRepo     repository.FeeConfigRepository
	feeConfigItemRepo repository.FeeConfigItemRepository
	invoiceRepo       repository.InvoiceRepository
	invoiceItemRepo   repository.InvoiceItemRepository
	enrollmentRepo    repository.StudentEnrollmentRepository
	effectiveDayRepo  repository.EffectiveDayRepository
	invoiceGen        InvoiceGenerateService
	exclRepo          repository.BillingMonthExclusionRepository
	monthZoneRepo     repository.StudentFacilityMonthZoneRepository
}

func NewStudentFacilityService(
	sfRepo repository.StudentFacilityRepository,
	studentRepo repository.StudentRepository,
	facilityRepo repository.FacilityRepository,
	acRepo repository.AcademicYearRepository,
	feeConfigItemRepo repository.FeeConfigItemRepository,
	invoiceRepo repository.InvoiceRepository,
	invoiceItemRepo repository.InvoiceItemRepository,
	enrollmentRepo repository.StudentEnrollmentRepository,
	effectiveDayRepo repository.EffectiveDayRepository,
	invoiceGen InvoiceGenerateService,
	exclRepo repository.BillingMonthExclusionRepository,
	feeConfigRepo repository.FeeConfigRepository,
	monthZoneRepo repository.StudentFacilityMonthZoneRepository,
) StudentFacilityService {
	return &studentFacilityService{
		sfRepo:            sfRepo,
		studentRepo:       studentRepo,
		facilityRepo:      facilityRepo,
		acRepo:            acRepo,
		feeConfigRepo:     feeConfigRepo,
		feeConfigItemRepo: feeConfigItemRepo,
		invoiceRepo:       invoiceRepo,
		invoiceItemRepo:   invoiceItemRepo,
		enrollmentRepo:    enrollmentRepo,
		effectiveDayRepo:  effectiveDayRepo,
		invoiceGen:        invoiceGen,
		exclRepo:          exclRepo,
		monthZoneRepo:     monthZoneRepo,
	}
}

func (s *studentFacilityService) GetByStudentID(studentID uint, params dto.StudentFacilityQueryParams) ([]dto.StudentFacilityResponse, error) {
	_, err := s.studentRepo.FindByID(studentID)
	if err != nil {
		return nil, errors.New("Siswa tidak ditemukan")
	}

	sfs, err := s.sfRepo.FindByStudentID(studentID, params)
	if err != nil {
		return nil, err
	}

	var responses []dto.StudentFacilityResponse
	for _, sf := range sfs {
		responses = append(responses, mapStudentFacilityToResponse(sf))
	}
	return responses, nil
}

func (s *studentFacilityService) Enroll(studentID uint, req dto.EnrollFacilityRequest) (*dto.StudentFacilityResponse, error) {
	_, err := s.studentRepo.FindByID(studentID)
	if err != nil {
		return nil, errors.New("Siswa tidak ditemukan")
	}

	_, err = s.facilityRepo.FindByID(req.FacilityID)
	if err != nil {
		return nil, errors.New("Fasilitas tidak ditemukan")
	}

	_, err = s.acRepo.FindByID(req.AcademicYearID)
	if err != nil {
		return nil, errors.New("Tahun ajaran tidak ditemukan")
	}

	already, _ := s.sfRepo.AlreadyEnrolled(studentID, req.FacilityID, req.AcademicYearID)
	if already {
		return nil, errors.New("Siswa sudah terdaftar di fasilitas ini untuk tahun ajaran tersebut")
	}

	// Validate FeeConfigItemID if provided
	if req.FeeConfigItemID != nil {
		item, err := s.feeConfigItemRepo.FindByID(*req.FeeConfigItemID)
		if err != nil {
			return nil, errors.New("Paket/zona tidak ditemukan")
		}
		if !item.IsActive {
			return nil, errors.New("Paket/zona sudah tidak aktif")
		}
	}

	startDate, err := utility.ParseDate(req.StartDate)
	if err != nil {
		return nil, errors.New("Format start_date tidak valid (YYYY-MM-DD)")
	}

	// Check if student was previously enrolled (inactive record exists)
	existing, _ := s.sfRepo.FindByStudentFacilityAcademicYear(studentID, req.FacilityID, req.AcademicYearID)
	if existing != nil {
		// Reactivate: clear end_date, update zone & start date
		oldFeeConfigItemID := existing.FeeConfigItemID
		existing.EndDate = nil
		existing.FeeConfigItemID = req.FeeConfigItemID
		existing.StartDate = startDate
		if err := s.sfRepo.Update(existing); err != nil {
			return nil, err
		}
		// Sinkronkan invoice. Hapus item zona lama HANYA jika zona berubah;
		// Add tetap jalan (unenroll sudah menghapus item bulan berjalan+depan).
		zoneChanged := !sameUintPtr(oldFeeConfigItemID, req.FeeConfigItemID)
		if s.invoiceGen != nil {
			var oldZoneNames []string
			if zoneChanged && oldFeeConfigItemID != nil {
				if oldItem, err := s.feeConfigItemRepo.FindByIDIncludingDeleted(*oldFeeConfigItemID); err == nil && oldItem != nil {
					oldZoneNames = append(oldZoneNames, oldItem.Name)
				}
			}
			go func() {
				if zoneChanged {
					if err := s.invoiceGen.RemoveFacilityFromFutureInvoices(studentID, req.FacilityID, req.AcademicYearID, oldZoneNames...); err != nil {
						log.Printf("[Facility] Gagal remove facility dari invoice (reactivation) student=%d facility=%d: %v", studentID, req.FacilityID, err)
					}
				}
				if err := s.invoiceGen.AddFacilityToMonthlyRange(studentID, req.FacilityID, req.AcademicYearID); err != nil {
					log.Printf("[Facility] Gagal add facility ke invoice (reactivation) student=%d facility=%d: %v", studentID, req.FacilityID, err)
				}
			}()
		}
		saved, err := s.sfRepo.FindByID(existing.ID)
		if err != nil {
			return nil, fmt.Errorf("gagal mengambil data fasilitas: %w", err)
		}
		resp := mapStudentFacilityToResponse(*saved)
		return &resp, nil
	}

	sf := &model.StudentFacility{
		StudentID:       studentID,
		FacilityID:      req.FacilityID,
		AcademicYearID:  req.AcademicYearID,
		FeeConfigItemID: req.FeeConfigItemID,
		StartDate:       startDate,
	}

	if err := s.sfRepo.Create(sf); err != nil {
		return nil, err
	}

	// Tambahkan item fasilitas ke invoice bulanan (dari start_date sampai akhir TA)
	if s.invoiceGen != nil {
		go func() {
			if err := s.invoiceGen.AddFacilityToMonthlyRange(studentID, req.FacilityID, req.AcademicYearID); err != nil {
				log.Printf("[Facility] Gagal add facility ke invoice (new enroll) student=%d facility=%d: %v", studentID, req.FacilityID, err)
			}
		}()
	}

	saved, err := s.sfRepo.FindByID(sf.ID)
	if err != nil {
		return nil, fmt.Errorf("gagal mengambil data fasilitas: %w", err)
	}
	resp := mapStudentFacilityToResponse(*saved)
	return &resp, nil
}

func (s *studentFacilityService) UpdateEnrollment(studentID, sfID uint, req dto.UpdateStudentFacilityRequest) (*dto.StudentFacilityResponse, *dto.FacilityDefaultZoneSummary, error) {
	sf, err := s.sfRepo.FindByID(sfID)
	if err != nil || sf.StudentID != studentID {
		return nil, nil, errors.New("Data pendaftaran fasilitas tidak ditemukan")
	}

	if sf.EndDate != nil {
		return nil, nil, errors.New("Siswa sudah tidak aktif di fasilitas ini")
	}

	// Validasi & resolve zona baru (default). Zona harus milik fee config tahun
	// ajaran enrollment — bila tidak, item invoice tidak akan pernah memakainya.
	var newItem *model.FeeConfigItem
	if req.FeeConfigItemID != nil {
		item, err := s.feeConfigItemRepo.FindByID(*req.FeeConfigItemID)
		if err != nil {
			return nil, nil, errors.New("Paket/zona tidak ditemukan")
		}
		if !item.IsActive {
			return nil, nil, errors.New("Paket/zona sudah tidak aktif")
		}
		feeConfig, fcErr := s.feeConfigRepo.FindByAcademicYearID(sf.AcademicYearID)
		if fcErr != nil || feeConfig == nil || item.FeeConfigID != feeConfig.ID {
			return nil, nil, errors.New("Paket/zona tidak ada di tarif tahun ajaran ini")
		}
		newItem = item
	}

	sf.FeeConfigItemID = req.FeeConfigItemID
	if err := s.sfRepo.Update(sf); err != nil {
		return nil, nil, err
	}

	// Selaraskan semua bulan unpaid tanpa override ke zona default (R.5 —
	// termasuk bulan lalu; bulan ber-override & item paid dilewati).
	summary := s.reconcileDefaultZone(sf, newItem)

	saved, err := s.sfRepo.FindByID(sf.ID)
	if err != nil {
		return nil, nil, fmt.Errorf("gagal mengambil data fasilitas: %w", err)
	}
	resp := mapStudentFacilityToResponse(*saved)
	return &resp, summary, nil
}

// reconcileDefaultZone menyelaraskan item invoice fasilitas pendaftaran sf ke
// zona default (defaultItem) pada semua bulan dalam rentang enrollment yang
// item-nya UNPAID dan TANPA override. Bulan ber-override dan item paid dilewati;
// quantity (hari) dipertahankan oleh RewriteFacilityMonthItem.
func (s *studentFacilityService) reconcileDefaultZone(sf *model.StudentFacility, defaultItem *model.FeeConfigItem) *dto.FacilityDefaultZoneSummary {
	summary := &dto.FacilityDefaultZoneSummary{}
	if s.invoiceGen == nil || s.monthZoneRepo == nil {
		return summary
	}

	ay, err := s.acRepo.FindByID(sf.AcademicYearID)
	if err != nil || ay == nil {
		log.Printf("[Facility] Reconcile gagal ambil tahun ajaran sf=%d: %v", sf.ID, err)
		return summary
	}

	// "Tanpa zona" (default NULL) → pakai item dasar nama fasilitas.
	if defaultItem == nil {
		defaultItem = s.baseFacilityItem(sf)
	}
	if defaultItem == nil {
		// Tidak ada tarif dasar — tidak ada yang bisa ditulis ke item bulan.
		log.Printf("[Facility] Reconcile lewati sf=%d: tarif dasar fasilitas tidak ditemukan", sf.ID)
		return summary
	}

	overrides, err := s.monthZoneRepo.FindByStudentFacilityID(sf.ID)
	if err != nil {
		log.Printf("[Facility] Reconcile gagal ambil override sf=%d: %v", sf.ID, err)
		return summary
	}
	overrideSet := make(map[string]bool, len(overrides))
	for _, z := range overrides {
		overrideSet[fmt.Sprintf("%d-%d", z.Month, z.Year)] = true
	}

	months := utility.MonthRangeFromDate(sf.StartDate, ay.EndDate)
	for _, m := range months {
		key := fmt.Sprintf("%d-%d", m.Month, m.Year)
		if overrideSet[key] {
			summary.SkippedOverride++
			continue
		}
		res, err := s.invoiceGen.RewriteFacilityMonthItem(sf.StudentID, sf.FacilityID, m.Month, m.Year, defaultItem, false)
		if err != nil {
			log.Printf("[Facility] Reconcile sf=%d bulan=%d/%d: %v", sf.ID, m.Month, m.Year, err)
			continue
		}
		if res.BlockedByPayment {
			summary.SkippedPaid++
			continue
		}
		if res.InvoiceItemUpdated {
			summary.Reconciled++
		}
	}
	return summary
}

// SetMonthZone menetapkan override zona utk satu bulan lalu menulis ulang item
// invoice bulan itu. Bulan dengan item paid butuh Force=true (R.6).
func (s *studentFacilityService) SetMonthZone(studentID, sfID uint, req dto.UpdateStudentFacilityMonthZoneRequest) (*dto.FacilityMonthZoneResponse, error) {
	sf, err := s.sfRepo.FindByID(sfID)
	if err != nil || sf.StudentID != studentID {
		return nil, errors.New("Data pendaftaran fasilitas tidak ditemukan")
	}
	if sf.EndDate != nil {
		return nil, errors.New("Siswa sudah tidak aktif di fasilitas ini")
	}
	if !s.monthWithinEnrollment(sf, req.Month, req.Year) {
		return nil, errors.New("Bulan/tahun di luar rentang pendaftaran fasilitas (tidak valid)")
	}

	feeItem, err := s.resolveZoneFeeItem(sf, req.FeeConfigItemID)
	if err != nil {
		return nil, err
	}

	zone := &model.StudentFacilityMonthZone{
		StudentFacilityID: sfID,
		Month:             req.Month,
		Year:              req.Year,
		FeeConfigItemID:   req.FeeConfigItemID,
	}
	if err := s.monthZoneRepo.UpsertMonth(zone); err != nil {
		return nil, err
	}

	res, err := s.invoiceGen.RewriteFacilityMonthItem(studentID, sf.FacilityID, req.Month, req.Year, feeItem, req.Force)
	if err != nil {
		return nil, err
	}
	if res.BlockedByPayment {
		return nil, errors.New("Item fasilitas bulan ini sudah dibayar — tidak bisa diubah tanpa konfirmasi force")
	}

	return &dto.FacilityMonthZoneResponse{
		Month:              req.Month,
		Year:               req.Year,
		FeeConfigItemID:    req.FeeConfigItemID,
		Source:             "override",
		InvoiceItemUpdated: res.InvoiceItemUpdated,
		ItemPaidAmount:     res.ItemPaidAmount,
		RemainingOrExcess:  res.RemainingOrExcess,
	}, nil
}

// ClearMonthZone menghapus override zona utk satu bulan (kembali ke default)
// lalu menulis ulang item invoice bulan itu.
func (s *studentFacilityService) ClearMonthZone(studentID, sfID uint, month, year uint, force bool) (*dto.FacilityMonthZoneResponse, error) {
	sf, err := s.sfRepo.FindByID(sfID)
	if err != nil || sf.StudentID != studentID {
		return nil, errors.New("Data pendaftaran fasilitas tidak ditemukan")
	}
	if sf.EndDate != nil {
		return nil, errors.New("Siswa sudah tidak aktif di fasilitas ini")
	}
	if !s.monthWithinEnrollment(sf, month, year) {
		return nil, errors.New("Bulan/tahun di luar rentang pendaftaran fasilitas (tidak valid)")
	}

	if err := s.monthZoneRepo.DeleteMonth(sfID, month, year); err != nil {
		return nil, err
	}

	feeItem, err := s.resolveZoneFeeItem(sf, sf.FeeConfigItemID)
	if err != nil {
		return nil, err
	}

	res, err := s.invoiceGen.RewriteFacilityMonthItem(studentID, sf.FacilityID, month, year, feeItem, force)
	if err != nil {
		return nil, err
	}
	if res.BlockedByPayment {
		return nil, errors.New("Item fasilitas bulan ini sudah dibayar — tidak bisa diubah tanpa konfirmasi force")
	}

	return &dto.FacilityMonthZoneResponse{
		Month:              month,
		Year:               year,
		FeeConfigItemID:    sf.FeeConfigItemID,
		Source:             "default",
		InvoiceItemUpdated: res.InvoiceItemUpdated,
		ItemPaidAmount:     res.ItemPaidAmount,
		RemainingOrExcess:  res.RemainingOrExcess,
	}, nil
}

// resolveZoneFeeItem memvalidasi & me-resolve fee item zona utk bulan:
//   - zoneID non-nil → zona tsb harus aktif & milik fee config tahun ajaran
//   - zoneID nil ("tanpa zona") → item dasar nama fasilitas
func (s *studentFacilityService) resolveZoneFeeItem(sf *model.StudentFacility, zoneID *uint) (*model.FeeConfigItem, error) {
	if zoneID == nil {
		item := s.baseFacilityItem(sf)
		if item == nil {
			return nil, errors.New("Tarif dasar fasilitas tidak ditemukan")
		}
		return item, nil
	}

	item, err := s.feeConfigItemRepo.FindByID(*zoneID)
	if err != nil {
		return nil, errors.New("Paket/zona tidak ditemukan")
	}
	if !item.IsActive {
		return nil, errors.New("Paket/zona sudah tidak aktif")
	}
	feeConfig, fcErr := s.feeConfigRepo.FindByAcademicYearID(sf.AcademicYearID)
	if fcErr != nil || feeConfig == nil || item.FeeConfigID != feeConfig.ID {
		return nil, errors.New("Paket/zona tidak ada di tarif tahun ajaran ini")
	}
	return item, nil
}

// baseFacilityItem mengambil item tarif dasar fasilitas (key facility_<slug>)
// pada fee config tahun ajaran enrollment; nil bila tidak ada.
func (s *studentFacilityService) baseFacilityItem(sf *model.StudentFacility) *model.FeeConfigItem {
	feeConfig, err := s.feeConfigRepo.FindByAcademicYearID(sf.AcademicYearID)
	if err != nil || feeConfig == nil {
		return nil
	}
	items, err := s.feeConfigItemRepo.FindByItemKeys(feeConfig.ID, []string{facilityItemKey(sf.Facility.Name)})
	if err != nil || len(items) == 0 {
		return nil
	}
	return &items[0]
}

// monthWithinEnrollment memeriksa apakah (month, year) berada pada rentang
// bulan enrollment (start_date .. akhir tahun ajaran) — inklusif.
func (s *studentFacilityService) monthWithinEnrollment(sf *model.StudentFacility, month, year uint) bool {
	ay, err := s.acRepo.FindByID(sf.AcademicYearID)
	if err != nil || ay == nil {
		return false
	}
	if month < 1 || month > 12 {
		return false
	}
	start := sf.StartDate
	end := ay.EndDate
	if year < uint(start.Year()) || (year == uint(start.Year()) && month < uint(start.Month())) {
		return false
	}
	if year > uint(end.Year()) || (year == uint(end.Year()) && month > uint(end.Month())) {
		return false
	}
	return true
}

// facilityItemNameMatches menentukan apakah sebuah item invoice fasilitas
// milik pendaftaran fasilitas tertentu. Item fasilitas di invoice dinamai
// sesuai NAMA FASILITAS atau NAMA ZONA/PAKET yang dipilih saat enroll,
// dengan format "<nama> (N hari)" atau persis "<nama>". Pencocokan dilakukan
// pada nama dasar (bukan substring bebas) supaya "ZONA 1" tidak ikut cocok
// dengan item "ZONA 10 (24 hari)".
func facilityItemNameMatches(itemName, facilityName string, zoneNames ...string) bool {
	for _, base := range append([]string{facilityName}, zoneNames...) {
		if utility.InvoiceItemNameHasBase(itemName, base) {
			return true
		}
	}
	return false
}

// sameUintPtr membandingkan dua pointer uint (nil-safe).
func sameUintPtr(a, b *uint) bool {
	if a == nil || b == nil {
		return a == b
	}
	return *a == *b
}

func (s *studentFacilityService) GetCurrentMonthDays(studentID, sfID uint) (*dto.FacilityCurrentMonthDaysResponse, error) {
	sf, err := s.sfRepo.FindByID(sfID)
	if err != nil || sf.StudentID != studentID {
		return nil, errors.New("Data pendaftaran fasilitas tidak ditemukan")
	}

	now := time.Now()
	month := uint(now.Month())
	year := uint(now.Year())

	// Get student's monthly invoice for current month
	invoice, err := s.invoiceRepo.FindMonthlyByStudent(studentID, month, year)
	if err != nil {
		return &dto.FacilityCurrentMonthDaysResponse{
			DefaultDays: 0,
			CurrentDays: 0,
			ZoneAmount:  0,
		}, nil
	}

	// Find the facility item in this invoice.
	// Nama item bisa memakai nama fasilitas ATAU nama zona/paket siswa.
	var zoneName string
	if sf.FeeConfigItem != nil {
		zoneName = sf.FeeConfigItem.Name
	}

	items, _ := s.invoiceItemRepo.FindByInvoiceID(invoice.ID)
	var facilityItemID uint
	var currentQty uint
	for _, item := range items {
		if item.Category != "facility" {
			continue
		}
		// Prioritas: relasi facility_id (akurat). Baris legacy tanpa
		// facility_id tetap dicocokkan via nama fasilitas/zona.
		if item.FacilityID != nil {
			if *item.FacilityID != sf.FacilityID {
				continue
			}
		} else if !facilityItemNameMatches(item.Name, sf.Facility.Name, zoneName) {
			continue
		}
		facilityItemID = item.ID
		if item.Quantity != nil {
			currentQty = *item.Quantity
		}
		break
	}

	// Get default effective days
	var defaultDays uint
	enrollment, _ := s.enrollmentRepo.FindActiveByStudentID(studentID)
	if enrollment != nil {
		ed, _ := s.effectiveDayRepo.FindByClassGroupMonthYear(enrollment.ClassGroupID, month, year)
		if ed == nil || ed.ID == 0 {
			ed, _ = s.effectiveDayRepo.FindByLevelMonthYear(enrollment.ClassGroup.Level, month, year)
		}
		if ed != nil && ed.ID != 0 {
			defaultDays = ed.TotalDays
		}
	}

	// Get zone amount
	var zoneAmount float64
	if sf.FeeConfigItem != nil {
		zoneAmount = sf.FeeConfigItem.Amount
	}

	resp := &dto.FacilityCurrentMonthDaysResponse{
		DefaultDays: defaultDays,
		CurrentDays: currentQty,
		ZoneAmount:  zoneAmount,
		InvoiceID:   &invoice.ID,
	}
	if facilityItemID > 0 {
		resp.InvoiceItemID = &facilityItemID
	}
	return resp, nil
}

func (s *studentFacilityService) Unenroll(studentID, sfID uint) error {
	sf, err := s.sfRepo.FindByID(sfID)
	if err != nil || sf.StudentID != studentID {
		return errors.New("Data pendaftaran fasilitas tidak ditemukan")
	}

	now := time.Now()
	sf.EndDate = &now
	if err := s.sfRepo.Update(sf); err != nil {
		return err
	}

	// Hapus item unpaid fasilitas dari invoice mulai bulan siswa mengikuti
	// (start_date) ke depan — berhenti = semua item unpaid fasilitas ini
	// dihapus, termasuk bulan-bulan sebelum hari ini (Aturan B).
	if s.invoiceGen != nil {
		go func() {
			if err := s.invoiceGen.RemoveFacilityInvoices(studentID, sf.FacilityID, sf.AcademicYearID, sf.StartDate); err != nil {
				log.Printf("[Facility] Gagal remove facility dari invoice (unenroll) student=%d facility=%d: %v", studentID, sf.FacilityID, err)
			}
		}()
	}

	// R.8: hapus semua skip tagihan (billing exclusions) enrollment ini —
	// enrollment sudah nonaktif, data skip tidak boleh menggantung.
	if s.exclRepo != nil {
		if err := s.exclRepo.DeleteByStudentAndEntity(studentID, "facility", sf.FacilityID); err != nil {
			log.Printf("[Facility] Gagal menghapus billing exclusions student=%d facility=%d: %v", studentID, sf.FacilityID, err)
		}
	}

	// R.9 (epic zona-bulanan): hapus semua override zona per bulan pendaftaran
	// ini — enrollment sudah nonaktif, override tidak boleh menggantung.
	if s.monthZoneRepo != nil {
		if err := s.monthZoneRepo.DeleteByStudentFacilityID(sf.ID); err != nil {
			log.Printf("[Facility] Gagal menghapus month-zone sf=%d: %v", sf.ID, err)
		}
	}

	return nil
}

func mapStudentFacilityToResponse(sf model.StudentFacility) dto.StudentFacilityResponse {
	var endDateStr *string
	if sf.EndDate != nil {
		ed := sf.EndDate.Format("2006-01-02")
		endDateStr = &ed
	}

	resp := dto.StudentFacilityResponse{
		ID: sf.ID,
		Facility: dto.FacilityResponse{
			ID:          sf.Facility.ID,
			Name:        sf.Facility.Name,
			Description: sf.Facility.Description,
			IsActive:    sf.Facility.IsActive,
		},
		StartDate: sf.StartDate.Format("2006-01-02"),
		EndDate:   endDateStr,
	}

	if sf.FeeConfigItem != nil {
		resp.FeeConfigItem = &dto.FeeConfigItemBriefResponse{
			ID:     sf.FeeConfigItem.ID,
			Name:   sf.FeeConfigItem.Name,
			Amount: sf.FeeConfigItem.Amount,
			Unit:   sf.FeeConfigItem.Unit,
		}
	}

	return resp
}

func (s *studentFacilityService) GetStudentsByFacility(facilityID uint, params dto.FacilityStudentQueryParams) (*dto.PaginatedFacilityStudentResponse, error) {
	_, err := s.facilityRepo.FindByID(facilityID)
	if err != nil {
		return nil, errors.New("Fasilitas tidak ditemukan")
	}

	sfs, total, err := s.sfRepo.FindByFacilityID(facilityID, params)
	if err != nil {
		return nil, err
	}

	// Default pagination
	page := params.Page
	if page < 1 {
		page = 1
	}
	limit := params.Limit
	if limit < 1 {
		limit = 20
	}

	var items []dto.FacilityStudentItemResponse
	now := time.Now()
	curMonth := uint(now.Month())
	curYear := uint(now.Year())
	// Bila bulan/tahun diminta eksplisit, pakai itu (fitur pilih bulan).
	if params.Month > 0 && params.Year > 0 {
		curMonth = params.Month
		curYear = params.Year
	}

	// Override zona per bulan utk semua pendaftaran di halaman ini (batch,
	// hindari N+1) — zona efektif bulan = override ?: default.
	overrideBySF := map[uint]model.StudentFacilityMonthZone{}
	if s.monthZoneRepo != nil && len(sfs) > 0 {
		sfIDs := make([]uint, len(sfs))
		for i := range sfs {
			sfIDs[i] = sfs[i].ID
		}
		if monthZones, err := s.monthZoneRepo.FindBySFIDsAndMonth(sfIDs, curMonth, curYear); err == nil {
			for _, z := range monthZones {
				overrideBySF[z.StudentFacilityID] = z
			}
		}
	}

	for _, sf := range sfs {
		var endDateStr *string
		if sf.EndDate != nil {
			ed := sf.EndDate.Format("2006-01-02")
			endDateStr = &ed
		}

		item := dto.FacilityStudentItemResponse{
			ID: sf.ID,
			Student: dto.StudentBriefResponse{
				ID:       sf.Student.ID,
				FullName: sf.Student.FullName,
				Gender:   sf.Student.Gender,
			},
			StartDate: sf.StartDate.Format("2006-01-02"),
			EndDate:   endDateStr,
		}

		if sf.FeeConfigItem != nil {
			item.FeeConfigItem = &dto.FeeConfigItemBriefResponse{
				ID:     sf.FeeConfigItem.ID,
				Name:   sf.FeeConfigItem.Name,
				Amount: sf.FeeConfigItem.Amount,
				Unit:   sf.FeeConfigItem.Unit,
			}
		}

		// Zona EFEKTIF bulan yang diminta (override ?: default) untuk dropdown
		// zona per bulan di tab bulanan.
		if z, ok := overrideBySF[sf.ID]; ok {
			item.MonthZoneOverridden = true
			item.MonthZoneFeeConfigItemID = z.FeeConfigItemID
		} else {
			item.MonthZoneFeeConfigItemID = sf.FeeConfigItemID
		}

		// Populate current month invoice item quantity.
		// Nama item bisa memakai nama fasilitas ATAU nama zona/paket siswa.
		var zoneName string
		if sf.FeeConfigItem != nil {
			zoneName = sf.FeeConfigItem.Name
		}
		if invoice, err := s.invoiceRepo.FindMonthlyByStudent(sf.StudentID, curMonth, curYear); err == nil {
			invItems, _ := s.invoiceItemRepo.FindByInvoiceID(invoice.ID)
			for _, invItem := range invItems {
				if invItem.Category != "facility" || invItem.Quantity == nil {
					continue
				}
				// Prioritas: relasi facility_id. Baris legacy tanpa
				// facility_id tetap dicocokkan via nama fasilitas/zona.
				if invItem.FacilityID != nil {
					if *invItem.FacilityID != sf.FacilityID {
						continue
					}
				} else if !facilityItemNameMatches(invItem.Name, sf.Facility.Name, zoneName) {
					continue
				}
				item.CurrentMonthDays = invItem.Quantity
				// Penanda item bulan ini sudah dibayar (memicu konfirmasi edit).
				item.MonthItemPaid = invItem.PaidAmount > 0
				invoiceID := invoice.ID
				invItemID := invItem.ID
				item.InvoiceID = &invoiceID
				item.InvoiceItemID = &invItemID
				break
			}
		}

		items = append(items, item)
	}

	return &dto.PaginatedFacilityStudentResponse{
		Data: items,
		Meta: dto.Meta{
			Page:  page,
			Limit: limit,
			Total: total,
		},
	}, nil
}
