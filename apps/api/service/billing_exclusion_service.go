package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"errors"
	"fmt"
	"log"
	"time"

	"gorm.io/gorm"
)

type BillingExclusionService interface {
	GetByStudentAndEntity(studentID uint, entityType string, entityRefID uint) (*dto.BillingExclusionsResponse, error)
	SetExclusions(studentID uint, entityType string, entityRefID uint, req dto.SetBillingExclusionsRequest) (*dto.BillingExclusionsResponse, error)
	// SkipFacilityMonth menandai SATU bulan sebagai skip utk sebuah fasilitas
	// (idempotent): bulan ditambahkan ke daftar exclusion berjalan sehingga item
	// unpaid bulan tsb dihapus.
	SkipFacilityMonth(studentID, facilityID, month, year uint) error
	// UnskipFacilityMonth mencabut skip SATU bulan utk sebuah fasilitas
	// (idempotent): item bulan tsb dikembalikan.
	UnskipFacilityMonth(studentID, facilityID, month, year uint) error
}

type billingExclusionService struct {
	db         *gorm.DB
	exclRepo   repository.BillingMonthExclusionRepository
	ayRepo     repository.AcademicYearRepository
	invoiceGen InvoiceGenerateService
}

func NewBillingExclusionService(
	db *gorm.DB,
	exclRepo repository.BillingMonthExclusionRepository,
	ayRepo repository.AcademicYearRepository,
	invoiceGen InvoiceGenerateService,
) BillingExclusionService {
	return &billingExclusionService{db: db, exclRepo: exclRepo, ayRepo: ayRepo, invoiceGen: invoiceGen}
}

func (s *billingExclusionService) GetByStudentAndEntity(studentID uint, entityType string, entityRefID uint) (*dto.BillingExclusionsResponse, error) {
	exclusions, err := s.exclRepo.FindByStudentAndEntity(studentID, entityType, entityRefID)
	if err != nil {
		return nil, err
	}
	months := make([]dto.BillingExclusionMonth, 0, len(exclusions))
	for _, ex := range exclusions {
		months = append(months, dto.BillingExclusionMonth{Month: ex.Month, Year: ex.Year})
	}
	resp := &dto.BillingExclusionsResponse{Months: months}
	switch entityType {
	case "extracurricular":
		// Bulan yang item PASTA-nya sudah dibayar → UI men-disable (tak bisa di-skip).
		if paid, err := s.paidExtracurricularMonths(studentID, entityRefID); err == nil {
			resp.PaidMonths = paid
		}
	case "daycare":
		// Bulan yang item daycare-nya (SPD/konsumsi/overtime) sudah dibayar.
		if paid, err := s.paidDaycareMonths(studentID); err == nil {
			resp.PaidMonths = paid
		} else {
			log.Printf("[BillingExclusion] Gagal menghitung paid_months daycare siswa %d: %v", studentID, err)
		}
	}
	return resp, nil
}

// paidExtracurricularMonths mengembalikan bulan-bulan (tahun ajaran aktif) di mana
// siswa punya item invoice PASTA untuk ekskul tsb dengan paid_amount > 0.
// Item berbayar tidak bisa dihapus oleh RemoveExtracurricularItemFromMonthly
// (integritas pembayaran), jadi dialog Kelola Bulan harus men-disable bulan tsb.
func (s *billingExclusionService) paidExtracurricularMonths(studentID, extracurricularID uint) ([]dto.BillingExclusionMonth, error) {
	ay, err := s.ayRepo.FindActive()
	if err != nil {
		return nil, err
	}
	var ex model.Extracurricular
	if err := s.db.First(&ex, extracurricularID).Error; err != nil {
		return nil, err
	}
	var rows []struct {
		Month uint
		Year  uint
	}
	// Cocokkan item invoice dengan fee config item ekskul (name+category), sama
	// seperti logika extracurricularItemsToRemove — bukan asumsi nama sama persis.
	err = s.db.Table("invoice_items").
		Select("DISTINCT i.month AS month, i.year AS year").
		Joins("JOIN invoices i ON i.id = invoice_items.invoice_id").
		Joins("JOIN fee_configs fc ON fc.academic_year_id = i.academic_year_id").
		Joins("JOIN fee_config_items fci ON fci.fee_config_id = fc.id AND fci.category = ? AND fci.name = ? AND fci.is_active = ?", ex.Type, ex.Name, true).
		Where("i.student_id = ? AND i.academic_year_id = ? AND i.type = 'monthly'", studentID, ay.ID).
		Where("invoice_items.deleted_at IS NULL AND invoice_items.paid_amount > 0").
		Where("invoice_items.category = fci.category AND invoice_items.name = fci.name").
		Order("i.year, i.month").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	out := make([]dto.BillingExclusionMonth, 0, len(rows))
	for _, r := range rows {
		out = append(out, dto.BillingExclusionMonth{Month: r.Month, Year: r.Year})
	}
	return out, nil
}

// paidDaycareMonths mengembalikan bulan-bulan (tahun ajaran aktif) di mana siswa
// punya item daycare yang sudah dibayar sebagian/penuh pada invoice bulanan.
// Item invoice tidak menyimpan daycare_enrollment_id, jadi query memakai
// student+academic year — konsisten dengan invarian satu enrollment aktif per
// siswa per tahun ajaran. Item berbayar tidak bisa dihapus, jadi dialog Kelola
// Bulan harus men-disable bulan tersebut.
func (s *billingExclusionService) paidDaycareMonths(studentID uint) ([]dto.BillingExclusionMonth, error) {
	ay, err := s.ayRepo.FindActive()
	if err != nil {
		return nil, err
	}
	var rows []struct {
		Month uint
		Year  uint
	}
	err = s.db.Table("invoice_items").
		Select("DISTINCT invoices.month AS month, invoices.year AS year").
		Joins("JOIN invoices ON invoices.id = invoice_items.invoice_id").
		Where("invoices.student_id = ? AND invoices.academic_year_id = ? AND invoices.type = 'monthly'", studentID, ay.ID).
		Where("invoices.deleted_at IS NULL AND invoice_items.deleted_at IS NULL AND invoice_items.paid_amount > 0").
		Where("invoice_items.category IN ?", []string{"daycare", "daycare_meal", "daycare_overtime"}).
		Order("invoices.year, invoices.month").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	out := make([]dto.BillingExclusionMonth, 0, len(rows))
	for _, r := range rows {
		out = append(out, dto.BillingExclusionMonth{Month: r.Month, Year: r.Year})
	}
	return out, nil
}

type monthKey struct {
	month uint
	year  uint
}

func monthKeyLess(a, b monthKey) bool {
	return a.year < b.year || (a.year == b.year && a.month < b.month)
}

// monthWithinAcademicYear mengembalikan true jika bulan berada dalam rentang
// [startDate, endDate] tahun ajaran (per bulan).
func monthWithinAcademicYear(month, year uint, start, end time.Time) bool {
	key := monthKey{month, year}
	startKey := monthKey{uint(start.Month()), uint(start.Year())}
	endKey := monthKey{uint(end.Month()), uint(end.Year())}
	return !monthKeyLess(key, startKey) && !monthKeyLess(endKey, key)
}

// SetExclusions mengganti SELURUH daftar bulan skip (replace-all, source of
// truth) untuk (student, entity_type, entity_ref), lalu menerapkan perubahan ke
// invoice: bulan yang baru di-skip → item unpaid dihapus; bulan yang skip-nya
// dicabut → item ditambahkan kembali. Kegagalan penerapan invoice hanya
// di-log (pola sama dengan Unenroll) — daftar skip tetap tersimpan.
func (s *billingExclusionService) SetExclusions(studentID uint, entityType string, entityRefID uint, req dto.SetBillingExclusionsRequest) (*dto.BillingExclusionsResponse, error) {
	// Daycare memakai jalur strict: bila apply ke invoice gagal, daftar exclusion
	// dan perubahan invoice dikembalikan agar UI tidak menampilkan bulan "skip"
	// padahal tagihan masih ada.
	return s.setExclusions(studentID, entityType, entityRefID, req, entityType == "daycare")
}

// setExclusions strict=true dipakai jalur fasilitas month-days. Berbeda dari
// perilaku legacy SetExclusions, kegagalan apply invoice dikembalikan dan
// daftar exclusion dikembalikan ke state sebelumnya.
func (s *billingExclusionService) setExclusions(studentID uint, entityType string, entityRefID uint, req dto.SetBillingExclusionsRequest, strict bool) (*dto.BillingExclusionsResponse, error) {
	if entityType != "extracurricular" && entityType != "facility" && entityType != "daycare" {
		return nil, errors.New("entity_type tidak valid")
	}

	ay, err := s.ayRepo.FindActive()
	if err != nil {
		return nil, errors.New("Tahun ajaran aktif tidak ditemukan")
	}

	// Dedupe + validasi bulan dalam rentang tahun ajaran aktif
	requestedSet := make(map[monthKey]bool)
	var requested []dto.BillingExclusionMonth
	for _, m := range req.Months {
		key := monthKey{m.Month, m.Year}
		if requestedSet[key] {
			continue
		}
		if !monthWithinAcademicYear(m.Month, m.Year, ay.StartDate, ay.EndDate) {
			return nil, fmt.Errorf("Bulan %d/%d di luar tahun ajaran aktif", m.Month, m.Year)
		}
		requestedSet[key] = true
		requested = append(requested, m)
	}

	old, err := s.exclRepo.FindByStudentAndEntity(studentID, entityType, entityRefID)
	if err != nil {
		return nil, err
	}
	oldSet := make(map[monthKey]bool)
	for _, ex := range old {
		oldSet[monthKey{ex.Month, ex.Year}] = true
	}

	// Diff
	var toRemove, toRestore []monthKey
	for key := range requestedSet {
		if !oldSet[key] {
			toRemove = append(toRemove, key)
		}
	}
	for key := range oldSet {
		if !requestedSet[key] {
			toRestore = append(toRestore, key)
		}
	}

	// Simpan daftar baru (transaksional)
	newExclusions := make([]model.BillingMonthExclusion, 0, len(requested))
	for _, m := range requested {
		newExclusions = append(newExclusions, model.BillingMonthExclusion{
			StudentID:      studentID,
			EntityType:     entityType,
			EntityRefID:    entityRefID,
			Month:          m.Month,
			Year:           m.Year,
			AcademicYearID: ay.ID,
		})
	}
	if err := s.db.Transaction(func(tx *gorm.DB) error {
		return s.exclRepo.Replace(tx, studentID, entityType, entityRefID, newExclusions)
	}); err != nil {
		return nil, err
	}

	// Terapkan perubahan ke invoice. Jalur strict (daycare/fasilitas month-days)
	// menghentikan proses pada error pertama dan mengembalikan state sebelumnya.
	if strict {
		if err := s.applyStrictExclusionDiff(studentID, entityType, entityRefID, ay.ID, toRemove, toRestore, old); err != nil {
			return nil, err
		}
		return s.GetByStudentAndEntity(studentID, entityType, entityRefID)
	}

	for _, key := range toRemove {
		if applyErr := s.removeEntityItem(studentID, entityType, entityRefID, key.month, key.year); applyErr != nil {
			log.Printf("[BillingExclusion] Gagal hapus item %s %d bulan %d/%d siswa %d: %v", entityType, entityRefID, key.month, key.year, studentID, applyErr)
		}
	}
	for _, key := range toRestore {
		if applyErr := s.restoreEntityItem(studentID, entityType, entityRefID, ay.ID, key.month, key.year); applyErr != nil {
			log.Printf("[BillingExclusion] Gagal restore item %s %d bulan %d/%d siswa %d: %v", entityType, entityRefID, key.month, key.year, studentID, applyErr)
		}
	}

	return s.GetByStudentAndEntity(studentID, entityType, entityRefID)
}

// removeEntityItem adalah dispatcher remove per entity type.
func (s *billingExclusionService) removeEntityItem(studentID uint, entityType string, entityRefID, month, year uint) error {
	switch entityType {
	case "extracurricular":
		return s.invoiceGen.RemoveExtracurricularItemFromMonthly(studentID, entityRefID, month, year)
	case "facility":
		return s.invoiceGen.RemoveFacilityItemFromMonthly(studentID, entityRefID, month, year)
	case "daycare":
		return s.invoiceGen.RemoveDaycareItemFromMonthly(studentID, entityRefID, month, year)
	}
	return nil
}

// restoreEntityItem adalah dispatcher restore per entity type.
func (s *billingExclusionService) restoreEntityItem(studentID uint, entityType string, entityRefID, academicYearID, month, year uint) error {
	switch entityType {
	case "extracurricular":
		return s.invoiceGen.RestoreExtracurricularItemToMonthly(studentID, entityRefID, academicYearID, month, year)
	case "facility":
		return s.invoiceGen.RestoreFacilityItemToMonthly(studentID, entityRefID, academicYearID, month, year)
	case "daycare":
		return s.invoiceGen.RestoreDaycareItemToMonthly(studentID, entityRefID, academicYearID, month, year)
	}
	return nil
}

// applyStrictExclusionDiff menerapkan perubahan invoice satu per satu dan
// mengembalikan exclusion + perubahan invoice yang sudah terlanjur diterapkan
// bila salah satu langkah gagal.
func (s *billingExclusionService) applyStrictExclusionDiff(studentID uint, entityType string, entityRefID, academicYearID uint, toRemove, toRestore []monthKey, old []model.BillingMonthExclusion) error {
	appliedRemove := make([]monthKey, 0, len(toRemove))
	appliedRestore := make([]monthKey, 0, len(toRestore))

	for _, key := range toRemove {
		if err := s.removeEntityItem(studentID, entityType, entityRefID, key.month, key.year); err != nil {
			s.revertStrictDiff(studentID, entityType, entityRefID, academicYearID, appliedRemove, appliedRestore)
			return s.rollbackExclusions(studentID, entityType, entityRefID, old, err)
		}
		appliedRemove = append(appliedRemove, key)
	}
	for _, key := range toRestore {
		if err := s.restoreEntityItem(studentID, entityType, entityRefID, academicYearID, key.month, key.year); err != nil {
			s.revertStrictDiff(studentID, entityType, entityRefID, academicYearID, appliedRemove, appliedRestore)
			return s.rollbackExclusions(studentID, entityType, entityRefID, old, err)
		}
		appliedRestore = append(appliedRestore, key)
	}
	return nil
}

// revertStrictDiff membalik perubahan invoice yang sudah diterapkan (best-effort).
func (s *billingExclusionService) revertStrictDiff(studentID uint, entityType string, entityRefID, academicYearID uint, appliedRemove, appliedRestore []monthKey) {
	for _, key := range appliedRestore {
		if err := s.removeEntityItem(studentID, entityType, entityRefID, key.month, key.year); err != nil {
			log.Printf("[BillingExclusion] Revert restore %s %d bulan %d/%d gagal: %v", entityType, entityRefID, key.month, key.year, err)
		}
	}
	for _, key := range appliedRemove {
		if err := s.restoreEntityItem(studentID, entityType, entityRefID, academicYearID, key.month, key.year); err != nil {
			log.Printf("[BillingExclusion] Revert remove %s %d bulan %d/%d gagal: %v", entityType, entityRefID, key.month, key.year, err)
		}
	}
}

// SkipFacilityMonth menandai satu bulan sebagai skip utk sebuah fasilitas.
// Idempotent — bulan yang sudah ter-skip tidak diduplikasi.
func (s *billingExclusionService) SkipFacilityMonth(studentID, facilityID, month, year uint) error {
	return s.setFacilityMonthExcluded(studentID, facilityID, month, year, true)
}

// UnskipFacilityMonth mencabut skip satu bulan utk sebuah fasilitas.
// Idempotent — bulan yang memang tidak ter-skip tidak mengubah apa pun.
func (s *billingExclusionService) UnskipFacilityMonth(studentID, facilityID, month, year uint) error {
	return s.setFacilityMonthExcluded(studentID, facilityID, month, year, false)
}

// setFacilityMonthExcluded menambah/membuang SATU bulan dari daftar exclusion
// berjalan lalu mendelegasikan ke SetExclusions — supaya validasi bulan,
// replace-all, dan apply-diff ke invoice tidak diduplikasi.
func (s *billingExclusionService) setFacilityMonthExcluded(studentID, facilityID, month, year uint, skip bool) error {
	old, err := s.exclRepo.FindByStudentAndEntity(studentID, "facility", facilityID)
	if err != nil {
		return err
	}

	months := make([]dto.BillingExclusionMonth, 0, len(old)+1)
	found := false
	for _, ex := range old {
		if ex.Month == month && ex.Year == year {
			found = true
			if !skip {
				continue // cabut: buang bulan ini dari daftar
			}
		}
		months = append(months, dto.BillingExclusionMonth{Month: ex.Month, Year: ex.Year})
	}
	if skip && !found {
		months = append(months, dto.BillingExclusionMonth{Month: month, Year: year})
	}

	_, err = s.setExclusions(studentID, "facility", facilityID, dto.SetBillingExclusionsRequest{Months: months}, true)
	return err
}

// rollbackExclusions memulihkan daftar exclusion sebelum apply invoice gagal.
// Dipakai hanya pada jalur strict fasilitas; SetExclusions legacy tetap
// mempertahankan perilaku kompatibel berupa logging-only.
func (s *billingExclusionService) rollbackExclusions(studentID uint, entityType string, entityRefID uint, old []model.BillingMonthExclusion, applyErr error) error {
	rollbackErr := s.db.Transaction(func(tx *gorm.DB) error {
		return s.exclRepo.Replace(tx, studentID, entityType, entityRefID, old)
	})
	if rollbackErr != nil {
		return fmt.Errorf("%w; rollback exclusion gagal: %v", applyErr, rollbackErr)
	}
	return applyErr
}
