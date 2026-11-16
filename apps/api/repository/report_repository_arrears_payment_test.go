package repository

import (
	"testing"
	"time"

	"api/model"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Pembayaran tunggakan harus bisa difilter sebagai pos "arrears" di laporan
// saldo. Test ini mengunci jalur DailyPenerimaan/SumPenerimaan dengan kategori
// tersebut, karena item tunggakan historis memakai category "arrears".
func TestPenerimaan_IncludesArrearsCategory(t *testing.T) {
	db := setupReportSoftDeleteTestDB(t)

	user := model.User{Email: "admin-arrears@test.com", Password: "hashed", Role: "superadmin", FullName: "Admin"}
	require.NoError(t, db.Create(&user).Error)

	ay := model.AcademicYear{
		Name:      "2025/2026",
		StartDate: time.Date(2025, 7, 1, 0, 0, 0, 0, time.UTC),
		EndDate:   time.Date(2026, 6, 30, 0, 0, 0, 0, time.UTC),
		IsActive:  true,
	}
	require.NoError(t, db.Create(&ay).Error)

	student := model.Student{
		FullName:   "Siswa Tunggakan",
		BirthPlace: "Jakarta",
		BirthDate:  time.Date(2015, 1, 1, 0, 0, 0, 0, time.UTC),
		Gender:     "L",
	}
	require.NoError(t, db.Create(&student).Error)

	// Tunggakan historis: month/year NULL, item category "arrears".
	invoice := model.Invoice{
		StudentID:      student.ID,
		AcademicYearID: ay.ID,
		Type:           "arrears",
		Status:         "partial",
		TotalAmount:    100000,
		PaidAmount:     40000,
	}
	require.NoError(t, db.Create(&invoice).Error)

	item := model.InvoiceItem{
		InvoiceID:  invoice.ID,
		Name:       "Tunggakan TA 2024/2025",
		Category:   "arrears",
		Amount:     100000,
		PaidAmount: 40000,
		Status:     "partial",
	}
	require.NoError(t, db.Create(&item).Error)

	paymentDate := time.Date(2025, 8, 10, 0, 0, 0, 0, time.UTC)
	payment := model.Payment{
		StudentID:      student.ID,
		AcademicYearID: ay.ID,
		PaymentDate:    paymentDate,
		TotalAmount:    40000,
		Source:         "cash",
		CreatedBy:      user.ID,
	}
	require.NoError(t, db.Create(&payment).Error)
	require.NoError(t, db.Create(&model.PaymentItem{
		PaymentID:     payment.ID,
		InvoiceItemID: item.ID,
		Amount:        40000,
	}).Error)

	repo := NewReportRepository(db)
	start := time.Date(2025, 7, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(2025, 9, 30, 0, 0, 0, 0, time.UTC)

	sum, err := repo.SumPenerimaan(ay.ID, start, end, "arrears")
	require.NoError(t, err)
	assert.Equal(t, 40000.0, sum)

	daily, err := repo.DailyPenerimaan(ay.ID, start, end, "arrears")
	require.NoError(t, err)
	var dailyTotal float64
	for _, v := range daily {
		dailyTotal += v
	}
	assert.Equal(t, 40000.0, dailyTotal)

	// Pos lain tidak boleh ikut mengambil pembayaran tunggakan.
	other, err := repo.SumPenerimaan(ay.ID, start, end, "monthly_spp")
	require.NoError(t, err)
	assert.Equal(t, 0.0, other)
}
