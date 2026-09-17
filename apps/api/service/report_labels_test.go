package service

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

// TestInvoiceCategoryLabelsCoverOrder menjaga invarian: setiap kategori yang
// punya urutan tampil di Posisi Kas juga harus punya label. Kategori tanpa
// label tidak disembunyikan — ia tetap dirender apa adanya sebagai kode mentah
// (mis. "arrears"), kelas bug yang pernah muncul pada label jenis tagihan.
func TestInvoiceCategoryLabelsCoverOrder(t *testing.T) {
	for _, cat := range invoiceCategoryOrder {
		assert.NotEmptyf(
			t, invoiceCategoryLabels[cat],
			"kategori %q ada di invoiceCategoryOrder tapi tidak punya label", cat,
		)
	}
}

// TestInvoiceCategoryLabelArrears memastikan tunggakan punya label terbaca dan
// ditempatkan di urutan, bukan jatuh ke blok "kategori di luar urutan".
func TestInvoiceCategoryLabelArrears(t *testing.T) {
	assert.Equal(t, "Tunggakan", invoiceCategoryLabels["arrears"])
	assert.Contains(t, invoiceCategoryOrder, "arrears")
}
