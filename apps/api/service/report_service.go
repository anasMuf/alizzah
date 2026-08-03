package service

import (
	"api/dto"
	"api/repository"
	"api/utility"
	"fmt"
	"sort"
	"strings"
	"sync"
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
	GetPemasukan(req dto.PemasukanRequest) (*dto.PemasukanResponse, error)
	GetPengeluaran(req dto.PengeluaranRequest) (*dto.PengeluaranResponse, error)
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
		ay, err := s.academicYearRepo.FindActive()
		if err != nil {
			return nil, fmt.Errorf("gagal mengambil tahun ajaran aktif: %w", err)
		}
		academicYearID = ay.ID
	}

	date, err := utility.ParseDate(req.Date)
	if err != nil {
		return nil, fmt.Errorf("format date tidak valid (YYYY-MM-DD): %w", err)
	}
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

	ay, err := s.academicYearRepo.FindByID(academicYearID)
	if err != nil {
		return nil, fmt.Errorf("gagal mengambil data tahun ajaran: %w", err)
	}
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

var (
	annualReportCache     = map[uint]*dto.AnnualReportResponse{}
	annualReportCacheTime = map[uint]time.Time{}
	annualReportMu        sync.RWMutex
)

func (s *reportService) GetAnnualReport(req dto.AnnualReportRequest) (*dto.AnnualReportResponse, error) {
	annualReportMu.RLock()
	if cached, ok := annualReportCache[req.AcademicYearID]; ok {
		if time.Since(annualReportCacheTime[req.AcademicYearID]) < time.Hour {
			annualReportMu.RUnlock()
			return cached, nil
		}
	}
	annualReportMu.RUnlock()

	ay, err := s.academicYearRepo.FindByID(req.AcademicYearID)
	if err != nil {
		return nil, fmt.Errorf("gagal mengambil data tahun ajaran: %w", err)
	}

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

	annualReportMu.Lock()
	annualReportCache[req.AcademicYearID] = result
	annualReportCacheTime[req.AcademicYearID] = time.Now()
	annualReportMu.Unlock()

	return result, nil
}

func (s *reportService) GetStudentReport(studentID uint, req dto.StudentReportRequest) (*dto.StudentReportResponse, error) {
	student, err := s.studentRepo.FindByID(studentID)
	if err != nil {
		return nil, fmt.Errorf("gagal mengambil data siswa: %w", err)
	}

	academicYearID := uint(0)
	if !req.All {
		academicYearID = utility.ResolveAcademicYear(req.AcademicYearID, s.academicYearRepo)
	}

	invoiceSummary, _ := s.reportRepo.GetInvoiceSummaryByStudent(studentID, academicYearID)
	invoices, _ := s.invoiceRepo.FindByStudentID(studentID, "", "", academicYearID, false)
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
		var createdBy dto.UserBriefResponse
		if p.Creator.ID != 0 {
			createdBy = dto.UserBriefResponse{ID: p.Creator.ID, FullName: p.Creator.FullName}
		}
		paymentResponses[i] = dto.PaymentListResponse{
			ID:             p.ID,
			Student:        mapPaymentStudentBrief(p.Student),
			PaymentDate:    p.PaymentDate.Format("2006-01-02"),
			TotalAmount:    p.TotalAmount,
			SavingsDeposit: p.SavingsDeposit,
			Source:         p.Source,
			CreatedBy:      createdBy,
			CreatedAt:      p.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		}
	}

	return &dto.StudentReportResponse{
		Student:        mapPaymentStudentBrief(*student),
		Savings:        *savings,
		InvoiceSummary: *invoiceSummary,
		Invoices:       invoicesForReport,
		PaymentHistory: paymentResponses,
	}, nil
}

func (s *reportService) GetClassGroupReport(classGroupID uint, req dto.ClassGroupReportRequest) (*dto.ClassGroupReportResponse, error) {
	academicYearID := utility.ResolveAcademicYear(req.AcademicYearID, s.academicYearRepo)
	classGroup, err := s.classGroupRepo.FindByID(classGroupID)
	if err != nil {
		return nil, fmt.Errorf("gagal mengambil data rombel: %w", err)
	}

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
	"savings_mandatory": "Tabungan Wajib",
	"daycare":           "Daycare (SPD)",
	"daycare_meal":      "Konsumsi Daycare",
	"graduation":        "Wisuda",
	"facility":          "Fasilitas",
	"lainnya":           "Lain-lain",
	"savings_voluntary": "Tabungan Umum",
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
	"facility",
	"lainnya",
	"savings_voluntary",
}

func (s *reportService) GetPosisiKas(req dto.PosisiKasRequest) (*dto.PosisiKasResponse, error) {
	academicYearID := utility.ResolveAcademicYear(req.AcademicYearID, s.academicYearRepo)
	ay, err := s.academicYearRepo.FindByID(academicYearID)
	if err != nil {
		return nil, err
	}

	// Date ranges: date_from/date_to take priority over month/year
	var startDate, endDate, endPrevDate time.Time
	if req.DateFrom != "" && req.DateTo != "" {
		startDate, _ = time.Parse("2006-01-02", req.DateFrom)
		endDate, _ = time.Parse("2006-01-02", req.DateTo)
		endPrevDate = startDate.AddDate(0, 0, -1)
	} else {
		startDate = time.Date(int(req.Year), time.Month(req.Month), 1, 0, 0, 0, 0, time.UTC)
		endDate = startDate.AddDate(0, 1, -1)
		endPrevDate = startDate.AddDate(0, 0, -1)
	}

	// Parse categories filter
	var categoryFilter map[string]bool
	if req.Categories != "" || req.IncomeCategories != "" || req.IncludeSavings {
		categoryFilter = make(map[string]bool)
		for _, c := range strings.Split(req.Categories, ",") {
			c = strings.TrimSpace(c)
			if c != "" {
				categoryFilter[c] = true
			}
		}
		for _, c := range strings.Split(req.IncomeCategories, ",") {
			c = strings.TrimSpace(c)
			if c != "" {
				categoryFilter[c] = true
			}
		}
		if req.IncludeSavings {
			categoryFilter["savings_voluntary"] = true
		}
	}

	// Penerimaan bulan ini per category (dari invoice payment)
	penerimaanBulan, err := s.reportRepo.SumPenerimaanByInvoiceCategory(academicYearID, startDate, endDate)
	if err != nil {
		return nil, err
	}

	// Gabung penerimaan dari income_transactions (Dana BOS, Donasi, Hibah, Lainnya)
	incomeBulan, err := s.reportRepo.SumIncomeTransactionsByCategory(academicYearID, startDate, endDate, req.IncomeCategories)
	if err != nil {
		return nil, err
	}
	for cat, amount := range incomeBulan {
		penerimaanBulan[cat] += amount
	}

	// Gabung Tabungan Umum (savings deposits) as separate pos
	if req.IncludeSavings {
		savingsBulan, err := s.reportRepo.SumSavingsDeposits(academicYearID, startDate, endDate)
		if err != nil {
			return nil, err
		}
		if savingsBulan > 0 {
			penerimaanBulan["savings_voluntary"] += savingsBulan
		}
	}

	// Pengeluaran bulan ini per category (with details)
	pengeluaranBulan, err := s.reportRepo.SumPengeluaranByInvoiceCategory(academicYearID, startDate, endDate, req.ExpenseCategoryIDs)
	if err != nil {
		return nil, err
	}

	// Saldo sebelum: penerimaan - pengeluaran from start of AY to end of prev month
	penerimaanSebelum, err := s.reportRepo.SumPenerimaanByInvoiceCategory(academicYearID, ay.StartDate, endPrevDate)
	if err != nil {
		return nil, err
	}

	incomeSebelum, err := s.reportRepo.SumIncomeTransactionsByCategory(academicYearID, ay.StartDate, endPrevDate, req.IncomeCategories)
	if err != nil {
		return nil, err
	}
	for cat, amount := range incomeSebelum {
		penerimaanSebelum[cat] += amount
	}

	if req.IncludeSavings {
		savingsSebelum, err := s.reportRepo.SumSavingsDeposits(academicYearID, ay.StartDate, endPrevDate)
		if err != nil {
			return nil, err
		}
		penerimaanSebelum["savings_voluntary"] += savingsSebelum
	}

	pengeluaranSebelumRaw, err := s.reportRepo.SumPengeluaranByInvoiceCategory(academicYearID, ay.StartDate, endPrevDate, req.ExpenseCategoryIDs)
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

	// If categories filter is applied, only keep matching categories
	if categoryFilter != nil {
		for cat := range categorySet {
			if !categoryFilter[cat] {
				delete(categorySet, cat)
			}
		}
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
		} else if l, ok := incomeCategoryLabels[cat]; ok {
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
		} else if l, ok := incomeCategoryLabels[cat]; ok {
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

	dateFrom := req.DateFrom
	dateTo := req.DateTo

	return &dto.PosisiKasResponse{
		Month:        req.Month,
		Year:         req.Year,
		DateFrom:     dateFrom,
		DateTo:       dateTo,
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

	// Parse date range: date_from/date_to take priority over month/year
	var startDate, endDate, endPrevDate time.Time
	if req.DateFrom != "" && req.DateTo != "" {
		startDate, _ = time.Parse("2006-01-02", req.DateFrom)
		endDate, _ = time.Parse("2006-01-02", req.DateTo)
		endPrevDate = startDate.AddDate(0, 0, -1)
	} else {
		startDate = time.Date(int(req.Year), time.Month(req.Month), 1, 0, 0, 0, 0, time.UTC)
		endDate = startDate.AddDate(0, 1, -1)
		endPrevDate = startDate.AddDate(0, 0, -1)
	}

	// Parse categories: comma-separated takes priority over single category
	categories := []string{category}
	if req.Categories != "" {
		cats := strings.Split(req.Categories, ",")
		// Trim, filter empty, and deduplicate
		seen := make(map[string]bool)
		var filtered []string
		for _, c := range cats {
			c = strings.TrimSpace(c)
			if c != "" && !seen[c] {
				seen[c] = true
				filtered = append(filtered, c)
			}
		}
		categories = filtered
	}
	// If categories is just [""] (no invoice filter) AND no income filter → show all
	// If only income_categories specified, skip invoice queries
	allPos := len(categories) == 1 && categories[0] == "" && req.IncomeCategories == "" && !req.IncludeSavings
	onlyIncome := len(categories) == 1 && categories[0] == "" && req.IncomeCategories != ""

	// Aggregate data across all selected categories
	var mergedIncome map[string]float64
	var mergedExpense map[string]float64
	var totalPenerimaanSebelum, totalPengeluaranSebelum float64

	if allPos {
		mergedIncome, err = s.reportRepo.DailyPenerimaan(academicYearID, startDate, endDate, "")
		if err != nil {
			return nil, err
		}
		mergedExpense, err = s.reportRepo.DailyPengeluaran(academicYearID, startDate, endDate, "")
		if err != nil {
			return nil, err
		}
		penerimaanSebelum, err := s.reportRepo.SumPenerimaan(academicYearID, ay.StartDate, endPrevDate, "")
		if err != nil {
			return nil, err
		}
		pengeluaranSebelum, err := s.reportRepo.SumPengeluaran(academicYearID, ay.StartDate, endPrevDate, "")
		if err != nil {
			return nil, err
		}
		totalPenerimaanSebelum = penerimaanSebelum
		totalPengeluaranSebelum = pengeluaranSebelum
	} else if onlyIncome {
		mergedIncome = make(map[string]float64)
		mergedExpense = make(map[string]float64)
	} else if len(categories) > 0 && categories[0] != "" {
		mergedIncome = make(map[string]float64)
		mergedExpense = make(map[string]float64)
		for _, cat := range categories {
			catIncome, err := s.reportRepo.DailyPenerimaan(academicYearID, startDate, endDate, cat)
			if err != nil {
				return nil, err
			}
			for d, v := range catIncome {
				mergedIncome[d] += v
			}
			catExpense, err := s.reportRepo.DailyPengeluaran(academicYearID, startDate, endDate, cat)
			if err != nil {
				return nil, err
			}
			for d, v := range catExpense {
				mergedExpense[d] += v
			}
			pSebelum, err := s.reportRepo.SumPenerimaan(academicYearID, ay.StartDate, endPrevDate, cat)
			if err != nil {
				return nil, err
			}
			totalPenerimaanSebelum += pSebelum
			pengSebelum, err := s.reportRepo.SumPengeluaran(academicYearID, ay.StartDate, endPrevDate, cat)
			if err != nil {
				return nil, err
			}
			totalPengeluaranSebelum += pengSebelum
		}
	} else {
		mergedIncome = make(map[string]float64)
		mergedExpense = make(map[string]float64)
	}

	saldoSebelum := totalPenerimaanSebelum - totalPengeluaranSebelum

	// 3. Income transactions (add to penerimaan).
	// allPos: skip — DailyPenerimaan/SumPenerimaan already include them.
	// onlyIncome / explicit income_categories: include.
	if onlyIncome || strings.TrimSpace(req.IncomeCategories) != "" {
		incomeDaily, err := s.reportRepo.DailyIncomeTransactions(academicYearID, startDate, endDate, req.IncomeCategories)
		if err != nil {
			return nil, err
		}
		for d, v := range incomeDaily {
			mergedIncome[d] += v
		}
		incomeSumSebelum, err := s.reportRepo.SumIncomeTransactions(academicYearID, ay.StartDate, endPrevDate, req.IncomeCategories)
		if err != nil {
			return nil, err
		}
		saldoSebelum += incomeSumSebelum
	}

	// 4. Savings deposits (Tabungan Umum) — add to penerimaan (only when explicitly requested)
	if allPos || req.IncludeSavings {
		savingsDaily, err := s.reportRepo.DailySavingsDeposits(academicYearID, startDate, endDate)
		if err != nil {
			return nil, err
		}
		for d, v := range savingsDaily {
			mergedIncome[d] += v
		}
		savingsSumSebelum, err := s.reportRepo.SumSavingsDeposits(academicYearID, ay.StartDate, endPrevDate)
		if err != nil {
			return nil, err
		}
		saldoSebelum += savingsSumSebelum
	}

	// Collect all dates that have transactions
	dateSet := make(map[string]bool)
	for d := range mergedIncome {
		dateSet[d] = true
	}
	for d := range mergedExpense {
		dateSet[d] = true
	}

	// Sort dates
	var dates []string
	for d := range dateSet {
		dates = append(dates, d)
	}
	sort.Strings(dates)

	// Build rows with running balance
	var rows []dto.SaldoRow
	runningBalance := saldoSebelum
	var totalPenerimaan, totalPengeluaran float64

	for _, d := range dates {
		penerimaan := mergedIncome[d]
		pengeluaran := mergedExpense[d]
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
	var categoryDisplay string
	var categoriesDisplay []string
	if onlyIncome {
		postName = "Penerimaan Lain"
	} else if req.IncludeSavings && len(categories) == 1 && categories[0] == "" {
		postName = "Tabungan Umum"
	} else if !allPos {
		if len(categories) == 1 {
			categoryDisplay = categories[0]
			if label, ok := invoiceCategoryLabels[categoryDisplay]; ok {
				postName = label
			} else {
				postName = categoryDisplay
			}
		} else {
			postName = fmt.Sprintf("%d Pos", len(categories))
			for _, cat := range categories {
				if label, ok := invoiceCategoryLabels[cat]; ok {
					categoriesDisplay = append(categoriesDisplay, label)
				} else {
					categoriesDisplay = append(categoriesDisplay, cat)
				}
			}
		}
	} else {
		for _, cat := range invoiceCategoryOrder {
			if label, ok := invoiceCategoryLabels[cat]; ok {
				postList = append(postList, label)
			}
		}
	}

	dateFrom := req.DateFrom
	dateTo := req.DateTo

	return &dto.SaldoResponse{
		Month:        req.Month,
		Year:         req.Year,
		DateFrom:     dateFrom,
		DateTo:       dateTo,
		AcademicYear: ay.Name,
		PostName:     postName,
		Category:     categoryDisplay,
		Categories:   categoriesDisplay,
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
	// Use the start of the active academic year as baseline
	ay, ayErr := s.academicYearRepo.FindActive()
	if ayErr != nil {
		return nil, fmt.Errorf("gagal mengambil tahun ajaran aktif: %w", ayErr)
	}
	beginningOfTime := ay.StartDate
	endOfPrevMonth := startOfMonth.AddDate(0, 0, -1)

	// Saldo sebelum = sum debits (masuk/setoran) - sum credits (keluar/penarikan)
	// DB "debit" type = money IN, DB "credit" type = money OUT
	creditSebelum, err := s.reportRepo.SumSavingsCredit(beginningOfTime, endOfPrevMonth, savingsType)
	if err != nil {
		return nil, err
	}
	debitSebelum, err := s.reportRepo.SumSavingsDebit(beginningOfTime, endOfPrevMonth, savingsType)
	if err != nil {
		return nil, err
	}
	saldoSebelum := debitSebelum - creditSebelum

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
	sort.Strings(dates)

	// Build rows
	// DB "debit" = money IN (setoran)  → DTO "Penerimaan"
	// DB "credit" = money OUT (penarikan) → DTO "Pengeluaran"
	var rows []dto.TabunganReportRow
	runningBalance := saldoSebelum
	var totalPenerimaan, totalPengeluaran float64

	for _, d := range dates {
		penerimaan := dailyDebit[d]   // DB debit = money IN
		pengeluaran := dailyCredit[d] // DB credit = money OUT
		selisih := penerimaan - pengeluaran
		runningBalance += selisih
		totalPenerimaan += penerimaan
		totalPengeluaran += pengeluaran

		rows = append(rows, dto.TabunganReportRow{
			Date:        d,
			Penerimaan:  penerimaan,
			Pengeluaran: pengeluaran,
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
			Penerimaan:  totalPenerimaan,
			Pengeluaran: totalPengeluaran,
			Selisih:     totalPenerimaan - totalPengeluaran,
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

	// Saldo awal = sum debits (masuk) - sum credits (keluar) before startDate
	// DB "debit" type = money IN (setoran), DB "credit" type = money OUT (penarikan/pakai)
	creditBefore, _ := s.savingsTxnRepo.SumCreditByStudentBefore(studentID, startDate)
	debitBefore, _ := s.savingsTxnRepo.SumDebitByStudentBefore(studentID, startDate)
	saldoAwal := debitBefore - creditBefore

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
		"payment_deposit":       "Setoran via pembayaran",
		"payment_mandatory":     "Setoran tabungan wajib dari pembayaran",
		"guardian_withdrawal":   "Penarikan oleh wali murid",
		"payment_usage":         "Alokasi untuk pembayaran tagihan",
		"graduation_allocation": "Alokasi untuk wisuda",
		"transfer_return":       "Pengembalian sisa tabungan wajib",
	}

	for _, txn := range txns {
		debit := float64(0)
		credit := float64(0)
		// DB "credit" type = money OUT (pakai/penarikan)  → DTO "credit" = keluar
		// DB "debit"  type = money IN  (setoran)          → DTO "debit"  = masuk
		if txn.TransactionType == "credit" {
			credit = txn.NetAmount
			totalCredit += credit
		} else {
			debit = txn.NetAmount
			totalDebit += debit
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

func (s *reportService) GetPemasukan(req dto.PemasukanRequest) (*dto.PemasukanResponse, error) {
	academicYearID := utility.ResolveAcademicYear(req.AcademicYearID, s.academicYearRepo)
	ay, err := s.academicYearRepo.FindByID(academicYearID)
	if err != nil {
		return nil, err
	}

	startDate, _ := time.Parse("2006-01-02", req.DateFrom)
	endDate, _ := time.Parse("2006-01-02", req.DateTo)

	// Parse categories from request
	var categories []string
	if req.Categories != "" {
		for _, s := range strings.Split(req.Categories, ",") {
			s = strings.TrimSpace(s)
			if s != "" {
				categories = append(categories, s)
			}
		}
	}

	// Query summary
	rows, err := s.reportRepo.FindPemasukanSummary(academicYearID, startDate, endDate, categories, req.PaymentMethod, req.IncomeCategories, req.IncludeSavings)
	if err != nil {
		return nil, err
	}

	// Map category codes to display labels
	for i := range rows {
		if label, ok := invoiceCategoryLabels[rows[i].Category]; ok {
			rows[i].Category = label
		}
	}

	// Calculate grand total
	var grandTotal float64
	for _, r := range rows {
		grandTotal += r.Amount
	}

	return &dto.PemasukanResponse{
		DateFrom:     req.DateFrom,
		DateTo:       req.DateTo,
		AcademicYear: ay.Name,
		Rows:         rows,
		GrandTotal:   grandTotal,
	}, nil
}

func (s *reportService) GetPengeluaran(req dto.PengeluaranRequest) (*dto.PengeluaranResponse, error) {
	academicYearID := utility.ResolveAcademicYear(req.AcademicYearID, s.academicYearRepo)
	ay, err := s.academicYearRepo.FindByID(academicYearID)
	if err != nil {
		return nil, err
	}

	startDate, _ := time.Parse("2006-01-02", req.DateFrom)
	endDate, _ := time.Parse("2006-01-02", req.DateTo)

	// Parse expense category IDs
	var expenseIDs []string
	if req.ExpenseCategoryIDs != "" {
		expenseIDs = strings.Split(req.ExpenseCategoryIDs, ",")
	}

	// Query
	rows, err := s.reportRepo.FindPengeluaranRows(academicYearID, startDate, endDate, expenseIDs)
	if err != nil {
		return nil, err
	}

	var grandTotal float64
	for _, r := range rows {
		grandTotal += r.Amount
	}

	return &dto.PengeluaranResponse{
		DateFrom:     req.DateFrom,
		DateTo:       req.DateTo,
		AcademicYear: ay.Name,
		Rows:         rows,
		GrandTotal:   grandTotal,
	}, nil
}
