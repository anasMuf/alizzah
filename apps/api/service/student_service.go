package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"api/utility"
	"encoding/csv"
	"errors"
	"mime/multipart"
	"strings"
	"time"

	"gorm.io/gorm"
)

const dateLayout = "2006-01-02"

type StudentService interface {
	GetAll(params dto.StudentQueryParams) ([]dto.StudentListResponse, *dto.Meta, error)
	GetByID(id uint) (*dto.StudentDetailResponse, error)
	Create(createdBy uint, req dto.CreateStudentRequest) (*dto.StudentDetailResponse, error)
	Update(id uint, req dto.UpdateStudentRequest) (*dto.StudentDetailResponse, error)
	Delete(id uint) error
	Import(file *multipart.FileHeader) (*dto.ImportSummaryResponse, error)
}

type studentService struct {
	db             *gorm.DB
	studentRepo    repository.StudentRepository
	enrollmentRepo repository.StudentEnrollmentRepository
	classGroupRepo repository.ClassGroupRepository
	invoiceRepo    repository.InvoiceRepository
	savingsService SavingsService
	invoiceGen     InvoiceGenerateService
}

func NewStudentService(db *gorm.DB, studentRepo repository.StudentRepository, enrollmentRepo repository.StudentEnrollmentRepository, classGroupRepo repository.ClassGroupRepository, invoiceRepo repository.InvoiceRepository, savingsService SavingsService, invoiceGen InvoiceGenerateService) StudentService {
	return &studentService{
		db:             db,
		studentRepo:    studentRepo,
		enrollmentRepo: enrollmentRepo,
		classGroupRepo: classGroupRepo,
		invoiceRepo:    invoiceRepo,
		savingsService: savingsService,
		invoiceGen:     invoiceGen,
	}
}

func (s *studentService) GetAll(params dto.StudentQueryParams) ([]dto.StudentListResponse, *dto.Meta, error) {
	students, total, err := s.studentRepo.FindAll(params)
	if err != nil {
		return nil, nil, err
	}

	responses := make([]dto.StudentListResponse, len(students))
	for i, st := range students {
		responses[i] = dto.StudentListResponse{
			ID:            st.ID,
			FullName:      st.FullName,
			Gender:        st.Gender,
			BirthDate:     st.BirthDate.Format(dateLayout),
			Status:        st.Status,
			IsDaycareOnly: st.IsDaycareOnly,
		}
		// Populate current enrollment
		if s.enrollmentRepo != nil {
			if enr, err := s.enrollmentRepo.FindActiveByStudentID(st.ID); err == nil {
				responses[i].CurrentEnrollment = s.mapEnrollmentToBrief(enr)
			}
		}
	}

	meta := &dto.Meta{
		Page:  params.Page,
		Limit: params.Limit,
		Total: total,
	}

	return responses, meta, nil
}

func (s *studentService) GetByID(id uint) (*dto.StudentDetailResponse, error) {
	student, err := s.studentRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("Siswa tidak ditemukan")
		}
		return nil, err
	}

	resp := mapStudentToDetailResponse(*student)

	// Fill current enrollment
	if s.enrollmentRepo != nil {
		if enr, err := s.enrollmentRepo.FindActiveByStudentID(id); err == nil {
			resp.CurrentEnrollment = s.mapEnrollmentToBrief(enr)
		}
	}

	// Fill financial summary
	if s.invoiceRepo != nil {
		unpaidTotal, _ := s.invoiceRepo.SumUnpaidByStudent(id)
		generalBal := float64(0)
		mandatoryBal := float64(0)
		if s.savingsService != nil {
			generalBal, _ = s.savingsService.GetBalance(id, "general")
			mandatoryBal, _ = s.savingsService.GetBalance(id, "mandatory")
		}
		resp.FinancialSummary = &dto.FinancialSummaryResponse{
			TotalUnpaid:             unpaidTotal,
			SavingsGeneralBalance:   generalBal,
			SavingsMandatoryBalance: mandatoryBal,
		}
	}

	return resp, nil
}

func (s *studentService) Create(createdBy uint, req dto.CreateStudentRequest) (*dto.StudentDetailResponse, error) {
	birthDate, err := utility.ParseDate(req.BirthDate)
	if err != nil {
		return nil, errors.New("Format birth_date tidak valid (YYYY-MM-DD)")
	}

	wantEnrollment := req.ClassGroupID != 0

	if wantEnrollment && req.AcademicYearID == 0 {
		return nil, errors.New("academic_year_id wajib diisi jika class_group_id diberikan")
	}

	if wantEnrollment {
		cg, err := s.classGroupRepo.FindByID(req.ClassGroupID)
		if err != nil {
			return nil, errors.New("Rombel tidak ditemukan")
		}
		if cg.AcademicYearID != req.AcademicYearID {
			return nil, errors.New("Rombel tidak termasuk dalam tahun ajaran yang dipilih")
		}
	}

	enrollmentType := req.EnrollmentType
	if enrollmentType == "" {
		enrollmentType = "new"
	}

	enrollmentStatus := req.EnrollmentStatus
	if enrollmentStatus == "" {
		enrollmentStatus = "active"
	}

	startDate := time.Now()
	if req.StartDate != "" {
		sd, err := utility.ParseDate(req.StartDate)
		if err != nil {
			return nil, errors.New("Format start_date tidak valid (YYYY-MM-DD)")
		}
		startDate = sd
	}

	student := &model.Student{
		FullName:      req.FullName,
		BirthPlace:    req.BirthPlace,
		BirthDate:     birthDate,
		Gender:        req.Gender,
		Religion:      req.Religion,
		IsDaycareOnly: req.IsDaycareOnly,
		Status:        "active",
	}

	if len(req.Guardians) > 0 {
		var sgLinks []model.StudentGuardian
		for _, gReq := range req.Guardians {
			sgLinks = append(sgLinks, model.StudentGuardian{
				Guardian: model.Guardian{
					FullName:     gReq.FullName,
					Relationship: gReq.Relationship,
					Phone:        gReq.Phone,
					Address:      gReq.Address,
				},
				IsPrimary: gReq.IsPrimary,
			})
		}
		student.StudentGuardians = sgLinks
	}

	var classGroupLevel string
	if wantEnrollment {
		cg, _ := s.classGroupRepo.FindByID(req.ClassGroupID)
		if cg != nil {
			classGroupLevel = cg.Level
		}
	}

	err = s.db.Transaction(func(tx *gorm.DB) error {
		if err := s.studentRepo.WithTx(tx).Create(student); err != nil {
			return err
		}

		if wantEnrollment {
			enrollment := &model.StudentEnrollment{
				StudentID:      student.ID,
				ClassGroupID:   req.ClassGroupID,
				AcademicYearID: req.AcademicYearID,
				EnrollmentType: enrollmentType,
				StartDate:      startDate,
				Status:         enrollmentStatus,
				CreatedBy:      createdBy,
			}
			if err := s.enrollmentRepo.WithTx(tx).Create(enrollment); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	// Generate tagihan biaya awal & registrasi setelah enrollment berhasil
	if wantEnrollment && enrollmentStatus == "active" && s.invoiceGen != nil {
		level := classGroupLevel
		gender := student.Gender

		// Biaya Awal — sekali saat pertama masuk
		s.invoiceGen.GenerateInitial(dto.GenerateInitialInvoiceParams{
			StudentID:      student.ID,
			AcademicYearID: req.AcademicYearID,
			Level:          level,
			Gender:         gender,
			CreatedBy:      createdBy,
		})

		// Registrasi Tahunan
		s.invoiceGen.GenerateRegistration(dto.GenerateRegistrationInvoiceParams{
			StudentID:      student.ID,
			AcademicYearID: req.AcademicYearID,
			Level:          level,
			Gender:         gender,
			CreatedBy:      createdBy,
		})
	}

	createdStudent, _ := s.studentRepo.FindByID(student.ID)
	return mapStudentToDetailResponse(*createdStudent), nil
}

func (s *studentService) Update(id uint, req dto.UpdateStudentRequest) (*dto.StudentDetailResponse, error) {
	student, err := s.studentRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("Siswa tidak ditemukan")
		}
		return nil, err
	}

	birthDate, err := utility.ParseDate(req.BirthDate)
	if err != nil {
		return nil, errors.New("Format birth_date tidak valid (YYYY-MM-DD)")
	}

	student.FullName = req.FullName
	student.BirthPlace = req.BirthPlace
	student.BirthDate = birthDate
	student.Gender = req.Gender
	student.Religion = req.Religion
	student.IsDaycareOnly = req.IsDaycareOnly

	if err := s.studentRepo.Update(student); err != nil {
		return nil, err
	}

	return mapStudentToDetailResponse(*student), nil
}

func (s *studentService) Delete(id uint) error {
	hasActive, err := s.studentRepo.HasActiveEnrollment(id)
	if err != nil {
		return err
	}
	if hasActive {
		return errors.New("Tidak bisa menghapus siswa yang memiliki pendaftaran aktif")
	}

	_, err = s.studentRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("Siswa tidak ditemukan")
		}
		return err
	}

	return s.studentRepo.Delete(id)
}

func (s *studentService) Import(file *multipart.FileHeader) (*dto.ImportSummaryResponse, error) {
	src, err := file.Open()
	if err != nil {
		return nil, err
	}
	defer src.Close()

	reader := csv.NewReader(src)
	records, err := reader.ReadAll()
	if err != nil {
		return nil, errors.New("Gagal membaca file CSV")
	}

	if len(records) < 2 {
		return nil, errors.New("File CSV kosong atau hanya berisi header")
	}

	var students []model.Student
	var details []dto.ImportResult
	totalProcessed := 0
	totalFailed := 0

	for i, row := range records {
		if i == 0 {
			continue // Skip header
		}
		totalProcessed++

		// minimum: full_name, birth_place, birth_date, gender, religion
		if len(row) < 5 {
			details = append(details, dto.ImportResult{
				Row:     i + 1,
				Name:    "Unknown",
				Success: false,
				Error:   "Kolom kurang dari 5",
			})
			totalFailed++
			continue
		}

		fullName := strings.TrimSpace(row[0])
		birthPlace := strings.TrimSpace(row[1])
		birthDateStr := strings.TrimSpace(row[2])
		gender := strings.TrimSpace(row[3])
		religion := strings.TrimSpace(row[4])

		if fullName == "" {
			details = append(details, dto.ImportResult{Row: i + 1, Name: fullName, Success: false, Error: "Nama lengkap kosong"})
			totalFailed++
			continue
		}

		birthDate, err := time.Parse(dateLayout, birthDateStr)
		if err != nil {
			details = append(details, dto.ImportResult{Row: i + 1, Name: fullName, Success: false, Error: "Format tanggal lahir salah (harus YYYY-MM-DD)"})
			totalFailed++
			continue
		}

		if gender != "L" && gender != "P" {
			details = append(details, dto.ImportResult{Row: i + 1, Name: fullName, Success: false, Error: "Gender harus L atau P"})
			totalFailed++
			continue
		}

		student := model.Student{
			FullName:   fullName,
			BirthPlace: birthPlace,
			BirthDate:  birthDate,
			Gender:     gender,
			Religion:   religion,
			Status:     "active",
		}
		students = append(students, student)
	}

	if len(students) > 0 {
		successCount, dbResults, _ := s.studentRepo.BulkCreate(students)
		details = append(details, dbResults...)

		return &dto.ImportSummaryResponse{
			TotalProcessed: totalProcessed,
			TotalSuccess:   successCount,
			TotalFailed:    totalProcessed - successCount,
			Details:        details,
		}, nil
	}

	return &dto.ImportSummaryResponse{
		TotalProcessed: totalProcessed,
		TotalSuccess:   0,
		TotalFailed:    totalFailed,
		Details:        details,
	}, nil
}

func mapStudentToDetailResponse(st model.Student) *dto.StudentDetailResponse {
	var gBriefs []dto.GuardianBriefResponse
	for _, sg := range st.StudentGuardians {
		gBriefs = append(gBriefs, dto.GuardianBriefResponse{
			ID:           sg.Guardian.ID,
			FullName:     sg.Guardian.FullName,
			Relationship: sg.Guardian.Relationship,
			Phone:        sg.Guardian.Phone,
			IsPrimary:    sg.IsPrimary,
		})
	}

	var photoUrl *string
	if st.PhotoURL != "" {
		photoUrl = &st.PhotoURL
	}

	return &dto.StudentDetailResponse{
		ID:            st.ID,
		FullName:      st.FullName,
		Gender:        st.Gender,
		BirthPlace:    st.BirthPlace,
		BirthDate:     st.BirthDate.Format(dateLayout),
		Religion:      st.Religion,
		PhotoURL:      photoUrl,
		Status:        st.Status,
		IsDaycareOnly: st.IsDaycareOnly,
		Guardians: gBriefs,
		CreatedAt: st.CreatedAt.Format(time.RFC3339),
	}
}

func (s *studentService) mapEnrollmentToBrief(enr *model.StudentEnrollment) *dto.EnrollmentBriefResponse {
	return &dto.EnrollmentBriefResponse{
		ID:             enr.ID,
		ClassGroupID:   enr.ClassGroupID,
		ClassGroupName: enr.ClassGroup.Name,
		ClassGroup: dto.ClassGroupBriefResponse{
			ID:    enr.ClassGroup.ID,
			Name:  enr.ClassGroup.Name,
			Level: enr.ClassGroup.Level,
		},
		Level:            enr.ClassGroup.Level,
		AcademicYearID:   enr.AcademicYearID,
		AcademicYearName: enr.AcademicYear.Name,
		StartDate:        enr.StartDate.Format(dateLayout),
		Status:           enr.Status,
	}
}
