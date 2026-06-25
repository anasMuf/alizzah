package penerimaan

import (
	"api/dto"
	"api/internal/shared"
	"api/repository"
	"api/utility"
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"
)

// --- Service ---

type Service interface {
	GetAll(params QueryParams) ([]Response, *dto.Meta, error)
	GetByID(id uint) (*Response, error)
	Create(createdBy uint, req CreateRequest) (*Response, error)
	Update(id uint, req CreateRequest) (*Response, error)
	Delete(id uint) error
}

func NewService(db *gorm.DB, repo Repository, ayRepo repository.AcademicYearRepository) Service {
	return &svc{db: db, repo: repo, ayRepo: ayRepo, writer: shared.NewWriter()}
}

type svc struct {
	db     *gorm.DB
	repo   Repository
	ayRepo repository.AcademicYearRepository
	writer *shared.Writer
}

var categoryLabels = map[string]string{
	"bos":     "Dana BOS",
	"donasi":  "Donasi",
	"hibah":   "Hibah",
	"lainnya": "Penerimaan Lainnya",
}

func (s *svc) GetAll(params QueryParams) ([]Response, *dto.Meta, error) {
	txns, total, err := s.repo.FindAll(params)
	if err != nil {
		return nil, nil, err
	}
	responses := make([]Response, 0, len(txns))
	for _, t := range txns {
		responses = append(responses, mapToResponse(t))
	}
	page, limit := utility.NormalizePagination(params.Page, params.Limit)
	return responses, &dto.Meta{Page: page, Limit: limit, Total: total}, nil
}

func (s *svc) GetByID(id uint) (*Response, error) {
	it, err := s.repo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("Transaksi penerimaan tidak ditemukan")
		}
		return nil, err
	}
	r := mapToResponse(*it)
	return &r, nil
}

func (s *svc) Create(createdBy uint, req CreateRequest) (*Response, error) {
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

	var income IncomeTransaction
	err = s.db.Transaction(func(tx *gorm.DB) error {
		income = IncomeTransaction{
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
		return s.writer.WriteCashCredit(tx, req.AcademicYearID, txnDate, req.Amount, "income", &income.ID, fmt.Sprintf("%s: %s", label, req.SourceName), createdBy)
	})
	if err != nil {
		return nil, err
	}

	saved, err := s.repo.FindByID(income.ID)
	if err != nil {
		return nil, fmt.Errorf("Gagal mengambil data transaksi: %w", err)
	}
	r := mapToResponse(*saved)
	return &r, nil
}

func (s *svc) Update(id uint, req CreateRequest) (*Response, error) {
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

	err = s.db.Transaction(func(tx *gorm.DB) error {
		if err := s.writer.DeleteCashBySource(tx, "income", it.ID); err != nil {
			return fmt.Errorf("gagal menghapus transaksi kas lama: %w", err)
		}
		if err := s.repo.WithTx(tx).Update(it); err != nil {
			return err
		}
		label := categoryLabels[req.Category]
		return s.writer.WriteCashCredit(tx, req.AcademicYearID, txnDate, req.Amount, "income", &it.ID, fmt.Sprintf("%s: %s", label, req.SourceName), it.CreatedBy)
	})
	if err != nil {
		return nil, err
	}

	saved, err := s.repo.FindByID(id)
	if err != nil {
		return nil, fmt.Errorf("Gagal mengambil data transaksi: %w", err)
	}
	r := mapToResponse(*saved)
	return &r, nil
}

func (s *svc) Delete(id uint) error {
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
		if err := s.writer.DeleteCashBySource(tx, "income", it.ID); err != nil {
			return fmt.Errorf("gagal menghapus transaksi kas: %w", err)
		}
		return s.repo.WithTx(tx).Delete(id)
	})
}

// --- Mapper ---

func mapToResponse(it IncomeTransaction) Response {
	r := Response{
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
		r.ReferenceNumber = &it.ReferenceNumber
	}
	if it.Notes != "" {
		r.Notes = &it.Notes
	}
	return r
}


