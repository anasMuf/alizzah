package utility

import (
	"api/model"
	"time"
)

// MapFeeItemsToInvoiceItems converts fee config items to invoice items.
func MapFeeItemsToInvoiceItems(invoiceID uint, items []model.FeeConfigItem) []model.InvoiceItem {
	result := make([]model.InvoiceItem, len(items))
	for i, item := range items {
		result[i] = model.InvoiceItem{
			InvoiceID:         invoiceID,
			Name:              item.Name,
			Category:          item.Category,
			Amount:            item.Amount,
			IsMandatory:       true,
			IsKoperasi:        item.IsKoperasi,
			KoperasiProductID: item.KoperasiProductID,
		}
	}
	return result
}

// SumInvoiceItems calculates the total amount from a slice of invoice items.
func SumInvoiceItems(items []model.InvoiceItem) float64 {
	total := float64(0)
	for _, item := range items {
		total += item.Amount
	}
	return total
}

// SumFeeConfigItems calculates the total amount from a slice of fee config items.
func SumFeeConfigItems(items []model.FeeConfigItem) float64 {
	total := float64(0)
	for _, item := range items {
		total += item.Amount
	}
	return total
}

// CalculateInvoiceStatus determines the status based on total and paid amounts.
func CalculateInvoiceStatus(total, paid float64) string {
	if paid == 0 {
		return "unpaid"
	}
	if paid >= total {
		return "paid"
	}
	return "partial"
}

// MonthYear is a simple struct for month-year pairs.
type MonthYear struct {
	Month uint
	Year  uint
}

// MonthRangeFromDate calculates all months from startDate to endDate (inclusive).
func MonthRangeFromDate(startDate time.Time, endDate time.Time) []MonthYear {
	var months []MonthYear
	current := time.Date(startDate.Year(), startDate.Month(), 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(endDate.Year(), endDate.Month(), 1, 0, 0, 0, 0, time.UTC)
	for !current.After(end) {
		months = append(months, MonthYear{
			Month: uint(current.Month()),
			Year:  uint(current.Year()),
		})
		current = current.AddDate(0, 1, 0)
	}
	return months
}
