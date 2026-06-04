package service

import (
	"api/dto"
	"api/repository"
	"api/utility"
	"fmt"
	"time"
)

type ReportService interface {
	GetDailyReport(req dto.DailyReportRequest) (*dto.DailyReportResponse, error)
	GetMonthlyReport(req dto.MonthlyReportRequest) (*dto.MonthlyReportResponse, error)
	GetAnnualReport(req dto.AnnualReportRequest) (*dto.AnnualReportResponse, error)
	GetStudentReport(studentID uint, req dto.StudentReportRequest) (*dto.StudentReportResponse, error)
	GetClassGroupReport(classGroupID uint, req dto.ClassGroupReportRequest) (*dto.ClassGroupReportResponse, error)
	GetPosisiKas(req dto.PosisiKasRequest) (*dto.PosisiKasResponse, error)
	GetSaldo(req dto.SaldoRequest) (*dto.SaldoResponse, error)
	GetTransaksiPengeluaran(req dto.TransaksiPengeluaranRequest) (*dto.TransaksiPengeluaranResponse, error)
	GetTabunganReport(req dto.TabunganReportRequest) (*dto.TabunganReportResponse, error)
	GetTabunganSiswaReport(studentID uint, req dto.TabunganSiswaReportRequest) (*dto.TabunganSiswaReportResponse, error)
}

type reportService struct {
	reportRepo       repository.ReportRepository
	academicYearRepo repository.AcademicYearRepository
	cashRepo         repository.CashTransactionRepository
	vaultRepo        repository.VaultTransactionRepository
	dailyClosingRepo repository.DailyClosingRepository
	studentRepo      repository.StudentRepository
	invoiceRepo      repository.InvoiceRepository
	invoiceItemRepo  repository.InvoiceItemRepository
	paymentRepo      repository.PaymentRepository
	savingsService   SavingsService
	classGroupRepo   repository.ClassGroupRepository
	savingsTxnRepo   repository.SavingsTransactionRepository
}

func NewReportService(
	reportRepo repository.ReportRepository,
	academicYearRepo repository.AcademicYearRepository,
	cashRepo repository.CashTransactionRepository,
	vaultRepo repository.VaultTransactionRepository,
	dailyClosingRepo repository.DailyClosingRepository,
	studentRepo repository.StudentRepository,
	invoiceRepo repository.InvoiceRepository,
	invoiceItemRepo repository.InvoiceItemRepository,
	paymentRepo repository.PaymentRepository,
	savingsService SavingsService,
	classGroupRepo repository.ClassGroupRepository,
	savingsTxnRepo repository.SavingsTransactionRepository,
) ReportService {
	return &reportService{
		reportRepo:       reportRepo,
		academicYearRepo: academicYearRepo,
		cashRepo:         cashRepo,
		vaultRepo:        vaultRepo,
		dailyClosingRepo: dailyClosingRepo,
		studentRepo:      studentRepo,
		invoiceRepo:      invoiceRepo,
		invoiceItemRepo:  invoiceItemRepo,
		paymentRepo:      paymentRepo,
		savingsService:   savingsService,
		classGroupRepo:   classGroupRepo,
		savingsTxnRepo:   savingsTxnRepo,
	}
}

func (s *reportService) GetDailyReport(req dto.DailyReportRequest) (*dto.DailyReportResponse, error) {
	academicYearID := req.AcademicYearID
	if academicYearID == 0 {
		ay, _ := s.academicYearRepo.FindActive()
		academicYearID = ay.ID
	}

	date, _ := utility.ParseDate(req.Date)
	startOfDay := date
	endOfDay := date.Add(23*time.Hour + 59*time.Minute + 59*time.Second)

	incomeByCategory, _ := s.cashRepo.SumByCategory(academicYearID, startOfDay, endOfDay)
	totalIncome := utility.SumCategoryAmounts(incomeByCategory)

	expenseByCategory, _ := s.reportRepo.SumExpenseByCategory(academicYearID, startOfDay, endOfDay)
	totalExpense := utility.SumCategoryAmounts(expenseByCategory)

	openingBalance, _ := s.cashRepo.GetBalanceUpToDate(academicYearID, date.AddDate(0, 0, -1))
	closingBalance := openingBalance + totalIncome - totalExpense

	vaultBalance, _ := s.vaultRepo.GetCurrentBalance(academicYearID)

	dc, _ := s.dailyClosingRepo.FindByDate(date)
	var dcInReport *dto.DailyClosingInReport
	if dc != nil {
		dcInReport = &dto.DailyClosingInReport{
			PhysicalCashAmount: dc.PhysicalCashAmount,
			SystemCashAmount:   dc.SystemCashAmount,
			Difference:         dc.Difference,
			Notes:              utility.NilIfEmpty(dc.Notes),
			IsConfirmed:        dc.IsConfirmed,
		}
	}

	ay, _ := s.academicYearRepo.FindByID(academicYearID)
	return &dto.DailyReportResponse{
		Date:         req.Date,
		AcademicYear: ay.Name,
		IncomeSummary: dto.IncomeSummaryResponse{
			Total:      totalIncome,
			ByCategory: incomeByCategory,
		},
		ExpenseSummary: dto.ExpenseSummaryResponse{
			Total:      totalExpense,
			ByCategory: expenseByCategory,
		},
		Cash: dto.CashSummaryResponse{
			OpeningBalance: openingBalance,
			TotalCredit:    totalIncome,
			TotalDebit:     totalExpense,
			ClosingBalance: closingBalance,
		},
		Vault:        dto.VaultSummaryResponse{Balance: vaultBalance},
		DailyClosing: dcInReport,
	}, nil
}

func (s *reportService) GetMonthlyReport(req dto.MonthlyReportRequest) (*dto.MonthlyReportResponse, error) {
	academicYearID := utility.ResolveAcademicYear(req.AcademicYearID, s.academicYearRepo)
	startDate := time.Date(int(req.Year), time.Month(req.Month), 1, 0, 0, 0, 0, time.UTC)
	endDate := startDate.AddDate(0, 1, -1)

	byCategory, _ := s.reportRepo.SumInvoiceByCategory(academicYearID, req.Month, req.Year)
	totalBilled := utility.SumBilled(byCategory)
	totalPaid := utility.SumPaid(byCategory)

	expenseByCategory, _ := s.reportRepo.SumExpenseByCategory(academicYearID, startDate, endDate)
	totalExpense := utility.SumCategoryAmounts(expenseByCategory)

	arrearsByClass, _ := s.reportRepo.GetArrearsByClass(academicYearID, req.Month, req.Year)

	openingBalance, _ := s.cashRepo.GetBalanceUpToDate(academicYearID, startDate.AddDate(0, 0, -1))
	credit, debit, _ := s.cashRepo.SumByDateRange(academicYearID, startDate, endDate)

	period := startDate.Format("January 2006")

	return &dto.MonthlyReportResponse{
		Period: period,
		IncomeSummary: dto.MonthlyIncomeSummary{
			TotalBilled: totalBilled,
			TotalPaid:   totalPaid,
			TotalUnpaid: totalBilled - totalPaid,
			ByCategory:  byCategory,
		},
		ExpenseSummary: dto.ExpenseSummaryResponse{
			Total:      totalExpense,
			ByCategory: expenseByCategory,
		},
		ArrearsByClass: arrearsByClass,
		Cash: dto.MonthlyCashSummary{
			OpeningBalance: openingBalance,
			TotalIncome:    credit,
			TotalExpense:   debit,
			ClosingBalance: openingBalance + credit - debit,
		},
	}, nil
}

var annualReportCache = map[uint]*dto.AnnualReportResponse{}
var annualReportCacheTime = map[uint]time.Time{}

func (s *reportService) GetAnnualReport(req dto.AnnualReportRequest) (*dto.AnnualReportResponse, error) {
	if cached, ok := annualReportCache[req.AcademicYearID]; ok {
		if time.Since(annualReportCacheTime[req.AcademicYearID]) < time.Hour {
			return cached, nil
		}
	}

	ay, _ := s.academicYearRepo.FindByID(req.AcademicYearID)

	byCategory, _ := s.reportRepo.SumInvoiceByCategory(req.AcademicYearID, 0, 0)
	totalBilled := utility.SumBilled(byCategory)
	totalPaid := utility.SumPaid(byCategory)

	expenseByCategory, _ := s.reportRepo.SumExpenseByCategory(
		req.AcademicYearID, ay.StartDate, ay.EndDate,
	)
	totalExpense := utility.SumCategoryAmounts(expenseByCategory)

	byMonth, _ := s.reportRepo.GetMonthlyBreakdown(req.AcademicYearID)

	cashBalance, _ := s.cashRepo.GetCurrentBalance(req.AcademicYearID)
	vaultBalance, _ := s.vaultRepo.GetCurrentBalance(req.AcademicYearID)

	result := &dto.AnnualReportResponse{
		AcademicYear: ay.Name,
		IncomeSummary: dto.AnnualIncomeSummary{
			TotalBilled: totalBilled,
			TotalPaid:   totalPaid,
			TotalUnpaid: totalBilled - totalPaid,
		},
		ExpenseSummary: dto.AnnualExpenseSummary{Total: totalExpense},
		Net:            totalPaid - totalExpense,
		ByMonth:        byMonth,
		CashBalance:    cashBalance,
		VaultBalance:   vaultBalance,
	}

	annualReportCache[req.AcademicYearID] = result
	annualReportCacheTime[req.AcademicYearID] = time.Now()

	return result, nil
}

func (s *reportService) GetStudentReport(studentID uint, req dto.StudentReportRequest) (*dto.StudentReportResponse, error) {
	student, _ := s.studentRepo.FindByID(studentID)

	academicYearID := uint(0)
	if !req.All {
		academicYearID = utility.ResolveAcademicYear(req.AcademicYearID, s.academicYearRepo)
	}

	invoiceSummary, _ := s.reportRepo.GetInvoiceSummaryByStudent(studentID, academicYearID)
	invoices, _ := s.invoiceRepo.FindByStudentID(studentID, "", "", academicYearID)
	payments, _ := s.paymentRepo.FindByStudentID(studentID, dto.StudentPaymentQueryParams{})
	savings, _ := s.savingsService.GetByStudentID(studentID)

	invoicesForReport := make([]dto.InvoiceDetailForReport, len(invoices))
	for i, inv := range invoices {
		items, _ := s.invoiceItemRepo.FindByInvoiceID(inv.ID)
		period := utility.FormatInvoicePeriod(inv)
		
		itemResponses := make([]dto.InvoiceItemResponse, len(items))
		for j, item := range items {
			itemResponses[j] = dto.InvoiceItemResponse{
				ID:         item.ID,
				Category:   item.Category,
				Amount:     item.Amount,
				PaidAmount: item.PaidAmount,
			}
		}

		invoicesForReport[i] = dto.InvoiceDetailForReport{
			ID:          inv.ID,
			Type:        inv.Type,
			Period:      period,
			TotalAmount: inv.TotalAmount,
			PaidAmount:  inv.PaidAmount,
			Status:      inv.Status,
			Items:       itemResponses,
		}
	}

	paymentResponses := make([]dto.PaymentListResponse, len(payments))
	for i, p := range payments {
		paymentResponses[i] = dto.PaymentListResponse{
			ID:          p.ID,
			PaymentDate: p.PaymentDate.Format("2006-01-02"),
			TotalAmount: p.TotalAmount,
			Source:      p.Source,
		}
	}

	return &dto.StudentReportResponse{
		Student: dto.StudentBriefResponse{
			ID:       student.ID,
			FullName: student.FullName,
		},
		Savings:        *savings,
		InvoiceSummary: *invoiceSummary,
		Invoices:       invoicesForReport,
		PaymentHistory: paymentResponses,
	}, nil
}

func (s *reportService) GetClassGroupReport(classGroupID uint, req dto.ClassGroupReportRequest) (*dto.ClassGroupReportResponse, error) {
	academicYearID := utility.ResolveAcademicYear(req.AcademicYearID, s.academicYearRepo)
	classGroup, _ := s.classGroupRepo.FindByID(classGroupID)

	students, _ := s.reportRepo.GetStudentsByClassGroupForMonth(
		classGroupID, req.Month, req.Year, academicYearID,
	)

	totalStudents := len(students)
	totalBilled, totalPaid, totalUnpaid := float64(0), float64(0), float64(0)
	for _, st := range students {
		totalBilled += st.TotalAmount
		totalPaid += st.PaidAmount
		totalUnpaid += st.UnpaidAmount
	}

	paymentRate := utility.FormatPaymentRate(totalPaid, totalBilled)

	startDate := time.Date(int(req.Year), time.Month(req.Month), 1, 0, 0, 0, 0, time.UTC)
	period := startDate.Format("January 2006")

	return &dto.ClassGroupReportResponse{
		ClassGroup: dto.ClassGroupBriefResponse{
			ID:   classGroup.ID,
			Name: classGroup.Name,
		},
		Period: period,
		Summary: dto.ClassGroupReportSummary{
			TotalStudents: totalStudents,
			TotalBilled:   totalBilled,
			TotalPaid:     totalPaid,
			TotalUnpaid:   totalUnpaid,
			PaymentRate:   paymentRate,
		},
		Students: students,
	}, nil
}

// invoiceCategoryLabels maps invoice_items.category to display labels
var invoiceCategoryLabels = map[string]string{
	"monthly_spp":       "SPP",
	"monthly_infaq":     "Infaq Harian",
	"initial":           "Biaya Awal Masuk",
	"registration":      "Biaya Registrasi",
	"pasta":             "PASTA",
	"calisan":           "Calisan",
	"ekskul":            "Ekskul",
	"savings_mandatory": "Tabungan Wajib Berlian",
	"daycare":           "Daycare",
	"graduation":        "Wisuda",
}

// invoiceCategoryOrder defines display order for posisi kas report
var invoiceCategoryOrder = []string{
	"monthly_spp",
	"monthly_infaq",
	"initial",
	"registration",
	"pasta",
	"calisan",
	"ekskul",
	"savings_mandatory",
	"daycare",
	"graduation",
}

func (s *reportService) GetPosisiKas(req dto.PosisiKasRequest) (*dto.PosisiKasResponse, error) {
	academicYearID := utility.ResolveAcademicYear(req.AcademicYearID, s.academicYearRepo)
	ay, err := s.academicYearRepo.FindByID(academicYearID)
	if err != nil {
		return nil, err
	}

	// Date ranges
	startOfMonth := time.Date(int(req.Year), time.Month(req.Month), 1, 0, 0, 0, 0, time.UTC)
	endOfMonth := startOfMonth.AddDate(0, 1, -1)
	endOfPrevMonth := startOfMonth.AddDate(0, 0, -1)

	// Penerimaan bulan ini per category
	penerimaanBulan, err := s.reportRepo.SumPenerimaanByInvoiceCategory(academicYearID, startOfMonth, endOfMonth)
	if err != nil {
		return nil, err
	}

	// Pengeluaran bulan ini per category (with details)
	pengeluaranBulan, err := s.reportRepo.SumPengeluaranByInvoiceCategory(academicYearID, startOfMonth, endOfMonth)
	if err != nil {
		return nil, err
	}

	// Saldo sebelum: penerimaan - pengeluaran from start of AY to end of prev month
	penerimaanSebelum, err := s.reportRepo.SumPenerimaanByInvoiceCategory(academicYearID, ay.StartDate, endOfPrevMonth)
	if err != nil {
		return nil, err
	}

	pengeluaranSebelumRaw, err := s.reportRepo.SumPengeluaranByInvoiceCategory(academicYearID, ay.StartDate, endOfPrevMonth)
	if err != nil {
		return nil, err
	}
	// Sum pengeluaran sebelum per category
	pengeluaranSebelumTotal := make(map[string]float64)
	for cat, details := range pengeluaranSebelumRaw {
		for _, d := range details {
			pengeluaranSebelumTotal[cat] += d.Amount
		}
	}

	// Collect all categories that have any data
	categorySet := make(map[string]bool)
	for cat := range penerimaanBulan {
		categorySet[cat] = true
	}
	for cat := range pengeluaranBulan {
		categorySet[cat] = true
	}
	for cat := range penerimaanSebelum {
		categorySet[cat] = true
	}
	for cat := range pengeluaranSebelumTotal {
		categorySet[cat] = true
	}

	// Build posts in defined order
	var posts []dto.PosisiKasPost
	var grandTotal dto.PosisiKasTotal

	for _, cat := range invoiceCategoryOrder {
		if !categorySet[cat] {
			continue
		}

		saldoSebelum := penerimaanSebelum[cat] - pengeluaranSebelumTotal[cat]
		penerimaan := penerimaanBulan[cat]

		// Sum pengeluaran bulan for this category
		var totalPengeluaran float64
		for _, d := range pengeluaranBulan[cat] {
			totalPengeluaran += d.Amount
		}

		saldoBulan := penerimaan - totalPengeluaran
		saldoSampai := saldoSebelum + saldoBulan

		label := cat
		if l, ok := invoiceCategoryLabels[cat]; ok {
			label = l
		}

		posts = append(posts, dto.PosisiKasPost{
			Name:           label,
			Category:       cat,
			SaldoSebelum:   saldoSebelum,
			Penerimaan:     penerimaan,
			Pengeluaran:    totalPengeluaran,
			SaldoBulan:     saldoBulan,
			SaldoSampai:    saldoSampai,
			ExpenseDetails: pengeluaranBulan[cat],
		})

		grandTotal.SaldoSebelum += saldoSebelum
		grandTotal.Penerimaan += penerimaan
		grandTotal.Pengeluaran += totalPengeluaran
		grandTotal.SaldoBulan += saldoBulan
		grandTotal.SaldoSampai += saldoSampai

		delete(categorySet, cat)
	}

	// Any categories not in the predefined order
	for cat := range categorySet {
		saldoSebelum := penerimaanSebelum[cat] - pengeluaranSebelumTotal[cat]
		penerimaan := penerimaanBulan[cat]
		var totalPengeluaran float64
		for _, d := range pengeluaranBulan[cat] {
			totalPengeluaran += d.Amount
		}
		saldoBulan := penerimaan - totalPengeluaran
		saldoSampai := saldoSebelum + saldoBulan

		label := cat
		if l, ok := invoiceCategoryLabels[cat]; ok {
			label = l
		}

		posts = append(posts, dto.PosisiKasPost{
			Name:           label,
			Category:       cat,
			SaldoSebelum:   saldoSebelum,
			Penerimaan:     penerimaan,
			Pengeluaran:    totalPengeluaran,
			SaldoBulan:     saldoBulan,
			SaldoSampai:    saldoSampai,
			ExpenseDetails: pengeluaranBulan[cat],
		})

		grandTotal.SaldoSebelum += saldoSebelum
		grandTotal.Penerimaan += penerimaan
		grandTotal.Pengeluaran += totalPengeluaran
		grandTotal.SaldoBulan += saldoBulan
		grandTotal.SaldoSampai += saldoSampai
	}

	return &dto.PosisiKasResponse{
		Month:        req.Month,
		Year:         req.Year,
		AcademicYear: ay.Name,
		Posts:        posts,
		GrandTotal:   grandTotal,
	}, nil
}

func (s *reportService) GetSaldo(req dto.SaldoRequest) (*dto.SaldoResponse, error) {
	academicYearID := utility.ResolveAcademicYear(req.AcademicYearID, s.academicYearRepo)
	ay, err := s.academicYearRepo.FindByID(academicYearID)
	if err != nil {
		return nil, err
	}

	category := req.Category // "" = semua pos

	// Date ranges
	startOfMonth := time.Date(int(req.Year), time.Month(req.Month), 1, 0, 0, 0, 0, time.UTC)
	endOfMonth := startOfMonth.AddDate(0, 1, -1)
	endOfPrevMonth := startOfMonth.AddDate(0, 0, -1)

	// Saldo sebelum: penerimaan - pengeluaran from start of AY to end of prev month
	penerimaanSebelum, err := s.reportRepo.SumPenerimaan(academicYearID, ay.StartDate, endOfPrevMonth, category)
	if err != nil {
		return nil, err
	}
	pengeluaranSebelum, err := s.reportRepo.SumPengeluaran(academicYearID, ay.StartDate, endOfPrevMonth, category)
	if err != nil {
		return nil, err
	}
	saldoSebelum := penerimaanSebelum - pengeluaranSebelum

	// Daily data for the month
	dailyIncome, err := s.reportRepo.DailyPenerimaan(academicYearID, startOfMonth, endOfMonth, category)
	if err != nil {
		return nil, err
	}
	dailyExpense, err := s.reportRepo.DailyPengeluaran(academicYearID, startOfMonth, endOfMonth, category)
	if err != nil {
		return nil, err
	}

	// Collect all dates that have transactions
	dateSet := make(map[string]bool)
	for d := range dailyIncome {
		dateSet[d] = true
	}
	for d := range dailyExpense {
		dateSet[d] = true
	}

	// Sort dates
	var dates []string
	for d := range dateSet {
		dates = append(dates, d)
	}
	sortStrings(dates)

	// Build rows with running balance
	var rows []dto.SaldoRow
	runningBalance := saldoSebelum
	var totalPenerimaan, totalPengeluaran float64

	for _, d := range dates {
		penerimaan := dailyIncome[d]
		pengeluaran := dailyExpense[d]
		selisih := penerimaan - pengeluaran
		runningBalance += selisih

		totalPenerimaan += penerimaan
		totalPengeluaran += pengeluaran

		rows = append(rows, dto.SaldoRow{
			Date:        d,
			Penerimaan:  penerimaan,
			Pengeluaran: pengeluaran,
			Selisih:     selisih,
			Saldo:       runningBalance,
		})
	}

	// Post name & post list
	postName := "Semua Pos"
	var postList []string
	if category != "" {
		if label, ok := invoiceCategoryLabels[category]; ok {
			postName = label
		} else {
			postName = category
		}
	} else {
		// List all categories for sub-header
		for _, cat := range invoiceCategoryOrder {
			if label, ok := invoiceCategoryLabels[cat]; ok {
				postList = append(postList, label)
			}
		}
	}

	return &dto.SaldoResponse{
		Month:        req.Month,
		Year:         req.Year,
		AcademicYear: ay.Name,
		PostName:     postName,
		Category:     category,
		PostList:     postList,
		SaldoSebelum: saldoSebelum,
		Rows:         rows,
		TotalBulan: dto.SaldoTotalBulan{
			Penerimaan:  totalPenerimaan,
			Pengeluaran: totalPengeluaran,
			Selisih:     totalPenerimaan - totalPengeluaran,
		},
		SaldoAkhir: runningBalance,
	}, nil
}

// sortStrings sorts a slice of strings in place
func sortStrings(s []string) {
	for i := 1; i < len(s); i++ {
		for j := i; j > 0 && s[j] < s[j-1]; j-- {
			s[j], s[j-1] = s[j-1], s[j]
		}
	}
}

func (s *reportService) GetTransaksiPengeluaran(req dto.TransaksiPengeluaranRequest) (*dto.TransaksiPengeluaranResponse, error) {
	academicYearID := utility.ResolveAcademicYear(req.AcademicYearID, s.academicYearRepo)
	ay, err := s.academicYearRepo.FindByID(academicYearID)
	if err != nil {
		return nil, err
	}

	startOfMonth := time.Date(int(req.Year), time.Month(req.Month), 1, 0, 0, 0, 0, time.UTC)
	endOfMonth := startOfMonth.AddDate(0, 1, -1)

	expenses, err := s.reportRepo.FindExpensesForMonth(academicYearID, startOfMonth, endOfMonth)
	if err != nil {
		return nil, err
	}

	var transactions []dto.TransaksiPengeluaranBlock
	var grandTotal float64

	for _, exp := range expenses {
		// Category name: use parent if available, else child
		categoryName := exp.ExpenseCategory.Name
		parentName := ""
		if exp.ExpenseCategory.Parent != nil {
			parentName = exp.ExpenseCategory.Parent.Name
		}

		// Description for block header: parent category name or child
		keterangan := parentName
		if keterangan == "" {
			keterangan = categoryName
		}

		createdByName := exp.Creator.FullName

		block := dto.TransaksiPengeluaranBlock{
			ID:              exp.ID,
			TransactionDate: exp.ExpenseDate.Format("2006-01-02"),
			Source:          "cash", // currently all cash
			TotalAmount:     exp.Amount,
			TotalTerbilang:  utility.Terbilang(exp.Amount),
			Description:     keterangan,
			CategoryName:    keterangan,
			CreatedByName:   createdByName,
			CreatedAt:       exp.CreatedAt.Format("2006-01-02 15:04:05"),
			Items: []dto.TransaksiPengeluaranItem{
				{
					No:           1,
					CategoryName: categoryName,
					Description:  exp.Description,
					Amount:       exp.Amount,
				},
			},
		}

		transactions = append(transactions, block)
		grandTotal += exp.Amount
	}

	return &dto.TransaksiPengeluaranResponse{
		Month:        req.Month,
		Year:         req.Year,
		AcademicYear: ay.Name,
		Transactions: transactions,
		GrandTotal:   grandTotal,
	}, nil
}

func (s *reportService) GetTabunganReport(req dto.TabunganReportRequest) (*dto.TabunganReportResponse, error) {
	savingsType := req.Type // "" = semua, "general", "mandatory"

	startOfMonth := time.Date(int(req.Year), time.Month(req.Month), 1, 0, 0, 0, 0, time.UTC)
	endOfMonth := startOfMonth.AddDate(0, 1, -1)
	// Use a very early date as "beginning of time" for saldo sebelum
	beginningOfTime := time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC)
	endOfPrevMonth := startOfMonth.AddDate(0, 0, -1)

	// Saldo sebelum
	creditSebelum, err := s.reportRepo.SumSavingsCredit(beginningOfTime, endOfPrevMonth, savingsType)
	if err != nil {
		return nil, err
	}
	debitSebelum, err := s.reportRepo.SumSavingsDebit(beginningOfTime, endOfPrevMonth, savingsType)
	if err != nil {
		return nil, err
	}
	saldoSebelum := creditSebelum - debitSebelum

	// Daily data
	dailyCredit, err := s.reportRepo.DailySavingsCredit(startOfMonth, endOfMonth, savingsType)
	if err != nil {
		return nil, err
	}
	dailyDebit, err := s.reportRepo.DailySavingsDebit(startOfMonth, endOfMonth, savingsType)
	if err != nil {
		return nil, err
	}

	// Collect dates
	dateSet := make(map[string]bool)
	for d := range dailyCredit {
		dateSet[d] = true
	}
	for d := range dailyDebit {
		dateSet[d] = true
	}
	var dates []string
	for d := range dateSet {
		dates = append(dates, d)
	}
	sortStrings(dates)

	// Build rows
	var rows []dto.TabunganReportRow
	runningBalance := saldoSebelum
	var totalCredit, totalDebit float64

	for _, d := range dates {
		credit := dailyCredit[d]
		debit := dailyDebit[d]
		selisih := credit - debit
		runningBalance += selisih
		totalCredit += credit
		totalDebit += debit

		rows = append(rows, dto.TabunganReportRow{
			Date:        d,
			Penerimaan:  credit,
			Pengeluaran: debit,
			Selisih:     selisih,
			Saldo:       runningBalance,
		})
	}

	// Type label
	typeLabel := "Tabungan Siswa (Semua)"
	switch savingsType {
	case "general":
		typeLabel = "Tabungan Umum"
	case "mandatory":
		typeLabel = "Tabungan Wajib"
	}

	return &dto.TabunganReportResponse{
		Month:        req.Month,
		Year:         req.Year,
		TypeLabel:    typeLabel,
		Type:         savingsType,
		SaldoSebelum: saldoSebelum,
		Rows:         rows,
		TotalBulan: dto.SaldoTotalBulan{
			Penerimaan:  totalCredit,
			Pengeluaran: totalDebit,
			Selisih:     totalCredit - totalDebit,
		},
		SaldoAkhir: runningBalance,
	}, nil
}

func (s *reportService) GetTabunganSiswaReport(studentID uint, req dto.TabunganSiswaReportRequest) (*dto.TabunganSiswaReportResponse, error) {
	// Get student info
	student, err := s.studentRepo.FindByID(studentID)
	if err != nil {
		return nil, fmt.Errorf("siswa tidak ditemukan")
	}

	// Determine period
	var startDate, endDate time.Time
	if req.StartDate != "" {
		startDate, _ = time.Parse("2006-01-02", req.StartDate)
	} else {
		// Default: awal tahun ajaran aktif
		ay, _ := s.academicYearRepo.FindActive()
		if ay != nil {
			startDate = ay.StartDate
		} else {
			startDate = time.Date(time.Now().Year(), 7, 1, 0, 0, 0, 0, time.UTC)
		}
	}
	if req.EndDate != "" {
		endDate, _ = time.Parse("2006-01-02", req.EndDate)
	} else {
		endDate = time.Now()
	}

	// Get class group name
	classGroupName := ""
	for _, enr := range student.Enrollments {
		if enr.Status == "active" {
			classGroupName = enr.ClassGroup.Name
			break
		}
	}

	// Saldo awal = sum credits - sum debits before startDate
	creditBefore, _ := s.savingsTxnRepo.SumCreditByStudentBefore(studentID, startDate)
	debitBefore, _ := s.savingsTxnRepo.SumDebitByStudentBefore(studentID, startDate)
	saldoAwal := creditBefore - debitBefore

	// Get all transactions in period
	txns, err := s.savingsTxnRepo.FindAllByStudentID(studentID, startDate, endDate)
	if err != nil {
		return nil, err
	}

	// Build rows with running balance
	var rows []dto.TabunganSiswaRow
	runningBalance := saldoAwal
	var totalDebit, totalCredit float64

	sourceTypeLabels := map[string]string{
		"payment_deposit":        "Setoran via pembayaran",
		"guardian_withdrawal":    "Penarikan oleh wali murid",
		"payment_usage":          "Alokasi untuk pembayaran tagihan",
		"graduation_allocation":  "Alokasi untuk wisuda",
		"transfer_return":        "Pengembalian sisa tabungan wajib",
	}

	for _, txn := range txns {
		debit := float64(0)
		credit := float64(0)
		if txn.TransactionType == "credit" {
			debit = txn.NetAmount
			totalDebit += debit
		} else {
			credit = txn.NetAmount
			totalCredit += credit
		}
		runningBalance += debit - credit

		desc := sourceTypeLabels[txn.SourceType]
		if desc == "" {
			desc = txn.SourceType
		}
		if txn.Notes != "" {
			desc = txn.Notes
		}

		rows = append(rows, dto.TabunganSiswaRow{
			Date:        txn.CreatedAt.Format("2006-01-02"),
			Type:        txn.SourceType,
			Description: desc,
			Debit:       debit,
			Credit:      credit,
			Saldo:       runningBalance,
		})
	}

	return &dto.TabunganSiswaReportResponse{
		Student: dto.TabunganSiswaStudent{
			ID:         student.ID,
			FullName:   student.FullName,
			ClassGroup: classGroupName,
		},
		Period: dto.TabunganSiswaPeriod{
			StartDate: startDate.Format("2006-01-02"),
			EndDate:   endDate.Format("2006-01-02"),
		},
		SaldoAwal:   saldoAwal,
		Rows:        rows,
		TotalDebit:  totalDebit,
		TotalCredit: totalCredit,
		SaldoAkhir:  runningBalance,
	}, nil
}
