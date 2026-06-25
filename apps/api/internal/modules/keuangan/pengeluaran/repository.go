package pengeluaran

import (
	"time"

	"gorm.io/gorm"
)

// --- Expense Repository ---

type ExpenseRepository interface {
	FindAll(params ExpenseQueryParams) ([]Expense, int64, error)
	FindByID(id uint) (*Expense, error)
	Create(expense *Expense) error
	Update(expense *Expense) error
	Delete(id uint) error
	IsDateLocked(expenseDate time.Time) (bool, error)
	WithTx(tx *gorm.DB) ExpenseRepository
}

func NewExpenseRepository(db *gorm.DB) ExpenseRepository {
	return &expenseRepo{db: db}
}

type expenseRepo struct{ db *gorm.DB }

func (r *expenseRepo) WithTx(tx *gorm.DB) ExpenseRepository { return &expenseRepo{db: tx} }

func (r *expenseRepo) FindAll(params ExpenseQueryParams) ([]Expense, int64, error) {
	var expenses []Expense
	var total int64
	query := r.db.Model(&Expense{}).Preload("ExpenseCategory").Preload("ExpenseCategory.Parent").Preload("Creator")

	if params.AcademicYearID != 0 {
		query = query.Where("academic_year_id = ?", params.AcademicYearID)
	}
	if params.ExpenseCategoryID != 0 {
		query = query.Where("expense_category_id = ?", params.ExpenseCategoryID)
	}
	if params.StartDate != "" {
		if d, err := time.Parse("2006-01-02", params.StartDate); err == nil {
			query = query.Where("expense_date >= ?", d)
		}
	}
	if params.EndDate != "" {
		if d, err := time.Parse("2006-01-02", params.EndDate); err == nil {
			query = query.Where("expense_date <= ?", d)
		}
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	page := params.Page
	if page < 1 {
		page = 1
	}
	limit := params.Limit
	if limit < 1 {
		limit = 20
	}

	err := query.Order("expense_date DESC").Offset((page - 1) * limit).Limit(limit).Find(&expenses).Error
	return expenses, total, err
}

func (r *expenseRepo) FindByID(id uint) (*Expense, error) {
	var expense Expense
	err := r.db.Preload("ExpenseCategory").Preload("ExpenseCategory.Parent").
		Preload("Creator").Preload("AcademicYear").First(&expense, id).Error
	return &expense, err
}

func (r *expenseRepo) Create(expense *Expense) error { return r.db.Create(expense).Error }

func (r *expenseRepo) Update(expense *Expense) error { return r.db.Save(expense).Error }

func (r *expenseRepo) Delete(id uint) error { return r.db.Delete(&Expense{}, id).Error }

// IsDateLocked mengecek apakah tanggal sudah dikunci oleh tutup buku.
// Referensi ke model.DailyClosing (flat) selama masa transisi.
func (r *expenseRepo) IsDateLocked(expenseDate time.Time) (bool, error) {
	var count int64
	err := r.db.Table("daily_closings").Where("closing_date = ? AND is_confirmed = true", expenseDate).Count(&count).Error
	return count > 0, err
}

// --- Expense Category Repository ---

type CategoryRepository interface {
	FindAll() ([]ExpenseCategory, error)
	FindByID(id uint) (*ExpenseCategory, error)
	FindRootCategories() ([]ExpenseCategory, error)
	IsLeafNode(id uint) (bool, error)
	HasExpenses(id uint) (bool, error)
	HasChildren(id uint) (bool, error)
	Create(ec *ExpenseCategory) error
	Update(ec *ExpenseCategory) error
	Delete(id uint) error
}

func NewCategoryRepository(db *gorm.DB) CategoryRepository {
	return &categoryRepo{db: db}
}

type categoryRepo struct{ db *gorm.DB }

func (r *categoryRepo) FindAll() ([]ExpenseCategory, error) {
	var categories []ExpenseCategory
	err := r.db.Preload("Children").Where("parent_id IS NULL").Order("name ASC").Find(&categories).Error
	return categories, err
}

func (r *categoryRepo) FindByID(id uint) (*ExpenseCategory, error) {
	var cat ExpenseCategory
	err := r.db.Preload("Parent").First(&cat, id).Error
	return &cat, err
}

func (r *categoryRepo) FindRootCategories() ([]ExpenseCategory, error) {
	var categories []ExpenseCategory
	err := r.db.Where("parent_id IS NULL").Find(&categories).Error
	return categories, err
}

func (r *categoryRepo) IsLeafNode(id uint) (bool, error) {
	var count int64
	err := r.db.Model(&ExpenseCategory{}).Where("parent_id = ?", id).Count(&count).Error
	return count == 0, err
}

func (r *categoryRepo) HasExpenses(id uint) (bool, error) {
	var count int64
	err := r.db.Model(&Expense{}).Where("expense_category_id = ?", id).Count(&count).Error
	return count > 0, err
}

func (r *categoryRepo) HasChildren(id uint) (bool, error) {
	var count int64
	err := r.db.Model(&ExpenseCategory{}).Where("parent_id = ?", id).Count(&count).Error
	return count > 0, err
}

func (r *categoryRepo) Create(ec *ExpenseCategory) error { return r.db.Create(ec).Error }

func (r *categoryRepo) Update(ec *ExpenseCategory) error { return r.db.Save(ec).Error }

func (r *categoryRepo) Delete(id uint) error { return r.db.Delete(&ExpenseCategory{}, id).Error }
