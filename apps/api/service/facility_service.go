package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"api/utility"
	"errors"
	"fmt"
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
	Enroll(studentID uint, req dto.EnrollFacilityRequest) (*dto.StudentFacilityResponse, error)
	UpdateEnrollment(studentID, sfID uint, req dto.UpdateStudentFacilityRequest) (*dto.StudentFacilityResponse, error)
	Unenroll(studentID, sfID uint) error
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
	feeConfigItemRepo repository.FeeConfigItemRepository
	invoiceGen        InvoiceGenerateService
}

func NewStudentFacilityService(
	sfRepo repository.StudentFacilityRepository,
	studentRepo repository.StudentRepository,
	facilityRepo repository.FacilityRepository,
	acRepo repository.AcademicYearRepository,
	feeConfigItemRepo repository.FeeConfigItemRepository,
	invoiceGen InvoiceGenerateService,
) StudentFacilityService {
	return &studentFacilityService{
		sfRepo:            sfRepo,
		studentRepo:       studentRepo,
		facilityRepo:      facilityRepo,
		acRepo:            acRepo,
		feeConfigItemRepo: feeConfigItemRepo,
		invoiceGen:        invoiceGen,
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
		go s.invoiceGen.AddFacilityToMonthlyRange(studentID, req.FacilityID, req.AcademicYearID)
	}

	saved, err := s.sfRepo.FindByID(sf.ID)
	if err != nil {
		return nil, fmt.Errorf("gagal mengambil data fasilitas: %w", err)
	}
	resp := mapStudentFacilityToResponse(*saved)
	return &resp, nil
}

func (s *studentFacilityService) UpdateEnrollment(studentID, sfID uint, req dto.UpdateStudentFacilityRequest) (*dto.StudentFacilityResponse, error) {
	sf, err := s.sfRepo.FindByID(sfID)
	if err != nil || sf.StudentID != studentID {
		return nil, errors.New("Data pendaftaran fasilitas tidak ditemukan")
	}

	if sf.EndDate != nil {
		return nil, errors.New("Siswa sudah tidak aktif di fasilitas ini")
	}

	// Validate FeeConfigItem if provided
	if req.FeeConfigItemID != nil {
		item, err := s.feeConfigItemRepo.FindByID(*req.FeeConfigItemID)
		if err != nil {
			return nil, errors.New("Paket/zona tidak ditemukan")
		}
		if !item.IsActive {
			return nil, errors.New("Paket/zona sudah tidak aktif")
		}
	}

	sf.FeeConfigItemID = req.FeeConfigItemID
	if err := s.sfRepo.Update(sf); err != nil {
		return nil, err
	}

	// Reload with preloaded relations
	saved, err := s.sfRepo.FindByID(sf.ID)
	if err != nil {
		return nil, err
	}
	resp := mapStudentFacilityToResponse(*saved)
	return &resp, nil
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

	// Hapus item fasilitas dari invoice bulan ini ke depan yang belum dibayar
	if s.invoiceGen != nil {
		go s.invoiceGen.RemoveFacilityFromFutureInvoices(studentID, sf.FacilityID, sf.AcademicYearID)
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
