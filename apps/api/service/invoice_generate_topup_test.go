package service

import (
	"api/model"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

// seedCoreFeeItems menambahkan tarif SPP + Infaq ke fee config fixture.
func seedCoreFeeItems(t *testing.T, db *gorm.DB, ayID uint) {
	t.Helper()

	var fc model.FeeConfig
	require.NoError(t, db.Where("academic_year_id = ?", ayID).First(&fc).Error)

	require.NoError(t, db.Create(&model.FeeConfigItem{
		FeeConfigID: fc.ID, Category: "monthly_spp", ItemKey: "spp_sem1",
		Name: "SPP (Sem 1)", Level: "intan", Gender: "all", Amount: 150000, Unit: "fixed",
	}).Error)
	require.NoError(t, db.Create(&model.FeeConfigItem{
		FeeConfigID: fc.ID, Category: "monthly_spp", ItemKey: "spp_sem2",
		Name: "SPP (Sem 2)", Level: "intan", Gender: "all", Amount: 175000, Unit: "fixed",
	}).Error)
	require.NoError(t, db.Create(&model.FeeConfigItem{
		FeeConfigID: fc.ID, Category: "monthly_infaq", ItemKey: "infaq_harian",
		Name: "Infaq Harian", Level: "all", Gender: "all", Amount: 6000, Unit: "per_day",
	}).Error)
}

// TestGenerateMonthly_TopUpsCoreItemsOnExistingInvoice memastikan invoice bulanan
// yang sudah dibuat alur lain (mis. daycare) tetap dilengkapi SPP & Infaq saat
// enrollment akademik digenerate, tanpa menghapus item yang sudah ada.
func TestGenerateMonthly_TopUpsCoreItemsOnExistingInvoice(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedExclusionBaseFixture(t, db, false)
	ayID := fx.AcademicYear.ID
	studentID := fx.StudentID

	seedCoreFeeItems(t, db, ayID)

	require.NoError(t, db.Create(&model.EffectiveDay{
		ClassGroupID: 0, Level: "intan", AcademicYearID: ayID,
		Month: 11, Year: 2025, TotalDays: 14, TotalMondays: 4, CreatedBy: 1,
	}).Error)

	// Invoice November sudah ada dari alur daycare (tanpa SPP/Infaq).
	month, year := uint(11), uint(2025)
	inv := model.Invoice{
		StudentID: studentID, AcademicYearID: ayID, Type: "monthly",
		Month: &month, Year: &year, Status: "unpaid", TotalAmount: 300000,
	}
	require.NoError(t, db.Create(&inv).Error)
	require.NoError(t, db.Create(&model.InvoiceItem{
		InvoiceID: inv.ID, Name: "SPD Premium", Category: "daycare",
		Amount: 300000, Status: "unpaid",
	}).Error)

	gen := newTestInvoiceGen(t, db)
	require.NoError(t, gen.GenerateMonthly(dtoGenerateMonthlyParams(studentID, ayID, 11, 2025, nil)))

	var items []model.InvoiceItem
	require.NoError(t, db.Where("invoice_id = ?", inv.ID).Find(&items).Error)

	counts := map[string]int{}
	total := float64(0)
	for _, it := range items {
		counts[it.Category]++
		total += it.Amount
	}

	assert.Equal(t, 1, counts["daycare"], "item lama tidak boleh hilang/duplikat")
	assert.Equal(t, 1, counts["monthly_spp"], "SPP harus ditambahkan")
	assert.Equal(t, 1, counts["monthly_infaq"], "Infaq harus ditambahkan")
	assert.Equal(t, 300000.0+150000.0+84000.0, total)

	var got model.Invoice
	require.NoError(t, db.First(&got, inv.ID).Error)
	assert.Equal(t, 534000.0, got.TotalAmount)
	assert.Equal(t, "unpaid", got.Status)

	// Idempotent: generate ulang tidak boleh menambah duplikat.
	require.NoError(t, gen.GenerateMonthly(dtoGenerateMonthlyParams(studentID, ayID, 11, 2025, nil)))
	require.NoError(t, db.Where("invoice_id = ?", inv.ID).Find(&items).Error)
	counts = map[string]int{}
	for _, it := range items {
		counts[it.Category]++
	}
	assert.Equal(t, 1, counts["monthly_spp"])
	assert.Equal(t, 1, counts["monthly_infaq"])
}

// TestGenerateMonthly_TopUpSkipsPaidInvoice memastikan invoice yang sudah lunas
// tidak diubah oleh top-up.
func TestGenerateMonthly_TopUpSkipsPaidInvoice(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedExclusionBaseFixture(t, db, false)
	ayID := fx.AcademicYear.ID
	studentID := fx.StudentID

	seedCoreFeeItems(t, db, ayID)

	month, year := uint(11), uint(2025)
	inv := model.Invoice{
		StudentID: studentID, AcademicYearID: ayID, Type: "monthly",
		Month: &month, Year: &year, Status: "paid", TotalAmount: 300000, PaidAmount: 300000,
	}
	require.NoError(t, db.Create(&inv).Error)
	require.NoError(t, db.Create(&model.InvoiceItem{
		InvoiceID: inv.ID, Name: "SPD Premium", Category: "daycare",
		Amount: 300000, PaidAmount: 300000, Status: "paid",
	}).Error)

	gen := newTestInvoiceGen(t, db)
	require.NoError(t, gen.GenerateMonthly(dtoGenerateMonthlyParams(studentID, ayID, 11, 2025, nil)))

	var count int64
	require.NoError(t, db.Model(&model.InvoiceItem{}).
		Where("invoice_id = ? AND category = ?", inv.ID, "monthly_spp").Count(&count).Error)
	assert.Equal(t, int64(0), count, "invoice lunas tidak boleh ditambah SPP")

	var got model.Invoice
	require.NoError(t, db.First(&got, inv.ID).Error)
	assert.Equal(t, 300000.0, got.TotalAmount)
	assert.Equal(t, "paid", got.Status)
}
