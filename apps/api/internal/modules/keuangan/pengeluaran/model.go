package pengeluaran

import (
	"api/model"
	"time"
)

// Expense adalah pengeluaran operasional sekolah.
type Expense struct {
	model.PrimaryKey
	AcademicYearID    uint      `gorm:"not null;index"`
	ExpenseCategoryID uint      `gorm:"not null;index"`
	ExpenseDate       time.Time `gorm:"type:date;not null"`
	Amount            float64   `gorm:"type:decimal(15,2);not null"`
	Description       string    `gorm:"type:text;not null"`
	ReceiptURL        string    `gorm:"size:255"`
	CreatedBy         uint      `gorm:"not null"`
	model.BaseModelTimeAt

	AcademicYear    model.AcademicYear    `gorm:"foreignKey:AcademicYearID"`
	ExpenseCategory ExpenseCategory       `gorm:"foreignKey:ExpenseCategoryID"`
	Creator         model.User            `gorm:"foreignKey:CreatedBy"`
}

func (Expense) TableName() string { return "expenses" }

// ExpenseCategory adalah kategori pengeluaran (hirarki parent-child).
type ExpenseCategory struct {
	model.PrimaryKey
	ParentID        *uint  `gorm:"index"`
	Name            string `gorm:"size:100;not null"`
	InvoiceCategory string `gorm:"size:30"` // mapping ke invoice_items.category (hanya parent)
	model.BaseModelTimeAt

	Parent   *ExpenseCategory  `gorm:"foreignKey:ParentID"`
	Children []ExpenseCategory `gorm:"foreignKey:ParentID"`
}

func (ExpenseCategory) TableName() string { return "expense_categories" }

// Models mengembalikan model GORM untuk AutoMigrate.
func Models() []any {
	return []any{&Expense{}, &ExpenseCategory{}}
}
