package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

// seedDaycareEnrollmentFixture membuat enrollment daycare regular untuk siswa
// dari fixture billing exclusion, lengkap dengan fee item SPD harian dan data
// kehadiran bulanan Oktober 2025 (5 hari).
func seedDaycareEnrollmentFixture(t *testing.T, db *gorm.DB, fx exclusionInvoiceFixture) model.DaycareEnrollment {
	t.Helper()

	var fc model.FeeConfig
	require.NoError(t, db.Where("academic_year_id = ?", fx.AcademicYear.ID).First(&fc).Error)
	require.NoError(t, db.Create(&model.FeeConfigItem{
		FeeConfigID: fc.ID,
		Category:    "daycare",
		ItemKey:     "daycare_regular_0715_kbtk_daily",
		Name:        "SPD Daycare",
		Level:       "all",
		Gender:      "all",
		Amount:      50000,
		Unit:        "per_day",
	}).Error)

	de := model.DaycareEnrollment{
		StudentID:      fx.StudentID,
		AcademicYearID: fx.AcademicYear.ID,
		PackageType:    "regular_0715_kbtk",
		Category:       "regular",
		TimeSlot:       "07-15",
		AgeGroup:       "kbtk",
		StartDate:      time.Date(2025, 8, 1, 0, 0, 0, 0, time.UTC),
		Status:         "active",
		CreatedBy:      1,
	}
	require.NoError(t, db.Create(&de).Error)

	require.NoError(t, db.Create(&model.DaycareMonthlyAttendance{
		StudentID:      fx.StudentID,
		AcademicYearID: fx.AcademicYear.ID,
		Month:          10,
		Year:           2025,
		SPDDays:        5,
		CreatedBy:      1,
	}).Error)

	return de
}

func newDaycareBillingExclusionSvc(t *testing.T, db *gorm.DB) BillingExclusionService {
	t.Helper()
	return NewBillingExclusionService(
		db,
		repository.NewBillingMonthExclusionRepository(db),
		repository.NewAcademicYearRepository(db),
		newTestInvoiceGen(t, db),
	)
}

// Skip satu bulan daycare harus menghapus SPD, konsumsi, dan overtime yang
// belum dibayar, tetapi mempertahankan item yang sudah dibayar.
func TestSetExclusions_DaycareSkipKeepsPaidItems(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedExclusionInvoiceFixture(t, db)
	de := seedDaycareEnrollmentFixture(t, db, fx)

	var inv model.Invoice
	require.NoError(t, db.Where("student_id = ? AND month = ? AND year = ?", fx.StudentID, 10, 2025).First(&inv).Error)
	require.NoError(t, db.Create(&model.InvoiceItem{
		InvoiceID: inv.ID, Name: "SPD Daycare (5 hari)", Category: "daycare", Amount: 250000,
	}).Error)
	require.NoError(t, db.Create(&model.InvoiceItem{
		InvoiceID: inv.ID, Name: "Konsumsi (5 hari)", Category: "daycare_meal", Amount: 100000,
	}).Error)
	require.NoError(t, db.Create(&model.InvoiceItem{
		InvoiceID: inv.ID, Name: "Overtime (2 unit)", Category: "daycare_overtime", Amount: 40000,
	}).Error)
	paidItem := model.InvoiceItem{
		InvoiceID: inv.ID, Name: "SPD Daycare (paid)", Category: "daycare", Amount: 250000,
		PaidAmount: 250000, Status: "paid",
	}
	require.NoError(t, db.Create(&paidItem).Error)

	svc := newDaycareBillingExclusionSvc(t, db)
	_, err := svc.SetExclusions(fx.StudentID, "daycare", de.ID, dtoSetMonths(
		dto.BillingExclusionMonth{Month: 10, Year: 2025},
	))
	require.NoError(t, err)

	countDaycare, _ := countInvoiceItems(t, db, inv.ID, "daycare")
	countMeal, _ := countInvoiceItems(t, db, inv.ID, "daycare_meal")
	countOvertime, _ := countInvoiceItems(t, db, inv.ID, "daycare_overtime")

	assert.Equal(t, int64(1), countDaycare, "hanya item paid yang tersisa")
	assert.Equal(t, int64(0), countMeal, "konsumsi unpaid harus terhapus")
	assert.Equal(t, int64(0), countOvertime, "overtime unpaid harus terhapus")

	var remaining model.InvoiceItem
	require.NoError(t, db.Where("invoice_id = ? AND category = ?", inv.ID, "daycare").First(&remaining).Error)
	assert.Equal(t, paidItem.ID, remaining.ID)
}

// Generate bulan yang di-skip tidak boleh menambah item; mencabut skip harus
// mengembalikan SPD regular sesuai jumlah hari kehadiran bulanan.
func TestSetExclusions_DaycareSkipBlocksGenerateAndRestoreRebuilds(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedExclusionInvoiceFixture(t, db)
	de := seedDaycareEnrollmentFixture(t, db, fx)

	var inv model.Invoice
	require.NoError(t, db.Where("student_id = ? AND month = ? AND year = ?", fx.StudentID, 10, 2025).First(&inv).Error)

	svc := newDaycareBillingExclusionSvc(t, db)
	_, err := svc.SetExclusions(fx.StudentID, "daycare", de.ID, dtoSetMonths(
		dto.BillingExclusionMonth{Month: 10, Year: 2025},
	))
	require.NoError(t, err)

	// Generate manual setelah skip tidak boleh menagih daycare bulan tsb.
	require.NoError(t, newTestInvoiceGen(t, db).GenerateDaycareMonthlyInvoices(dto.GenerateDaycareMonthlyParams{
		StudentID:      fx.StudentID,
		AcademicYearID: fx.AcademicYear.ID,
		Month:          10,
		Year:           2025,
	}))
	count, _ := countInvoiceItems(t, db, inv.ID, "daycare")
	assert.Equal(t, int64(0), count, "bulan skip tidak boleh menghasilkan item daycare")

	// Cabut skip → SPD regular dibangun ulang dari 5 hari × 50.000.
	_, err = svc.SetExclusions(fx.StudentID, "daycare", de.ID, dtoSetMonths())
	require.NoError(t, err)

	var items []model.InvoiceItem
	require.NoError(t, db.Where("invoice_id = ? AND category = ?", inv.ID, "daycare").Find(&items).Error)
	require.Len(t, items, 1)
	assert.Equal(t, float64(250000), items[0].Amount)
	require.NotNil(t, items[0].Quantity)
	assert.Equal(t, uint(5), *items[0].Quantity)
}

// seedPremiumDaycareEnrollmentFixture membuat enrollment daycare premium serta
// fee item SPD flat dan overtime. Kehadiran bulanan November 2025 berisi 60 menit
// overtime (2 unit × Rp20.000).
func seedPremiumDaycareEnrollmentFixture(t *testing.T, db *gorm.DB, fx exclusionInvoiceFixture) model.DaycareEnrollment {
	t.Helper()

	var fc model.FeeConfig
	require.NoError(t, db.Where("academic_year_id = ?", fx.AcademicYear.ID).First(&fc).Error)
	require.NoError(t, db.Create(&model.FeeConfigItem{
		FeeConfigID: fc.ID,
		Category:    "daycare",
		ItemKey:     "daycare_premium_0715_kbtk_spd",
		Name:        "SPD Premium",
		Level:       "all",
		Gender:      "all",
		Amount:      400000,
		Unit:        "fixed",
	}).Error)
	require.NoError(t, db.Create(&model.FeeConfigItem{
		FeeConfigID: fc.ID,
		Category:    "daycare",
		ItemKey:     "daycare_overtime",
		Name:        "Overtime",
		Level:       "all",
		Gender:      "all",
		Amount:      20000,
		Unit:        "per_30min",
	}).Error)

	de := model.DaycareEnrollment{
		StudentID:      fx.StudentID,
		AcademicYearID: fx.AcademicYear.ID,
		PackageType:    "premium_0715_kbtk",
		Category:       "premium",
		TimeSlot:       "07-15",
		AgeGroup:       "kbtk",
		StartDate:      time.Date(2025, 8, 1, 0, 0, 0, 0, time.UTC),
		Status:         "active",
		CreatedBy:      1,
	}
	require.NoError(t, db.Create(&de).Error)

	require.NoError(t, db.Create(&model.DaycareMonthlyAttendance{
		StudentID:       fx.StudentID,
		AcademicYearID:  fx.AcademicYear.ID,
		Month:           11,
		Year:            2025,
		OvertimeMinutes: 60,
		CreatedBy:       1,
	}).Error)

	return de
}

// Restore satu bulan daycare premium harus scoped ke bulan target: SPD flat
// ditambahkan kembali, tetapi overtime unpaid di bulan lain tidak boleh terhapus.
func TestSetExclusions_DaycarePremiumRestoreDoesNotTouchOtherMonths(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedExclusionInvoiceFixture(t, db)
	de := seedPremiumDaycareEnrollmentFixture(t, db, fx)

	var novInv model.Invoice
	require.NoError(t, db.Where("student_id = ? AND month = ? AND year = ?", fx.StudentID, 11, 2025).First(&novInv).Error)
	overtimeQty := uint(2)
	require.NoError(t, db.Create(&model.InvoiceItem{
		InvoiceID: novInv.ID, Name: "Overtime (2 unit)", Category: "daycare_overtime",
		Amount: 40000, Quantity: &overtimeQty,
	}).Error)

	svc := newDaycareBillingExclusionSvc(t, db)
	_, err := svc.SetExclusions(fx.StudentID, "daycare", de.ID, dtoSetMonths(
		dto.BillingExclusionMonth{Month: 10, Year: 2025},
	))
	require.NoError(t, err)

	// Cabut skip Oktober → hanya Oktober yang di-restore.
	_, err = svc.SetExclusions(fx.StudentID, "daycare", de.ID, dtoSetMonths())
	require.NoError(t, err)

	var octInv model.Invoice
	require.NoError(t, db.Where("student_id = ? AND month = ? AND year = ?", fx.StudentID, 10, 2025).First(&octInv).Error)
	octCount, octTotal := countInvoiceItems(t, db, octInv.ID, "daycare")
	assert.Equal(t, int64(1), octCount, "SPD flat Oktober harus dipulihkan")
	assert.Equal(t, float64(400000), octTotal)

	// Overtime November tidak boleh ikut terhapus oleh restore Oktober.
	var novItems []model.InvoiceItem
	require.NoError(t, db.Where("invoice_id = ? AND category = ?", novInv.ID, "daycare_overtime").Find(&novItems).Error)
	require.Len(t, novItems, 1)
	assert.Equal(t, float64(40000), novItems[0].Amount)
}

// Bulan dengan item daycare yang sudah dibayar harus dilaporkan sebagai
// paid_months agar UI menonaktifkan checkbox bulan tersebut.
func TestGetByStudentAndEntity_DaycareReportsPaidMonths(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedExclusionInvoiceFixture(t, db)
	de := seedDaycareEnrollmentFixture(t, db, fx)

	var sepInv model.Invoice
	require.NoError(t, db.Where("student_id = ? AND month = ? AND year = ?", fx.StudentID, 9, 2025).First(&sepInv).Error)
	require.NoError(t, db.Create(&model.InvoiceItem{
		InvoiceID: sepInv.ID, Name: "SPD Daycare (paid)", Category: "daycare",
		Amount: 250000, PaidAmount: 250000, Status: "paid",
	}).Error)

	svc := newDaycareBillingExclusionSvc(t, db)
	resp, err := svc.GetByStudentAndEntity(fx.StudentID, "daycare", de.ID)
	require.NoError(t, err)
	require.Len(t, resp.PaidMonths, 1)
	assert.Equal(t, uint(9), resp.PaidMonths[0].Month)
	assert.Equal(t, uint(2025), resp.PaidMonths[0].Year)
}
