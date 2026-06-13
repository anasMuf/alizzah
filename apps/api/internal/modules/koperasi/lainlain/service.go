package lainlain

import (
	"errors"
	"time"

	"api/internal/modules/koperasi/kas"
	"api/repository"

	"gorm.io/gorm"
)

type Service interface {
	Create(req CreateRequest, createdBy uint) (*Response, error)
	List(p QueryParams) ([]Response, int64, error)
	Get(id uint) (*Response, error)
}

type svc struct {
	db         *gorm.DB
	repo       Repository
	cashWriter kas.Writer
	ayRepo     repository.AcademicYearRepository
}

func NewService(db *gorm.DB, r Repository, cashWriter kas.Writer, ayRepo repository.AcademicYearRepository) Service {
	return &svc{db: db, repo: r, cashWriter: cashWriter, ayRepo: ayRepo}
}

func (s *svc) Create(req CreateRequest, createdBy uint) (*Response, error) {
	if _, err := s.ayRepo.FindByID(req.AcademicYearID); err != nil {
		return nil, errors.New("Tahun ajaran tidak ditemukan")
	}
	date, err := time.Parse("2006-01-02", req.TransactionDate)
	if err != nil {
		return nil, errors.New("Format transaction_date tidak valid (YYYY-MM-DD)")
	}
	desc := req.Description
	if desc == "" {
		desc = "Lain-lain: " + req.Category
	}

	var rec MiscTransaction
	err = s.db.Transaction(func(tx *gorm.DB) error {
		rec = MiscTransaction{
			AcademicYearID:  req.AcademicYearID,
			Flow:            req.Flow,
			Category:        req.Category,
			Amount:          req.Amount,
			TransactionDate: date,
			Description:     req.Description,
			CreatedBy:       createdBy,
		}
		if err := s.repo.CreateWithTx(&rec, tx); err != nil {
			return err
		}
		var cashID uint
		var werr error
		if req.Flow == "income" {
			cashID, werr = s.cashWriter.WriteCredit(req.AcademicYearID, date, req.Amount, "misc_income", &rec.ID, req.Category, desc, createdBy, tx)
		} else {
			cashID, werr = s.cashWriter.WriteDebit(req.AcademicYearID, date, req.Amount, "misc_expense", &rec.ID, req.Category, desc, createdBy, tx)
		}
		if werr != nil {
			return werr
		}
		return tx.Model(&rec).Update("cash_txn_id", cashID).Error
	})
	if err != nil {
		return nil, err
	}
	return s.Get(rec.ID)
}

func (s *svc) List(p QueryParams) ([]Response, int64, error) {
	items, total, err := s.repo.FindAll(p)
	if err != nil {
		return nil, 0, err
	}
	out := make([]Response, 0, len(items))
	for _, m := range items {
		out = append(out, toResponse(m))
	}
	return out, total, nil
}

func (s *svc) Get(id uint) (*Response, error) {
	m, err := s.repo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("Transaksi lain-lain tidak ditemukan")
		}
		return nil, err
	}
	resp := toResponse(*m)
	return &resp, nil
}
