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

type DaycareEnrollmentService interface {
	GetAll(params dto.DaycareEnrollmentQueryParams) ([]dto.DaycareEnrollmentResponse, *dto.Meta, error)
	GetByID(id uint) (*dto.DaycareEnrollmentResponse, error)
	Create(createdBy uint, req dto.CreateDaycareEnrollmentRequest) (*dto.DaycareEnrollmentResponse, error)
	Update(id uint, req dto.CreateDaycareEnrollmentRequest) (*dto.DaycareEnrollmentResponse, error)
	UpdateStatus(id uint, req dto.UpdateDaycareStatusRequest) error
	// Attendance (daily - kept for backward compat)
	UpsertAttendance(createdBy uint, req dto.UpsertDaycareAttendanceRequest) (*dto.DaycareAttendanceResponse, error)
	GetAttendance(studentID, month, year uint) ([]dto.DaycareAttendanceResponse, error)
	// Monthly Attendance
	UpsertMonthlyAttendance(createdBy uint, req dto.UpsertDaycareMonthlyAttendanceRequest) (*dto.DaycareMonthlyAttendanceResponse, error)
	GetMonthlyAttendance(studentID, month, year uint) (*dto.DaycareMonthlyAttendanceResponse, error)
	GetAllMonthlyAttendance(month, year uint, academicYearID uint) ([]dto.DaycareMonthlyAttendanceResponse, error)
}

type daycareEnrollmentService struct {
	db             *gorm.DB
	daycareRepo    repository.DaycareEnrollmentRepository
	studentRepo    repository.StudentRepository
	acRepo         repository.AcademicYearRepository
	monthlyAttRepo repository.DaycareMonthlyAttendanceRepository
	invoiceGen     InvoiceGenerateService
}

func NewDaycareEnrollmentService(db *gorm.DB, daycareRepo repository.DaycareEnrollmentRepository, studentRepo repository.StudentRepository, acRepo repository.AcademicYearRepository, monthlyAttRepo repository.DaycareMonthlyAttendanceRepository, invoiceGen InvoiceGenerateService) DaycareEnrollmentService {
	return &daycareEnrollmentService{
		db:             db,
		daycareRepo:    daycareRepo,
		studentRepo:    studentRepo,
		acRepo:         acRepo,
		monthlyAttRepo: monthlyAttRepo,
		invoiceGen:     invoiceGen,
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

func (s *daycareEnrollmentService) buildPackageType(req dto.CreateDaycareEnrollmentRequest) string {
	if req.Category == "premium" {
		return fmt.Sprintf("premium_%s_%s", strings.ReplaceAll(req.TimeSlot, "-", ""), req.AgeGroup)
	}
	return fmt.Sprintf("regular_%s_%s", strings.ReplaceAll(req.TimeSlot, "-", ""), req.AgeGroup)
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

	existing, _ := s.daycareRepo.FindActiveByStudentID(req.StudentID, req.AcademicYearID)
	if existing != nil {
		return nil, utility.NewConflictError("Siswa sudah memiliki pendaftaran daycare aktif")
	}

	startDate, err := utility.ParseDate(req.StartDate)
	if err != nil {
		return nil, errors.New("Format start_date tidak valid (YYYY-MM-DD)")
	}

	de := &model.DaycareEnrollment{
		StudentID:      req.StudentID,
		AcademicYearID: req.AcademicYearID,
		PackageType:    s.buildPackageType(req),
		Category:       req.Category,
		TimeSlot:       req.TimeSlot,
		AgeGroup:       req.AgeGroup,
		StartDate:      startDate,
		Status:         "active",
		CreatedBy:      createdBy,
	}

	if err := s.daycareRepo.Create(de); err != nil {
		return nil, err
	}

	// Generate initial invoice (Biaya Awal) + inject SPD ke future monthly invoices untuk Premium
	if de.Category == "premium" && s.invoiceGen != nil {
		student, _ := s.studentRepo.FindByID(req.StudentID)
		gender := "all"
		if student != nil {
			gender = student.Gender
		}
		s.invoiceGen.GenerateDaycareInitial(dto.GenerateInitialInvoiceParams{
			StudentID:      req.StudentID,
			AcademicYearID: req.AcademicYearID,
			Level:          "all",
			Gender:         gender,
			CreatedBy:      createdBy,
		})
		// Inject flat SPD + meal + TPQ ke semua monthly invoice yg sudah ada
		if err := s.invoiceGen.InjectPremiumDaycareToMonthlyInvoices(*de); err != nil {
			return nil, err
		}
	}

	savedDe, err := s.daycareRepo.FindByID(de.ID)
	if err != nil {
		return nil, fmt.Errorf("gagal mengambil data daycare: %w", err)
	}
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
	de.Category = req.Category
	de.TimeSlot = req.TimeSlot
	de.AgeGroup = req.AgeGroup
	de.PackageType = s.buildPackageType(req)
	de.StartDate = startDate

	if err := s.daycareRepo.Update(de); err != nil {
		return nil, err
	}

	savedDe, err := s.daycareRepo.FindByID(de.ID)
	if err != nil {
		return nil, fmt.Errorf("gagal mengambil data daycare: %w", err)
	}
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

// ─── Attendance ──────────────────────────────────────────────────────

func (s *daycareEnrollmentService) UpsertAttendance(createdBy uint, req dto.UpsertDaycareAttendanceRequest) (*dto.DaycareAttendanceResponse, error) {
	date, err := utility.ParseDate(req.Date)
	if err != nil {
		return nil, errors.New("Format date tidak valid (YYYY-MM-DD)")
	}

	att := model.DaycareAttendance{}
	s.db.Where("student_id = ? AND date = ?", req.StudentID, date).First(&att)

	att.StudentID = req.StudentID
	att.AcademicYearID = req.AcademicYearID
	att.Date = date
	att.TimeSlot = req.TimeSlot
	att.WithMeal = req.WithMeal
	att.WithTpq = req.WithTpq
	att.CreatedBy = createdBy

	if att.ID == 0 {
		s.db.Create(&att)
	} else {
		s.db.Save(&att)
	}

	// Auto-generate SPD (meal/TPQ dari attendance untuk semua kategori)
	if s.invoiceGen != nil {
		de, err := s.daycareRepo.FindActiveByStudentID(req.StudentID, req.AcademicYearID)
		if err == nil && de != nil {
			genErr := s.invoiceGen.GenerateDaycareMonthlyInvoices(dto.GenerateDaycareMonthlyParams{
				StudentID:      req.StudentID,
				AcademicYearID: req.AcademicYearID,
				Month:          uint(date.Month()),
				Year:           uint(date.Year()),
				CreatedBy:      createdBy,
			})
			if genErr != nil {
				log.Printf("[Daycare SPD] Auto-generate gagal untuk student=%d: %v", req.StudentID, genErr)
			}
		}
	}

	return &dto.DaycareAttendanceResponse{
		ID:        att.ID,
		StudentID: att.StudentID,
		Date:      req.Date,
		TimeSlot:  att.TimeSlot,
		WithMeal:  att.WithMeal,
		WithTpq:   att.WithTpq,
	}, nil
}

func (s *daycareEnrollmentService) GetAttendance(studentID, month, year uint) ([]dto.DaycareAttendanceResponse, error) {
	start := time.Date(int(year), time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	end := start.AddDate(0, 1, 0)

	var atts []model.DaycareAttendance
	s.db.Where("student_id = ? AND date >= ? AND date < ?", studentID, start, end).
		Order("date ASC").Find(&atts)

	var resp []dto.DaycareAttendanceResponse
	for _, a := range atts {
		resp = append(resp, dto.DaycareAttendanceResponse{
			ID:        a.ID,
			StudentID: a.StudentID,
			Date:      a.Date.Format("2006-01-02"),
			TimeSlot:  a.TimeSlot,
			WithMeal:  a.WithMeal,
			WithTpq:   a.WithTpq,
		})
	}
	return resp, nil
}

// ─── Monthly Attendance ──────────────────────────────────────

func (s *daycareEnrollmentService) UpsertMonthlyAttendance(createdBy uint, req dto.UpsertDaycareMonthlyAttendanceRequest) (*dto.DaycareMonthlyAttendanceResponse, error) {
	att := &model.DaycareMonthlyAttendance{
		StudentID:      req.StudentID,
		AcademicYearID: req.AcademicYearID,
		Month:          req.Month,
		Year:           req.Year,
		SPDDays:        req.SPDDays,
		MealDays:       req.MealDays,
		CreatedBy:      createdBy,
	}

	if err := s.monthlyAttRepo.Upsert(att); err != nil {
		return nil, err
	}

	// Auto-generate invoice setelah simpan kehadiran bulanan
	if s.invoiceGen != nil {
		genErr := s.invoiceGen.GenerateDaycareMonthlyInvoices(dto.GenerateDaycareMonthlyParams{
			StudentID:      req.StudentID,
			AcademicYearID: req.AcademicYearID,
			Month:          req.Month,
			Year:           req.Year,
			CreatedBy:      createdBy,
		})
		if genErr != nil {
			log.Printf("[Daycare SPD] Auto-generate gagal untuk student=%d bulan=%d/%d: %v", req.StudentID, req.Month, req.Year, genErr)
		}
	}

	return mapMonthlyAttendanceToResponse(*att), nil
}

func (s *daycareEnrollmentService) GetMonthlyAttendance(studentID, month, year uint) (*dto.DaycareMonthlyAttendanceResponse, error) {
	att, err := s.monthlyAttRepo.FindByStudentMonthYear(studentID, month, year)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil // not found = no data yet, not an error
		}
		return nil, err
	}
	return mapMonthlyAttendanceToResponse(*att), nil
}

func (s *daycareEnrollmentService) GetAllMonthlyAttendance(month, year uint, academicYearID uint) ([]dto.DaycareMonthlyAttendanceResponse, error) {
	var atts []model.DaycareMonthlyAttendance
	query := s.db.Where("month = ? AND year = ?", month, year)
	if academicYearID != 0 {
		query = query.Where("academic_year_id = ?", academicYearID)
	}
	if err := query.Preload("Student").Find(&atts).Error; err != nil {
		return nil, err
	}

	var resp []dto.DaycareMonthlyAttendanceResponse
	for _, a := range atts {
		resp = append(resp, *mapMonthlyAttendanceToResponse(a))
	}
	return resp, nil
}

func mapMonthlyAttendanceToResponse(a model.DaycareMonthlyAttendance) *dto.DaycareMonthlyAttendanceResponse {
	studentName := ""
	if a.Student.ID != 0 {
		studentName = a.Student.FullName
	}
	return &dto.DaycareMonthlyAttendanceResponse{
		ID:             a.ID,
		StudentID:      a.StudentID,
		StudentName:    studentName,
		AcademicYearID: a.AcademicYearID,
		Month:          a.Month,
		Year:           a.Year,
		SPDDays:        a.SPDDays,
		MealDays:       a.MealDays,
	}
}

func mapDaycareEnrollmentToResponse(de model.DaycareEnrollment) *dto.DaycareEnrollmentResponse {
	var endDateStr *string
	if de.EndDate != nil {
		ed := de.EndDate.Format("2006-01-02")
		endDateStr = &ed
	}

	var studentBrief dto.StudentBriefResponse
	if de.Student.ID != 0 {
		studentBrief = mapStudentBrief(de.Student)
	}

	return &dto.DaycareEnrollmentResponse{
		ID:           de.ID,
		Student:      studentBrief,
		AcademicYear: dto.AcademicYearBriefResponse{ID: de.AcademicYear.ID, Name: de.AcademicYear.Name},
		Category:     de.Category,
		TimeSlot:     de.TimeSlot,
		AgeGroup:     de.AgeGroup,
		PackageType:  de.PackageType,
		StartDate:    de.StartDate.Format("2006-01-02"),
		EndDate:      endDateStr,
		Status:       de.Status,
	}
}
