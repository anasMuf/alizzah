package pengeluaran

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

// --- Expense Service ---

type ExpenseService interface {
	GetAll(params ExpenseQueryParams) ([]ExpenseResponse, *dto.Meta, error)
	GetByID(id uint) (*ExpenseResponse, error)
	Create(createdBy uint, req CreateExpenseRequest) (*ExpenseResponse, error)
	Update(id uint, req CreateExpenseRequest) (*ExpenseResponse, error)
	Delete(id uint) error
}

func NewExpenseService(db *gorm.DB, expenseRepo ExpenseRepository, categoryRepo CategoryRepository, ayRepo repository.AcademicYearRepository) ExpenseService {
	return &expenseSvc{
		db:           db,
		expenseRepo:  expenseRepo,
		categoryRepo: categoryRepo,
		ayRepo:       ayRepo,
		writer:       shared.NewWriter(),
	}
}

type expenseSvc struct {
	db           *gorm.DB
	expenseRepo  ExpenseRepository
	categoryRepo CategoryRepository
	ayRepo       repository.AcademicYearRepository
	writer       *shared.Writer
}

func (s *expenseSvc) GetAll(params ExpenseQueryParams) ([]ExpenseResponse, *dto.Meta, error) {
	expenses, total, err := s.expenseRepo.FindAll(params)
	if err != nil {
		return nil, nil, err
	}

	var responses []ExpenseResponse
	for _, exp := range expenses {
		responses = append(responses, mapExpenseToResponse(exp))
	}

	page, limit := utility.NormalizePagination(params.Page, params.Limit)
	meta := &dto.Meta{Page: page, Limit: limit, Total: total}
	return responses, meta, nil
}

func (s *expenseSvc) GetByID(id uint) (*ExpenseResponse, error) {
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

func (s *expenseSvc) Create(createdBy uint, req CreateExpenseRequest) (*ExpenseResponse, error) {
	isLeaf, err := s.categoryRepo.IsLeafNode(req.ExpenseCategoryID)
	if err != nil {
		return nil, errors.New("Kategori pengeluaran tidak ditemukan")
	}
	if !isLeaf {
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

	var expense Expense
	err = s.db.Transaction(func(tx *gorm.DB) error {
		expense = Expense{
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

		return s.writer.WriteCashDebit(tx, req.AcademicYearID, expenseDate, req.Amount, "expense", &expense.ID, fmt.Sprintf("Pengeluaran: %s", req.Description), createdBy)
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

func (s *expenseSvc) Update(id uint, req CreateExpenseRequest) (*ExpenseResponse, error) {
	expense, err := s.expenseRepo.FindByID(id)
	if err != nil {
		return nil, errors.New("Pengeluaran tidak ditemukan")
	}

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
		if err := s.writer.DeleteCashBySource(tx, "expense", expense.ID); err != nil {
			return fmt.Errorf("gagal menghapus transaksi kas lama: %w", err)
		}
		if err := s.expenseRepo.WithTx(tx).Update(expense); err != nil {
			return err
		}
		desc := req.Description
		if oldCategoryID != req.ExpenseCategoryID {
			desc = fmt.Sprintf("[Kategori diperbarui] %s", desc)
		}
		return s.writer.WriteCashDebit(tx, req.AcademicYearID, expenseDate, req.Amount, "expense", &expense.ID, fmt.Sprintf("Pengeluaran: %s", desc), expense.CreatedBy)
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

func (s *expenseSvc) Delete(id uint) error {
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
		if err := s.writer.DeleteCashBySource(tx, "expense", expense.ID); err != nil {
			return fmt.Errorf("gagal menghapus transaksi kas: %w", err)
		}
		return s.expenseRepo.WithTx(tx).Delete(id)
	})
}

// --- Expense Category Service ---

type CategoryService interface {
	GetAll() ([]CategoryResponse, error)
	Create(req CreateCategoryRequest) (*CategoryResponse, error)
	Update(id uint, req CreateCategoryRequest) (*CategoryResponse, error)
	Delete(id uint) error
}

func NewCategoryService(repo CategoryRepository) CategoryService {
	return &categorySvc{repo: repo}
}

type categorySvc struct{ repo CategoryRepository }

func (s *categorySvc) GetAll() ([]CategoryResponse, error) {
	cats, err := s.repo.FindAll()
	if err != nil {
		return nil, err
	}
	var responses []CategoryResponse
	for _, cat := range cats {
		responses = append(responses, mapCategoryToResponse(cat))
	}
	return responses, nil
}

func (s *categorySvc) Create(req CreateCategoryRequest) (*CategoryResponse, error) {
	if req.ParentID != nil {
		parent, err := s.repo.FindByID(*req.ParentID)
		if err != nil {
			return nil, errors.New("Kategori induk tidak ditemukan")
		}
		if parent.ParentID != nil {
			return nil, errors.New("Kategori hanya diizinkan 2 level")
		}
	}

	cat := &ExpenseCategory{
		Name:            req.Name,
		ParentID:        req.ParentID,
		InvoiceCategory: req.InvoiceCategory,
	}
	if err := s.repo.Create(cat); err != nil {
		return nil, err
	}

	resp := mapCategoryToResponse(*cat)
	return &resp, nil
}

func (s *categorySvc) Update(id uint, req CreateCategoryRequest) (*CategoryResponse, error) {
	cat, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.New("Kategori tidak ditemukan")
	}

	cat.Name = req.Name
	cat.InvoiceCategory = req.InvoiceCategory
	if err := s.repo.Update(cat); err != nil {
		return nil, err
	}

	resp := mapCategoryToResponse(*cat)
	return &resp, nil
}

func (s *categorySvc) Delete(id uint) error {
	_, err := s.repo.FindByID(id)
	if err != nil {
		return errors.New("Kategori tidak ditemukan")
	}

	hasChildren, _ := s.repo.HasChildren(id)
	if hasChildren {
		return errors.New("Tidak bisa menghapus kategori yang memiliki sub-kategori")
	}

	hasExpenses, _ := s.repo.HasExpenses(id)
	if hasExpenses {
		return errors.New("Tidak bisa menghapus kategori yang sudah digunakan oleh pengeluaran")
	}

	return s.repo.Delete(id)
}

// --- Mappers ---

func mapExpenseToResponse(exp Expense) ExpenseResponse {
	resp := ExpenseResponse{
		ID:          exp.ID,
		ExpenseDate: exp.ExpenseDate.Format("2006-01-02"),
		Amount:      exp.Amount,
		Description: exp.Description,
		CreatedBy:   dto.UserBriefResponse{ID: exp.Creator.ID, FullName: exp.Creator.FullName},
		CreatedAt:   exp.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
	resp.Category = CategoryBrief{
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

func mapCategoryToResponse(cat ExpenseCategory) CategoryResponse {
	resp := CategoryResponse{
		ID:              cat.ID,
		Name:            cat.Name,
		ParentID:        cat.ParentID,
		InvoiceCategory: cat.InvoiceCategory,
	}
	for _, child := range cat.Children {
		resp.Children = append(resp.Children, mapCategoryToResponse(child))
	}
	return resp
}


