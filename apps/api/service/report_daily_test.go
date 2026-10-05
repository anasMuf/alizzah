package service

import (
	"testing"
	"time"

	"api/dto"
	"api/model"
	"api/repository"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Stub minimal untuk GetDailyReport. Interface di-embed agar method yang tidak
// dipakai tetap memenuhi kontrak tanpa boilerplate; memanggilnya akan panik,
// yang justru berguna sebagai alarm bila ketergantungan baru muncul.

type stubDailyReportCashRepo struct {
	repository.CashTransactionRepository
	byCategory      []dto.CategoryAmount
	balanceUpToDate float64
	dayCredit       float64
	dayDebit        float64
}

func (s *stubDailyReportCashRepo) SumByCategory(uint, time.Time, time.Time) ([]dto.CategoryAmount, error) {
	return s.byCategory, nil
}

func (s *stubDailyReportCashRepo) GetBalanceUpToDate(uint, time.Time) (float64, error) {
	return s.balanceUpToDate, nil
}

func (s *stubDailyReportCashRepo) SumByDate(uint, time.Time) (float64, float64, error) {
	return s.dayCredit, s.dayDebit, nil
}

type stubDailyReportVaultRepo struct {
	repository.VaultTransactionRepository
	balance        float64
	calledWithDate time.Time
}

func (s *stubDailyReportVaultRepo) GetBalanceUpToDate(_ uint, date time.Time) (float64, error) {
	s.calledWithDate = date
	return s.balance, nil
}

type stubDailyReportReportRepo struct {
	repository.ReportRepository
	expenseByCategory []dto.CategoryAmount
}

func (s *stubDailyReportReportRepo) SumExpenseByCategory(uint, time.Time, time.Time) ([]dto.CategoryAmount, error) {
	return s.expenseByCategory, nil
}

type stubDailyReportAYRepo struct {
	repository.AcademicYearRepository
}

func (s *stubDailyReportAYRepo) FindByID(uint) (*model.AcademicYear, error) {
	return &model.AcademicYear{Name: "2026/2027"}, nil
}

type stubDailyReportClosingRepo struct {
	repository.DailyClosingRepository
}

func (s *stubDailyReportClosingRepo) FindByDate(time.Time) (*model.DailyClosing, error) {
	return nil, nil
}

func newStubDailyReportService(
	cash repository.CashTransactionRepository,
	vault repository.VaultTransactionRepository,
	report repository.ReportRepository,
) ReportService {
	return NewReportService(
		report, &stubDailyReportAYRepo{}, cash, vault, &stubDailyReportClosingRepo{},
		nil, nil, nil, nil, nil, nil, nil,
	)
}

// TestGetDailyReport_SaldoBrangkasIkutTanggalLaporan memastikan saldo brangkas
// dihitung sampai tanggal laporan, bukan saldo terkini — laporan tanggal lampau
// tidak boleh menampilkan saldo hari ini.
func TestGetDailyReport_SaldoBrangkasIkutTanggalLaporan(t *testing.T) {
	vault := &stubDailyReportVaultRepo{balance: 250000}
	svc := newStubDailyReportService(&stubDailyReportCashRepo{}, vault, &stubDailyReportReportRepo{})

	res, err := svc.GetDailyReport(dto.DailyReportRequest{Date: "2026-09-02", AcademicYearID: 3})
	require.NoError(t, err)

	assert.Equal(t, 250000.0, res.Vault.Balance)
	require.False(t, vault.calledWithDate.IsZero(), "repo brangkas harus dipanggil dengan tanggal")
	assert.Equal(t, 2026, vault.calledWithDate.Year())
	assert.Equal(t, time.September, vault.calledWithDate.Month())
	assert.Equal(t, 2, vault.calledWithDate.Day())
}
