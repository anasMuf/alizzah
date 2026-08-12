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
	"gorm.io/gorm/clause"
)

type DaycareEnrollmentService interface {
	GetAll(params dto.DaycareEnrollmentQueryParams) ([]dto.DaycareEnrollmentResponse, *dto.Meta, error)
	GetByID(id uint) (*dto.DaycareEnrollmentResponse, error)
	Create(createdBy uint, req dto.CreateDaycareEnrollmentRequest) (*dto.DaycareEnrollmentResponse, error)
	Update(id uint, req dto.CreateDaycareEnrollmentRequest) (*dto.DaycareEnrollmentResponse, error)
	UpdateStatus(id uint, req dto.UpdateDaycareStatusRequest) error
	Delete(id uint) (*dto.DeleteDaycareEnrollmentResponse, error)
	DeleteWithInvoices(id uint) (*dto.DeleteDaycareEnrollmentResponse, error)
	HasPremiumHistory(studentID uint) (bool, error)
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
	invoiceRepo    repository.InvoiceRepository
	invoiceGen     InvoiceGenerateService
}

func NewDaycareEnrollmentService(db *gorm.DB, daycareRepo repository.DaycareEnrollmentRepository, studentRepo repository.StudentRepository, acRepo repository.AcademicYearRepository, monthlyAttRepo repository.DaycareMonthlyAttendanceRepository, invoiceRepo repository.InvoiceRepository, invoiceGen InvoiceGenerateService) DaycareEnrollmentService {
	return &daycareEnrollmentService{
		db:             db,
		daycareRepo:    daycareRepo,
		studentRepo:    studentRepo,
		acRepo:         acRepo,
		monthlyAttRepo: monthlyAttRepo,
		invoiceRepo:    invoiceRepo,
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

	// Auto-detect enrollment_type untuk premium
	enrollmentType := req.EnrollmentType
	if req.Category == "premium" && enrollmentType == "" {
		hasHistory, _ := s.daycareRepo.HasPremiumHistory(req.StudentID)
		if hasHistory {
			enrollmentType = "lanjutan"
		} else {
			enrollmentType = "baru"
		}
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

	err = s.db.Transaction(func(tx *gorm.DB) error {
		if err := s.daycareRepo.WithTx(tx).Create(de); err != nil {
			return err
		}

		// Generate initial invoice (Biaya Awal) hanya untuk premium baru
		if de.Category == "premium" && enrollmentType == "baru" && s.invoiceGen != nil {
			student, _ := s.studentRepo.FindByID(req.StudentID)
			gender := "all"
			if student != nil {
				gender = student.Gender
			}
			if err := s.invoiceGen.GenerateDaycareInitial(dto.GenerateInitialInvoiceParams{
				StudentID:      req.StudentID,
				AcademicYearID: req.AcademicYearID,
				Level:          "all",
				Gender:         gender,
				CreatedBy:      createdBy,
			}); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	// Inject flat SPD + meal + TPQ ke semua monthly invoice yg sudah ada (premium semua tipe)
	if de.Category == "premium" && s.invoiceGen != nil {
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

	oldCategory := de.Category
	oldTimeSlot := de.TimeSlot
	oldAgeGroup := de.AgeGroup
	categoryChanged := oldCategory != req.Category
	// Untuk premium: perubahan time_slot/age_group juga perlu sync SPD
	spdChanged := req.Category == "premium" && (oldTimeSlot != req.TimeSlot || oldAgeGroup != req.AgeGroup)
	needsSync := categoryChanged || spdChanged

	// Tentukan enrollment_type untuk premium SEBELUM update DB
	// (HasPremiumHistory harus dicek sebelum enrollment disimpan sebagai premium)
	var enrollmentType string
	if categoryChanged && req.Category == "premium" {
		enrollmentType = req.EnrollmentType
		if enrollmentType == "" {
			hasHistory, _ := s.daycareRepo.HasPremiumHistory(de.StudentID)
			if hasHistory {
				enrollmentType = "lanjutan"
			} else {
				enrollmentType = "baru"
			}
		}
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

	// Handle perubahan yg mempengaruhi SPD: sync invoices accordingly
	if needsSync && s.invoiceGen != nil {
		fromMonth := uint(startDate.Month())
		fromYear := uint(startDate.Year())

		// Hapus item daycare dari invoice bulanan ke depan (regular/meal/premium)
		if err := s.invoiceGen.RemoveDaycareFromFutureInvoices(de.StudentID, fromMonth, fromYear); err != nil {
			return nil, fmt.Errorf("gagal menghapus tagihan daycare lama: %w", err)
		}

		if req.Category == "premium" {
			// Inject premium SPD ke invoice bulanan
			if err := s.invoiceGen.InjectPremiumDaycareToMonthlyInvoices(*de); err != nil {
				return nil, err
			}

			// Generate initial invoice (Biaya Awal) hanya untuk premium baru (category changed)
			if categoryChanged && enrollmentType == "baru" {
				student, _ := s.studentRepo.FindByID(de.StudentID)
				gender := "all"
				if student != nil {
					gender = student.Gender
				}
				if err := s.invoiceGen.GenerateDaycareInitial(dto.GenerateInitialInvoiceParams{
					StudentID:      de.StudentID,
					AcademicYearID: de.AcademicYearID,
					Level:          "all",
					Gender:         gender,
					CreatedBy:      de.CreatedBy,
				}); err != nil {
					return nil, err
				}
			}
		}
		// Jika downgrade dari premium ke regular: hapus invoice daycare_initial
		if categoryChanged && oldCategory == "premium" && req.Category == "regular" {
			if err := s.invoiceGen.DeleteDaycareInitial(de.StudentID, de.AcademicYearID); err != nil {
				log.Printf("[Daycare] Gagal hapus daycare_initial saat downgrade student=%d: %v", de.StudentID, err)
			}
		}
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

	// Aktifkan kembali: inject ulang item daycare ke invoice bulan depan
	if req.Status == "active" && s.invoiceGen != nil {
		if de.Category == "premium" {
			// Premium: inject flat SPD + meal + TPQ
			if err := s.invoiceGen.InjectPremiumDaycareToMonthlyInvoices(*de); err != nil {
				log.Printf("[Daycare] Gagal inject premium saat aktivasi: %v", err)
			}
		}
	}

	return nil
}

// Delete checks for unpaid monthly invoices before deleting. If there are unpaid
// invoices from current month onward, returns a warning without deleting.
// If enrollment is already inactive, deletes immediately without checking invoices.
func (s *daycareEnrollmentService) Delete(id uint) (*dto.DeleteDaycareEnrollmentResponse, error) {
	de, err := s.daycareRepo.FindByID(id)
	if err != nil {
		return nil, errors.New("Pendaftaran daycare tidak ditemukan")
	}

	// Enrollment non-aktif → hapus langsung, tidak perlu cek invoice
	if de.Status != "active" {
		if err := s.daycareRepo.Delete(id); err != nil {
			return nil, fmt.Errorf("gagal menghapus enrollment: %w", err)
		}
		return &dto.DeleteDaycareEnrollmentResponse{
			Warning: false,
			Message: fmt.Sprintf("Pendaftaran daycare untuk %s berhasil dihapus", de.Student.FullName),
		}, nil
	}

	// Enrollment aktif → cek invoice bulanan yang belum lunas dari bulan ini ke depan
	now := time.Now()
	invoices, err := s.invoiceRepo.FindMonthlyByStudentFromMonth(de.StudentID, uint(now.Month()), uint(now.Year()))
	if err != nil {
		return nil, fmt.Errorf("gagal mengecek invoice: %w", err)
	}

	var unpaid []dto.UnpaidInvoiceBrief
	for _, inv := range invoices {
		if inv.Status != "paid" {
			unpaid = append(unpaid, dto.UnpaidInvoiceBrief{
				ID:          inv.ID,
				Type:        inv.Type,
				Month:       inv.Month,
				Year:        inv.Year,
				TotalAmount: inv.TotalAmount,
				PaidAmount:  inv.PaidAmount,
			})
		}
	}

	// Jika ada invoice unpaid, kembalikan warning — jangan hapus dulu
	if len(unpaid) > 0 {
		return &dto.DeleteDaycareEnrollmentResponse{
			Warning:        true,
			Message:        fmt.Sprintf("Terdapat %d invoice belum lunas untuk %s", len(unpaid), de.Student.FullName),
			UnpaidInvoices: unpaid,
		}, nil
	}

	// Tidak ada invoice unpaid → hapus langsung
	if err := s.daycareRepo.Delete(id); err != nil {
		return nil, fmt.Errorf("gagal menghapus enrollment: %w", err)
	}

	return &dto.DeleteDaycareEnrollmentResponse{
		Warning: false,
		Message: fmt.Sprintf("Pendaftaran daycare untuk %s berhasil dihapus", de.Student.FullName),
	}, nil
}

// DeleteWithInvoices deletes the enrollment and all unpaid monthly invoices
// from current month onward. For inactive enrollments, just deletes the record.
func (s *daycareEnrollmentService) DeleteWithInvoices(id uint) (*dto.DeleteDaycareEnrollmentResponse, error) {
	de, err := s.daycareRepo.FindByID(id)
	if err != nil {
		return nil, errors.New("Pendaftaran daycare tidak ditemukan")
	}

	// Enrollment non-aktif → hapus langsung
	if de.Status != "active" {
		if err := s.daycareRepo.Delete(id); err != nil {
			return nil, fmt.Errorf("gagal menghapus enrollment: %w", err)
		}
		return &dto.DeleteDaycareEnrollmentResponse{
			Warning: false,
			Message: fmt.Sprintf("Pendaftaran daycare untuk %s berhasil dihapus", de.Student.FullName),
		}, nil
	}

	now := time.Now()
	invoices, err := s.invoiceRepo.FindMonthlyByStudentFromMonth(de.StudentID, uint(now.Month()), uint(now.Year()))
	if err != nil {
		return nil, fmt.Errorf("gagal mengecek invoice: %w", err)
	}

	var deletedCount int
	err = s.db.Transaction(func(tx *gorm.DB) error {
		for _, inv := range invoices {
			if inv.Status != "paid" {
				if err := tx.Where("invoice_id = ?", inv.ID).Delete(&model.InvoiceItem{}).Error; err != nil {
					return err
				}
				if err := tx.Delete(&inv).Error; err != nil {
					return err
				}
				deletedCount++
			}
		}
		return tx.Delete(&model.DaycareEnrollment{}, id).Error
	})
	if err != nil {
		return nil, fmt.Errorf("gagal menghapus enrollment dan invoice: %w", err)
	}

	return &dto.DeleteDaycareEnrollmentResponse{
		Warning: false,
		Message: fmt.Sprintf("Pendaftaran daycare untuk %s dan %d invoice berhasil dihapus", de.Student.FullName, deletedCount),
	}, nil
}

// HasPremiumHistory returns true if the student has ever had a premium daycare enrollment.
func (s *daycareEnrollmentService) HasPremiumHistory(studentID uint) (bool, error) {
	return s.daycareRepo.HasPremiumHistory(studentID)
}

// ─── Attendance ──────────────────────────────────────────────────────

func (s *daycareEnrollmentService) UpsertAttendance(createdBy uint, req dto.UpsertDaycareAttendanceRequest) (*dto.DaycareAttendanceResponse, error) {
	date, err := utility.ParseDate(req.Date)
	if err != nil {
		return nil, errors.New("Format date tidak valid (YYYY-MM-DD)")
	}

	att := model.DaycareAttendance{
		StudentID:      req.StudentID,
		AcademicYearID: req.AcademicYearID,
		Date:           date,
		TimeSlot:       req.TimeSlot,
		WithMeal:       req.WithMeal,
		WithTpq:        req.WithTpq,
		CreatedBy:      createdBy,
	}

	err = s.db.Transaction(func(tx *gorm.DB) error {
		return tx.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "student_id"}, {Name: "date"}},
			DoUpdates: clause.AssignmentColumns([]string{"time_slot", "with_meal", "with_tpq", "created_by", "updated_at"}),
		}).Create(&att).Error
	})
	if err != nil {
		return nil, fmt.Errorf("gagal menyimpan absensi: %w", err)
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
		StudentID:       req.StudentID,
		AcademicYearID:  req.AcademicYearID,
		Month:           req.Month,
		Year:            req.Year,
		SPDDays:         req.SPDDays,
		MealDays:        req.MealDays,
		OvertimeMinutes: req.OvertimeMinutes,
		CreatedBy:       createdBy,
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

	// Overtime: Rp 10.000 per 30 menit, pembulatan ke bawah
	overtimeUnits := a.OvertimeMinutes / 30
	overtimeAmount := float64(overtimeUnits) * 10000

	return &dto.DaycareMonthlyAttendanceResponse{
		ID:              a.ID,
		StudentID:       a.StudentID,
		StudentName:     studentName,
		AcademicYearID:  a.AcademicYearID,
		Month:           a.Month,
		Year:            a.Year,
		SPDDays:         a.SPDDays,
		MealDays:        a.MealDays,
		OvertimeMinutes: a.OvertimeMinutes,
		OvertimeAmount:  overtimeAmount,
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
