package tutupbuku

import (
	"api/dto"
	"api/repository"
	"api/utility"
	"fmt"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type Service interface {
	GetAll(params QueryParams) ([]Response, *dto.Meta, error)
	GetByID(id uint) (*Response, error)
	Create(closedBy uint, req CreateRequest) (*Response, error)
	Confirm(id uint, req ConfirmRequest) error
}

func NewService(db *gorm.DB, repo Repository) Service {
	return &svc{db: db, repo: repo}
}

type svc struct {
	db   *gorm.DB
	repo Repository
}

func (s *svc) GetAll(params QueryParams) ([]Response, *dto.Meta, error) {
	dcs, total, err := s.repo.FindAll(params)
	if err != nil {
		return nil, nil, err
	}
	resps := make([]Response, len(dcs))
	for i, dc := range dcs {
		resps[i] = mapToResponse(&dc)
	}
	return resps, &dto.Meta{Page: params.Page, Limit: params.Limit, Total: total}, nil
}

func (s *svc) GetByID(id uint) (*Response, error) {
	dc, err := s.repo.FindByID(id)
	if err != nil {
		return nil, echo.NewHTTPError(404, "Tutup buku tidak ditemukan")
	}
	r := mapToResponse(dc)
	return &r, nil
}

func (s *svc) Create(closedBy uint, req CreateRequest) (*Response, error) {
	closingDate, err := utility.ParseDate(req.ClosingDate)
	if err != nil {
		return nil, echo.NewHTTPError(400, "Format closing_date tidak valid (YYYY-MM-DD)")
	}
	if closingDate.After(time.Now()) {
		return nil, echo.NewHTTPError(400, "Tanggal tutup buku tidak boleh di masa depan")
	}

	// Cross-reference: CashTransactionRepository masih flat.
	cashRepo := repository.NewCashTransactionRepository(s.db)
	systemCash, err := cashRepo.GetBalanceUpToDate(req.AcademicYearID, closingDate)
	if err != nil {
		return nil, fmt.Errorf("gagal menghitung saldo kas sistem: %w", err)
	}
	difference := req.PhysicalCashAmount - systemCash
	if difference != 0 && req.Notes == "" {
		return nil, echo.NewHTTPError(400, "Keterangan wajib diisi jika ada selisih kas")
	}

	dc := &DailyClosing{
		AcademicYearID:     req.AcademicYearID,
		ClosingDate:        closingDate,
		PhysicalCashAmount: req.PhysicalCashAmount,
		SystemCashAmount:   systemCash,
		Difference:         difference,
		Notes:              req.Notes,
		ClosedBy:           closedBy,
	}
	if err := s.repo.Create(dc); err != nil {
		if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "uq_daily_closing_date") {
			return nil, echo.NewHTTPError(409, "Tutup buku untuk tanggal ini sudah ada")
		}
		return nil, err
	}
	created, err := s.repo.FindByID(dc.ID)
	if err != nil {
		return nil, fmt.Errorf("gagal mengambil data tutup buku: %w", err)
	}
	r := mapToResponse(created)
	return &r, nil
}

func (s *svc) Confirm(id uint, req ConfirmRequest) error {
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

func mapToResponse(dc *DailyClosing) Response {
	var notes *string
	if dc.Notes != "" { notes = &dc.Notes }
	return Response{
		ID: dc.ID, ClosingDate: dc.ClosingDate.Format("2006-01-02"),
		PhysicalCashAmount: dc.PhysicalCashAmount, SystemCashAmount: dc.SystemCashAmount,
		Difference: dc.Difference, Notes: notes, IsConfirmed: dc.IsConfirmed,
		ClosedBy: dto.UserBriefResponse{ID: dc.Closer.ID, FullName: dc.Closer.FullName},
	}
}
