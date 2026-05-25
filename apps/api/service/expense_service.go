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
		cat, _ := s.categoryRepo.FindByID(req.ExpenseCategoryID)
		if cat != nil && cat.ParentID == nil {
			return nil, errors.New("Tidak bisa menggunakan kategori root, pilih sub-kategori")
		}
	}

	expenseDate, _ := time.Parse("2006-01-02", req.ExpenseDate)

	locked, _ := s.expenseRepo.IsDateLocked(expenseDate)
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

	saved, _ := s.expenseRepo.FindByID(expense.ID)
	resp := mapExpenseToResponse(*saved)
	return &resp, nil
}

func (s *expenseService) Update(id uint, req dto.CreateExpenseRequest) (*dto.ExpenseResponse, error) {
	expense, err := s.expenseRepo.FindByID(id)
	if err != nil {
		return nil, errors.New("Pengeluaran tidak ditemukan")
	}

	// Check if date is locked
	locked, _ := s.expenseRepo.IsDateLocked(expense.ExpenseDate)
	if locked {
		return nil, errors.New("Tanggal sudah dikunci oleh tutup buku")
	}

	expenseDate, _ := time.Parse("2006-01-02", req.ExpenseDate)
	expense.AcademicYearID = req.AcademicYearID
	expense.ExpenseCategoryID = req.ExpenseCategoryID
	expense.ExpenseDate = expenseDate
	expense.Amount = req.Amount
	expense.Description = req.Description
	expense.ReceiptURL = req.ReceiptURL

	if err := s.expenseRepo.Update(expense); err != nil {
		return nil, err
	}

	saved, _ := s.expenseRepo.FindByID(id)
	resp := mapExpenseToResponse(*saved)
	return &resp, nil
}

func (s *expenseService) Delete(id uint) error {
	expense, err := s.expenseRepo.FindByID(id)
	if err != nil {
		return errors.New("Pengeluaran tidak ditemukan")
	}

	locked, _ := s.expenseRepo.IsDateLocked(expense.ExpenseDate)
	if locked {
		return errors.New("Tanggal sudah dikunci oleh tutup buku")
	}

	return s.expenseRepo.Delete(id)
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
