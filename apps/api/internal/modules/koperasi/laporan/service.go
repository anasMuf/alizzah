package laporan

import (
	"errors"
	"time"
)

type Service interface {
	Monthly(ayID uint, month, year int) (*MonthlyReport, error)
	ProfitLoss(ayID uint, startStr, endStr string) (*ProfitLoss, error)
	Receivables(ayID uint) (*OutstandingReport, error)
	Payables(ayID uint) (*OutstandingReport, error)
	Stock() (*StockReport, error)
}

type svc struct{ repo Repository }

func NewService(repo Repository) Service { return &svc{repo: repo} }

func (s *svc) Monthly(ayID uint, month, year int) (*MonthlyReport, error) {
	now := time.Now()
	if month == 0 {
		month = int(now.Month())
	}
	if year == 0 {
		year = now.Year()
	}
	if month < 1 || month > 12 {
		return nil, errors.New("Bulan tidak valid")
	}
	start := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	end := start.AddDate(0, 1, 0).Add(-time.Second)

	lines, err := s.repo.MonthlyByCategory(ayID, start, end)
	if err != nil {
		return nil, err
	}
	rep := &MonthlyReport{Month: month, Year: year, Categories: make([]CategoryLine, 0, len(lines))}
	for _, l := range lines {
		l.Net = l.Credit - l.Debit
		rep.Categories = append(rep.Categories, l)
		rep.TotalCredit += l.Credit
		rep.TotalDebit += l.Debit
	}
	rep.Net = rep.TotalCredit - rep.TotalDebit
	return rep, nil
}

func (s *svc) ProfitLoss(ayID uint, startStr, endStr string) (*ProfitLoss, error) {
	start := time.Date(1970, 1, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(2999, 12, 31, 23, 59, 59, 0, time.UTC)
	if startStr != "" {
		d, err := time.Parse("2006-01-02", startStr)
		if err != nil {
			return nil, errors.New("Format start_date tidak valid (YYYY-MM-DD)")
		}
		start = d
	}
	if endStr != "" {
		d, err := time.Parse("2006-01-02", endStr)
		if err != nil {
			return nil, errors.New("Format end_date tidak valid (YYYY-MM-DD)")
		}
		end = d.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
	}

	revenue, hpp, opex, err := s.repo.ProfitLossData(ayID, start, end)
	if err != nil {
		return nil, err
	}
	pl := &ProfitLoss{
		Revenue:          revenue,
		CostOfGoods:      hpp,
		GrossProfit:      revenue - hpp,
		OperatingExpense: opex,
		NetProfit:        revenue - hpp - opex,
	}
	if startStr != "" {
		pl.StartDate = startStr
	}
	if endStr != "" {
		pl.EndDate = endStr
	}
	return pl, nil
}

func (s *svc) Receivables(ayID uint) (*OutstandingReport, error) {
	rows, err := s.repo.Receivables(ayID)
	if err != nil {
		return nil, err
	}
	return toOutstanding(rows), nil
}

func (s *svc) Payables(ayID uint) (*OutstandingReport, error) {
	rows, err := s.repo.Payables(ayID)
	if err != nil {
		return nil, err
	}
	return toOutstanding(rows), nil
}

func toOutstanding(rows []outRow) *OutstandingReport {
	rep := &OutstandingReport{Items: make([]OutstandingItem, 0, len(rows))}
	for _, r := range rows {
		remaining := r.Total - r.Paid
		rep.Items = append(rep.Items, OutstandingItem{
			ID:        r.ID,
			Party:     r.Party,
			Date:      r.Date.Format("2006-01-02"),
			Total:     r.Total,
			Paid:      r.Paid,
			Remaining: remaining,
			Status:    r.Status,
		})
		rep.TotalRemaining += remaining
	}
	return rep
}

func (s *svc) Stock() (*StockReport, error) {
	rows, err := s.repo.Stock()
	if err != nil {
		return nil, err
	}
	rep := &StockReport{Items: make([]StockItem, 0, len(rows))}
	for _, r := range rows {
		val := float64(r.Stock) * r.CostPrice
		rep.Items = append(rep.Items, StockItem{
			ProductID:   r.ProductID,
			Name:        r.Name,
			VariantID:   r.VariantID,
			VariantName: r.VariantName,
			Stock:       r.Stock,
			CostPrice:   r.CostPrice,
			SalePrice:   r.SalePrice,
			StockValue:  val,
		})
		rep.TotalStockValue += val
	}
	return rep, nil
}
