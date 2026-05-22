package dto

// Query
type ExpenseQueryParams struct {
	AcademicYearID    uint
	ExpenseCategoryID uint
	StartDate         string
	EndDate           string
	Page              int
	Limit             int
}

// Request
type CreateExpenseCategoryRequest struct {
	Name     string `json:"name" validate:"required,max=100"`
	ParentID *uint  `json:"parent_id" validate:"omitempty"`
}

type CreateExpenseRequest struct {
	AcademicYearID    uint    `json:"academic_year_id" validate:"required"`
	ExpenseCategoryID uint    `json:"expense_category_id" validate:"required"`
	ExpenseDate       string  `json:"expense_date" validate:"required,datetime=2006-01-02"`
	Amount            float64 `json:"amount" validate:"required,min=1"`
	Description       string  `json:"description" validate:"required"`
	ReceiptURL        string  `json:"receipt_url" validate:"omitempty,url"`
}

// Response
type ExpenseCategoryResponse struct {
	ID       uint                      `json:"id"`
	Name     string                    `json:"name"`
	ParentID *uint                     `json:"parent_id"`
	Children []ExpenseCategoryResponse `json:"children,omitempty"`
}

type ExpenseResponse struct {
	ID          uint                 `json:"id"`
	Category    ExpenseCategoryBrief `json:"category"`
	ExpenseDate string               `json:"expense_date"`
	Amount      float64              `json:"amount"`
	Description string               `json:"description"`
	ReceiptURL  *string              `json:"receipt_url"`
	CreatedBy   UserBriefResponse    `json:"created_by"`
	CreatedAt   string               `json:"created_at"`
}

type ExpenseCategoryBrief struct {
	ID         uint   `json:"id"`
	Name       string `json:"name"`
	ParentName string `json:"parent_name"`
}
