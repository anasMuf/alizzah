package utility

import (
	"math"
	"strings"
)

var satuan = []string{
	"", "Satu", "Dua", "Tiga", "Empat", "Lima",
	"Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas",
}

// terbilangHelper converts integer to Indonesian words (recursive)
func terbilangHelper(n int64) string {
	if n < 0 {
		return "Minus " + terbilangHelper(-n)
	}
	if n < 12 {
		return satuan[n]
	}
	if n < 20 {
		return satuan[n-10] + " Belas"
	}
	if n < 100 {
		sisa := n % 10
		result := satuan[n/10] + " Puluh"
		if sisa > 0 {
			result += " " + satuan[sisa]
		}
		return result
	}
	if n < 200 {
		sisa := n - 100
		if sisa == 0 {
			return "Seratus"
		}
		return "Seratus " + terbilangHelper(sisa)
	}
	if n < 1000 {
		sisa := n % 100
		result := satuan[n/100] + " Ratus"
		if sisa > 0 {
			result += " " + terbilangHelper(sisa)
		}
		return result
	}
	if n < 2000 {
		sisa := n - 1000
		if sisa == 0 {
			return "Seribu"
		}
		return "Seribu " + terbilangHelper(sisa)
	}
	if n < 1000000 {
		sisa := n % 1000
		result := terbilangHelper(n/1000) + " Ribu"
		if sisa > 0 {
			result += " " + terbilangHelper(sisa)
		}
		return result
	}
	if n < 1000000000 {
		sisa := n % 1000000
		result := terbilangHelper(n/1000000) + " Juta"
		if sisa > 0 {
			result += " " + terbilangHelper(sisa)
		}
		return result
	}
	if n < 1000000000000 {
		sisa := n % 1000000000
		result := terbilangHelper(n/1000000000) + " Miliar"
		if sisa > 0 {
			result += " " + terbilangHelper(sisa)
		}
		return result
	}
	sisa := n % 1000000000000
	result := terbilangHelper(n/1000000000000) + " Triliun"
	if sisa > 0 {
		result += " " + terbilangHelper(sisa)
	}
	return result
}

// Terbilang converts a float64 amount to Indonesian words with "Rupiah" suffix.
// Example: 26459400 → "Dua Puluh Enam Juta Empat Ratus Lima Puluh Sembilan Ribu Empat Ratus Rupiah"
func Terbilang(amount float64) string {
	n := int64(math.Round(amount))
	if n == 0 {
		return "Nol Rupiah"
	}

	result := terbilangHelper(n)
	result = strings.TrimSpace(result)
	return result + " Rupiah"
}
