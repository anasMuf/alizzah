package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"api/utility"
	"errors"
	"fmt"
	"time"
)

// StudentFacilityService — tetap di flat karena dependensi ke InvoiceGenerateService.
type StudentFacilityService interface {
	GetByStudentID(studentID uint, params dto.StudentFacilityQueryParams) ([]dto.StudentFacilityResponse, error)
	Enroll(studentID uint, req dto.EnrollFacilityRequest) (*dto.StudentFacilityResponse, error)
	Unenroll(studentID, sfID uint) error
}

type studentFacilityService struct {
	sfRepo       repository.StudentFacilityRepository
	studentRepo  repository.StudentRepository
	facilityRepo repository.FacilityRepository
	acRepo       repository.AcademicYearRepository
	invoiceGen   InvoiceGenerateService
}

func NewStudentFacilityService(
	sfRepo repository.StudentFacilityRepository,
	studentRepo repository.StudentRepository,
	facilityRepo repository.FacilityRepository,
	acRepo repository.AcademicYearRepository,
	invoiceGen InvoiceGenerateService,
) StudentFacilityService {
	return &studentFacilityService{
		sfRepo:       sfRepo,
		studentRepo:  studentRepo,
		facilityRepo: facilityRepo,
		acRepo:       acRepo,
		invoiceGen:   invoiceGen,
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
	startDate, err := utility.ParseDate(req.StartDate)
	if err != nil {
		return nil, errors.New("Format start_date tidak valid (YYYY-MM-DD)")
	}
	sf := &model.StudentFacility{
		StudentID:      studentID,
		FacilityID:     req.FacilityID,
		AcademicYearID: req.AcademicYearID,
		StartDate:      startDate,
	}
	if err := s.sfRepo.Create(sf); err != nil {
		return nil, err
	}
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
	return dto.StudentFacilityResponse{
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
}
