package service

import (
	"testing"

	"api/dto"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestGetDailyReport_RingkasanKasPakaiBasisLedger mengunci keputusan bahwa
// Ringkasan Kas (opening/credit/debit/closing) memakai ledger kas_transactions,
// bukan IncomeSummary/ExpenseSummary. Keduanya sengaja berbeda: arus kas juga
// mencakup transfer kas↔brangkas dan pergerakan tabungan yang tidak muncul
// sebagai pemasukan/pengeluaran per kategori.
//
// CATATAN: test ini mengunci perilaku perubahan pada GetDailyReport yang saat
// ini masih belum ter-commit (closing balance berbasis ledger). Test ini SENGAJA
// tidak disertakan dalam commit perubahan saldo brangkas karena akan merah tanpa
// perubahan tersebut — lembar ini disimpan hingga perubahan itu di-commit.
func TestGetDailyReport_RingkasanKasPakaiBasisLedger(t *testing.T) {
	cash := &stubDailyReportCashRepo{
		// Pemasukan per kategori (informasional) 500.000...
		byCategory: []dto.CategoryAmount{{Category: "monthly_spp", Amount: 500000}},
		// ...sedangkan ledgernya bergerak 900.000 masuk / 150.000 keluar,
		// selisihnya berasal dari mutasi yang bukan pemasukan kategori.
		balanceUpToDate: 1000000,
		dayCredit:       900000,
		dayDebit:        150000,
	}
	report := &stubDailyReportReportRepo{
		expenseByCategory: []dto.CategoryAmount{{Category: "Operasional", Amount: 120000}},
	}
	svc := newStubDailyReportService(cash, &stubDailyReportVaultRepo{}, report)

	res, err := svc.GetDailyReport(dto.DailyReportRequest{Date: "2026-09-02", AcademicYearID: 3})
	require.NoError(t, err)

	assert.Equal(t, 500000.0, res.IncomeSummary.Total, "rincian kategori tetap dari income per kategori")
	assert.Equal(t, 120000.0, res.ExpenseSummary.Total)

	assert.Equal(t, 900000.0, res.Cash.TotalCredit, "total_credit harus dari ledger, bukan income_summary")
	assert.Equal(t, 150000.0, res.Cash.TotalDebit, "total_debit harus dari ledger, bukan expense_summary")
	assert.Equal(t, 1000000.0, res.Cash.OpeningBalance)

	// Invarian rekonsiliasi: saldo akhir = saldo awal + arus kas hari itu.
	assert.Equal(t, 1750000.0, res.Cash.ClosingBalance)
	assert.Equal(
		t, res.Cash.OpeningBalance+res.Cash.TotalCredit-res.Cash.TotalDebit,
		res.Cash.ClosingBalance,
	)
}
