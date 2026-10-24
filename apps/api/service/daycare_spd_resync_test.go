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

// seedDaycareSPDFeeItems menambahkan dua tarif SPD regular (slot lama & baru)
// pada fee config fixture agar perubahan time_slot bisa diuji end-to-end.
func seedDaycareSPDFeeItems(t *testing.T, db *gorm.DB, academicYearID uint) {
	t.Helper()

	var fc model.FeeConfig
	require.NoError(t, db.Where("academic_year_id = ?", academicYearID).First(&fc).Error)

	require.NoError(t, db.Create(&model.FeeConfigItem{
		FeeConfigID: fc.ID, Category: "daycare", ItemKey: "daycare_regular_1013_kbtk_daily",
		Name: "SPD Regular 10-13 KB-TK", Level: "all", Gender: "all", Amount: 10000, Unit: "per_day",
	}).Error)
	require.NoError(t, db.Create(&model.FeeConfigItem{
		FeeConfigID: fc.ID, Category: "daycare", ItemKey: "daycare_regular_1015_kbtk_daily",
		Name: "SPD Regular 10-15 KB-TK", Level: "all", Gender: "all", Amount: 15000, Unit: "per_day",
	}).Error)
}

func seedRegularDaycare(t *testing.T, db *gorm.DB, fx exclusionInvoiceFixture, slot string, spdDays uint) model.DaycareEnrollment {
	t.Helper()

	de := model.DaycareEnrollment{
		StudentID:      fx.StudentID,
		AcademicYearID: fx.AcademicYear.ID,
		PackageType:    "regular_1013_kbtk",
		Category:       "regular",
		TimeSlot:       slot,
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
		SPDDays:        spdDays,
		CreatedBy:      1,
	}).Error)

	return de
}

func newDaycareSvc(t *testing.T, db *gorm.DB, invoiceGen InvoiceGenerateService) DaycareEnrollmentService {
	t.Helper()
	return NewDaycareEnrollmentService(
		db,
		repository.NewDaycareEnrollmentRepository(db),
		repository.NewStudentRepository(db),
		repository.NewAcademicYearRepository(db),
		repository.NewDaycareMonthlyAttendanceRepository(db),
		repository.NewInvoiceRepository(db),
		invoiceGen,
		repository.NewBillingMonthExclusionRepository(db),
	)
}

func findInvoice(t *testing.T, db *gorm.DB, studentID, ayID, month, year uint) model.Invoice {
	t.Helper()
	var inv model.Invoice
	require.NoError(t, db.Where("student_id = ? AND academic_year_id = ? AND month = ? AND year = ?", studentID, ayID, month, year).First(&inv).Error)
	return inv
}

// Regresi: perubahan time_slot enrollment regular harus MENGGANTI item SPD lama
// (tarif slot lama) dengan item SPD baru, bukan menambah item sehingga menumpuk.
func TestDaycareUpdate_RegularSlotChangeReplacesSPDItem(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedExclusionInvoiceFixture(t, db)
	seedDaycareSPDFeeItems(t, db, fx.AcademicYear.ID)
	de := seedRegularDaycare(t, db, fx, "10-13", 2)

	invoiceGen := newTestInvoiceGen(t, db)
	require.NoError(t, invoiceGen.GenerateDaycareMonthlyInvoices(dto.GenerateDaycareMonthlyParams{
		StudentID: fx.StudentID, AcademicYearID: fx.AcademicYear.ID, Month: 10, Year: 2025,
	}))

	inv := findInvoice(t, db, fx.StudentID, fx.AcademicYear.ID, 10, 2025)
	var before []model.InvoiceItem
	require.NoError(t, db.Where("invoice_id = ? AND category = ?", inv.ID, "daycare").Find(&before).Error)
	require.Len(t, before, 1)
	assert.Contains(t, before[0].Name, "10-13")
	assert.Equal(t, 20000.0, before[0].Amount)

	svc := newDaycareSvc(t, db, invoiceGen)
	_, err := svc.Update(de.ID, dto.CreateDaycareEnrollmentRequest{
		StudentID:      fx.StudentID,
		AcademicYearID: fx.AcademicYear.ID,
		Category:       "regular",
		TimeSlot:       "10-15",
		AgeGroup:       "kbtk",
		StartDate:      "2025-08-01",
	})
	require.NoError(t, err)

	var after []model.InvoiceItem
	require.NoError(t, db.Where("invoice_id = ? AND category = ?", inv.ID, "daycare").Find(&after).Error)
	require.Len(t, after, 1, "harus ada tepat satu item SPD setelah slot berubah")
	assert.Contains(t, after[0].Name, "10-15")
	assert.Equal(t, 30000.0, after[0].Amount, "2 hari x tarif slot baru 15.000")

	var refreshed model.Invoice
	require.NoError(t, db.First(&refreshed, inv.ID).Error)
	assert.Equal(t, 30000.0, refreshed.TotalAmount, "total invoice harus ikut terkoreksi")
}

// Regresi: mengubah SPD menjadi 0 hari harus menghapus item unpaid yang lama,
// bukan meninggalkan tagihan basi.
func TestDaycareMonthlyAttendance_ZeroDaysRemovesSPDItem(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedExclusionInvoiceFixture(t, db)
	seedDaycareSPDFeeItems(t, db, fx.AcademicYear.ID)
	seedRegularDaycare(t, db, fx, "10-15", 2)

	invoiceGen := newTestInvoiceGen(t, db)
	require.NoError(t, invoiceGen.GenerateDaycareMonthlyInvoices(dto.GenerateDaycareMonthlyParams{
		StudentID: fx.StudentID, AcademicYearID: fx.AcademicYear.ID, Month: 10, Year: 2025,
	}))

	inv := findInvoice(t, db, fx.StudentID, fx.AcademicYear.ID, 10, 2025)
	var before []model.InvoiceItem
	require.NoError(t, db.Where("invoice_id = ? AND category = ?", inv.ID, "daycare").Find(&before).Error)
	require.Len(t, before, 1)

	svc := newDaycareSvc(t, db, invoiceGen)
	_, err := svc.UpsertMonthlyAttendance(1, dto.UpsertDaycareMonthlyAttendanceRequest{
		StudentID:      fx.StudentID,
		AcademicYearID: fx.AcademicYear.ID,
		Month:          10,
		Year:           2025,
		SPDDays:        0,
		MealDays:       0,
	})
	require.NoError(t, err)

	var after []model.InvoiceItem
	require.NoError(t, db.Where("invoice_id = ? AND category = ?", inv.ID, "daycare").Find(&after).Error)
	assert.Empty(t, after, "SPD 0 hari tidak boleh menyisakan item daycare")

	var refreshed model.Invoice
	require.NoError(t, db.First(&refreshed, inv.ID).Error)
	assert.Equal(t, 0.0, refreshed.TotalAmount)
}

// Generate massal tidak boleh menghapus item ketika data kehadiran tidak ada.
// Pembersihan hanya terjadi bila pemanggil meminta secara eksplisit.
func TestDaycareGenerate_NoAttendanceKeepsItemsUnlessRequested(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedExclusionInvoiceFixture(t, db)
	seedDaycareSPDFeeItems(t, db, fx.AcademicYear.ID)
	seedRegularDaycare(t, db, fx, "10-15", 2)

	invoiceGen := newTestInvoiceGen(t, db)
	params := dto.GenerateDaycareMonthlyParams{
		StudentID: fx.StudentID, AcademicYearID: fx.AcademicYear.ID, Month: 10, Year: 2025,
	}
	require.NoError(t, invoiceGen.GenerateDaycareMonthlyInvoices(params))

	inv := findInvoice(t, db, fx.StudentID, fx.AcademicYear.ID, 10, 2025)
	var before []model.InvoiceItem
	require.NoError(t, db.Where("invoice_id = ? AND category = ?", inv.ID, "daycare").Find(&before).Error)
	require.Len(t, before, 1)

	// Hapus data kehadiran → generate biasa (mis. bulk) tidak boleh menghapus item.
	require.NoError(t, db.Where("student_id = ? AND month = ? AND year = ?", fx.StudentID, 10, 2025).
		Delete(&model.DaycareMonthlyAttendance{}).Error)
	require.NoError(t, invoiceGen.GenerateDaycareMonthlyInvoices(params))

	var afterBulk []model.InvoiceItem
	require.NoError(t, db.Where("invoice_id = ? AND category = ?", inv.ID, "daycare").Find(&afterBulk).Error)
	assert.Len(t, afterBulk, 1, "generate tanpa data tidak boleh menghapus tagihan")

	// Permintaan eksplisit (mis. dari simpan kehadiran 0 hari) baru boleh menghapus.
	params.ClearWhenNoAttendance = true
	require.NoError(t, invoiceGen.GenerateDaycareMonthlyInvoices(params))
	var afterClear []model.InvoiceItem
	require.NoError(t, db.Where("invoice_id = ? AND category = ?", inv.ID, "daycare").Find(&afterClear).Error)
	assert.Empty(t, afterClear)
}

// Jika tarif slot baru belum dikonfigurasi, resync tidak boleh menghapus item
// SPD lama (lebih baik tagihan lama tetap ada daripada hilang).
func TestDaycareUpdate_SlotChangeMissingFeeItemKeepsOldSPD(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedExclusionInvoiceFixture(t, db)
	seedDaycareSPDFeeItems(t, db, fx.AcademicYear.ID)
	de := seedRegularDaycare(t, db, fx, "10-13", 2)

	invoiceGen := newTestInvoiceGen(t, db)
	require.NoError(t, invoiceGen.GenerateDaycareMonthlyInvoices(dto.GenerateDaycareMonthlyParams{
		StudentID: fx.StudentID, AcademicYearID: fx.AcademicYear.ID, Month: 10, Year: 2025,
	}))

	inv := findInvoice(t, db, fx.StudentID, fx.AcademicYear.ID, 10, 2025)

	svc := newDaycareSvc(t, db, invoiceGen)
	// Slot 07-15 sengaja tidak punya fee item pada fixture.
	_, err := svc.Update(de.ID, dto.CreateDaycareEnrollmentRequest{
		StudentID:      fx.StudentID,
		AcademicYearID: fx.AcademicYear.ID,
		Category:       "regular",
		TimeSlot:       "07-15",
		AgeGroup:       "kbtk",
		StartDate:      "2025-08-01",
	})
	require.NoError(t, err)

	var after []model.InvoiceItem
	require.NoError(t, db.Where("invoice_id = ? AND category = ?", inv.ID, "daycare").Find(&after).Error)
	require.Len(t, after, 1, "item lama tidak boleh hilang saat tarif baru tidak ditemukan")
	assert.Contains(t, after[0].Name, "10-13")
}

// Item yang sudah dibayar tidak boleh dihapus/diubah oleh resync slot.
func TestDaycareUpdate_SlotChangeKeepsPaidSPDItem(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedExclusionInvoiceFixture(t, db)
	seedDaycareSPDFeeItems(t, db, fx.AcademicYear.ID)
	de := seedRegularDaycare(t, db, fx, "10-13", 2)

	invoiceGen := newTestInvoiceGen(t, db)
	require.NoError(t, invoiceGen.GenerateDaycareMonthlyInvoices(dto.GenerateDaycareMonthlyParams{
		StudentID: fx.StudentID, AcademicYearID: fx.AcademicYear.ID, Month: 10, Year: 2025,
	}))

	inv := findInvoice(t, db, fx.StudentID, fx.AcademicYear.ID, 10, 2025)
	var item model.InvoiceItem
	require.NoError(t, db.Where("invoice_id = ? AND category = ?", inv.ID, "daycare").First(&item).Error)
	require.NoError(t, db.Model(&item).Updates(map[string]interface{}{
		"paid_amount": item.Amount,
		"status":      "paid",
	}).Error)

	svc := newDaycareSvc(t, db, invoiceGen)
	_, err := svc.Update(de.ID, dto.CreateDaycareEnrollmentRequest{
		StudentID:      fx.StudentID,
		AcademicYearID: fx.AcademicYear.ID,
		Category:       "regular",
		TimeSlot:       "10-15",
		AgeGroup:       "kbtk",
		StartDate:      "2025-08-01",
	})
	require.NoError(t, err)

	var kept model.InvoiceItem
	require.NoError(t, db.First(&kept, item.ID).Error, "item SPD yang sudah dibayar tidak boleh hilang")
	assert.Equal(t, item.Amount, kept.PaidAmount)
	assert.Contains(t, kept.Name, "10-13")
}
