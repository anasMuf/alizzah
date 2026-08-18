package repository

import (
	"api/dto"
	"api/model"
	"strings"
	"time"

	"gorm.io/gorm"
)

type ExpenseRepository interface {
	FindAll(params dto.ExpenseQueryParams) ([]model.Expense, int64, error)
	FindByID(id uint) (*model.Expense, error)
	Create(expense *model.Expense) error
	Update(expense *model.Expense) error
	Delete(id uint) error
	IsDateLocked(expenseDate time.Time) (bool, error)
	WithTx(tx *gorm.DB) ExpenseRepository
}

type expenseRepository struct {
	db *gorm.DB
}

func NewExpenseRepository(db *gorm.DB) ExpenseRepository {
	return &expenseRepository{db: db}
}

func (r *expenseRepository) WithTx(tx *gorm.DB) ExpenseRepository {
	return &expenseRepository{db: tx}
}

func (r *expenseRepository) FindAll(params dto.ExpenseQueryParams) ([]model.Expense, int64, error) {
	var expenses []model.Expense
	var total int64
	query := r.db.Model(&model.Expense{}).Preload("ExpenseCategory").Preload("ExpenseCategory.Parent").Preload("Creator")

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

	// Apply dynamic multi-sort if provided
	if params.SortBy != "" {
		sortFields := strings.Split(params.SortBy, ",")
		sortDirs := strings.Split(params.SortDir, ",")

		fieldMap := map[string]string{
			"expense_date":        "expenses.expense_date",
			"created_at":          "expenses.created_at",
			"amount":              "expenses.amount",
			"expense_category_id": "expenses.expense_category_id",
			"category":            "expenses.expense_category_id",
			"id":                  "expenses.id",
		}

		for i, field := range sortFields {
			field = strings.TrimSpace(field)
			column, ok := fieldMap[field]
			if !ok {
				continue
			}

			dir := "DESC"
			if i < len(sortDirs) {
				d := strings.ToUpper(strings.TrimSpace(sortDirs[i]))
				if d == "ASC" || d == "DESC" {
					dir = d
				}
			} else if len(sortDirs) > 0 {
				d := strings.ToUpper(strings.TrimSpace(sortDirs[0]))
				if d == "ASC" || d == "DESC" {
					dir = d
				}
			}

			query = query.Order(column + " " + dir)
		}
		// Deterministic tie-breaker
		query = query.Order("expenses.id DESC")
	} else {
		// Default fallback order
		query = query.Order("expenses.expense_date DESC, expenses.created_at DESC, expenses.id DESC")
	}

	err := query.Offset((page - 1) * limit).Limit(limit).Find(&expenses).Error
	return expenses, total, err
}

func (r *expenseRepository) FindByID(id uint) (*model.Expense, error) {
	var expense model.Expense
	err := r.db.Preload("ExpenseCategory").Preload("ExpenseCategory.Parent").Preload("Creator").Preload("AcademicYear").First(&expense, id).Error
	return &expense, err
}

func (r *expenseRepository) Create(expense *model.Expense) error {
	return r.db.Create(expense).Error
}

func (r *expenseRepository) Update(expense *model.Expense) error {
	return r.db.Save(expense).Error
}

func (r *expenseRepository) Delete(id uint) error {
	return r.db.Delete(&model.Expense{}, id).Error
}

func (r *expenseRepository) IsDateLocked(expenseDate time.Time) (bool, error) {
	var count int64
	err := r.db.Model(&model.DailyClosing{}).Where("closing_date = ? AND is_confirmed = true", expenseDate).Count(&count).Error
	return count > 0, err
}
