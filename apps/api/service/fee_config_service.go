package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"api/utility"
	"errors"
	"fmt"

	"gorm.io/gorm"
)

type FeeConfigService interface {
	GetAll() ([]dto.FeeConfigResponse, error)
	GetByID(id uint) (*dto.FeeConfigResponse, error)
	GetByAcademicYear(academicYearID uint) (*dto.FeeConfigResponse, error)
	Create(req dto.CreateFeeConfigRequest) (*dto.FeeConfigResponse, error)
	Update(id uint, req dto.UpdateFeeConfigRequest) (*dto.FeeConfigResponse, error)
	// Item management
	GetItems(feeConfigID uint, params dto.FeeConfigItemQueryParams) ([]dto.FeeConfigItemResponse, error)
	CreateItem(feeConfigID uint, req dto.CreateFeeConfigItemRequest) (*dto.FeeConfigItemResponse, error)
	UpdateItem(feeConfigID, itemID uint, req dto.CreateFeeConfigItemRequest) (*dto.FeeConfigItemResponse, error)
	DeleteItem(feeConfigID, itemID uint) error
}

type feeConfigService struct {
	fcRepo     repository.FeeConfigRepository
	itemRepo   repository.FeeConfigItemRepository
	ayRepo     repository.AcademicYearRepository
}

func NewFeeConfigService(fcRepo repository.FeeConfigRepository, itemRepo repository.FeeConfigItemRepository, ayRepo repository.AcademicYearRepository) FeeConfigService {
	return &feeConfigService{
		fcRepo:   fcRepo,
		itemRepo: itemRepo,
		ayRepo:   ayRepo,
	}
}

func (s *feeConfigService) GetAll() ([]dto.FeeConfigResponse, error) {
	fcs, err := s.fcRepo.FindAll()
	if err != nil {
		return nil, err
	}

	var responses []dto.FeeConfigResponse
	for _, fc := range fcs {
		res := mapFeeConfigToResponse(fc)
		s.populateProductNames(res.Items)
		responses = append(responses, *res)
	}
	return responses, nil
}

func (s *feeConfigService) GetByID(id uint) (*dto.FeeConfigResponse, error) {
	fc, err := s.fcRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("Konfigurasi tarif tidak ditemukan")
		}
		return nil, err
	}
	res := mapFeeConfigToResponse(*fc)
	s.populateProductNames(res.Items)
	return res, nil
}

func (s *feeConfigService) GetByAcademicYear(academicYearID uint) (*dto.FeeConfigResponse, error) {
	fc, err := s.fcRepo.FindByAcademicYearID(academicYearID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("Konfigurasi tarif tidak ditemukan untuk tahun ajaran ini")
		}
		return nil, err
	}
	res := mapFeeConfigToResponse(*fc)
	s.populateProductNames(res.Items)
	return res, nil
}

func (s *feeConfigService) Create(req dto.CreateFeeConfigRequest) (*dto.FeeConfigResponse, error) {
	_, err := s.ayRepo.FindByID(req.AcademicYearID)
	if err != nil {
		return nil, errors.New("Tahun ajaran tidak ditemukan")
	}

	existing, _ := s.fcRepo.FindByAcademicYearID(req.AcademicYearID)
	if existing != nil {
		return nil, utility.NewConflictError("Konfigurasi tarif sudah ada untuk tahun ajaran ini")
	}

	fc := &model.FeeConfig{
		AcademicYearID:   req.AcademicYearID,
		SavingsAdminRate: req.SavingsAdminRate,
	}

	if err := s.fcRepo.Create(fc); err != nil {
		return nil, err
	}

	savedFc, err := s.fcRepo.FindByID(fc.ID)
	if err != nil {
		return nil, fmt.Errorf("gagal mengambil data konfigurasi tarif: %w", err)
	}
	return mapFeeConfigToResponse(*savedFc), nil
}

func (s *feeConfigService) Update(id uint, req dto.UpdateFeeConfigRequest) (*dto.FeeConfigResponse, error) {
	fc, err := s.fcRepo.FindByID(id)
	if err != nil {
		return nil, errors.New("Konfigurasi tarif tidak ditemukan")
	}

	fc.SavingsAdminRate = req.SavingsAdminRate
	if err := s.fcRepo.Update(fc); err != nil {
		return nil, err
	}

	savedFc, err := s.fcRepo.FindByID(id)
	if err != nil {
		return nil, fmt.Errorf("gagal mengambil data konfigurasi tarif: %w", err)
	}
	return mapFeeConfigToResponse(*savedFc), nil
}

func (s *feeConfigService) GetItems(feeConfigID uint, params dto.FeeConfigItemQueryParams) ([]dto.FeeConfigItemResponse, error) {
	items, err := s.itemRepo.FindByFeeConfigID(feeConfigID, params)
	if err != nil {
		return nil, err
	}

	var responses []dto.FeeConfigItemResponse
	for _, item := range items {
		responses = append(responses, *mapFeeConfigItemToResponse(item))
	}
	s.populateProductNames(responses)
	return responses, nil
}

func (s *feeConfigService) CreateItem(feeConfigID uint, req dto.CreateFeeConfigItemRequest) (*dto.FeeConfigItemResponse, error) {
	_, err := s.fcRepo.FindByID(feeConfigID)
	if err != nil {
		return nil, errors.New("Konfigurasi tarif tidak ditemukan")
	}

	existing, _ := s.itemRepo.FindByItemKey(feeConfigID, req.ItemKey, req.Level, req.Gender)
	if existing != nil {
		return nil, utility.NewConflictError("Kombinasi item tarif sudah ada untuk fee config ini")
	}

	item := &model.FeeConfigItem{
		FeeConfigID:       feeConfigID,
		Category:          req.Category,
		ItemKey:           req.ItemKey,
		Name:              req.Name,
		Level:             req.Level,
		Gender:            req.Gender,
		Amount:            req.Amount,
		Unit:              req.Unit,
		IsMandatory:       req.IsMandatory,
		IsKoperasi:        req.IsKoperasi,
		KoperasiProductID: req.KoperasiProductID,
	}

	if err := s.itemRepo.Create(item); err != nil {
		return nil, err
	}

	res := mapFeeConfigItemToResponse(*item)
	if res.KoperasiProductID != nil {
		names, _ := s.itemRepo.GetProductNames([]uint{*res.KoperasiProductID})
		if names != nil {
			res.KoperasiProductName = names[*res.KoperasiProductID]
		}
	}
	return res, nil
}

func (s *feeConfigService) UpdateItem(feeConfigID, itemID uint, req dto.CreateFeeConfigItemRequest) (*dto.FeeConfigItemResponse, error) {
	item, err := s.itemRepo.FindByID(itemID)
	if err != nil || item.FeeConfigID != feeConfigID {
		return nil, errors.New("Item tarif tidak ditemukan pada fee config ini")
	}

	existing, _ := s.itemRepo.FindByItemKey(feeConfigID, req.ItemKey, req.Level, req.Gender)
	if existing != nil && existing.ID != itemID {
		return nil, utility.NewConflictError("Kombinasi item tarif sudah ada untuk fee config ini")
	}

	item.Category = req.Category
	item.ItemKey = req.ItemKey
	item.Name = req.Name
	item.Level = req.Level
	item.Gender = req.Gender
	item.Amount = req.Amount
	item.Unit = req.Unit
	item.IsMandatory = req.IsMandatory
	item.IsKoperasi = req.IsKoperasi
	item.KoperasiProductID = req.KoperasiProductID

	if err := s.itemRepo.Update(item); err != nil {
		return nil, err
	}

	res := mapFeeConfigItemToResponse(*item)
	if res.KoperasiProductID != nil {
		names, _ := s.itemRepo.GetProductNames([]uint{*res.KoperasiProductID})
		if names != nil {
			res.KoperasiProductName = names[*res.KoperasiProductID]
		}
	}
	return res, nil
}

func (s *feeConfigService) DeleteItem(feeConfigID, itemID uint) error {
	item, err := s.itemRepo.FindByID(itemID)
	if err != nil || item.FeeConfigID != feeConfigID {
		return errors.New("Item tarif tidak ditemukan pada fee config ini")
	}

	used, err := s.itemRepo.IsUsedByInvoices(itemID)
	if err != nil {
		return err
	}
	if used {
		return utility.NewUnprocessableError("Tidak bisa menghapus item yang sudah digunakan pada tagihan")
	}

	return s.itemRepo.Delete(itemID)
}

func (s *feeConfigService) populateProductNames(responses []dto.FeeConfigItemResponse) {
	var ids []uint
	for _, item := range responses {
		if item.KoperasiProductID != nil {
			ids = append(ids, *item.KoperasiProductID)
		}
	}
	if len(ids) == 0 {
		return
	}
	names, err := s.itemRepo.GetProductNames(ids)
	if err != nil || names == nil {
		return
	}
	for i := range responses {
		if responses[i].KoperasiProductID != nil {
			responses[i].KoperasiProductName = names[*responses[i].KoperasiProductID]
		}
	}
}

func mapFeeConfigToResponse(fc model.FeeConfig) *dto.FeeConfigResponse {
	res := &dto.FeeConfigResponse{
		ID: fc.ID,
		AcademicYear: dto.AcademicYearBriefResponse{
			ID:   fc.AcademicYear.ID,
			Name: fc.AcademicYear.Name,
		},
		SavingsAdminRate: fc.SavingsAdminRate,
		CreatedAt:        fc.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	if len(fc.Items) > 0 {
		var items []dto.FeeConfigItemResponse
		for _, item := range fc.Items {
			items = append(items, *mapFeeConfigItemToResponse(item))
		}
		res.Items = items
	}

	return res
}

func mapFeeConfigItemToResponse(item model.FeeConfigItem) *dto.FeeConfigItemResponse {
	return &dto.FeeConfigItemResponse{
		ID:                item.ID,
		Category:          item.Category,
		ItemKey:           item.ItemKey,
		Name:              item.Name,
		Level:             item.Level,
		Gender:            item.Gender,
		Amount:            item.Amount,
		Unit:              item.Unit,
		IsMandatory:       item.IsMandatory,
		IsKoperasi:        item.IsKoperasi,
		KoperasiProductID: item.KoperasiProductID,
	}
}
