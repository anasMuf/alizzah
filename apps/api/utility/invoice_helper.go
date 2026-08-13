package utility

import (
	"api/model"
	"strings"
	"time"
)

// InvoiceItemNameHasBase mengecek apakah nama item invoice ber-dasar base:
// sama persis dengan base, atau mengikuti format baku "<base> (N hari)".
// Pencocokan nama dasar (bukan substring) mencegah "ZONA 1" ikut cocok
// dengan item "ZONA 10 (24 hari)".
func InvoiceItemNameHasBase(itemName, base string) bool {
	if base == "" {
		return false
	}
	if itemName == base {
		return true
	}
	return strings.HasPrefix(itemName, base) &&
		strings.HasPrefix(itemName[len(base):], " (")
}

// EscapeLikePattern meng-escape karakter wildcard LIKE (% _ \) agar nama
// yang mengandung karakter tersebut dicocokkan secara literal.
func EscapeLikePattern(s string) string {
	return strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(s)
}

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
