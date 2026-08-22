package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"errors"
	"fmt"
	"log"

	"gorm.io/gorm"
)

type DispensationService interface {
	GetByStudentID(studentID uint, params dto.DispensationQueryParams) ([]dto.DispensationResponse, error)
	GetByID(id uint) (*dto.DispensationResponse, error)
	Create(studentID, createdBy uint, req dto.CreateDispensationRequest) (*dto.DispensationResponse, error)
	Update(id uint, req dto.UpdateDispensationRequest) (*dto.DispensationResponse, error)
	Toggle(id uint) (*dto.DispensationResponse, error)
	Delete(id uint) error
	CarryOverPermanent(studentID, fromAcademicYearID, toAcademicYearID, startMonth, startYear uint) error
}

type dispensationService struct {
	repo        repository.DispensationRepository
	studentRepo repository.StudentRepository
	acRepo      repository.AcademicYearRepository
	invoiceGen  InvoiceGenerateService
}

func NewDispensationService(
	repo repository.DispensationRepository,
	studentRepo repository.StudentRepository,
	acRepo repository.AcademicYearRepository,
	invoiceGen InvoiceGenerateService,
) DispensationService {
	return &dispensationService{repo: repo, studentRepo: studentRepo, acRepo: acRepo, invoiceGen: invoiceGen}
}

func (s *dispensationService) GetByStudentID(studentID uint, params dto.DispensationQueryParams) ([]dto.DispensationResponse, error) {
	_, err := s.studentRepo.FindByID(studentID)
	if err != nil {
		return nil, errors.New("Siswa tidak ditemukan")
	}

	items, err := s.repo.FindByStudentID(studentID, params)
	if err != nil {
		return nil, err
	}

	var responses []dto.DispensationResponse
	for _, d := range items {
		responses = append(responses, mapDispensationToResponse(d))
	}
	return responses, nil
}

func (s *dispensationService) GetByID(id uint) (*dto.DispensationResponse, error) {
	d, err := s.repo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("Dispensasi tidak ditemukan")
		}
		return nil, err
	}
	resp := mapDispensationToResponse(*d)
	return &resp, nil
}

func (s *dispensationService) Create(studentID, createdBy uint, req dto.CreateDispensationRequest) (*dto.DispensationResponse, error) {
	_, err := s.studentRepo.FindByID(studentID)
	if err != nil {
		return nil, errors.New("Siswa tidak ditemukan")
	}

	_, err = s.acRepo.FindByID(req.AcademicYearID)
	if err != nil {
		return nil, errors.New("Tahun ajaran tidak ditemukan")
	}

	// Validate percent max 100
	if req.DiscountType == "percent" && req.DiscountValue > 100 {
		return nil, errors.New("Persentase dispensasi tidak boleh lebih dari 100%")
	}

	// Default fee category
	feeCategory := req.FeeCategory
	if feeCategory == "" {
		feeCategory = "monthly_spp"
	}

	d := &model.Dispensation{
		StudentID:      studentID,
		AcademicYearID: req.AcademicYearID,
		FeeCategory:    feeCategory,
		DiscountType:   req.DiscountType,
		DiscountValue:  req.DiscountValue,
		IsPermanent:    req.IsPermanent,
		StartMonth:     req.StartMonth,
		StartYear:      req.StartYear,
		EndMonth:       req.EndMonth,
		EndYear:        req.EndYear,
		Reason:         req.Reason,
		Notes:          req.Notes,
		IsActive:       true,
		CreatedBy:      createdBy,
	}

	// If permanent, clear end date
	if req.IsPermanent {
		d.EndMonth = nil
		d.EndYear = nil
	}

	if err := s.repo.Create(d); err != nil {
		return nil, err
	}

	// Apply to existing unpaid invoices. Sinkron (bukan `go ...`) supaya
	// panggilan berurutan tidak saling tumpang tindih dan error terlihat.
	if s.invoiceGen != nil {
		if err := s.invoiceGen.ApplyDispensationToExistingInvoices(studentID, req.AcademicYearID); err != nil {
			log.Printf("[Dispensasi] Gagal apply ke invoice siswa %d: %v", studentID, err)
		}
	}

	saved, err := s.repo.FindByID(d.ID)
	if err != nil {
		return nil, fmt.Errorf("gagal mengambil data dispensasi: %w", err)
	}
	resp := mapDispensationToResponse(*saved)
	return &resp, nil
}

func (s *dispensationService) Update(id uint, req dto.UpdateDispensationRequest) (*dto.DispensationResponse, error) {
	d, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.New("Dispensasi tidak ditemukan")
	}

	if req.DiscountType == "percent" && req.DiscountValue > 100 {
		return nil, errors.New("Persentase dispensasi tidak boleh lebih dari 100%")
	}

	d.DiscountType = req.DiscountType
	d.DiscountValue = req.DiscountValue
	d.IsPermanent = req.IsPermanent
	d.Reason = req.Reason
	d.Notes = req.Notes

	if req.IsPermanent {
		d.EndMonth = nil
		d.EndYear = nil
	} else {
		d.EndMonth = req.EndMonth
		d.EndYear = req.EndYear
	}

	if err := s.repo.Update(d); err != nil {
		return nil, err
	}

	// Re-apply to existing invoices. Sinkron supaya tidak terjadi race
	// antar panggilan dan error terlihat di log.
	if s.invoiceGen != nil {
		if err := s.invoiceGen.ApplyDispensationToExistingInvoices(d.StudentID, d.AcademicYearID); err != nil {
			log.Printf("[Dispensasi] Gagal apply ke invoice siswa %d: %v", d.StudentID, err)
		}
	}

	saved, err := s.repo.FindByID(id)
	if err != nil {
		return nil, fmt.Errorf("gagal mengambil data dispensasi: %w", err)
	}
	resp := mapDispensationToResponse(*saved)
	return &resp, nil
}

func (s *dispensationService) Toggle(id uint) (*dto.DispensationResponse, error) {
	d, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.New("Dispensasi tidak ditemukan")
	}

	d.IsActive = !d.IsActive
	if err := s.repo.Update(d); err != nil {
		return nil, err
	}

	// Re-apply to existing invoices. Sinkron supaya tidak terjadi race
	// antar panggilan dan error terlihat di log.
	if s.invoiceGen != nil {
		if err := s.invoiceGen.ApplyDispensationToExistingInvoices(d.StudentID, d.AcademicYearID); err != nil {
			log.Printf("[Dispensasi] Gagal apply ke invoice siswa %d: %v", d.StudentID, err)
		}
	}

	saved, err := s.repo.FindByID(id)
	if err != nil {
		return nil, fmt.Errorf("gagal mengambil data dispensasi: %w", err)
	}
	resp := mapDispensationToResponse(*saved)
	return &resp, nil
}

func (s *dispensationService) Delete(id uint) error {
	d, err := s.repo.FindByID(id)
	if err != nil {
		return errors.New("Dispensasi tidak ditemukan")
	}

	studentID := d.StudentID
	ayID := d.AcademicYearID

	if err := s.repo.Delete(id); err != nil {
		return err
	}

	// Re-apply to existing invoices (removes deleted dispensation items).
	// Sinkron supaya tidak terjadi race antar panggilan dan error terlihat.
	if s.invoiceGen != nil {
		if err := s.invoiceGen.ApplyDispensationToExistingInvoices(studentID, ayID); err != nil {
			log.Printf("[Dispensasi] Gagal apply ke invoice siswa %d: %v", studentID, err)
		}
	}

	return nil
}

func (s *dispensationService) CarryOverPermanent(studentID, fromAcademicYearID, toAcademicYearID, startMonth, startYear uint) error {
	permanents, err := s.repo.FindPermanentActive(studentID, fromAcademicYearID)
	if err != nil {
		return err
	}

	for _, d := range permanents {
		newD := model.Dispensation{
			StudentID:      d.StudentID,
			AcademicYearID: toAcademicYearID,
			FeeCategory:    d.FeeCategory,
			DiscountType:   d.DiscountType,
			DiscountValue:  d.DiscountValue,
			IsPermanent:    true,
			StartMonth:     startMonth,
			StartYear:      startYear,
			Reason:         d.Reason,
			Notes:          fmt.Sprintf("Carry over dari TA sebelumnya. %s", d.Notes),
			IsActive:       true,
			CreatedBy:      d.CreatedBy,
		}
		s.repo.Create(&newD)
	}
	return nil
}

func mapDispensationToResponse(d model.Dispensation) dto.DispensationResponse {
	resp := dto.DispensationResponse{
		ID:        d.ID,
		StudentID: d.StudentID,
		AcademicYear: dto.AcademicYearBriefResponse{
			ID:   d.AcademicYear.ID,
			Name: d.AcademicYear.Name,
		},
		FeeCategory:   d.FeeCategory,
		DiscountType:  d.DiscountType,
		DiscountValue: d.DiscountValue,
		IsPermanent:   d.IsPermanent,
		StartMonth:    d.StartMonth,
		StartYear:     d.StartYear,
		EndMonth:      d.EndMonth,
		EndYear:       d.EndYear,
		Reason:        d.Reason,
		IsActive:      d.IsActive,
		CreatedBy: dto.UserBriefResponse{
			ID:       d.Creator.ID,
			FullName: d.Creator.FullName,
		},
		CreatedAt: d.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
	if d.Notes != "" {
		resp.Notes = &d.Notes
	}
	return resp
}

// CalculateTotalDiscount computes stacked discount from multiple dispensations
func CalculateTotalDiscount(originalAmount float64, dispensations []model.Dispensation) float64 {
	totalDiscount := float64(0)

	for _, d := range dispensations {
		switch d.DiscountType {
		case "percent":
			totalDiscount += originalAmount * d.DiscountValue / 100
		case "fixed":
			totalDiscount += d.DiscountValue
		}
	}

	if totalDiscount > originalAmount {
		totalDiscount = originalAmount
	}

	return totalDiscount
}
