package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"api/utility"
	"errors"
	"time"

	"gorm.io/gorm"
)

type DaycareEnrollmentService interface {
	GetAll(params dto.DaycareEnrollmentQueryParams) ([]dto.DaycareEnrollmentResponse, *dto.Meta, error)
	GetByID(id uint) (*dto.DaycareEnrollmentResponse, error)
	Create(createdBy uint, req dto.CreateDaycareEnrollmentRequest) (*dto.DaycareEnrollmentResponse, error)
	Update(id uint, req dto.CreateDaycareEnrollmentRequest) (*dto.DaycareEnrollmentResponse, error)
	UpdateStatus(id uint, req dto.UpdateDaycareStatusRequest) error
}

type daycareEnrollmentService struct {
	db          *gorm.DB
	daycareRepo repository.DaycareEnrollmentRepository
	studentRepo repository.StudentRepository
	acRepo      repository.AcademicYearRepository
	invoiceGen  InvoiceGenerateService
}

func NewDaycareEnrollmentService(db *gorm.DB, daycareRepo repository.DaycareEnrollmentRepository, studentRepo repository.StudentRepository, acRepo repository.AcademicYearRepository, invoiceGen InvoiceGenerateService) DaycareEnrollmentService {
	return &daycareEnrollmentService{
		db:          db,
		daycareRepo: daycareRepo,
		studentRepo: studentRepo,
		acRepo:      acRepo,
		invoiceGen:  invoiceGen,
	}
}

func (s *daycareEnrollmentService) GetAll(params dto.DaycareEnrollmentQueryParams) ([]dto.DaycareEnrollmentResponse, *dto.Meta, error) {
	des, total, err := s.daycareRepo.FindAll(params)
	if err != nil {
		return nil, nil, err
	}

	var responses []dto.DaycareEnrollmentResponse
	for _, de := range des {
		responses = append(responses, *mapDaycareEnrollmentToResponse(de))
	}

	meta := &dto.Meta{
		Page:  params.Page,
		Limit: params.Limit,
		Total: total,
	}

	return responses, meta, nil
}

func (s *daycareEnrollmentService) GetByID(id uint) (*dto.DaycareEnrollmentResponse, error) {
	de, err := s.daycareRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("Pendaftaran daycare tidak ditemukan")
		}
		return nil, err
	}
	return mapDaycareEnrollmentToResponse(*de), nil
}

func (s *daycareEnrollmentService) Create(createdBy uint, req dto.CreateDaycareEnrollmentRequest) (*dto.DaycareEnrollmentResponse, error) {
	_, err := s.studentRepo.FindByID(req.StudentID)
	if err != nil {
		return nil, errors.New("Siswa tidak ditemukan")
	}

	_, err = s.acRepo.FindByID(req.AcademicYearID)
	if err != nil {
		return nil, errors.New("Tahun ajaran tidak ditemukan")
	}

	// Cek duplikasi
	existing, _ := s.daycareRepo.FindActiveByStudentID(req.StudentID, req.AcademicYearID)
	if existing != nil {
		return nil, errors.New("Siswa sudah memiliki pendaftaran daycare aktif di tahun ajaran ini")
	}

	startDate, err := utility.ParseDate(req.StartDate)
	if err != nil {
		return nil, errors.New("Format start_date tidak valid (YYYY-MM-DD)")
	}

	de := &model.DaycareEnrollment{
		StudentID:      req.StudentID,
		AcademicYearID: req.AcademicYearID,
		PackageType:    req.PackageType,
		StartDate:      startDate,
		Status:         "active",
		CreatedBy:      createdBy,
	}

	if err := s.daycareRepo.Create(de); err != nil {
		return nil, err
	}

	if s.invoiceGen != nil {
		var daycareCount int64
		s.db.Model(&model.DaycareEnrollment{}).Where("student_id = ?", req.StudentID).Count(&daycareCount)
		if daycareCount == 1 {
			student, _ := s.studentRepo.FindByID(req.StudentID)
			s.invoiceGen.GenerateDaycareInitial(dto.GenerateInitialInvoiceParams{
				StudentID:      req.StudentID,
				AcademicYearID: req.AcademicYearID,
				Level:          "all",
				Gender:         student.Gender,
				CreatedBy:      createdBy,
			})
		}

		s.invoiceGen.GenerateDaycareMonthlyRange(dto.GenerateDaycareMonthlyParams{
			StudentID:      req.StudentID,
			AcademicYearID: req.AcademicYearID,
			PackageType:    req.PackageType,
			StartDate:      req.StartDate,
			CreatedBy:      createdBy,
		})
	}

	savedDe, _ := s.daycareRepo.FindByID(de.ID)
	return mapDaycareEnrollmentToResponse(*savedDe), nil
}

func (s *daycareEnrollmentService) Update(id uint, req dto.CreateDaycareEnrollmentRequest) (*dto.DaycareEnrollmentResponse, error) {
	de, err := s.daycareRepo.FindByID(id)
	if err != nil {
		return nil, errors.New("Pendaftaran daycare tidak ditemukan")
	}

	startDate, err := utility.ParseDate(req.StartDate)
	if err != nil {
		return nil, errors.New("Format start_date tidak valid (YYYY-MM-DD)")
	}

	de.StudentID = req.StudentID
	de.AcademicYearID = req.AcademicYearID
	de.PackageType = req.PackageType
	de.StartDate = startDate

	if err := s.daycareRepo.Update(de); err != nil {
		return nil, err
	}

	savedDe, _ := s.daycareRepo.FindByID(de.ID)
	return mapDaycareEnrollmentToResponse(*savedDe), nil
}

func (s *daycareEnrollmentService) UpdateStatus(id uint, req dto.UpdateDaycareStatusRequest) error {
	de, err := s.daycareRepo.FindByID(id)
	if err != nil {
		return errors.New("Pendaftaran daycare tidak ditemukan")
	}

	var endDate *time.Time
	if req.Status == "inactive" {
		if req.EndDate == "" {
			return errors.New("end_date wajib diisi jika status diubah menjadi inactive")
		}
		parsed, err := utility.ParseDate(req.EndDate)
		if err != nil {
			return errors.New("Format end_date tidak valid (YYYY-MM-DD)")
		}
		endDate = &parsed
	}

	if err := s.daycareRepo.UpdateStatus(id, req.Status, endDate); err != nil {
		return err
	}

	if req.Status == "inactive" && s.invoiceGen != nil {
		now := time.Now()
		s.invoiceGen.RemoveDaycareFromFutureInvoices(de.StudentID, uint(now.Month()), uint(now.Year()))
	}

	return nil
}

func mapDaycareEnrollmentToResponse(de model.DaycareEnrollment) *dto.DaycareEnrollmentResponse {
	var endDateStr *string
	if de.EndDate != nil {
		ed := de.EndDate.Format("2006-01-02")
		endDateStr = &ed
	}

	return &dto.DaycareEnrollmentResponse{
		ID: de.ID,
		Student: dto.StudentBriefResponse{
			ID:       de.Student.ID,
			FullName: de.Student.FullName,
			Gender:   de.Student.Gender,
			Status:   de.Student.Status,
		},
		AcademicYear: dto.AcademicYearBriefResponse{
			ID:   de.AcademicYear.ID,
			Name: de.AcademicYear.Name,
		},
		PackageType: de.PackageType,
		StartDate:   de.StartDate.Format("2006-01-02"),
		EndDate:     endDateStr,
		Status:      de.Status,
	}
}
