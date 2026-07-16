package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"errors"
	"log"

	"gorm.io/gorm"
)

type EffectiveDayService interface {
	GetByClassGroup(classGroupID uint, params dto.EffectiveDayQueryParams) ([]dto.EffectiveDayResponse, error)
	Upsert(classGroupID uint, createdBy uint, req dto.UpsertEffectiveDayRequest) (*dto.EffectiveDayResponse, error)
	Update(classGroupID, edID uint, req dto.UpsertEffectiveDayRequest) (*dto.EffectiveDayResponse, error)
	// Per-jenjang
	GetByLevel(level string, params dto.EffectiveDayQueryParams) ([]dto.EffectiveDayResponse, error)
	UpsertLevel(level string, createdBy uint, req dto.UpsertEffectiveDayRequest) (*dto.EffectiveDayResponse, error)
	// Grid unified
	GetGrid(academicYearID uint) (*dto.EffectiveDayGridResponse, error)
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

func (s *effectiveDayService) GetByLevel(level string, params dto.EffectiveDayQueryParams) ([]dto.EffectiveDayResponse, error) {
	eds, err := s.effectiveDayRepo.FindByLevel(level, params)
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

	savedEd, _ := s.effectiveDayRepo.FindByClassGroupMonthYear(classGroupID, req.Month, req.Year)

	if s.invoiceGen != nil {
		go s.invoiceGen.RecalculateInfaqHarian(classGroupID, req.Month, req.Year)
	}

	return mapEffectiveDayToResponse(*savedEd), nil
}

func (s *effectiveDayService) UpsertLevel(level string, createdBy uint, req dto.UpsertEffectiveDayRequest) (*dto.EffectiveDayResponse, error) {
	ed := &model.EffectiveDay{
		Level:          level,
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

	savedEd, _ := s.effectiveDayRepo.FindByLevelMonthYear(level, req.Month, req.Year)

	// Recalculate infaq for all class groups of this level
	// Hapus dulu per-rombel effective days agar fallback ke jenjang berfungsi
	if s.invoiceGen != nil {
		cgs, err := s.classGroupRepo.FindAll(dto.ClassGroupQueryParams{})
		if err == nil {
			log.Printf("[UpsertLevel] found %d total class groups, filtering for level=%s", len(cgs), level)
			count := 0
			for _, cg := range cgs {
				if cg.Level == level {
					// Hapus per-rombel ED agar recalculate pakai nilai jenjang
					if delErr := s.effectiveDayRepo.DeleteByClassGroupMonthYear(cg.ID, req.Month, req.Year); delErr != nil {
						log.Printf("[UpsertLevel] warning: gagal hapus per-rombel ED classGroupID=%d: %v", cg.ID, delErr)
					}
					log.Printf("[UpsertLevel] spawning RecalculateInfaqHarian for classGroupID=%d month=%d year=%d", cg.ID, req.Month, req.Year)
					go s.invoiceGen.RecalculateInfaqHarian(cg.ID, req.Month, req.Year)
					count++
				}
			}
			log.Printf("[UpsertLevel] spawned %d RecalculateInfaqHarian goroutines", count)
		} else {
			log.Printf("[UpsertLevel] error FindAll class groups: %v", err)
		}
	} else {
		log.Printf("[UpsertLevel] invoiceGen is nil, skipping recalculate")
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

	savedEd, _ := s.effectiveDayRepo.FindByClassGroupMonthYear(classGroupID, req.Month, req.Year)

	if s.invoiceGen != nil {
		go s.invoiceGen.RecalculateInfaqHarian(classGroupID, req.Month, req.Year)
	}

	return mapEffectiveDayToResponse(*savedEd), nil
}

// GetGrid returns unified grid data: level defaults + class group overrides for one academic year.
func (s *effectiveDayService) GetGrid(academicYearID uint) (*dto.EffectiveDayGridResponse, error) {
	// Load all class groups
	cgs, err := s.classGroupRepo.FindAll(dto.ClassGroupQueryParams{AcademicYearID: academicYearID})
	if err != nil {
		return nil, err
	}

	// Level rows: load per-jenjang effective days for all 3 levels
	levels := []string{"mutiara", "intan", "berlian"}
	levelRows := make([]dto.EffectiveDayLevelRow, 0, 3)

	for _, lvl := range levels {
		eds, err := s.effectiveDayRepo.FindByLevel(lvl, dto.EffectiveDayQueryParams{AcademicYearID: academicYearID})
		if err != nil {
			return nil, err
		}
		row := dto.EffectiveDayLevelRow{
			Level:  lvl,
			Months: make(map[uint]dto.EffectiveDayMonthCell),
		}
		for _, ed := range eds {
			row.Months[ed.Month] = dto.EffectiveDayMonthCell{
				TotalDays:    ed.TotalDays,
				TotalMondays: ed.TotalMondays,
			}
		}
		levelRows = append(levelRows, row)
	}

	// Class group rows: per-rombel effective days, nil if not overridden
	cgRows := make([]dto.EffectiveDayClassGroupRow, 0, len(cgs))
	for _, cg := range cgs {
		eds, err := s.effectiveDayRepo.FindByClassGroup(cg.ID, dto.EffectiveDayQueryParams{AcademicYearID: academicYearID})
		if err != nil {
			return nil, err
		}
		row := dto.EffectiveDayClassGroupRow{
			ID:     cg.ID,
			Name:   cg.Name,
			Level:  cg.Level,
			Months: make(map[uint]*dto.EffectiveDayMonthCell),
		}
		// Pre-fill all months with nil (no override)
		for _, ed := range eds {
			row.Months[ed.Month] = &dto.EffectiveDayMonthCell{
				TotalDays:    ed.TotalDays,
				TotalMondays: ed.TotalMondays,
			}
		}
		cgRows = append(cgRows, row)
	}

	return &dto.EffectiveDayGridResponse{
		Levels:      levelRows,
		ClassGroups: cgRows,
	}, nil
}

func mapEffectiveDayToResponse(ed model.EffectiveDay) *dto.EffectiveDayResponse {
	return &dto.EffectiveDayResponse{
		ID:           ed.ID,
		ClassGroupID: ed.ClassGroupID,
		Level:        ed.Level,
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
