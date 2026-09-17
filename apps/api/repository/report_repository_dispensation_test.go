package repository

import (
	"testing"
	"time"

	"api/model"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

// seedDispensationReportFixture menyiapkan satu invoice bulanan berisi:
//   - item SPP (monthly_spp) 100.000, dibayar 40.000
//   - item dispensasi −25.000 yang sudah dipetakan ke monthly_spp
//   - item dispensasi −5.000 yang BELUM dipetakan (offset_category kosong)
//
// plus satu pembayaran yang mengalokasikan ketiganya, untuk menguji atribusi pos
// pada jalur berbasis item (SumInvoiceByCategory) maupun berbasis pembayaran
// (SumByCategory).
func seedDispensationReportFixture(t *testing.T, db *gorm.DB) uint {
	t.Helper()

	user := model.User{Email: "admin-disp@test.com", Password: "hashed", Role: "superadmin", FullName: "Admin"}
	require.NoError(t, db.Create(&user).Error)

	ay := model.AcademicYear{
		Name:      "2026/2027",
		StartDate: time.Date(2026, 7, 13, 0, 0, 0, 0, time.UTC),
		EndDate:   time.Date(2027, 6, 30, 0, 0, 0, 0, time.UTC),
		IsActive:  true,
	}
	require.NoError(t, db.Create(&ay).Error)

	student := model.Student{
		FullName:   "Siswa Dispensasi",
		BirthPlace: "Jakarta",
		BirthDate:  time.Date(2015, 1, 1, 0, 0, 0, 0, time.UTC),
		Gender:     "L",
	}
	require.NoError(t, db.Create(&student).Error)

	month, year := uint(1), uint(2026)
	invoice := model.Invoice{
		StudentID: student.ID, AcademicYearID: ay.ID,
		Type: "monthly", Month: &month, Year: &year,
		Status: "partial", TotalAmount: 70000, PaidAmount: 40000,
	}
	require.NoError(t, db.Create(&invoice).Error)

	spp := model.InvoiceItem{InvoiceID: invoice.ID, Name: "SPP", Category: "monthly_spp", Amount: 100000, PaidAmount: 40000, Status: "partial"}
	require.NoError(t, db.Create(&spp).Error)

	dispMapped := model.InvoiceItem{
		InvoiceID: invoice.ID, Name: "Dispensasi: SPP", Category: "dispensation",
		Amount: -25000, PaidAmount: 0, Status: "unpaid", OffsetCategory: "monthly_spp",
	}
	require.NoError(t, db.Create(&dispMapped).Error)

	dispUnmapped := model.InvoiceItem{
		InvoiceID: invoice.ID, Name: "Dispensasi: Belum Dipetakan", Category: "dispensation",
		Amount: -5000, PaidAmount: 0, Status: "unpaid",
	}
	require.NoError(t, db.Create(&dispUnmapped).Error)

	payment := model.Payment{
		StudentID: student.ID, AcademicYearID: ay.ID,
		PaymentDate: time.Date(2026, 8, 1, 0, 0, 0, 0, time.UTC),
		TotalAmount: 10000, Source: "cash", CreatedBy: user.ID,
	}
	require.NoError(t, db.Create(&payment).Error)

	for _, pi := range []model.PaymentItem{
		{PaymentID: payment.ID, InvoiceItemID: spp.ID, Amount: 40000},
		{PaymentID: payment.ID, InvoiceItemID: dispMapped.ID, Amount: -25000},
		{PaymentID: payment.ID, InvoiceItemID: dispUnmapped.ID, Amount: -5000},
	} {
		require.NoError(t, db.Create(&pi).Error)
	}

	return ay.ID
}

// TestSumInvoiceByCategory_NetsDispensationToOriginPos memverifikasi jalur
// berbasis item: dispensasi yang terpetakan mengurangi pos asalnya, bukan
// berdiri sebagai bucket "dispensation".
func TestSumInvoiceByCategory_NetsDispensationToOriginPos(t *testing.T) {
	db := setupReportSoftDeleteTestDB(t)
	ayID := seedDispensationReportFixture(t, db)

	results, err := NewReportRepository(db).SumInvoiceByCategory(ayID, 1, 2026)
	require.NoError(t, err)

	billed := map[string]float64{}
	for _, r := range results {
		billed[r.Category] = r.Billed
	}

	// 100.000 − 25.000: dispensasi terpetakan menempel ke SPP.
	assert.Equal(t, 75000.0, billed["monthly_spp"])
	// Hanya dispensasi yang BELUM dipetakan yang berdiri sendiri — sinyal data.
	assert.Equal(t, -5000.0, billed["dispensation"])
}

// TestSumByCategory_NetsDispensationToOriginPos memverifikasi jalur berbasis
// pembayaran (laporan harian): perlakuan dispensasi harus sama dengan Posisi Kas,
// yang sudah lebih dulu memetakan ke pos asal.
func TestSumByCategory_NetsDispensationToOriginPos(t *testing.T) {
	db := setupReportSoftDeleteTestDB(t)
	ayID := seedDispensationReportFixture(t, db)

	start := time.Date(2026, 7, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 9, 30, 0, 0, 0, 0, time.UTC)

	results, err := NewCashTransactionRepository(db).SumByCategory(ayID, start, end)
	require.NoError(t, err)

	amounts := map[string]float64{}
	for _, r := range results {
		amounts[r.Category] = r.Amount
	}

	// 40.000 − 25.000: dispensasi terpetakan mengurangi SPP.
	assert.Equal(t, 15000.0, amounts["monthly_spp"])
	assert.Equal(t, -5000.0, amounts["dispensation"])
}

// TestSumByCategory_TotalUnchangedByAttribution memastikan pengalihan hanya
// memindahkan atribusi: jumlah total lintas pos identik dengan penjumlahan
// mentah per kategori.
func TestSumByCategory_TotalUnchangedByAttribution(t *testing.T) {
	db := setupReportSoftDeleteTestDB(t)
	ayID := seedDispensationReportFixture(t, db)

	start := time.Date(2026, 7, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 9, 30, 0, 0, 0, 0, time.UTC)

	results, err := NewCashTransactionRepository(db).SumByCategory(ayID, start, end)
	require.NoError(t, err)

	var total float64
	for _, r := range results {
		total += r.Amount
	}
	// 40.000 (SPP) − 25.000 − 5.000 (dispensasi) = 10.000, tak berubah oleh
	// pemetaan pos.
	assert.Equal(t, 10000.0, total)
}
