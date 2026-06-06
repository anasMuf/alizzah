package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"api/utility"
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"
)

type ExpenseService interface {
	GetAll(params dto.ExpenseQueryParams) ([]dto.ExpenseResponse, *dto.Meta, error)
	GetByID(id uint) (*dto.ExpenseResponse, error)
	Create(createdBy uint, req dto.CreateExpenseRequest) (*dto.ExpenseResponse, error)
	Update(id uint, req dto.CreateExpenseRequest) (*dto.ExpenseResponse, error)
	Delete(id uint) error
}

type expenseService struct {
	db             *gorm.DB
	expenseRepo    repository.ExpenseRepository
	categoryRepo   repository.ExpenseCategoryRepository
	ayRepo         repository.AcademicYearRepository
	txnWriter      TransactionWriterService
}

func NewExpenseService(
	db *gorm.DB,
	expenseRepo repository.ExpenseRepository,
	categoryRepo repository.ExpenseCategoryRepository,
	ayRepo repository.AcademicYearRepository,
	txnWriter TransactionWriterService,
) ExpenseService {
	return &expenseService{
		db:           db,
		expenseRepo:  expenseRepo,
		categoryRepo: categoryRepo,
		ayRepo:       ayRepo,
		txnWriter:    txnWriter,
	}
}

func (s *expenseService) GetAll(params dto.ExpenseQueryParams) ([]dto.ExpenseResponse, *dto.Meta, error) {
	expenses, total, err := s.expenseRepo.FindAll(params)
	if err != nil {
		return nil, nil, err
	}

	var responses []dto.ExpenseResponse
	for _, exp := range expenses {
		responses = append(responses, mapExpenseToResponse(exp))
	}

	page, limit := utility.NormalizePagination(params.Page, params.Limit)

	meta := &dto.Meta{Page: page, Limit: limit, Total: total}
	return responses, meta, nil
}

func (s *expenseService) GetByID(id uint) (*dto.ExpenseResponse, error) {
	expense, err := s.expenseRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("Pengeluaran tidak ditemukan")
		}
		return nil, err
	}
	resp := mapExpenseToResponse(*expense)
	return &resp, nil
}

func (s *expenseService) Create(createdBy uint, req dto.CreateExpenseRequest) (*dto.ExpenseResponse, error) {
	// Validate category is leaf node
	isLeaf, err := s.categoryRepo.IsLeafNode(req.ExpenseCategoryID)
	if err != nil {
		return nil, errors.New("Kategori pengeluaran tidak ditemukan")
	}
	// If it's not a leaf node, it's a root category
	if !isLeaf {
		// Check if it's actually a root (has no parent)
		cat, err := s.categoryRepo.FindByID(req.ExpenseCategoryID)
		if err == nil && cat.ParentID == nil {
			return nil, errors.New("Tidak bisa menggunakan kategori root, pilih sub-kategori")
		}
	}

	expenseDate, err := time.Parse("2006-01-02", req.ExpenseDate)
	if err != nil {
		return nil, fmt.Errorf("Format expense_date tidak valid (YYYY-MM-DD): %w", err)
	}

	locked, err := s.expenseRepo.IsDateLocked(expenseDate)
	if err != nil {
		return nil, fmt.Errorf("Gagal memeriksa status kunci tanggal: %w", err)
	}
	if locked {
		return nil, errors.New("Tanggal sudah dikunci oleh tutup buku")
	}

	var expense model.Expense
	err = s.db.Transaction(func(tx *gorm.DB) error {
		expense = model.Expense{
			AcademicYearID:    req.AcademicYearID,
			ExpenseCategoryID: req.ExpenseCategoryID,
			ExpenseDate:       expenseDate,
			Amount:            req.Amount,
			Description:       req.Description,
			ReceiptURL:        req.ReceiptURL,
			CreatedBy:         createdBy,
		}
		if err := s.expenseRepo.WithTx(tx).Create(&expense); err != nil {
			return err
		}

		return s.txnWriter.WriteCashDebit(req.AcademicYearID, expenseDate, req.Amount, "expense", &expense.ID, fmt.Sprintf("Pengeluaran: %s", req.Description), createdBy, tx)
	})

	if err != nil {
		return nil, err
	}

	saved, err := s.expenseRepo.FindByID(expense.ID)
	if err != nil {
		return nil, fmt.Errorf("Gagal mengambil data pengeluaran: %w", err)
	}
	resp := mapExpenseToResponse(*saved)
	return &resp, nil
}

func (s *expenseService) Update(id uint, req dto.CreateExpenseRequest) (*dto.ExpenseResponse, error) {
	expense, err := s.expenseRepo.FindByID(id)
	if err != nil {
		return nil, errors.New("Pengeluaran tidak ditemukan")
	}

	// Check if date is locked
	locked, err := s.expenseRepo.IsDateLocked(expense.ExpenseDate)
	if err != nil {
		return nil, fmt.Errorf("Gagal memeriksa status kunci tanggal: %w", err)
	}
	if locked {
		return nil, errors.New("Tanggal sudah dikunci oleh tutup buku")
	}

	expenseDate, err := time.Parse("2006-01-02", req.ExpenseDate)
	if err != nil {
		return nil, fmt.Errorf("Format expense_date tidak valid (YYYY-MM-DD): %w", err)
	}

	oldCategoryID := expense.ExpenseCategoryID
	expense.AcademicYearID = req.AcademicYearID
	expense.ExpenseCategoryID = req.ExpenseCategoryID
	expense.ExpenseDate = expenseDate
	expense.Amount = req.Amount
	expense.Description = req.Description
	expense.ReceiptURL = req.ReceiptURL

	err = s.db.Transaction(func(tx *gorm.DB) error {
		// 1. Hapus CashTransaction lama
		if err := s.txnWriter.DeleteCashBySource(tx, "expense", expense.ID); err != nil {
			return fmt.Errorf("gagal menghapus transaksi kas lama: %w", err)
		}

		// 2. Update expense
		if err := s.expenseRepo.WithTx(tx).Update(expense); err != nil {
			return err
		}

		// 3. Tulis CashTransaction baru dengan nominal yang sudah diupdate
		desc := req.Description
		if oldCategoryID != req.ExpenseCategoryID {
			desc = fmt.Sprintf("[Kategori diperbarui] %s", desc)
		}
		return s.txnWriter.WriteCashDebit(req.AcademicYearID, expenseDate, req.Amount,
			"expense", &expense.ID, fmt.Sprintf("Pengeluaran: %s", desc), expense.CreatedBy, tx)
	})
	if err != nil {
		return nil, err
	}

	saved, err := s.expenseRepo.FindByID(id)
	if err != nil {
		return nil, fmt.Errorf("Gagal mengambil data pengeluaran: %w", err)
	}
	resp := mapExpenseToResponse(*saved)
	return &resp, nil
}

func (s *expenseService) Delete(id uint) error {
	expense, err := s.expenseRepo.FindByID(id)
	if err != nil {
		return errors.New("Pengeluaran tidak ditemukan")
	}

	locked, err := s.expenseRepo.IsDateLocked(expense.ExpenseDate)
	if err != nil {
		return fmt.Errorf("Gagal memeriksa status kunci tanggal: %w", err)
	}
	if locked {
		return errors.New("Tanggal sudah dikunci oleh tutup buku")
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		// 1. Hapus CashTransaction terkait
		if err := s.txnWriter.DeleteCashBySource(tx, "expense", expense.ID); err != nil {
			return fmt.Errorf("gagal menghapus transaksi kas: %w", err)
		}
		// 2. Hapus Expense
		return s.expenseRepo.WithTx(tx).Delete(id)
	})
}

func mapExpenseToResponse(exp model.Expense) dto.ExpenseResponse {
	resp := dto.ExpenseResponse{
		ID:          exp.ID,
		ExpenseDate: exp.ExpenseDate.Format("2006-01-02"),
		Amount:      exp.Amount,
		Description: exp.Description,
		CreatedBy:   dto.UserBriefResponse{ID: exp.Creator.ID, FullName: exp.Creator.FullName},
		CreatedAt:   exp.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
	resp.Category = dto.ExpenseCategoryBrief{
		ID:   exp.ExpenseCategory.ID,
		Name: exp.ExpenseCategory.Name,
	}
	if exp.ExpenseCategory.Parent != nil {
		resp.Category.ParentName = exp.ExpenseCategory.Parent.Name
	}
	if exp.ReceiptURL != "" {
		resp.ReceiptURL = &exp.ReceiptURL
	}
	return resp
}
