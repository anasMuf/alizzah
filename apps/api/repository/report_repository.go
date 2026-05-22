package repository

import (
	"api/dto"
	"time"

	"gorm.io/gorm"
)

type ReportRepository interface {
	SumInvoiceByCategory(academicYearID uint, month, year uint) ([]dto.BilledVsPaid, error)
	SumExpenseByCategory(academicYearID uint, startDate, endDate time.Time) ([]dto.CategoryAmount, error)
	GetArrearsByClass(academicYearID uint, month, year uint) ([]dto.ClassArrearSummary, error)
	GetMonthlyBreakdown(academicYearID uint) ([]dto.MonthlyBreakdown, error)
	GetInvoiceSummaryByStudent(studentID uint, academicYearID uint) (*dto.InvoiceSummary, error)
	GetStudentsByClassGroupForMonth(classGroupID uint, month, year uint, academicYearID uint) ([]dto.StudentPaymentStatusInReport, error)
}

type reportRepository struct {
	db *gorm.DB
}

func NewReportRepository(db *gorm.DB) ReportRepository {
	return &reportRepository{db: db}
}

func (r *reportRepository) SumInvoiceByCategory(academicYearID uint, month, year uint) ([]dto.BilledVsPaid, error) {
	var results []dto.BilledVsPaid

	query := r.db.Table("invoice_items ii").
		Select("ii.category, SUM(ii.amount) as billed, SUM(ii.paid_amount) as paid").
		Joins("JOIN invoices i ON i.id = ii.invoice_id").
		Where("i.academic_year_id = ?", academicYearID)

	if month != 0 {
		query = query.Where("i.month = ?", month)
	}
	if year != 0 {
		query = query.Where("i.year = ?", year)
	}

	err := query.Group("ii.category").Scan(&results).Error
	return results, err
}

func (r *reportRepository) SumExpenseByCategory(academicYearID uint, startDate, endDate time.Time) ([]dto.CategoryAmount, error) {
	var results []dto.CategoryAmount

	err := r.db.Table("expenses e").
		Select("ec_parent.name as category, ec.name as sub_category, SUM(e.amount) as amount").
		Joins("JOIN expense_categories ec ON ec.id = e.expense_category_id").
		Joins("LEFT JOIN expense_categories ec_parent ON ec_parent.id = ec.parent_id").
		Where("e.academic_year_id = ? AND e.expense_date BETWEEN ? AND ?", academicYearID, startDate, endDate).
		Group("ec_parent.name, ec.name").
		Scan(&results).Error

	return results, err
}

func (r *reportRepository) GetArrearsByClass(academicYearID uint, month, year uint) ([]dto.ClassArrearSummary, error) {
	var results []dto.ClassArrearSummary

	err := r.db.Table("invoices i").
		Select("cg.name as class_group_name, SUM(i.total_amount - i.paid_amount) as total_unpaid, COUNT(DISTINCT i.student_id) as student_count").
		Joins("JOIN student_enrollments se ON se.student_id = i.student_id AND se.academic_year_id = i.academic_year_id").
		Joins("JOIN class_groups cg ON cg.id = se.class_group_id").
		Where("i.academic_year_id = ? AND i.status != 'paid'", academicYearID).
		Where("i.month = ? AND i.year = ?", month, year).
		Group("cg.name").
		Scan(&results).Error

	return results, err
}

func (r *reportRepository) GetMonthlyBreakdown(academicYearID uint) ([]dto.MonthlyBreakdown, error) {
	var results []dto.MonthlyBreakdown

	// We use a union query or two separate queries to get income and expense per month.
	// For simplicity, we will do two queries and merge them in memory.
	type MonthlyAmount struct {
		Month  uint
		Year   uint
		Amount float64
	}

	var incomes []MonthlyAmount
	err := r.db.Table("payments p").
		Select("EXTRACT(MONTH FROM p.payment_date) as month, EXTRACT(YEAR FROM p.payment_date) as year, SUM(p.total_amount) as amount").
		Where("p.academic_year_id = ?", academicYearID).
		Group("year, month").
		Scan(&incomes).Error
	if err != nil {
		return nil, err
	}

	var expenses []MonthlyAmount
	err = r.db.Table("expenses e").
		Select("EXTRACT(MONTH FROM e.expense_date) as month, EXTRACT(YEAR FROM e.expense_date) as year, SUM(e.amount) as amount").
		Where("e.academic_year_id = ?", academicYearID).
		Group("year, month").
		Scan(&expenses).Error
	if err != nil {
		return nil, err
	}

	// Merge
	breakdownMap := make(map[string]*dto.MonthlyBreakdown)
	merge := func(month, year uint, income, expense float64) {
		key := string(rune(year)) + "-" + string(rune(month)) // simple key
		if _, ok := breakdownMap[key]; !ok {
			breakdownMap[key] = &dto.MonthlyBreakdown{Month: month, Year: year}
		}
		breakdownMap[key].Income += income
		breakdownMap[key].Expense += expense
	}

	for _, inc := range incomes {
		merge(inc.Month, inc.Year, inc.Amount, 0)
	}
	for _, exp := range expenses {
		merge(exp.Month, exp.Year, 0, exp.Amount)
	}

	for _, v := range breakdownMap {
		results = append(results, *v)
	}

	return results, nil
}

func (r *reportRepository) GetInvoiceSummaryByStudent(studentID uint, academicYearID uint) (*dto.InvoiceSummary, error) {
	var summary dto.InvoiceSummary

	query := r.db.Table("invoices").
		Select("COALESCE(SUM(total_amount), 0) as total_billed, COALESCE(SUM(paid_amount), 0) as total_paid").
		Where("student_id = ?", studentID)

	if academicYearID != 0 {
		query = query.Where("academic_year_id = ?", academicYearID)
	}

	err := query.Scan(&summary).Error
	summary.TotalUnpaid = summary.TotalBilled - summary.TotalPaid
	return &summary, err
}

func (r *reportRepository) GetStudentsByClassGroupForMonth(classGroupID uint, month, year uint, academicYearID uint) ([]dto.StudentPaymentStatusInReport, error) {
	var results []dto.StudentPaymentStatusInReport

	err := r.db.Table("student_enrollments se").
		Select("se.student_id, s.full_name as student_name, COALESCE(i.status, 'unbilled') as invoice_status, COALESCE(i.total_amount, 0) as total_amount, COALESCE(i.paid_amount, 0) as paid_amount, COALESCE(i.total_amount - i.paid_amount, 0) as unpaid_amount").
		Joins("JOIN students s ON s.id = se.student_id").
		Joins("LEFT JOIN invoices i ON i.student_id = se.student_id AND i.month = ? AND i.year = ? AND i.academic_year_id = ?", month, year, academicYearID).
		Where("se.class_group_id = ? AND se.academic_year_id = ?", classGroupID, academicYearID).
		Scan(&results).Error

	return results, err
}
