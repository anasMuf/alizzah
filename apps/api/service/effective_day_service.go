package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"errors"

	"gorm.io/gorm"
)

type EffectiveDayService interface {
	GetByClassGroup(classGroupID uint, params dto.EffectiveDayQueryParams) ([]dto.EffectiveDayResponse, error)
	Upsert(classGroupID uint, createdBy uint, req dto.UpsertEffectiveDayRequest) (*dto.EffectiveDayResponse, error)
	Update(classGroupID, edID uint, req dto.UpsertEffectiveDayRequest) (*dto.EffectiveDayResponse, error)
}

type effectiveDayService struct {
	effectiveDayRepo repository.EffectiveDayRepository
	classGroupRepo   repository.ClassGroupRepository
	invoiceGen       InvoiceGenerateService
}

func NewEffectiveDayService(effectiveDayRepo repository.EffectiveDayRepository, classGroupRepo repository.ClassGroupRepository, invoiceGen InvoiceGenerateService) EffectiveDayService {
	return &effectiveDayService{
		effectiveDayRepo: effectiveDayRepo,
		classGroupRepo:   classGroupRepo,
		invoiceGen:       invoiceGen,
	}
}

func (s *effectiveDayService) GetByClassGroup(classGroupID uint, params dto.EffectiveDayQueryParams) ([]dto.EffectiveDayResponse, error) {
	_, err := s.classGroupRepo.FindByID(classGroupID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("Rombel tidak ditemukan")
		}
		return nil, err
	}

	eds, err := s.effectiveDayRepo.FindByClassGroup(classGroupID, params)
	if err != nil {
		return nil, err
	}

	var responses []dto.EffectiveDayResponse
	for _, ed := range eds {
		responses = append(responses, *mapEffectiveDayToResponse(ed))
	}

	return responses, nil
}

func (s *effectiveDayService) Upsert(classGroupID uint, createdBy uint, req dto.UpsertEffectiveDayRequest) (*dto.EffectiveDayResponse, error) {
	_, err := s.classGroupRepo.FindByID(classGroupID)
	if err != nil {
		return nil, errors.New("Rombel tidak ditemukan")
	}

	ed := &model.EffectiveDay{
		ClassGroupID:   classGroupID,
		AcademicYearID: req.AcademicYearID,
		Month:          req.Month,
		Year:           req.Year,
		TotalDays:      req.TotalDays,
		TotalMondays:   req.TotalMondays,
		CreatedBy:      createdBy,
	}

	if err := s.effectiveDayRepo.Upsert(ed); err != nil {
		return nil, err
	}

	// Fetch again to ensure preload
	savedEd, _ := s.effectiveDayRepo.FindByClassGroupMonthYear(classGroupID, req.Month, req.Year)

	// Batch 5: trigger recalculate infaq harian di invoice bulan tersebut
	if s.invoiceGen != nil {
		go s.invoiceGen.RecalculateInfaqHarian(classGroupID, req.Month, req.Year)
	}

	return mapEffectiveDayToResponse(*savedEd), nil
}

func (s *effectiveDayService) Update(classGroupID, edID uint, req dto.UpsertEffectiveDayRequest) (*dto.EffectiveDayResponse, error) {
	_, err := s.classGroupRepo.FindByID(classGroupID)
	if err != nil {
		return nil, errors.New("Rombel tidak ditemukan")
	}

	ed, err := s.effectiveDayRepo.FindByClassGroupMonthYear(classGroupID, req.Month, req.Year)
	if err != nil || ed.ID != edID {
		return nil, errors.New("Data hari efektif tidak ditemukan")
	}

	ed.TotalDays = req.TotalDays
	ed.TotalMondays = req.TotalMondays
	ed.AcademicYearID = req.AcademicYearID

	if err := s.effectiveDayRepo.Update(ed); err != nil {
		return nil, err
	}

	// Fetch again for preloads
	savedEd, _ := s.effectiveDayRepo.FindByClassGroupMonthYear(classGroupID, req.Month, req.Year)

	// Batch 5: trigger recalculate infaq harian di invoice bulan tersebut
	if s.invoiceGen != nil {
		go s.invoiceGen.RecalculateInfaqHarian(classGroupID, req.Month, req.Year)
	}

	return mapEffectiveDayToResponse(*savedEd), nil
}

func mapEffectiveDayToResponse(ed model.EffectiveDay) *dto.EffectiveDayResponse {
	return &dto.EffectiveDayResponse{
		ID:           ed.ID,
		ClassGroupID: ed.ClassGroupID,
		Month:        ed.Month,
		Year:         ed.Year,
		TotalDays:    ed.TotalDays,
		TotalMondays: ed.TotalMondays,
		CreatedBy: dto.UserBriefResponse{
			ID:       ed.Creator.ID,
			FullName: ed.Creator.FullName,
		},
		CreatedAt: ed.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}
