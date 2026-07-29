package repository

import (
	"api/dto"
	"api/model"
	"fmt"
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

	// Posisi Kas
	SumPenerimaanByInvoiceCategory(academicYearID uint, startDate, endDate time.Time) (map[string]float64, error)
	SumPengeluaranByInvoiceCategory(academicYearID uint, startDate, endDate time.Time) (map[string][]dto.PosisiKasExpense, error)
	SumIncomeTransactionsByCategory(academicYearID uint, startDate, endDate time.Time) (map[string]float64, error)

	// Transaksi Pengeluaran
	FindExpensesForMonth(academicYearID uint, startDate, endDate time.Time) ([]model.Expense, error)

	// Saldo Per Pos / Semua Pos
	DailyPenerimaan(academicYearID uint, startDate, endDate time.Time, category string) (map[string]float64, error)
	DailyPengeluaran(academicYearID uint, startDate, endDate time.Time, category string) (map[string]float64, error)
	SumPenerimaan(academicYearID uint, startDate, endDate time.Time, category string) (float64, error)
	SumPengeluaran(academicYearID uint, startDate, endDate time.Time, category string) (float64, error)

	// Pemasukan & Pengeluaran
	FindPaymentsInRange(academicYearID uint, startDate, endDate time.Time, categories []string) ([]dto.PemasukanTransaction, error)
	FindIncomeTransactionsInRange(academicYearID uint, startDate, endDate time.Time) ([]dto.PemasukanTransaction, error)

	// Tabungan
	DailySavingsCredit(startDate, endDate time.Time, savingsType string) (map[string]float64, error)
	DailySavingsDebit(startDate, endDate time.Time, savingsType string) (map[string]float64, error)
	SumSavingsCredit(startDate, endDate time.Time, savingsType string) (float64, error)
	SumSavingsDebit(startDate, endDate time.Time, savingsType string) (float64, error)
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
	// Saat agregat lintas-bulan (tanpa filter bulan), kecualikan tagihan bulanan
	// bulan depan (clamp ke TA). Untuk laporan bulan spesifik, tidak diubah.
	if month == 0 && year == 0 {
		query = query.Where(monthlyVisibilityCond("i"))
	}

	err := query.Group("ii.category").Scan(&results).Error
	return results, err
}

func (r *reportRepository) SumExpenseByCategory(academicYearID uint, startDate, endDate time.Time) ([]dto.CategoryAmount, error) {
	var results []dto.CategoryAmount

	err := r.db.Table("expenses e").
		Select("COALESCE(ec_parent.name, 'Tanpa Kategori') as category, COALESCE(ec.name, 'Tanpa Sub-Kategori') as sub_category, SUM(e.amount) as amount").
		Joins("LEFT JOIN expense_categories ec ON ec.id = e.expense_category_id").
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

	// Kecualikan tagihan bulanan bulan depan (clamp ke TA) dari total.
	query = query.Where(monthlyVisibilityCond("invoices"))

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

// SumPenerimaanByInvoiceCategory: total payment_items grouped by invoice_items.category
func (r *reportRepository) SumPenerimaanByInvoiceCategory(academicYearID uint, startDate, endDate time.Time) (map[string]float64, error) {
	type row struct {
		Category string
		Total    float64
	}
	var rows []row

	err := r.db.Table("payment_items pi").
		Select("ii.category, SUM(pi.amount) as total").
		Joins("JOIN invoice_items ii ON ii.id = pi.invoice_item_id").
		Joins("JOIN payments p ON p.id = pi.payment_id").
		Where("p.academic_year_id = ? AND p.payment_date BETWEEN ? AND ?", academicYearID, startDate, endDate).
		Group("ii.category").
		Scan(&rows).Error

	result := make(map[string]float64)
	for _, r := range rows {
		result[r.Category] = r.Total
	}
	return result, err
}

// SumPengeluaranByInvoiceCategory: expenses grouped by parent expense_category's invoice_category, with child details
func (r *reportRepository) SumPengeluaranByInvoiceCategory(academicYearID uint, startDate, endDate time.Time) (map[string][]dto.PosisiKasExpense, error) {
	type row struct {
		InvoiceCategory string
		ChildName       string
		Total           float64
	}
	var rows []row

	err := r.db.Table("expenses e").
		Select("pec.invoice_category, COALESCE(ec.name, 'Tanpa Sub-Kategori') as child_name, SUM(e.amount) as total").
		Joins("LEFT JOIN expense_categories ec ON ec.id = e.expense_category_id").
		Joins("LEFT JOIN expense_categories pec ON pec.id = ec.parent_id").
		Where("e.academic_year_id = ? AND e.expense_date BETWEEN ? AND ?", academicYearID, startDate, endDate).
		Where("pec.invoice_category IS NOT NULL AND pec.invoice_category != ''").
		Group("pec.invoice_category, ec.name").
		Scan(&rows).Error

	result := make(map[string][]dto.PosisiKasExpense)
	for _, r := range rows {
		result[r.InvoiceCategory] = append(result[r.InvoiceCategory], dto.PosisiKasExpense{
			Name:   r.ChildName,
			Amount: r.Total,
		})
	}
	return result, err
}

// SumIncomeTransactionsByCategory: total income_transactions grouped by category
func (r *reportRepository) SumIncomeTransactionsByCategory(academicYearID uint, startDate, endDate time.Time) (map[string]float64, error) {
	type row struct {
		Category string
		Total    float64
	}
	var rows []row

	err := r.db.Table("income_transactions").
		Select("category, SUM(amount) as total").
		Where("academic_year_id = ? AND transaction_date BETWEEN ? AND ?", academicYearID, startDate, endDate).
		Group("category").
		Scan(&rows).Error

	result := make(map[string]float64)
	for _, row := range rows {
		result[row.Category] = row.Total
	}
	return result, err
}

// DailyPenerimaan: penerimaan per hari (invoice payments + income transactions), optionally filtered by category
func (r *reportRepository) DailyPenerimaan(academicYearID uint, startDate, endDate time.Time, category string) (map[string]float64, error) {
	type row struct {
		Date  time.Time
		Total float64
	}

	result := make(map[string]float64)

	// Invoice payments
	{
		var rows []row
		query := r.db.Table("payment_items pi").
			Select("p.payment_date as date, SUM(pi.amount) as total").
			Joins("JOIN invoice_items ii ON ii.id = pi.invoice_item_id").
			Joins("JOIN payments p ON p.id = pi.payment_id").
			Where("p.academic_year_id = ? AND p.payment_date BETWEEN ? AND ?", academicYearID, startDate, endDate)

		if category != "" {
			query = query.Where("ii.category = ?", category)
		}

		if err := query.Group("p.payment_date").Scan(&rows).Error; err != nil {
			return nil, err
		}
		for _, row := range rows {
			result[row.Date.Format("2006-01-02")] += row.Total
		}
	}

	// Income transactions
	{
		var rows []row
		query := r.db.Table("income_transactions").
			Select("transaction_date as date, SUM(amount) as total").
			Where("academic_year_id = ? AND transaction_date BETWEEN ? AND ?", academicYearID, startDate, endDate)

		if category != "" {
			query = query.Where("category = ?", category)
		}

		if err := query.Group("transaction_date").Scan(&rows).Error; err != nil {
			return nil, err
		}
		for _, row := range rows {
			result[row.Date.Format("2006-01-02")] += row.Total
		}
	}

	return result, nil
}

// DailyPengeluaran: pengeluaran per hari, optionally filtered by parent expense_category invoice_category
func (r *reportRepository) DailyPengeluaran(academicYearID uint, startDate, endDate time.Time, category string) (map[string]float64, error) {
	type row struct {
		Date  time.Time
		Total float64
	}
	var rows []row

	query := r.db.Table("expenses e").
		Select("e.expense_date as date, SUM(e.amount) as total")

	if category != "" {
		query = query.
			Joins("LEFT JOIN expense_categories ec ON ec.id = e.expense_category_id").
			Joins("LEFT JOIN expense_categories pec ON pec.id = ec.parent_id").
			Where("e.academic_year_id = ? AND e.expense_date BETWEEN ? AND ?", academicYearID, startDate, endDate).
			Where("pec.invoice_category = ?", category)
	} else {
		query = query.
			Where("e.academic_year_id = ? AND e.expense_date BETWEEN ? AND ?", academicYearID, startDate, endDate)
	}

	err := query.Group("e.expense_date").Scan(&rows).Error

	result := make(map[string]float64)
	for _, r := range rows {
		result[r.Date.Format("2006-01-02")] = r.Total
	}
	return result, err
}

// SumPenerimaan: total penerimaan in range (invoice payments + income transactions), optionally filtered by category
func (r *reportRepository) SumPenerimaan(academicYearID uint, startDate, endDate time.Time, category string) (float64, error) {
	var total float64

	// Invoice payments
	query := r.db.Table("payment_items pi").
		Select("COALESCE(SUM(pi.amount), 0)").
		Joins("JOIN invoice_items ii ON ii.id = pi.invoice_item_id").
		Joins("JOIN payments p ON p.id = pi.payment_id").
		Where("p.academic_year_id = ? AND p.payment_date BETWEEN ? AND ?", academicYearID, startDate, endDate)

	if category != "" {
		query = query.Where("ii.category = ?", category)
	}

	if err := query.Scan(&total).Error; err != nil {
		return 0, err
	}

	// Income transactions
	var incomeTotal float64
	incomeQuery := r.db.Table("income_transactions").
		Select("COALESCE(SUM(amount), 0)").
		Where("academic_year_id = ? AND transaction_date BETWEEN ? AND ?", academicYearID, startDate, endDate)

	if category != "" {
		incomeQuery = incomeQuery.Where("category = ?", category)
	}

	if err := incomeQuery.Scan(&incomeTotal).Error; err != nil {
		return 0, err
	}

	return total + incomeTotal, nil
}

// SumPengeluaran: total pengeluaran in range, optionally filtered by parent category
func (r *reportRepository) SumPengeluaran(academicYearID uint, startDate, endDate time.Time, category string) (float64, error) {
	var total float64

	query := r.db.Table("expenses e").
		Select("COALESCE(SUM(e.amount), 0)")

	if category != "" {
		query = query.
			Joins("LEFT JOIN expense_categories ec ON ec.id = e.expense_category_id").
			Joins("LEFT JOIN expense_categories pec ON pec.id = ec.parent_id").
			Where("e.academic_year_id = ? AND e.expense_date BETWEEN ? AND ?", academicYearID, startDate, endDate).
			Where("pec.invoice_category = ?", category)
	} else {
		query = query.
			Where("e.academic_year_id = ? AND e.expense_date BETWEEN ? AND ?", academicYearID, startDate, endDate)
	}

	err := query.Scan(&total).Error
	return total, err
}

// FindExpensesForMonth: all expenses in a month with category + creator preloaded
func (r *reportRepository) FindExpensesForMonth(academicYearID uint, startDate, endDate time.Time) ([]model.Expense, error) {
	var expenses []model.Expense
	err := r.db.
		Preload("ExpenseCategory").
		Preload("ExpenseCategory.Parent").
		Preload("Creator").
		Where("academic_year_id = ? AND expense_date BETWEEN ? AND ?", academicYearID, startDate, endDate).
		Order("expense_date ASC, created_at ASC").
		Find(&expenses).Error
	return expenses, err
}

// savingsTypeFilter adds optional savings type filter via JOIN
func savingsTypeFilter(query *gorm.DB, savingsType string) *gorm.DB {
	if savingsType != "" {
		return query.
			Joins("JOIN student_savings ss ON ss.id = st.student_savings_id").
			Where("ss.type = ?", savingsType)
	}
	return query
}

// DailySavingsCredit: credit transactions per day
func (r *reportRepository) DailySavingsCredit(startDate, endDate time.Time, savingsType string) (map[string]float64, error) {
	type row struct {
		Date  time.Time
		Total float64
	}
	var rows []row

	query := r.db.Table("savings_transactions st").
		Select("DATE(st.created_at) as date, SUM(st.net_amount) as total").
		Where("st.transaction_type = 'credit' AND st.created_at >= ? AND st.created_at < ?", startDate, endDate.Add(24*time.Hour))

	query = savingsTypeFilter(query, savingsType)
	err := query.Group("DATE(st.created_at)").Scan(&rows).Error

	result := make(map[string]float64)
	for _, r := range rows {
		result[r.Date.Format("2006-01-02")] = r.Total
	}
	return result, err
}

// DailySavingsDebit: debit transactions per day
func (r *reportRepository) DailySavingsDebit(startDate, endDate time.Time, savingsType string) (map[string]float64, error) {
	type row struct {
		Date  time.Time
		Total float64
	}
	var rows []row

	query := r.db.Table("savings_transactions st").
		Select("DATE(st.created_at) as date, SUM(st.net_amount) as total").
		Where("st.transaction_type = 'debit' AND st.created_at >= ? AND st.created_at < ?", startDate, endDate.Add(24*time.Hour))

	query = savingsTypeFilter(query, savingsType)
	err := query.Group("DATE(st.created_at)").Scan(&rows).Error

	result := make(map[string]float64)
	for _, r := range rows {
		result[r.Date.Format("2006-01-02")] = r.Total
	}
	return result, err
}

// SumSavingsCredit: total credit in range
func (r *reportRepository) SumSavingsCredit(startDate, endDate time.Time, savingsType string) (float64, error) {
	var total float64
	query := r.db.Table("savings_transactions st").
		Select("COALESCE(SUM(st.net_amount), 0)").
		Where("st.transaction_type = 'credit' AND st.created_at >= ? AND st.created_at < ?", startDate, endDate.Add(24*time.Hour))

	query = savingsTypeFilter(query, savingsType)
	err := query.Scan(&total).Error
	return total, err
}

// SumSavingsDebit: total debit in range
func (r *reportRepository) SumSavingsDebit(startDate, endDate time.Time, savingsType string) (float64, error) {
	var total float64
	query := r.db.Table("savings_transactions st").
		Select("COALESCE(SUM(st.net_amount), 0)").
		Where("st.transaction_type = 'debit' AND st.created_at >= ? AND st.created_at < ?", startDate, endDate.Add(24*time.Hour))

	query = savingsTypeFilter(query, savingsType)
	err := query.Scan(&total).Error
	return total, err
}

// FindPaymentsInRange returns payments (invoice + income_transaction format) in date range
func (r *reportRepository) FindPaymentsInRange(academicYearID uint, startDate, endDate time.Time, categories []string) ([]dto.PemasukanTransaction, error) {
	type Row struct {
		PaymentID     uint      `gorm:"column:payment_id"`
		PaymentDate   time.Time `gorm:"column:payment_date"`
		Source        string    `gorm:"column:source"`
		TotalAmount   float64   `gorm:"column:total_amount"`
		ItemCategory  string    `gorm:"column:item_category"`
		ItemName      string    `gorm:"column:item_name"`
		ItemAmount    float64   `gorm:"column:item_amount"`
		CreatedByName string    `gorm:"column:created_by_name"`
	}

	var rows []Row
	query := r.db.Table("payments p").
		Select("p.id as payment_id, p.payment_date, p.source, p.total_amount, ii.category as item_category, ii.name as item_name, COALESCE(ii.notes, ii.name) as item_description, pi.amount as item_amount, u.full_name as created_by_name").
		Joins("JOIN payment_items pi ON pi.payment_id = p.id").
		Joins("JOIN invoice_items ii ON ii.id = pi.invoice_item_id").
		Joins("LEFT JOIN users u ON u.id = p.created_by").
		Where("p.academic_year_id = ? AND p.payment_date BETWEEN ? AND ?", academicYearID, startDate, endDate)

	if len(categories) > 0 {
		query = query.Where("ii.category IN ?", categories)
	}

	query = query.Order("p.payment_date ASC, p.id ASC")

	if err := query.Scan(&rows).Error; err != nil {
		return nil, err
	}

	// Group by payment_id
	paymentMap := make(map[uint]*dto.PemasukanTransaction)
	var paymentOrder []uint

	for _, row := range rows {
		if _, exists := paymentMap[row.PaymentID]; !exists {
			paymentMap[row.PaymentID] = &dto.PemasukanTransaction{
				ID:              row.PaymentID,
				Source:          row.ItemCategory,
				PaymentMethod:   row.Source,
				Terbilang:       "",
				TransactionDate: row.PaymentDate.Format("2006-01-02"),
				TransactionNo:   fmt.Sprintf("PAY-%d", row.PaymentID),
				Petugas:         row.CreatedByName,
				Items:           []dto.PemasukanItem{},
				TotalAmount:     row.TotalAmount,
			}
			paymentOrder = append(paymentOrder, row.PaymentID)
		}
		txn := paymentMap[row.PaymentID]
		txn.Items = append(txn.Items, dto.PemasukanItem{
			No:       len(txn.Items) + 1,
			Category: row.ItemName,
			Amount:   row.ItemAmount,
		})
	}

	var result []dto.PemasukanTransaction
	for _, id := range paymentOrder {
		result = append(result, *paymentMap[id])
	}

	return result, nil
}

// FindIncomeTransactionsInRange returns income transactions in date range as PemasukanTransaction format
func (r *reportRepository) FindIncomeTransactionsInRange(academicYearID uint, startDate, endDate time.Time) ([]dto.PemasukanTransaction, error) {
	type Row struct {
		ID              uint      `gorm:"column:id"`
		TransactionDate time.Time `gorm:"column:transaction_date"`
		Category        string    `gorm:"column:category"`
		SourceName      string    `gorm:"column:source_name"`
		Amount          float64   `gorm:"column:amount"`
		ReferenceNumber string    `gorm:"column:reference_number"`
		CreatedByName   string    `gorm:"column:created_by_name"`
	}

	var rows []Row
	err := r.db.Table("income_transactions it").
		Select("it.id, it.transaction_date, it.category, it.source_name, it.amount, COALESCE(it.reference_number, '') as reference_number, u.full_name as created_by_name").
		Joins("LEFT JOIN users u ON u.id = it.created_by").
		Where("it.academic_year_id = ? AND it.transaction_date BETWEEN ? AND ?", academicYearID, startDate, endDate).
		Order("it.transaction_date ASC, it.id ASC").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	var result []dto.PemasukanTransaction
	incomeLabels := map[string]string{
		"bos":     "Dana BOS",
		"donasi":  "Donasi",
		"hibah":   "Hibah",
		"lainnya": "Lainnya",
	}

	for _, row := range rows {
		categoryLabel := row.Category
		if label, ok := incomeLabels[row.Category]; ok {
			categoryLabel = label
		}
		result = append(result, dto.PemasukanTransaction{
			ID:              row.ID,
			Source:          categoryLabel,
			PaymentMethod:   "tunai",
			Terbilang:       "",
			TransactionDate: row.TransactionDate.Format("2006-01-02"),
			TransactionNo:   row.ReferenceNumber,
			Petugas:         row.CreatedByName,
			Items: []dto.PemasukanItem{
				{No: 1, Category: categoryLabel, Description: row.SourceName, Amount: row.Amount},
			},
			TotalAmount: row.Amount,
		})
	}

	return result, nil
}
