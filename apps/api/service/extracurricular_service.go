package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"api/utility"
	"errors"
	"fmt"
	"strings"

	"gorm.io/gorm"
)

type ExtracurricularService interface {
	GetAll(params dto.ExtracurricularQueryParams) ([]dto.ExtracurricularResponse, error)
	Create(req dto.CreateExtracurricularRequest) (*dto.ExtracurricularResponse, error)
	Update(id uint, req dto.CreateExtracurricularRequest) (*dto.ExtracurricularResponse, error)
	Delete(id uint) error
}

type extracurricularService struct {
	db                  *gorm.DB
	extracurricularRepo repository.ExtracurricularRepository
	feeConfigRepo       repository.FeeConfigRepository
	feeConfigItemRepo   repository.FeeConfigItemRepository
}

func NewExtracurricularService(
	db *gorm.DB,
	extracurricularRepo repository.ExtracurricularRepository,
	feeConfigRepo repository.FeeConfigRepository,
	feeConfigItemRepo repository.FeeConfigItemRepository,
) ExtracurricularService {
	return &extracurricularService{
		db:                  db,
		extracurricularRepo: extracurricularRepo,
		feeConfigRepo:       feeConfigRepo,
		feeConfigItemRepo:   feeConfigItemRepo,
	}
}

func (s *extracurricularService) GetAll(params dto.ExtracurricularQueryParams) ([]dto.ExtracurricularResponse, error) {
	exs, err := s.extracurricularRepo.FindAll(params)
	if err != nil {
		return nil, err
	}

	// Cek mandatory dari fee config — match by name, bukan item_key
	mandatoryNames := make(map[string]bool)
	feeConfig, _ := s.feeConfigRepo.FindActive()
	if feeConfig != nil && feeConfig.ID > 0 {
		items, _ := s.feeConfigItemRepo.FindByCategory(feeConfig.ID, "pasta")
		for _, item := range items {
			if item.IsMandatory {
				mandatoryNames[item.Name] = true
			}
		}
	}

	var responses []dto.ExtracurricularResponse
	for _, ex := range exs {
		responses = append(responses, dto.ExtracurricularResponse{
			ID:          ex.ID,
			Name:        ex.Name,
			Type:        ex.Type,
			Levels:      ex.Levels,
			IsMandatory: mandatoryNames[ex.Name],
		})
	}
	return responses, nil
}

func (s *extracurricularService) Create(req dto.CreateExtracurricularRequest) (*dto.ExtracurricularResponse, error) {
	ex := &model.Extracurricular{
		Name:   req.Name,
		Type:   req.Type,
		Levels: req.Levels,
	}

	if err := s.extracurricularRepo.Create(ex); err != nil {
		return nil, err
	}

	// Auto-create fee config item dengan nominal 0 (jika ada fee config aktif)
	// agar admin tinggal isi nominal di halaman Tarif
	feeConfig, _ := s.feeConfigRepo.FindActive()
	if feeConfig != nil && feeConfig.ID > 0 {
		slug := strings.ToLower(strings.ReplaceAll(req.Name, " ", "_"))
		itemKey := fmt.Sprintf("%s_%s", req.Type, slug)
		titleName := strings.ToUpper(req.Type[:1]) + req.Type[1:]

		existing, _ := s.feeConfigItemRepo.FindByItemKeys(feeConfig.ID, []string{itemKey})
		if len(existing) == 0 {
			s.db.Create(&model.FeeConfigItem{
				FeeConfigID: feeConfig.ID,
				Category:    req.Type,
				ItemKey:     itemKey,
				Name:        fmt.Sprintf("%s %s", titleName, req.Name),
				Level:       "all",
				Gender:      "all",
				Amount:      0,
				Unit:        "fixed",
			})
		}
	}

	return &dto.ExtracurricularResponse{
		ID:     ex.ID,
		Name:   ex.Name,
		Type:   ex.Type,
		Levels: ex.Levels,
	}, nil
}

func (s *extracurricularService) Update(id uint, req dto.CreateExtracurricularRequest) (*dto.ExtracurricularResponse, error) {
	ex, err := s.extracurricularRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("Ekstrakurikuler tidak ditemukan")
		}
		return nil, err
	}

	oldName := ex.Name
	ex.Name = req.Name
	ex.Type = req.Type
	ex.Levels = req.Levels

	if err := s.extracurricularRepo.Update(ex); err != nil {
		return nil, err
	}

	// Sinkron: update fee item name jika berubah
	if oldName != req.Name {
		oldSlug := strings.ToLower(strings.ReplaceAll(oldName, " ", "_"))
		newSlug := strings.ToLower(strings.ReplaceAll(req.Name, " ", "_"))
		oldKey := fmt.Sprintf("%s_%s", req.Type, oldSlug)
		newKey := fmt.Sprintf("%s_%s", req.Type, newSlug)
		titleName := strings.ToUpper(req.Type[:1]) + req.Type[1:]

		feeConfig, _ := s.feeConfigRepo.FindActive()
		if feeConfig != nil && feeConfig.ID > 0 {
			item, err := s.feeConfigItemRepo.FindByItemKey(feeConfig.ID, oldKey, "all", "all")
			if err == nil && item != nil {
				item.ItemKey = newKey
				item.Name = fmt.Sprintf("%s %s", titleName, req.Name)
				s.feeConfigItemRepo.Update(item)
			}
		}
	}

	return &dto.ExtracurricularResponse{
		ID:     ex.ID,
		Name:   ex.Name,
		Type:   ex.Type,
		Levels: ex.Levels,
	}, nil
}

func (s *extracurricularService) Delete(id uint) error {
	ex, err := s.extracurricularRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("Ekstrakurikuler tidak ditemukan")
		}
		return err
	}

	isUsed, err := s.extracurricularRepo.IsUsedByStudents(id)
	if err != nil {
		return err
	}
	if isUsed {
		return utility.NewUnprocessableError("Tidak bisa menghapus ekstrakurikuler karena masih diikuti oleh siswa")
	}

	if err := s.extracurricularRepo.Delete(id); err != nil {
		return err
	}

	// Hapus juga fee config item terkait
	slug := strings.ToLower(strings.ReplaceAll(ex.Name, " ", "_"))
	itemKey := fmt.Sprintf("%s_%s", ex.Type, slug)
	feeConfig, _ := s.feeConfigRepo.FindActive()
	if feeConfig != nil && feeConfig.ID > 0 {
		items, _ := s.feeConfigItemRepo.FindByItemKeys(feeConfig.ID, []string{itemKey})
		for _, item := range items {
			s.feeConfigItemRepo.Delete(item.ID)
		}
	}

	return nil
}
