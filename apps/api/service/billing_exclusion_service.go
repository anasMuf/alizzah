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
	if entityType == "extracurricular" {
		// Bulan yang item PASTA-nya sudah dibayar → UI men-disable (tak bisa di-skip).
		if paid, err := s.paidExtracurricularMonths(studentID, entityRefID); err == nil {
			resp.PaidMonths = paid
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
	if entityType != "extracurricular" && entityType != "facility" {
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

	// Terapkan perubahan ke invoice
	for _, key := range toRemove {
		var applyErr error
		if entityType == "extracurricular" {
			applyErr = s.invoiceGen.RemoveExtracurricularItemFromMonthly(studentID, entityRefID, key.month, key.year)
		} else {
			applyErr = s.invoiceGen.RemoveFacilityItemFromMonthly(studentID, entityRefID, key.month, key.year)
		}
		if applyErr != nil {
			log.Printf("[BillingExclusion] Gagal hapus item %s %d bulan %d/%d siswa %d: %v", entityType, entityRefID, key.month, key.year, studentID, applyErr)
		}
	}
	for _, key := range toRestore {
		var applyErr error
		if entityType == "extracurricular" {
			applyErr = s.invoiceGen.RestoreExtracurricularItemToMonthly(studentID, entityRefID, ay.ID, key.month, key.year)
		} else {
			applyErr = s.invoiceGen.RestoreFacilityItemToMonthly(studentID, entityRefID, ay.ID, key.month, key.year)
		}
		if applyErr != nil {
			log.Printf("[BillingExclusion] Gagal restore item %s %d bulan %d/%d siswa %d: %v", entityType, entityRefID, key.month, key.year, studentID, applyErr)
		}
	}

	return s.GetByStudentAndEntity(studentID, entityType, entityRefID)
}
