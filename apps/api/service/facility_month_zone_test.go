package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

// Fixture utk uji semantik zona default & override per bulan (epic zona-bulanan):
// tahun ajaran 2025/2026, siswa dgn enrollment fasilitas mulai 2025-08, invoice
// bulanan 2025-08..2026-06 (dari seedExclusionInvoiceFixture), fee config dgn
// item dasar "Antar Jemput" + dua zona per_day.
type facilityZoneFixture struct {
	StudentID      uint
	FacilityID     uint
	AcademicYearID uint
	SFID           uint
	Zone1ID        uint // ZONA 1 — 10.000/hari
	Zone2ID        uint // ZONA 2 — 15.000/hari
}

func seedFacilityZoneFixture(t *testing.T, db *gorm.DB) facilityZoneFixture {
	t.Helper()
	fx := seedExclusionInvoiceFixture(t, db) // invoice 2025-08..2026-06 sudah dibuat

	var sf model.StudentFacility
	require.NoError(t, db.Where("student_id = ? AND facility_id = ?", fx.StudentID, fx.FacilityID).First(&sf).Error)

	var fc model.FeeConfig
	require.NoError(t, db.Where("academic_year_id = ?", fx.AcademicYear.ID).First(&fc).Error)

	z1 := model.FeeConfigItem{FeeConfigID: fc.ID, Category: "facility", ItemKey: "facility_antar_jemput_zona_1", Name: "ZONA 1", Level: "all", Gender: "all", Amount: 10000, Unit: "per_day", IsMandatory: true, IsActive: true}
	require.NoError(t, db.Create(&z1).Error)
	z2 := model.FeeConfigItem{FeeConfigID: fc.ID, Category: "facility", ItemKey: "facility_antar_jemput_zona_2", Name: "ZONA 2", Level: "all", Gender: "all", Amount: 15000, Unit: "per_day", IsMandatory: true, IsActive: true}
	require.NoError(t, db.Create(&z2).Error)

	return facilityZoneFixture{
		StudentID:      fx.StudentID,
		FacilityID:     fx.FacilityID,
		AcademicYearID: fx.AcademicYear.ID,
		SFID:           sf.ID,
		Zone1ID:        z1.ID,
		Zone2ID:        z2.ID,
	}
}

func newFacilityZoneSvc(t *testing.T, db *gorm.DB) StudentFacilityService {
	t.Helper()
	return NewStudentFacilityService(
		repository.NewStudentFacilityRepository(db),
		repository.NewStudentRepository(db),
		repository.NewFacilityRepository(db),
		repository.NewAcademicYearRepository(db),
		repository.NewFeeConfigItemRepository(db),
		repository.NewInvoiceRepository(db),
		repository.NewInvoiceItemRepository(db),
		repository.NewStudentEnrollmentRepository(db),
		repository.NewEffectiveDayRepository(db),
		newTestInvoiceGen(t, db),
		repository.NewBillingMonthExclusionRepository(db),
		repository.NewFeeConfigRepository(db),
		repository.NewStudentFacilityMonthZoneRepository(db),
	)
}

func TestFacilityMonthZone_SetAndClear(t *testing.T) {
	t.Parallel()
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedFacilityZoneFixture(t, db)
	svc := newFacilityZoneSvc(t, db)

	// Item bulan 9/2025 dibuat manual sebagai ZONA 2 (10 hari) Rp 150.000.
	invoiceSep := findMonthlyInvoice(t, db, fx.StudentID, 9, 2025)
	facilityItemID := addFacilityInvoiceItem(t, db, invoiceSep.ID, fx.FacilityID, "ZONA 2 (10 hari)", 150000, 10, 15000, 0)

	// Default enrollment = ZONA 2 (jadi DELETE bulan kembali ke ZONA 2).
	_, _, err := svc.UpdateEnrollment(fx.StudentID, fx.SFID, dto.UpdateStudentFacilityRequest{FeeConfigItemID: &fx.Zone2ID})
	require.NoError(t, err)

	// PUT month-zone: September → ZONA 1 (override).
	resp, err := svc.SetMonthZone(fx.StudentID, fx.SFID, dto.UpdateStudentFacilityMonthZoneRequest{
		Month: 9, Year: 2025, FeeConfigItemID: &fx.Zone1ID, Force: false,
	})
	require.NoError(t, err)
	assert.Equal(t, "override", resp.Source)
	assert.True(t, resp.InvoiceItemUpdated)
	assert.Equal(t, float64(100000), resp.RemainingOrExcess)

	item := reloadInvoiceItem(t, db, facilityItemID)
	assert.Equal(t, "ZONA 1 (10 hari)", item.Name)
	require.NotNil(t, item.UnitPrice)
	assert.Equal(t, float64(10000), *item.UnitPrice)
	assert.Equal(t, float64(100000), item.Amount)
	require.NotNil(t, item.Quantity)
	assert.Equal(t, uint(10), *item.Quantity, "quantity hari harus dipertahankan")

	// Total invoice ikut dihitung ulang (hanya berisi item ini).
	invoiceReloaded := reloadInvoice(t, db, invoiceSep.ID)
	assert.Equal(t, float64(100000), invoiceReloaded.TotalAmount)

	// Override tersimpan; DELETE bulan → kembali ke default (ZONA 2).
	monthZoneRepo := repository.NewStudentFacilityMonthZoneRepository(db)
	zones, err := monthZoneRepo.FindByStudentFacilityID(fx.SFID)
	require.NoError(t, err)
	require.Len(t, zones, 1)

	resp2, err := svc.ClearMonthZone(fx.StudentID, fx.SFID, 9, 2025, false)
	require.NoError(t, err)
	assert.Equal(t, "default", resp2.Source)
	item = reloadInvoiceItem(t, db, facilityItemID)
	assert.Equal(t, "ZONA 2 (10 hari)", item.Name)
	assert.Equal(t, float64(150000), item.Amount)

	zones, err = monthZoneRepo.FindByStudentFacilityID(fx.SFID)
	require.NoError(t, err)
	assert.Len(t, zones, 0, "override harus hilang setelah DELETE")
}

func TestFacilityMonthZone_PaidRequiresForce(t *testing.T) {
	t.Parallel()
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedFacilityZoneFixture(t, db)
	svc := newFacilityZoneSvc(t, db)

	// Bulan 10/2025: item ZONA 2 (10 hari) Rp 150.000, sudah dibayar penuh.
	invoiceOct := findMonthlyInvoice(t, db, fx.StudentID, 10, 2025)
	itemID := addFacilityInvoiceItem(t, db, invoiceOct.ID, fx.FacilityID, "ZONA 2 (10 hari)", 150000, 10, 15000, 150000)

	// Tanpa force → ditolak, item tidak berubah.
	_, err := svc.SetMonthZone(fx.StudentID, fx.SFID, dto.UpdateStudentFacilityMonthZoneRequest{
		Month: 10, Year: 2025, FeeConfigItemID: &fx.Zone1ID, Force: false,
	})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "sudah dibayar")
	assert.Equal(t, "ZONA 2 (10 hari)", reloadInvoiceItem(t, db, itemID).Name, "item tidak berubah tanpa force")

	// Dengan force → amount berubah, paid_amount dipertahankan, selisih kelebihan bayar.
	resp, err := svc.SetMonthZone(fx.StudentID, fx.SFID, dto.UpdateStudentFacilityMonthZoneRequest{
		Month: 10, Year: 2025, FeeConfigItemID: &fx.Zone1ID, Force: true,
	})
	require.NoError(t, err)
	assert.True(t, resp.InvoiceItemUpdated)
	assert.Equal(t, float64(150000), resp.ItemPaidAmount)
	assert.Equal(t, float64(-50000), resp.RemainingOrExcess, "kelebihan bayar karena harga turun")

	item := reloadInvoiceItem(t, db, itemID)
	assert.Equal(t, "ZONA 1 (10 hari)", item.Name)
	assert.Equal(t, float64(100000), item.Amount)
	assert.Equal(t, float64(150000), item.PaidAmount, "paid_amount dipertahankan")
	assert.Equal(t, "paid", item.Status)
}

func TestFacilityUpdateEnrollment_ReconcileAllUnpaidMonths(t *testing.T) {
	t.Parallel()
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedFacilityZoneFixture(t, db)
	svc := newFacilityZoneSvc(t, db)

	// Default awal ZONA 1.
	_, _, err := svc.UpdateEnrollment(fx.StudentID, fx.SFID, dto.UpdateStudentFacilityRequest{FeeConfigItemID: &fx.Zone1ID})
	require.NoError(t, err)

	// Bulan 9/2025: item unpaid ZONA 1 — tanpa override.
	invoiceSep := findMonthlyInvoice(t, db, fx.StudentID, 9, 2025)
	sepItem := addFacilityInvoiceItem(t, db, invoiceSep.ID, fx.FacilityID, "ZONA 1 (10 hari)", 100000, 10, 10000, 0)
	// Bulan 11/2025: item PAID ZONA 1 — tanpa override (harus dilewati otomatis).
	invoiceNov := findMonthlyInvoice(t, db, fx.StudentID, 11, 2025)
	novItem := addFacilityInvoiceItem(t, db, invoiceNov.ID, fx.FacilityID, "ZONA 1 (10 hari)", 100000, 10, 10000, 100000)
	// Bulan 12/2025: item unpaid + override eksplisit ZONA 1 (harus dilewati saat
	// default berubah — tidak ikut ditulis ulang ke ZONA 2).
	invoiceDec := findMonthlyInvoice(t, db, fx.StudentID, 12, 2025)
	decItem := addFacilityInvoiceItem(t, db, invoiceDec.ID, fx.FacilityID, "ZONA 1 (10 hari)", 100000, 10, 10000, 0)
	_, err = svc.SetMonthZone(fx.StudentID, fx.SFID, dto.UpdateStudentFacilityMonthZoneRequest{
		Month: 12, Year: 2025, FeeConfigItemID: &fx.Zone1ID, Force: false,
	})
	require.NoError(t, err)

	// Ubah default ZONA 1 → ZONA 2.
	_, summary, err := svc.UpdateEnrollment(fx.StudentID, fx.SFID, dto.UpdateStudentFacilityRequest{FeeConfigItemID: &fx.Zone2ID})
	require.NoError(t, err)
	assert.GreaterOrEqual(t, summary.Reconciled, 1, "bulan unpaid tanpa override harus disesuaikan")
	assert.GreaterOrEqual(t, summary.SkippedPaid, 1, "bulan paid harus dilewati")
	assert.GreaterOrEqual(t, summary.SkippedOverride, 1, "bulan ber-override harus dilewati")

	// September (unpaid, tanpa override) → ikut ZONA 2.
	sep := reloadInvoiceItem(t, db, sepItem)
	assert.Equal(t, "ZONA 2 (10 hari)", sep.Name)
	assert.Equal(t, float64(150000), sep.Amount)
	// November (paid) → tetap ZONA 1.
	nov := reloadInvoiceItem(t, db, novItem)
	assert.Equal(t, "ZONA 1 (10 hari)", nov.Name)
	// Desember (override) → tetap ZONA 1 (tidak ikut default baru).
	dec := reloadInvoiceItem(t, db, decItem)
	assert.Equal(t, "ZONA 1 (10 hari)", dec.Name)
	assert.Equal(t, float64(100000), dec.Amount)
}

func TestFacilityGetStudentsByFacility_IncludesEffectiveZone(t *testing.T) {
	t.Parallel()
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedFacilityZoneFixture(t, db)
	svc := newFacilityZoneSvc(t, db)

	// Default ZONA 2; override September → ZONA 1.
	_, _, err := svc.UpdateEnrollment(fx.StudentID, fx.SFID, dto.UpdateStudentFacilityRequest{FeeConfigItemID: &fx.Zone2ID})
	require.NoError(t, err)
	_, err = svc.SetMonthZone(fx.StudentID, fx.SFID, dto.UpdateStudentFacilityMonthZoneRequest{
		Month: 9, Year: 2025, FeeConfigItemID: &fx.Zone1ID, Force: false,
	})
	require.NoError(t, err)

	resp, err := svc.GetStudentsByFacility(fx.FacilityID, dto.FacilityStudentQueryParams{
		AcademicYearID: fx.AcademicYearID,
		Page:           1,
		Limit:          20,
		Month:          9,
		Year:           2025,
	})
	require.NoError(t, err)
	require.Len(t, resp.Data, 1)
	row := resp.Data[0]
	require.NotNil(t, row.MonthZoneFeeConfigItemID)
	assert.Equal(t, fx.Zone1ID, *row.MonthZoneFeeConfigItemID, "September memakai override")
	assert.True(t, row.MonthZoneOverridden)

	// Bulan 10/2025 tanpa override → zona efektif = default.
	resp2, err := svc.GetStudentsByFacility(fx.FacilityID, dto.FacilityStudentQueryParams{
		AcademicYearID: fx.AcademicYearID,
		Page:           1,
		Limit:          20,
		Month:          10,
		Year:           2025,
	})
	require.NoError(t, err)
	row2 := resp2.Data[0]
	require.NotNil(t, row2.MonthZoneFeeConfigItemID)
	assert.Equal(t, fx.Zone2ID, *row2.MonthZoneFeeConfigItemID)
	assert.False(t, row2.MonthZoneOverridden)
}

// ─── helpers data ────────────────────────────────────────────────────

func findMonthlyInvoice(t *testing.T, db *gorm.DB, studentID, month, year uint) model.Invoice {
	t.Helper()
	var inv model.Invoice
	err := db.Where("student_id = ? AND type = ? AND month = ? AND year = ?", studentID, "monthly", month, year).First(&inv).Error
	require.NoError(t, err)
	return inv
}

// addFacilityInvoiceItem menambah item fasilitas per_day pada invoice.
func addFacilityInvoiceItem(t *testing.T, db *gorm.DB, invoiceID, facilityID uint, name string, amount float64, qty uint, unitPrice, paid float64) uint {
	t.Helper()
	up := unitPrice
	status := "unpaid"
	if paid > 0 {
		status = "paid"
	}
	item := model.InvoiceItem{
		InvoiceID:   invoiceID,
		Name:        name,
		Category:    "facility",
		Amount:      amount,
		Quantity:    &qty,
		UnitPrice:   &up,
		PaidAmount:  paid,
		Status:      status,
		IsMandatory: true,
		FacilityID:  &facilityID,
	}
	require.NoError(t, db.Create(&item).Error)
	// Total invoice mengikuti item (agar asersi recalc konsisten).
	require.NoError(t, db.Model(&model.Invoice{}).Where("id = ?", invoiceID).Update("total_amount", amount).Error)
	require.NoError(t, db.Model(&model.Invoice{}).Where("id = ?", invoiceID).Update("paid_amount", paid).Error)
	return item.ID
}

func reloadInvoiceItem(t *testing.T, db *gorm.DB, id uint) model.InvoiceItem {
	t.Helper()
	var item model.InvoiceItem
	require.NoError(t, db.First(&item, id).Error)
	return item
}

func reloadInvoice(t *testing.T, db *gorm.DB, id uint) model.Invoice {
	t.Helper()
	var inv model.Invoice
	require.NoError(t, db.First(&inv, id).Error)
	return inv
}

func findFacilityItemByInvoiceMonth(t *testing.T, db *gorm.DB, studentID, facilityID, month, year uint) model.InvoiceItem {
	t.Helper()
	inv := findMonthlyInvoice(t, db, studentID, month, year)
	var item model.InvoiceItem
	err := db.Where("invoice_id = ? AND category = ? AND facility_id = ?", inv.ID, "facility", facilityID).First(&item).Error
	require.NoError(t, err)
	return item
}
