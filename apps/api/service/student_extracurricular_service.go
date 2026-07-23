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

type StudentExtracurricularService interface {
	GetByStudentID(studentID uint, params dto.StudentExtracurricularQueryParams) ([]dto.StudentExtracurricularResponse, error)
	Enroll(studentID uint, req dto.EnrollExtracurricularRequest) (*dto.StudentExtracurricularResponse, error)
	Update(studentID, seID uint, req dto.UpdateStudentExtracurricularRequest) (*dto.StudentExtracurricularResponse, error)
	Unenroll(studentID, seID uint) error
}

type studentExtracurricularService struct {
	db          *gorm.DB
	seRepo      repository.StudentExtracurricularRepository
	studentRepo repository.StudentRepository
	exRepo      repository.ExtracurricularRepository
	acRepo      repository.AcademicYearRepository
	invoiceGen  InvoiceGenerateService
}

func NewStudentExtracurricularService(db *gorm.DB, seRepo repository.StudentExtracurricularRepository, studentRepo repository.StudentRepository, exRepo repository.ExtracurricularRepository, acRepo repository.AcademicYearRepository, invoiceGen InvoiceGenerateService) StudentExtracurricularService {
	return &studentExtracurricularService{
		db:          db,
		seRepo:      seRepo,
		studentRepo: studentRepo,
		exRepo:      exRepo,
		acRepo:      acRepo,
		invoiceGen:  invoiceGen,
	}
}

func (s *studentExtracurricularService) GetByStudentID(studentID uint, params dto.StudentExtracurricularQueryParams) ([]dto.StudentExtracurricularResponse, error) {
	_, err := s.studentRepo.FindByID(studentID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("Siswa tidak ditemukan")
		}
		return nil, err
	}

	ses, err := s.seRepo.FindByStudentID(studentID, params)
	if err != nil {
		return nil, err
	}

	var responses []dto.StudentExtracurricularResponse
	for _, se := range ses {
		responses = append(responses, *mapStudentExtracurricularToResponse(se))
	}
	return responses, nil
}

func (s *studentExtracurricularService) Enroll(studentID uint, req dto.EnrollExtracurricularRequest) (*dto.StudentExtracurricularResponse, error) {
	_, err := s.studentRepo.FindByID(studentID)
	if err != nil {
		return nil, errors.New("Siswa tidak ditemukan")
	}

	_, err = s.exRepo.FindByID(req.ExtracurricularID)
	if err != nil {
		return nil, errors.New("Ekstrakurikuler tidak ditemukan")
	}

	_, err = s.acRepo.FindByID(req.AcademicYearID)
	if err != nil {
		return nil, errors.New("Tahun ajaran tidak ditemukan")
	}

	already, _ := s.seRepo.AlreadyEnrolled(studentID, req.ExtracurricularID, req.AcademicYearID)
	if already {
		return nil, errors.New("Siswa sudah terdaftar di ekstrakurikuler ini untuk tahun ajaran tersebut")
	}

	startDate, err := utility.ParseDate(req.StartDate)
	if err != nil {
		return nil, errors.New("Format start_date tidak valid (YYYY-MM-DD)")
	}

	se := &model.StudentExtracurricular{
		StudentID:         studentID,
		ExtracurricularID: req.ExtracurricularID,
		AcademicYearID:    req.AcademicYearID,
		StartDate:         startDate,
	}

	// 1. Buat enrollment dalam transaksi — unique constraint di DB bertindak
	//    sebagai safety net terhadap concurrent request yang lolos AlreadyEnrolled.
	txErr := s.db.Transaction(func(tx *gorm.DB) error {
		if err := s.seRepo.WithTx(tx).Create(se); err != nil {
			if strings.Contains(err.Error(), "duplicate key") || strings.Contains(err.Error(), "uq_active_extracurricular") {
				return errors.New("Siswa sudah terdaftar di ekstrakurikuler ini untuk tahun ajaran tersebut")
			}
			return fmt.Errorf("gagal membuat enrollment: %w", err)
		}
		return nil
	})
	if txErr != nil {
		return nil, txErr
	}

	// 2. Generate item tagihan — dijalankan SETELAH commit agar record enrollment
	//    sudah visible bagi repo non-transaksional di dalam AddExtracurricularToMonthlyRange.
	if s.invoiceGen != nil {
		if err := s.invoiceGen.AddExtracurricularToMonthlyRange(studentID, req.ExtracurricularID, req.AcademicYearID); err != nil {
			return nil, fmt.Errorf("enrollment berhasil, tapi gagal generate tagihan: %w", err)
		}
	}

	savedSe, err := s.seRepo.FindByID(se.ID)
	if err != nil {
		return nil, fmt.Errorf("gagal mengambil data ekskul: %w", err)
	}
	return mapStudentExtracurricularToResponse(*savedSe), nil
}

func (s *studentExtracurricularService) Update(studentID, seID uint, req dto.UpdateStudentExtracurricularRequest) (*dto.StudentExtracurricularResponse, error) {
	se, err := s.seRepo.FindByID(seID)
	if err != nil || se.StudentID != studentID {
		return nil, errors.New("Data pendaftaran ekstrakurikuler tidak ditemukan")
	}

	endDate, err := utility.ParseDate(req.EndDate)
	if err != nil {
		return nil, errors.New("Format end_date tidak valid (YYYY-MM-DD)")
	}

	se.EndDate = &endDate
	if err := s.seRepo.Update(se); err != nil {
		return nil, err
	}

	savedSe, err := s.seRepo.FindByID(seID)
	if err != nil {
		return nil, fmt.Errorf("gagal mengambil data ekskul: %w", err)
	}
	return mapStudentExtracurricularToResponse(*savedSe), nil
}

func (s *studentExtracurricularService) Unenroll(studentID, seID uint) error {
	se, err := s.seRepo.FindByID(seID)
	if err != nil || se.StudentID != studentID {
		return errors.New("Data pendaftaran ekstrakurikuler tidak ditemukan")
	}

	now := time.Now()
	se.EndDate = &now

	// Unenrollment harus selalu berhasil. Invoice cleanup bersifat best-effort —
	// jika gagal, admin bisa menjalankan ulang sync endpoint.
	if err := s.seRepo.Update(se); err != nil {
		return fmt.Errorf("gagal mencabut pendaftaran: %w", err)
	}

	if s.invoiceGen != nil {
		_ = s.invoiceGen.RemoveExtracurricularFromFutureInvoices(studentID, se.ExtracurricularID, se.AcademicYearID)
	}

	return nil
}

func mapStudentExtracurricularToResponse(se model.StudentExtracurricular) *dto.StudentExtracurricularResponse {
	var endDateStr *string
	if se.EndDate != nil {
		ed := se.EndDate.Format("2006-01-02")
		endDateStr = &ed
	}

	return &dto.StudentExtracurricularResponse{
		ID: se.ID,
		Extracurricular: dto.ExtracurricularResponse{
			ID:   se.Extracurricular.ID,
			Name: se.Extracurricular.Name,
			Type: se.Extracurricular.Type,
		},
		StartDate: se.StartDate.Format("2006-01-02"),
		EndDate:   endDateStr,
	}
}
