package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupSyncPreviewTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db := setupBillingExclusionInvoiceTestDB(t)
	require.NoError(t, db.AutoMigrate(&model.DaycareEnrollment{}))
	return db
}

func TestFeeItemsToAddForMonth_Filters(t *testing.T) {
	db := setupSyncPreviewTestDB(t)
	fx := seedExclusionInvoiceFixture(t, db)

	var inv model.Invoice
	require.NoError(t, db.Where("student_id = ? AND month = ? AND year = ?", fx.StudentID, 8, 2025).First(&inv).Error)

	// Item "Robotika" sudah ada di invoice → harus di-skip oleh filter
	require.NoError(t, db.Create(&model.InvoiceItem{InvoiceID: inv.ID, Name: "Robotika", Category: "pasta", Amount: 100000, IsMandatory: true}).Error)

	startMonth := uint(9)
	feeItems := []model.FeeConfigItem{
		{Name: "Robotika", Category: "pasta", Level: "all", Amount: 100000, Unit: "fixed"},                          // sudah ada → skip
		{Name: "Berlian Only", Category: "pasta", Level: "berlian", Amount: 50000, Unit: "fixed"},                   // level tidak cocok (siswa intan) → skip
		{Name: "Mulai Sep", Category: "pasta", Level: "all", Amount: 50000, Unit: "fixed", StartMonth: &startMonth}, // startMonth 9 > bulan 8 → skip
		{Name: "Sempoa Kids", Category: "pasta", Level: "all", Amount: 50000, Unit: "fixed"},                        // valid → tambah
	}

	gen := newTestInvoiceGen(t, db).(*invoiceGenerateService)
	toAdd := gen.feeItemsToAddForMonth(inv.ID, 8, "intan", feeItems)

	require.Len(t, toAdd, 1)
	assert.Equal(t, "Sempoa Kids", toAdd[0].Name)
}

func TestPlanExtracurricularSync_ClassifiesMonths(t *testing.T) {
	db := setupSyncPreviewTestDB(t)
	fx := seedExclusionInvoiceFixture(t, db)

	// Setup: exclusion Oktober, item Robotika sudah ada di November, invoice Februari dihapus
	exclRepo := repository.NewBillingMonthExclusionRepository(db)
	require.NoError(t, exclRepo.Replace(db, fx.StudentID, "extracurricular", fx.ExID, []model.BillingMonthExclusion{
		{StudentID: fx.StudentID, EntityType: "extracurricular", EntityRefID: fx.ExID, Month: 10, Year: 2025, AcademicYearID: fx.AcademicYear.ID},
	}))

	var novInv model.Invoice
	require.NoError(t, db.Where("student_id = ? AND month = ? AND year = ?", fx.StudentID, 11, 2025).First(&novInv).Error)
	require.NoError(t, db.Create(&model.InvoiceItem{InvoiceID: novInv.ID, Name: "Robotika", Category: "pasta", Amount: 100000, IsMandatory: true}).Error)

	var febInv model.Invoice
	require.NoError(t, db.Where("student_id = ? AND month = ? AND year = ?", fx.StudentID, 2, 2026).First(&febInv).Error)
	require.NoError(t, db.Delete(&febInv).Error)

	gen := newTestInvoiceGen(t, db)
	resp, err := gen.PlanExtracurricularSync()
	require.NoError(t, err)

	var item *dto.ExtracurricularPreviewItem
	for i := range resp.Items {
		if resp.Items[i].StudentID == fx.StudentID && resp.Items[i].ExtracurricularID == fx.ExID {
			item = &resp.Items[i]
			break
		}
	}
	require.NotNil(t, item, "preview harus memuat enrollment Robotika siswa")
	assert.Equal(t, "Robotika", item.ExtracurricularName)

	// 11 bulan (Agu 2025..Jun 2026): 8 ditambah, Okt=excluded, Nov=exists, Feb=no_invoice
	require.Len(t, item.MonthsToAdd, 8)
	assert.Equal(t, uint(1), item.SkippedExcluded)
	assert.Equal(t, uint(1), item.SkippedExists)
	assert.Equal(t, uint(1), item.SkippedNoInvoice)

	// Bulan yang ditambahkan tidak boleh mencakup bulan skip/ada/invoice-hilang
	addedKeys := map[string]bool{}
	for _, m := range item.MonthsToAdd {
		addedKeys[keyOfMonthYear(m)] = true
	}
	assert.False(t, addedKeys["10-2025"], "Oktober (excluded) tidak boleh masuk months_to_add")
	assert.False(t, addedKeys["11-2025"], "November (sudah ada) tidak boleh masuk months_to_add")
	assert.False(t, addedKeys["2-2026"], "Februari (invoice hilang) tidak boleh masuk months_to_add")
	assert.True(t, addedKeys["8-2025"], "Agustus harus masuk months_to_add")
	assert.True(t, addedKeys["1-2026"], "Januari harus masuk months_to_add")
}

func TestPlanExtracurricularSync_ReadOnly(t *testing.T) {
	db := setupSyncPreviewTestDB(t)
	fx := seedExclusionInvoiceFixture(t, db)

	gen := newTestInvoiceGen(t, db)

	countInvoices := func() int64 {
		var n int64
		require.NoError(t, db.Model(&model.Invoice{}).Count(&n).Error)
		return n
	}
	countItems := func() int64 {
		var n int64
		require.NoError(t, db.Model(&model.InvoiceItem{}).Count(&n).Error)
		return n
	}
	countExclusions := func() int64 {
		var n int64
		require.NoError(t, db.Model(&model.BillingMonthExclusion{}).Count(&n).Error)
		return n
	}

	beforeInv, beforeItems, beforeExcl := countInvoices(), countItems(), countExclusions()

	_, err := gen.PlanExtracurricularSync()
	require.NoError(t, err)
	_, err = gen.PlanDaycareSync()
	require.NoError(t, err)

	assert.Equal(t, beforeInv, countInvoices(), "preview tidak boleh mengubah jumlah invoice")
	assert.Equal(t, beforeItems, countItems(), "preview tidak boleh mengubah jumlah invoice_items")
	assert.Equal(t, beforeExcl, countExclusions(), "preview tidak boleh mengubah jumlah exclusion")
	_ = fx
}

func TestPlanDaycareSync_PremiumRegular(t *testing.T) {
	db := setupSyncPreviewTestDB(t)
	fx := seedExclusionInvoiceFixture(t, db)

	user := model.User{Email: "daycare@test.com", Password: "h", Role: "admin", FullName: "Admin Daycare"}
	require.NoError(t, db.Create(&user).Error)

	premium := model.DaycareEnrollment{
		StudentID: fx.StudentID, AcademicYearID: fx.AcademicYear.ID, PackageType: "premium_full",
		Category: "premium", TimeSlot: "07-15", AgeGroup: "kbtk",
		StartDate: time.Date(2025, 8, 1, 0, 0, 0, 0, time.UTC), Status: "active", CreatedBy: user.ID,
	}
	require.NoError(t, db.Create(&premium).Error)
	regular := model.DaycareEnrollment{
		StudentID: fx.StudentID, AcademicYearID: fx.AcademicYear.ID, PackageType: "regular",
		Category: "regular", TimeSlot: "10-15", AgeGroup: "kbtk",
		StartDate: time.Date(2025, 8, 1, 0, 0, 0, 0, time.UTC), Status: "active", CreatedBy: user.ID,
	}
	require.NoError(t, db.Create(&regular).Error)

	gen := newTestInvoiceGen(t, db)
	resp, err := gen.PlanDaycareSync()
	require.NoError(t, err)
	require.Len(t, resp.Items, 2)

	byCategory := map[string]dto.DaycarePreviewItem{}
	for _, it := range resp.Items {
		byCategory[it.Category] = it
	}
	assert.True(t, byCategory["premium"].WillSync, "premium harus akan disinkronkan")
	assert.False(t, byCategory["regular"].WillSync, "regular harus dilewati")
	assert.Contains(t, byCategory["regular"].Reason, "regular")
}

func keyOfMonthYear(m dto.MonthYearBrief) string {
	return fmt.Sprintf("%d-%d", m.Month, m.Year)
}
