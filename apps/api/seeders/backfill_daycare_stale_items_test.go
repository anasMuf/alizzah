package seeders

import (
	"api/model"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupDaycareSeederTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	// sqlite :memory: bersifat per-koneksi; pin ke satu koneksi agar semua query
	// melihat database yang sama.
	sqlDB, err := db.DB()
	require.NoError(t, err)
	sqlDB.SetMaxOpenConns(1)

	require.NoError(t, db.AutoMigrate(
		&model.User{},
		&model.AcademicYear{},
		&model.ClassGroup{},
		&model.Student{},
		&model.StudentEnrollment{},
		&model.StudentGuardian{},
		&model.StudentExceptionality{},
		&model.StudentSavings{},
		&model.FeeConfig{},
		&model.FeeConfigItem{},
		&model.Invoice{},
		&model.InvoiceItem{},
		&model.InvoiceInstallment{},
		&model.BillingMonthExclusion{},
		&model.DaycareEnrollment{},
		&model.DaycareMonthlyAttendance{},
	))
	return db
}

type daycareSeederFixture struct {
	Invoice    model.Invoice
	OldSPD     model.InvoiceItem
	NewSPD     model.InvoiceItem
	LegacyMeal model.InvoiceItem
}

// seedDaycareDuplicateInvoice membuat invoice bulanan dengan tiga item kategori
// "daycare": SPD slot lama, SPD slot baru, dan konsumsi legacy.
func seedDaycareDuplicateInvoice(t *testing.T, db *gorm.DB, withMonthlyAttendance bool) daycareSeederFixture {
	t.Helper()

	user := model.User{Email: "admin@test.com", Password: "h", Role: "superadmin", FullName: "Admin"}
	require.NoError(t, db.Create(&user).Error)

	ay := model.AcademicYear{
		Name:      "2025/2026",
		StartDate: time.Date(2025, 7, 14, 0, 0, 0, 0, time.UTC),
		EndDate:   time.Date(2026, 6, 30, 0, 0, 0, 0, time.UTC),
		IsActive:  true,
	}
	require.NoError(t, db.Create(&ay).Error)

	student := model.Student{
		FullName:   "Anak Test",
		BirthPlace: "Jakarta",
		BirthDate:  time.Date(2018, 1, 1, 0, 0, 0, 0, time.UTC),
		Gender:     "L",
		Status:     "active",
	}
	require.NoError(t, db.Create(&student).Error)

	fc := model.FeeConfig{AcademicYearID: ay.ID}
	require.NoError(t, db.Create(&fc).Error)

	require.NoError(t, db.Create(&model.FeeConfigItem{
		FeeConfigID: fc.ID, Category: "daycare", ItemKey: "daycare_regular_1013_kbtk_daily",
		Name: "SPD Regular 10-13 KB-TK", Level: "all", Gender: "all", Amount: 10000, Unit: "per_day",
	}).Error)
	require.NoError(t, db.Create(&model.FeeConfigItem{
		FeeConfigID: fc.ID, Category: "daycare", ItemKey: "daycare_regular_1015_kbtk_daily",
		Name: "SPD Regular 10-15 KB-TK", Level: "all", Gender: "all", Amount: 15000, Unit: "per_day",
	}).Error)
	require.NoError(t, db.Create(&model.FeeConfigItem{
		FeeConfigID: fc.ID, Category: "daycare", ItemKey: "daycare_regular_meal",
		Name: "Paket Konsumsi Regular", Level: "all", Gender: "all", Amount: 20000, Unit: "per_day",
	}).Error)

	de := model.DaycareEnrollment{
		StudentID:      student.ID,
		AcademicYearID: ay.ID,
		PackageType:    "regular_1015_kbtk",
		Category:       "regular",
		TimeSlot:       "10-15",
		AgeGroup:       "kbtk",
		StartDate:      time.Date(2025, 8, 1, 0, 0, 0, 0, time.UTC),
		Status:         "active",
		CreatedBy:      user.ID,
	}
	require.NoError(t, db.Create(&de).Error)

	if withMonthlyAttendance {
		require.NoError(t, db.Create(&model.DaycareMonthlyAttendance{
			StudentID:      student.ID,
			AcademicYearID: ay.ID,
			Month:          10,
			Year:           2025,
			SPDDays:        2,
			MealDays:       2,
			CreatedBy:      user.ID,
		}).Error)
	}

	month, year := uint(10), uint(2025)
	inv := model.Invoice{
		StudentID: student.ID, AcademicYearID: ay.ID, Type: "monthly",
		Month: &month, Year: &year, Status: "unpaid",
	}
	require.NoError(t, db.Create(&inv).Error)

	qty := uint(2)
	oldUnit, newUnit, mealUnit := 10000.0, 15000.0, 20000.0

	oldSPD := model.InvoiceItem{
		InvoiceID: inv.ID, Name: "SPD Regular 10-13 KB-TK (2 hari)", Category: "daycare",
		Amount: 20000, Quantity: &qty, UnitPrice: &oldUnit, Status: "unpaid",
	}
	require.NoError(t, db.Create(&oldSPD).Error)

	newSPD := model.InvoiceItem{
		InvoiceID: inv.ID, Name: "SPD Regular 10-15 KB-TK (2 hari)", Category: "daycare",
		Amount: 30000, Quantity: &qty, UnitPrice: &newUnit, Status: "unpaid",
	}
	require.NoError(t, db.Create(&newSPD).Error)

	legacyMeal := model.InvoiceItem{
		InvoiceID: inv.ID, Name: "Paket Konsumsi Regular (2 hari)", Category: "daycare",
		Amount: 40000, Quantity: &qty, UnitPrice: &mealUnit, Status: "unpaid",
	}
	require.NoError(t, db.Create(&legacyMeal).Error)

	return daycareSeederFixture{Invoice: inv, OldSPD: oldSPD, NewSPD: newSPD, LegacyMeal: legacyMeal}
}

func assertItemActive(t *testing.T, db *gorm.DB, itemID uint, wantActive bool) {
	t.Helper()
	var item model.InvoiceItem
	err := db.First(&item, itemID).Error
	if wantActive {
		require.NoError(t, err, "item %d seharusnya masih aktif", itemID)
		return
	}
	require.ErrorIs(t, err, gorm.ErrRecordNotFound, "item %d seharusnya sudah di-soft-delete", itemID)
}

func TestBackfillDaycareStaleItems_RemovesOldSlotKeepsLegacyMeal(t *testing.T) {
	db := setupDaycareSeederTestDB(t)
	fx := seedDaycareDuplicateInvoice(t, db, true)

	BackfillDaycareStaleItems(db)

	assertItemActive(t, db, fx.OldSPD.ID, false)
	assertItemActive(t, db, fx.NewSPD.ID, true)
	assertItemActive(t, db, fx.LegacyMeal.ID, true)
}

func TestBackfillDaycareStaleItems_KeepsPaidItems(t *testing.T) {
	db := setupDaycareSeederTestDB(t)
	fx := seedDaycareDuplicateInvoice(t, db, true)

	require.NoError(t, db.Model(&model.InvoiceItem{}).Where("id = ?", fx.OldSPD.ID).
		Updates(map[string]interface{}{"paid_amount": fx.OldSPD.Amount, "status": "paid"}).Error)

	BackfillDaycareStaleItems(db)

	assertItemActive(t, db, fx.OldSPD.ID, true)
	assertItemActive(t, db, fx.NewSPD.ID, true)
}

func TestBackfillDaycareStaleItems_SkipsWithoutMonthlyAttendance(t *testing.T) {
	db := setupDaycareSeederTestDB(t)
	fx := seedDaycareDuplicateInvoice(t, db, false)

	BackfillDaycareStaleItems(db)

	// Fallback absensi harian multi-slot bisa sah → jangan hapus.
	assertItemActive(t, db, fx.OldSPD.ID, true)
	assertItemActive(t, db, fx.NewSPD.ID, true)
}

func TestBackfillDaycareStaleItems_SkipsSoftDeletedInvoice(t *testing.T) {
	db := setupDaycareSeederTestDB(t)
	fx := seedDaycareDuplicateInvoice(t, db, true)

	require.NoError(t, db.Delete(&model.Invoice{}, fx.Invoice.ID).Error)

	BackfillDaycareStaleItems(db)

	assertItemActive(t, db, fx.OldSPD.ID, true)
}
