package pengeluaran

import "api/dto"

// --- Query Params ---

type ExpenseQueryParams struct {
	AcademicYearID    uint
	ExpenseCategoryID uint
	StartDate         string
	EndDate           string
	Page              int
	Limit             int
}

// --- Requests ---

type CreateCategoryRequest struct {
	Name            string `json:"name" validate:"required,max=100"`
	ParentID        *uint  `json:"parent_id" validate:"omitempty"`
	InvoiceCategory string `json:"invoice_category" validate:"omitempty,max=30"`
}

type CreateExpenseRequest struct {
	AcademicYearID    uint    `json:"academic_year_id" validate:"required"`
	ExpenseCategoryID uint    `json:"expense_category_id" validate:"required"`
	ExpenseDate       string  `json:"expense_date" validate:"required,dateonly"`
	Amount            float64 `json:"amount" validate:"required,min=1"`
	Description       string  `json:"description" validate:"required"`
	ReceiptURL        string  `json:"receipt_url" validate:"omitempty,url"`
}

// --- Responses ---

type CategoryResponse struct {
	ID              uint               `json:"id"`
	Name            string             `json:"name"`
	ParentID        *uint              `json:"parent_id"`
	InvoiceCategory string             `json:"invoice_category,omitempty"`
	Children        []CategoryResponse `json:"children,omitempty"`
}

type ExpenseResponse struct {
	ID          uint                `json:"id"`
	Category    CategoryBrief       `json:"category"`
	ExpenseDate string              `json:"expense_date"`
	Amount      float64             `json:"amount"`
	Description string              `json:"description"`
	ReceiptURL  *string             `json:"receipt_url"`
	CreatedBy   dto.UserBriefResponse `json:"created_by"`
	CreatedAt   string              `json:"created_at"`
}

type CategoryBrief struct {
	ID         uint   `json:"id"`
	Name       string `json:"name"`
	ParentName string `json:"parent_name"`
}
