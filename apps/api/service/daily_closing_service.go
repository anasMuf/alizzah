package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"api/utility"
	"fmt"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
)

type DailyClosingService interface {
	GetAll(params dto.DailyClosingQueryParams) ([]dto.DailyClosingListResponse, *dto.Meta, error)
	GetByID(id uint) (*dto.DailyClosingListResponse, error)
	Create(closedBy uint, req dto.CreateDailyClosingRequest) (*dto.DailyClosingListResponse, error)
	Confirm(id uint, closedBy uint, req dto.ConfirmDailyClosingRequest) error
}

type dailyClosingService struct {
	repo     repository.DailyClosingRepository
	cashRepo repository.CashTransactionRepository
}

func NewDailyClosingService(repo repository.DailyClosingRepository, cashRepo repository.CashTransactionRepository) DailyClosingService {
	return &dailyClosingService{
		repo:     repo,
		cashRepo: cashRepo,
	}
}

func (s *dailyClosingService) GetAll(params dto.DailyClosingQueryParams) ([]dto.DailyClosingListResponse, *dto.Meta, error) {
	closings, total, err := s.repo.FindAll(params)
	if err != nil {
		return nil, nil, err
	}

	responses := make([]dto.DailyClosingListResponse, len(closings))
	for i, dc := range closings {
		responses[i] = s.mapToResponse(&dc)
	}

	meta := &dto.Meta{
		Page:  params.Page,
		Limit: params.Limit,
		Total: total,
	}

	return responses, meta, nil
}

func (s *dailyClosingService) GetByID(id uint) (*dto.DailyClosingListResponse, error) {
	dc, err := s.repo.FindByID(id)
	if err != nil {
		return nil, echo.NewHTTPError(404, "Tutup buku tidak ditemukan")
	}
	resp := s.mapToResponse(dc)
	return &resp, nil
}

func (s *dailyClosingService) Create(closedBy uint, req dto.CreateDailyClosingRequest) (*dto.DailyClosingListResponse, error) {
	closingDate, err := utility.ParseDate(req.ClosingDate)
	if err != nil {
		return nil, echo.NewHTTPError(400, "Format closing_date tidak valid (YYYY-MM-DD)")
	}

	if closingDate.After(time.Now()) {
		return nil, echo.NewHTTPError(400, "Tanggal tutup buku tidak boleh di masa depan")
	}

	systemCash, err := s.cashRepo.GetBalanceUpToDate(req.AcademicYearID, closingDate)
	if err != nil {
		return nil, fmt.Errorf("gagal menghitung saldo kas sistem: %w", err)
	}

	difference := req.PhysicalCashAmount - systemCash

	if difference != 0 && req.Notes == "" {
		return nil, echo.NewHTTPError(400, "Keterangan wajib diisi jika ada selisih kas")
	}

	dc := &model.DailyClosing{
		AcademicYearID:     req.AcademicYearID,
		ClosingDate:        closingDate,
		PhysicalCashAmount: req.PhysicalCashAmount,
		SystemCashAmount:   systemCash,
		Difference:         difference,
		Notes:              req.Notes,
		IsConfirmed:        false,
		ClosedBy:           closedBy,
	}

	if err := s.repo.Create(dc); err != nil {
		// Unique constraint violation → concurrent create
		if strings.Contains(err.Error(), "duplicate key") || strings.Contains(err.Error(), "uq_daily_closing_date") {
			return nil, echo.NewHTTPError(409, "Tutup buku untuk tanggal ini sudah ada")
		}
		return nil, err
	}

	// Fetch again to get relations
	createdDc, err := s.repo.FindByID(dc.ID)
	if err != nil {
		return nil, fmt.Errorf("gagal mengambil data tutup buku: %w", err)
	}

	resp := s.mapToResponse(createdDc)
	return &resp, nil
}

func (s *dailyClosingService) Confirm(id uint, closedBy uint, req dto.ConfirmDailyClosingRequest) error {
	dc, err := s.repo.FindByID(id)
	if err != nil {
		return echo.NewHTTPError(404, "Tutup buku tidak ditemukan")
	}
	if dc.IsConfirmed {
		return echo.NewHTTPError(409, "Tutup buku sudah dikonfirmasi sebelumnya")
	}
	if dc.Difference != 0 && req.Notes == "" {
		return echo.NewHTTPError(400, "Keterangan wajib diisi jika ada selisih kas")
	}
	return s.repo.Confirm(id, req.Notes)
}

func (s *dailyClosingService) mapToResponse(dc *model.DailyClosing) dto.DailyClosingListResponse {
	var notes *string
	if dc.Notes != "" {
		notes = &dc.Notes
	}
	return dto.DailyClosingListResponse{
		ID:                 dc.ID,
		ClosingDate:        dc.ClosingDate.Format("2006-01-02"),
		PhysicalCashAmount: dc.PhysicalCashAmount,
		SystemCashAmount:   dc.SystemCashAmount,
		Difference:         dc.Difference,
		Notes:              notes,
		IsConfirmed:        dc.IsConfirmed,
		ClosedBy: dto.UserBriefResponse{
			ID:       dc.Closer.ID,
			FullName: dc.Closer.FullName,
		},
	}
}
