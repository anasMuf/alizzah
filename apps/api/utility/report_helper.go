package utility

import (
	"api/dto"
	"api/model"
	"api/repository"
	"fmt"
	"time"
)

// FormatInvoicePeriod formats the period for student report
func FormatInvoicePeriod(inv model.Invoice) string {
	switch inv.Type {
	case "monthly":
		t := time.Date(int(*inv.Year), time.Month(*inv.Month), 1, 0, 0, 0, 0, time.UTC)
		return t.Format("January 2006")
	case "initial":
		return "Biaya Awal"
	case "registration":
		return "Registrasi Tahunan"
	case "graduation":
		return "Wisuda"
	default:
		return inv.Type
	}
}

// FormatPaymentRate calculates payment rate percentage
func FormatPaymentRate(paid, billed float64) string {
	if billed == 0 {
		return "0%"
	}
	return fmt.Sprintf("%.1f%%", (paid/billed)*100)
}

// ResolveAcademicYear resolves the active academic year if not provided
func ResolveAcademicYear(id uint, repo repository.AcademicYearRepository) uint {
	if id != 0 {
		return id
	}
	ay, err := repo.FindActive()
	if err != nil || ay == nil {
		return 0
	}
	return ay.ID
}

// SumBilled sums the billed amounts
func SumBilled(items []dto.BilledVsPaid) float64 {
	total := float64(0)
	for _, item := range items {
		total += item.Billed
	}
	return total
}

// SumPaid sums the paid amounts
func SumPaid(items []dto.BilledVsPaid) float64 {
	total := float64(0)
	for _, item := range items {
		total += item.Paid
	}
	return total
}

// SumCategoryAmounts sums the amounts in CategoryAmount list
func SumCategoryAmounts(items []dto.CategoryAmount) float64 {
	total := float64(0)
	for _, item := range items {
		total += item.Amount
	}
	return total
}

// NilIfEmpty returns nil if string is empty
func NilIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
