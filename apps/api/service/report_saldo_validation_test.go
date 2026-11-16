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

type stubSaldoAYRepo struct {
	repository.AcademicYearRepository
	ay model.AcademicYear
}

func (s *stubSaldoAYRepo) FindByID(uint) (*model.AcademicYear, error) {
	return &s.ay, nil
}

func (s *stubSaldoAYRepo) FindActive() (*model.AcademicYear, error) {
	return &s.ay, nil
}

func TestValidateReportDateRange(t *testing.T) {
	ayStart := time.Date(2025, 7, 14, 0, 0, 0, 0, time.UTC)
	ayEnd := time.Date(2026, 6, 30, 0, 0, 0, 0, time.UTC)

	tests := []struct {
		name    string
		start   time.Time
		end     time.Time
		wantErr bool
	}{
		{"tepat di batas TA", ayStart, ayEnd, false},
		{"di dalam TA", time.Date(2025, 8, 1, 0, 0, 0, 0, time.UTC), time.Date(2026, 5, 31, 0, 0, 0, 0, time.UTC), false},
		{"mulai sebelum TA", ayStart.AddDate(0, 0, -1), ayEnd, true},
		{"selesai setelah TA", ayStart, ayEnd.AddDate(0, 0, 1), true},
		{"di luar TA sepenuhnya", time.Date(2026, 11, 1, 0, 0, 0, 0, time.UTC), time.Date(2026, 11, 16, 0, 0, 0, 0, time.UTC), true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateReportDateRange(tt.start, tt.end, ayStart, ayEnd, "2025/2026")
			if tt.wantErr {
				require.Error(t, err)
				assert.Contains(t, err.Error(), "di luar tahun ajaran")
				return
			}
			require.NoError(t, err)
		})
	}
}

func TestGetSaldo_RejectsDatesOutsideSelectedAcademicYear(t *testing.T) {
	svc := NewReportService(
		nil,
		&stubSaldoAYRepo{ay: model.AcademicYear{
			Name:      "2025/2026",
			StartDate: time.Date(2025, 7, 14, 0, 0, 0, 0, time.UTC),
			EndDate:   time.Date(2026, 6, 30, 0, 0, 0, 0, time.UTC),
		}},
		nil, nil, nil, nil, nil, nil, nil, nil, nil, nil,
	)

	_, err := svc.GetSaldo(dto.SaldoRequest{
		AcademicYearID: 2,
		DateFrom:       "2026-11-01",
		DateTo:         "2026-11-16",
	})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "di luar tahun ajaran")
}

func TestGetSaldo_RejectsInvalidDateRange(t *testing.T) {
	svc := NewReportService(
		nil,
		&stubSaldoAYRepo{ay: model.AcademicYear{
			Name:      "2025/2026",
			StartDate: time.Date(2025, 7, 14, 0, 0, 0, 0, time.UTC),
			EndDate:   time.Date(2026, 6, 30, 0, 0, 0, 0, time.UTC),
		}},
		nil, nil, nil, nil, nil, nil, nil, nil, nil, nil,
	)

	t.Run("date_to sebelum date_from", func(t *testing.T) {
		_, err := svc.GetSaldo(dto.SaldoRequest{
			AcademicYearID: 2,
			DateFrom:       "2025-09-10",
			DateTo:         "2025-09-01",
		})
		require.Error(t, err)
		assert.Contains(t, err.Error(), "tidak boleh sebelum")
	})

	t.Run("format tanggal salah", func(t *testing.T) {
		_, err := svc.GetSaldo(dto.SaldoRequest{
			AcademicYearID: 2,
			DateFrom:       "10-09-2025",
			DateTo:         "2025-09-30",
		})
		require.Error(t, err)
		assert.Contains(t, err.Error(), "Format date_from")
	})

	t.Run("tanggal tidak diisi", func(t *testing.T) {
		_, err := svc.GetSaldo(dto.SaldoRequest{AcademicYearID: 2})
		require.Error(t, err)
		assert.Contains(t, err.Error(), "wajib diisi")
	})
}

func TestGetPemasukan_RejectsDatesOutsideAcademicYear(t *testing.T) {
	svc := NewReportService(
		nil,
		&stubSaldoAYRepo{ay: model.AcademicYear{
			Name:      "2025/2026",
			StartDate: time.Date(2025, 7, 14, 0, 0, 0, 0, time.UTC),
			EndDate:   time.Date(2026, 6, 30, 0, 0, 0, 0, time.UTC),
		}},
		nil, nil, nil, nil, nil, nil, nil, nil, nil, nil,
	)

	_, err := svc.GetPemasukan(dto.PemasukanRequest{
		AcademicYearID: 2,
		DateFrom:       "2026-11-01",
		DateTo:         "2026-11-16",
	})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "di luar tahun ajaran")
}

func TestGetPosisiKas_RejectsDatesOutsideAcademicYear(t *testing.T) {
	svc := NewReportService(
		nil,
		&stubSaldoAYRepo{ay: model.AcademicYear{
			Name:      "2025/2026",
			StartDate: time.Date(2025, 7, 14, 0, 0, 0, 0, time.UTC),
			EndDate:   time.Date(2026, 6, 30, 0, 0, 0, 0, time.UTC),
		}},
		nil, nil, nil, nil, nil, nil, nil, nil, nil, nil,
	)

	_, err := svc.GetPosisiKas(dto.PosisiKasRequest{
		AcademicYearID: 2,
		DateFrom:       "2026-11-01",
		DateTo:         "2026-11-16",
	})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "di luar tahun ajaran")
}
