package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"
)

type IncomeTransactionService interface {
	GetAll(params dto.IncomeTransactionQueryParams) ([]dto.IncomeTransactionResponse, *dto.Meta, error)
	GetByID(id uint) (*dto.IncomeTransactionResponse, error)
	Create(createdBy uint, req dto.CreateIncomeTransactionRequest) (*dto.IncomeTransactionResponse, error)
	Update(id uint, req dto.CreateIncomeTransactionRequest) (*dto.IncomeTransactionResponse, error)
	Delete(id uint) error
}

type incomeTransactionService struct {
	db        *gorm.DB
	repo      repository.IncomeTransactionRepository
	ayRepo    repository.AcademicYearRepository
	txnWriter TransactionWriterService
}

func NewIncomeTransactionService(
	db *gorm.DB,
	repo repository.IncomeTransactionRepository,
	ayRepo repository.AcademicYearRepository,
	txnWriter TransactionWriterService,
) IncomeTransactionService {
	return &incomeTransactionService{
		db:        db,
		repo:      repo,
		ayRepo:    ayRepo,
		txnWriter: txnWriter,
	}
}

func (s *incomeTransactionService) GetAll(params dto.IncomeTransactionQueryParams) ([]dto.IncomeTransactionResponse, *dto.Meta, error) {
	txns, total, err := s.repo.FindAll(params)
	if err != nil {
		return nil, nil, err
	}

	var responses []dto.IncomeTransactionResponse
	for _, t := range txns {
		responses = append(responses, mapIncomeTransactionToResponse(t))
	}

	page := params.Page
	if page < 1 {
		page = 1
	}
	limit := params.Limit
	if limit < 1 {
		limit = 20
	}

	meta := &dto.Meta{Page: page, Limit: limit, Total: total}
	return responses, meta, nil
}

func (s *incomeTransactionService) GetByID(id uint) (*dto.IncomeTransactionResponse, error) {
	it, err := s.repo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("Transaksi penerimaan tidak ditemukan")
		}
		return nil, err
	}
	resp := mapIncomeTransactionToResponse(*it)
	return &resp, nil
}

func (s *incomeTransactionService) Create(createdBy uint, req dto.CreateIncomeTransactionRequest) (*dto.IncomeTransactionResponse, error) {
	txnDate, err := time.Parse("2006-01-02", req.TransactionDate)
	if err != nil {
		return nil, fmt.Errorf("Format transaction_date tidak valid (YYYY-MM-DD): %w", err)
	}

	locked, err := s.repo.IsDateLocked(txnDate)
	if err != nil {
		return nil, fmt.Errorf("Gagal memeriksa status kunci tanggal: %w", err)
	}
	if locked {
		return nil, errors.New("Tanggal sudah dikunci oleh tutup buku")
	}

	categoryLabels := map[string]string{
		"bos":     "Dana BOS",
		"donasi":  "Donasi",
		"hibah":   "Hibah",
		"lainnya": "Penerimaan Lainnya",
	}

	var income model.IncomeTransaction
	err = s.db.Transaction(func(tx *gorm.DB) error {
		income = model.IncomeTransaction{
			AcademicYearID:  req.AcademicYearID,
			Category:        req.Category,
			SourceName:      req.SourceName,
			Amount:          req.Amount,
			TransactionDate: txnDate,
			ReferenceNumber: req.ReferenceNumber,
			Notes:           req.Notes,
			CreatedBy:       createdBy,
		}
		if err := s.repo.CreateWithTx(&income, tx); err != nil {
			return err
		}

		label := categoryLabels[req.Category]
		desc := fmt.Sprintf("%s: %s", label, req.SourceName)
		return s.txnWriter.WriteCashCredit(
			req.AcademicYearID, txnDate, req.Amount,
			"income", &income.ID, desc, createdBy, tx,
		)
	})
	if err != nil {
		return nil, err
	}

	saved, err := s.repo.FindByID(income.ID)
	if err != nil {
		return nil, fmt.Errorf("Gagal mengambil data transaksi: %w", err)
	}
	resp := mapIncomeTransactionToResponse(*saved)
	return &resp, nil
}

func (s *incomeTransactionService) Update(id uint, req dto.CreateIncomeTransactionRequest) (*dto.IncomeTransactionResponse, error) {
	it, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.New("Transaksi penerimaan tidak ditemukan")
	}

	locked, err := s.repo.IsDateLocked(it.TransactionDate)
	if err != nil {
		return nil, fmt.Errorf("Gagal memeriksa status kunci tanggal: %w", err)
	}
	if locked {
		return nil, errors.New("Tanggal sudah dikunci oleh tutup buku")
	}

	txnDate, err := time.Parse("2006-01-02", req.TransactionDate)
	if err != nil {
		return nil, fmt.Errorf("Format transaction_date tidak valid (YYYY-MM-DD): %w", err)
	}

	it.AcademicYearID = req.AcademicYearID
	it.Category = req.Category
	it.SourceName = req.SourceName
	it.Amount = req.Amount
	it.TransactionDate = txnDate
	it.ReferenceNumber = req.ReferenceNumber
	it.Notes = req.Notes

	categoryLabels := map[string]string{
		"bos":     "Dana BOS",
		"donasi":  "Donasi",
		"hibah":   "Hibah",
		"lainnya": "Penerimaan Lainnya",
	}

	err = s.db.Transaction(func(tx *gorm.DB) error {
		// 1. Hapus CashTransaction lama
		if err := s.txnWriter.DeleteCashBySource(tx, "income", it.ID); err != nil {
			return fmt.Errorf("gagal menghapus transaksi kas lama: %w", err)
		}

		// 2. Update income transaction
		if err := s.repo.WithTx(tx).Update(it); err != nil {
			return err
		}

		// 3. Tulis CashTransaction baru
		label := categoryLabels[req.Category]
		desc := fmt.Sprintf("%s: %s", label, req.SourceName)
		return s.txnWriter.WriteCashCredit(
			req.AcademicYearID, txnDate, req.Amount,
			"income", &it.ID, desc, it.CreatedBy, tx,
		)
	})
	if err != nil {
		return nil, err
	}

	saved, err := s.repo.FindByID(id)
	if err != nil {
		return nil, fmt.Errorf("Gagal mengambil data transaksi: %w", err)
	}
	resp := mapIncomeTransactionToResponse(*saved)
	return &resp, nil
}

func (s *incomeTransactionService) Delete(id uint) error {
	it, err := s.repo.FindByID(id)
	if err != nil {
		return errors.New("Transaksi penerimaan tidak ditemukan")
	}

	locked, err := s.repo.IsDateLocked(it.TransactionDate)
	if err != nil {
		return fmt.Errorf("Gagal memeriksa status kunci tanggal: %w", err)
	}
	if locked {
		return errors.New("Tanggal sudah dikunci oleh tutup buku")
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		// 1. Hapus CashTransaction terkait
		if err := s.txnWriter.DeleteCashBySource(tx, "income", it.ID); err != nil {
			return fmt.Errorf("gagal menghapus transaksi kas: %w", err)
		}
		// 2. Hapus IncomeTransaction
		return s.repo.WithTx(tx).Delete(id)
	})
}

func mapIncomeTransactionToResponse(it model.IncomeTransaction) dto.IncomeTransactionResponse {
	resp := dto.IncomeTransactionResponse{
		ID: it.ID,
		AcademicYear: dto.AcademicYearBriefResponse{
			ID:   it.AcademicYear.ID,
			Name: it.AcademicYear.Name,
		},
		Category:        it.Category,
		SourceName:      it.SourceName,
		Amount:          it.Amount,
		TransactionDate: it.TransactionDate.Format("2006-01-02"),
		CreatedBy: dto.UserBriefResponse{
			ID:       it.Creator.ID,
			FullName: it.Creator.FullName,
		},
		CreatedAt: it.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
	if it.ReferenceNumber != "" {
		resp.ReferenceNumber = &it.ReferenceNumber
	}
	if it.Notes != "" {
		resp.Notes = &it.Notes
	}
	return resp
}
