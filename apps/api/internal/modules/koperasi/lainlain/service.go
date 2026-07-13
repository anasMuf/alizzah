package lainlain

import (
	"errors"
	"fmt"
	"time"

	"api/internal/modules/koperasi/kas"
	"api/model"
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

		// Bridge: catat di tabel sekolah (expenses + cash_transactions)
		if req.Flow == "expense" {
			if err := s.recordSchoolExpense(tx, req.AcademicYearID, date, req.Amount, desc, createdBy); err != nil {
				return err
			}
		} else if req.Flow == "income" {
			if err := s.recordSchoolIncome(tx, req.AcademicYearID, date, req.Amount, desc, createdBy); err != nil {
				return err
			}
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

// recordSchoolExpense mencatat pengeluaran di tabel sekolah (expenses + cash_transactions)
// sebagai jembatan agar transaksi koperasi muncul di laporan keuangan sekolah.
func (s *svc) recordSchoolExpense(tx *gorm.DB, academicYearID uint, date time.Time, amount float64, description string, createdBy uint) error {
	var kopCategory model.ExpenseCategory
	if err := tx.Where("name = ? AND parent_id IS NOT NULL", "Koperasi").First(&kopCategory).Error; err != nil {
		return fmt.Errorf("Sub-kategori 'Koperasi' tidak ditemukan: %w", err)
	}

	expense := model.Expense{
		AcademicYearID:    academicYearID,
		ExpenseCategoryID: kopCategory.ID,
		ExpenseDate:       date,
		Amount:            amount,
		Description:       description,
		CreatedBy:         createdBy,
	}
	if err := tx.Create(&expense).Error; err != nil {
		return fmt.Errorf("Gagal mencatat pengeluaran koperasi: %w", err)
	}

	cashTxn := model.CashTransaction{
		AcademicYearID:  academicYearID,
		TransactionDate: date,
		TransactionType: "credit",
		Amount:          amount,
		SourceType:      "expense",
		SourceID:        &expense.ID,
		Description:     description,
		CreatedBy:       createdBy,
	}
	if err := tx.Create(&cashTxn).Error; err != nil {
		return fmt.Errorf("Gagal mencatat transaksi kas koperasi: %w", err)
	}

	return nil
}

// recordSchoolIncome mencatat pemasukan di tabel sekolah (cash_transactions credit)
// sebagai jembatan agar pemasukan koperasi muncul di laporan keuangan sekolah.
func (s *svc) recordSchoolIncome(tx *gorm.DB, academicYearID uint, date time.Time, amount float64, description string, createdBy uint) error {
	cashTxn := model.CashTransaction{
		AcademicYearID:  academicYearID,
		TransactionDate: date,
		TransactionType: "debit",
		Amount:          amount,
		SourceType:      "koperasi_income",
		Description:     description,
		CreatedBy:       createdBy,
	}
	if err := tx.Create(&cashTxn).Error; err != nil {
		return fmt.Errorf("Gagal mencatat pemasukan kas koperasi: %w", err)
	}

	return nil
}
