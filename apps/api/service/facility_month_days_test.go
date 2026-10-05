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

// newTestInvoiceService membangun InvoiceService dengan repo nyata (sqlite) —
// dipakai agar perubahan jumlah hari memakai perhitungan & guard yang sama
// dengan endpoint quantity.
func newTestInvoiceService(t *testing.T, db *gorm.DB) InvoiceService {
	t.Helper()
	return NewInvoiceService(
		db,
		repository.NewInvoiceRepository(db),
		repository.NewStudentRepository(db),
		repository.NewAcademicYearRepository(db),
		repository.NewInvoiceItemRepository(db),
		repository.NewFeeConfigItemRepository(db),
		repository.NewInvoiceInstallmentRepository(db),
		repository.NewPaymentRepository(db),
		newTestBillingExclusionSvc(t, db),
	)
}

// newTestBillingExclusionSvc membangun BillingExclusionService dengan repo &
// generator nyata (sqlite in-memory) — pola sama dengan billing_exclusion_service_test.go.
func newTestBillingExclusionSvc(t *testing.T, db *gorm.DB) BillingExclusionService {
	t.Helper()
	return NewBillingExclusionService(
		db,
		repository.NewBillingMonthExclusionRepository(db),
		repository.NewAcademicYearRepository(db),
		newTestInvoiceGen(t, db),
	)
}

// countExclusionMonths menghitung baris exclusion utk (student, facility).
func countExclusionMonths(t *testing.T, db *gorm.DB, studentID, facilityID uint) int {
	t.Helper()
	var count int64
	require.NoError(t, db.Model(&model.BillingMonthExclusion{}).
		Where("student_id = ? AND entity_type = ? AND entity_ref_id = ?", studentID, "facility", facilityID).
		Count(&count).Error)
	return int(count)
}

func TestSkipFacilityMonth_RemovesItemAndIsIdempotent(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedExclusionInvoiceFixture(t, db)

	var inv model.Invoice
	require.NoError(t, db.Where("student_id = ? AND month = ? AND year = ?", fx.StudentID, 10, 2025).First(&inv).Error)
	fid := fx.FacilityID
	require.NoError(t, db.Create(&model.InvoiceItem{
		InvoiceID: inv.ID, Name: "Antar Jemput", Category: "facility",
		Amount: 50000, IsMandatory: true, FacilityID: &fid,
	}).Error)

	svc := newTestBillingExclusionSvc(t, db)

	require.NoError(t, svc.SkipFacilityMonth(fx.StudentID, fx.FacilityID, 10, 2025))

	count, _ := countInvoiceItems(t, db, inv.ID, "facility")
	assert.Equal(t, int64(0), count, "item fasilitas unpaid harus dihapus saat bulan di-skip")
	assert.Equal(t, 1, countExclusionMonths(t, db, fx.StudentID, fx.FacilityID))

	// Idempotent: memanggil lagi tidak boleh menambah baris atau error.
	require.NoError(t, svc.SkipFacilityMonth(fx.StudentID, fx.FacilityID, 10, 2025))
	assert.Equal(t, 1, countExclusionMonths(t, db, fx.StudentID, fx.FacilityID), "skip ulang tidak boleh menduplikasi bulan")
}

func TestSkipFacilityMonth_RollsBackWhenInvoiceApplyFails(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedExclusionInvoiceFixture(t, db)
	svc := newTestBillingExclusionSvc(t, db)

	// Facility ID tidak ada → RemoveFacilityItemFromMonthly gagal setelah
	// exclusion sempat disimpan. Jalur strict harus mengembalikan state lama.
	err := svc.SkipFacilityMonth(fx.StudentID, 999999, 10, 2025)
	require.Error(t, err)
	assert.Equal(t, 0, countExclusionMonths(t, db, fx.StudentID, 999999), "exclusion tidak boleh tertinggal saat apply gagal")
}

func TestSkipFacilityMonth_PreservesOtherSkippedMonths(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedExclusionInvoiceFixture(t, db)

	svc := newTestBillingExclusionSvc(t, db)
	require.NoError(t, svc.SkipFacilityMonth(fx.StudentID, fx.FacilityID, 10, 2025))
	require.NoError(t, svc.SkipFacilityMonth(fx.StudentID, fx.FacilityID, 12, 2025))

	assert.Equal(t, 2, countExclusionMonths(t, db, fx.StudentID, fx.FacilityID))

	exclRepo := repository.NewBillingMonthExclusionRepository(db)
	rows, err := exclRepo.FindByStudentAndEntity(fx.StudentID, "facility", fx.FacilityID)
	require.NoError(t, err)
	require.Len(t, rows, 2)
	assert.Equal(t, uint(10), rows[0].Month)
	assert.Equal(t, uint(12), rows[1].Month)
}

func TestUnskipFacilityMonth_RestoresItemAndIsIdempotent(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedExclusionInvoiceFixture(t, db)

	var inv model.Invoice
	require.NoError(t, db.Where("student_id = ? AND month = ? AND year = ?", fx.StudentID, 10, 2025).First(&inv).Error)
	fid := fx.FacilityID
	require.NoError(t, db.Create(&model.InvoiceItem{
		InvoiceID: inv.ID, Name: "Antar Jemput", Category: "facility",
		Amount: 50000, IsMandatory: true, FacilityID: &fid,
	}).Error)

	svc := newTestBillingExclusionSvc(t, db)
	require.NoError(t, svc.SkipFacilityMonth(fx.StudentID, fx.FacilityID, 10, 2025))

	require.NoError(t, svc.UnskipFacilityMonth(fx.StudentID, fx.FacilityID, 10, 2025))

	assert.Equal(t, 0, countExclusionMonths(t, db, fx.StudentID, fx.FacilityID), "exclusion harus hilang saat skip dicabut")
	count, total := countInvoiceItems(t, db, inv.ID, "facility")
	assert.Equal(t, int64(1), count, "item fasilitas harus dikembalikan")
	assert.Equal(t, 50000.0, total)

	// Idempotent: mencabut skip yang memang tidak ada tidak boleh error/duplikasi.
	require.NoError(t, svc.UnskipFacilityMonth(fx.StudentID, fx.FacilityID, 10, 2025))
	count, _ = countInvoiceItems(t, db, inv.ID, "facility")
	assert.Equal(t, int64(1), count, "pencabutan ulang tidak boleh menduplikasi item")
}

func TestSkipFacilityMonth_RejectsMonthOutsideActiveAcademicYear(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedExclusionInvoiceFixture(t, db)

	svc := newTestBillingExclusionSvc(t, db)
	err := svc.SkipFacilityMonth(fx.StudentID, fx.FacilityID, 10, 2027)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "di luar tahun ajaran aktif")
	assert.Equal(t, 0, countExclusionMonths(t, db, fx.StudentID, fx.FacilityID), "bulan invalid tidak boleh tersimpan")
}

// ─── SetMonthDays (jumlah hari 0 ⇄ N) ────────────────────────────────

type monthDaysFixture struct {
	exclusionInvoiceFixture
	SFID   uint
	ItemID uint
}

// seedMonthDaysFixture menyiapkan fasilitas per_day "Antar Jemput" + item invoice
// September 2025 (10 hari @ Rp 10.000 = Rp 100.000).
func seedMonthDaysFixture(t *testing.T, db *gorm.DB) monthDaysFixture {
	t.Helper()
	fx := seedExclusionInvoiceFixture(t, db)

	require.NoError(t, db.Model(&model.FeeConfigItem{}).
		Where("item_key = ?", "facility_antar_jemput").
		Update("unit", "per_day").Error)

	var sf model.StudentFacility
	require.NoError(t, db.Where("student_id = ? AND facility_id = ?", fx.StudentID, fx.FacilityID).First(&sf).Error)

	// Hari efektif September 2025 → 20 hari, supaya item fasilitas per_day yang
	// dipulihkan (mis. setelah skip dicabut) benar-benar berbasis jumlah hari.
	var cg model.ClassGroup
	require.NoError(t, db.First(&cg).Error)
	require.NoError(t, db.Create(&model.EffectiveDay{
		ClassGroupID: cg.ID, AcademicYearID: fx.AcademicYear.ID,
		Month: 9, Year: 2025, TotalDays: 20, TotalMondays: 0, CreatedBy: 1,
	}).Error)

	inv := findMonthlyInvoice(t, db, fx.StudentID, 9, 2025)
	itemID := addFacilityInvoiceItem(t, db, inv.ID, fx.FacilityID, "Antar Jemput (10 hari)", 100000, 10, 10000, 0)

	return monthDaysFixture{exclusionInvoiceFixture: fx, SFID: sf.ID, ItemID: itemID}
}

func daysPtr(d uint) *uint { return &d }

func TestUpdateItemQuantity_ZeroFacilityDelegatesToSkip(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedMonthDaysFixture(t, db)
	invoice := findMonthlyInvoice(t, db, fx.StudentID, 9, 2025)

	svc := newTestInvoiceService(t, db)
	zero := uint(0)
	resp, err := svc.UpdateItemQuantity(invoice.ID, fx.ItemID, dto.UpdateInvoiceItemQuantityRequest{Quantity: &zero})
	require.NoError(t, err)
	require.NotNil(t, resp)
	assert.True(t, resp.Skipped)
	assert.Equal(t, 0.0, resp.Amount)

	count, _ := countInvoiceItems(t, db, invoice.ID, "facility")
	assert.Equal(t, int64(0), count, "quantity 0 harus menghapus item fasilitas dari invoice")
	assert.Equal(t, 1, countExclusionMonths(t, db, fx.StudentID, fx.FacilityID))
}

func TestUpdateItemQuantity_ZeroRejectsNonFacility(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedMonthDaysFixture(t, db)
	invoice := findMonthlyInvoice(t, db, fx.StudentID, 9, 2025)

	qty := uint(10)
	unitPrice := 5000.0
	infaq := model.InvoiceItem{
		InvoiceID: invoice.ID, Name: "Infaq Harian (10 hari)", Category: "monthly_infaq",
		Amount: 50000, Quantity: &qty, UnitPrice: &unitPrice, Status: "unpaid",
	}
	require.NoError(t, db.Create(&infaq).Error)

	svc := newTestInvoiceService(t, db)
	zero := uint(0)
	_, err := svc.UpdateItemQuantity(invoice.ID, infaq.ID, dto.UpdateInvoiceItemQuantityRequest{Quantity: &zero})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "hanya berlaku untuk item fasilitas")

	var unchanged model.InvoiceItem
	require.NoError(t, db.First(&unchanged, infaq.ID).Error)
	require.NotNil(t, unchanged.Quantity)
	assert.Equal(t, uint(10), *unchanged.Quantity)
	assert.Equal(t, 50000.0, unchanged.Amount)
	assert.Equal(t, 0, countExclusionMonths(t, db, fx.StudentID, fx.FacilityID))
}

func TestUpdateItemQuantity_NilQuantityRejected(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedMonthDaysFixture(t, db)
	invoice := findMonthlyInvoice(t, db, fx.StudentID, 9, 2025)

	svc := newTestInvoiceService(t, db)
	_, err := svc.UpdateItemQuantity(invoice.ID, fx.ItemID, dto.UpdateInvoiceItemQuantityRequest{})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "Jumlah hari wajib diisi")
}

func TestSetMonthDays_ZeroSkipsMonthAndRemovesItem(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedMonthDaysFixture(t, db)
	svc := newFacilityZoneSvc(t, db)

	resp, err := svc.SetMonthDays(fx.StudentID, fx.SFID, dto.UpdateFacilityMonthDaysRequest{
		Month: 9, Year: 2025, Days: daysPtr(0),
	})
	require.NoError(t, err)
	assert.True(t, resp.Excluded, "bulan harus ditandai di-skip")
	assert.Equal(t, uint(0), resp.Days)

	inv := findMonthlyInvoice(t, db, fx.StudentID, 9, 2025)
	count, _ := countInvoiceItems(t, db, inv.ID, "facility")
	assert.Equal(t, int64(0), count, "item fasilitas harus dihapus dari tagihan")
	assert.Equal(t, 1, countExclusionMonths(t, db, fx.StudentID, fx.FacilityID))

	require.NoError(t, db.First(&inv, inv.ID).Error)
	assert.Equal(t, 0.0, inv.TotalAmount, "total tagihan harus turun setelah item dihapus")
}

func TestSetMonthDays_ZeroIsIdempotent(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedMonthDaysFixture(t, db)
	svc := newFacilityZoneSvc(t, db)

	_, err := svc.SetMonthDays(fx.StudentID, fx.SFID, dto.UpdateFacilityMonthDaysRequest{Month: 9, Year: 2025, Days: daysPtr(0)})
	require.NoError(t, err)
	_, err = svc.SetMonthDays(fx.StudentID, fx.SFID, dto.UpdateFacilityMonthDaysRequest{Month: 9, Year: 2025, Days: daysPtr(0)})
	require.NoError(t, err)

	assert.Equal(t, 1, countExclusionMonths(t, db, fx.StudentID, fx.FacilityID), "skip ulang tidak boleh menduplikasi bulan")
}

func TestSetMonthDays_DaysOnSkippedMonthRestoresItemWithDays(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedMonthDaysFixture(t, db)
	svc := newFacilityZoneSvc(t, db)

	_, err := svc.SetMonthDays(fx.StudentID, fx.SFID, dto.UpdateFacilityMonthDaysRequest{Month: 9, Year: 2025, Days: daysPtr(0)})
	require.NoError(t, err)

	resp, err := svc.SetMonthDays(fx.StudentID, fx.SFID, dto.UpdateFacilityMonthDaysRequest{Month: 9, Year: 2025, Days: daysPtr(12)})
	require.NoError(t, err)
	assert.False(t, resp.Excluded, "skip harus dicabut")
	assert.Equal(t, uint(12), resp.Days)
	require.NotNil(t, resp.InvoiceItemID)

	item := reloadInvoiceItem(t, db, *resp.InvoiceItemID)
	require.NotNil(t, item.Quantity)
	assert.Equal(t, uint(12), *item.Quantity, "jumlah hari harus mengikuti input (bukan hari efektif)")
	// unit_price diambil dari item; nominal = unit_price × hari.
	require.NotNil(t, item.UnitPrice)
	assert.Equal(t, *item.UnitPrice*12, item.Amount)

	assert.Equal(t, 0, countExclusionMonths(t, db, fx.StudentID, fx.FacilityID), "exclusion harus hilang")
}

func TestSetMonthDays_ZeroRejectedWhenItemHasPayment(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedMonthDaysFixture(t, db)
	svc := newFacilityZoneSvc(t, db)

	// Item sudah dibayar sebagian → tidak boleh di-nol-kan.
	require.NoError(t, db.Model(&model.InvoiceItem{}).Where("id = ?", fx.ItemID).
		Updates(map[string]interface{}{"paid_amount": 50000, "status": "partial"}).Error)

	_, err := svc.SetMonthDays(fx.StudentID, fx.SFID, dto.UpdateFacilityMonthDaysRequest{Month: 9, Year: 2025, Days: daysPtr(0)})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "sudah ada pembayaran")

	assert.Equal(t, 0, countExclusionMonths(t, db, fx.StudentID, fx.FacilityID), "guard harus dicek SEBELUM exclusion disimpan")
	inv := findMonthlyInvoice(t, db, fx.StudentID, 9, 2025)
	count, _ := countInvoiceItems(t, db, inv.ID, "facility")
	assert.Equal(t, int64(1), count, "item tidak boleh diubah")
}

func TestSetMonthDays_DaysRejectedWhenItemHasPayment(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedMonthDaysFixture(t, db)
	svc := newFacilityZoneSvc(t, db)

	require.NoError(t, db.Model(&model.InvoiceItem{}).Where("id = ?", fx.ItemID).
		Updates(map[string]interface{}{"paid_amount": 100000, "status": "paid"}).Error)

	_, err := svc.SetMonthDays(fx.StudentID, fx.SFID, dto.UpdateFacilityMonthDaysRequest{Month: 9, Year: 2025, Days: daysPtr(20)})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "sudah ada pembayaran")
}

func TestSetMonthDays_NilDaysRejected(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedMonthDaysFixture(t, db)
	svc := newFacilityZoneSvc(t, db)

	_, err := svc.SetMonthDays(fx.StudentID, fx.SFID, dto.UpdateFacilityMonthDaysRequest{Month: 9, Year: 2025})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "Jumlah hari wajib diisi")
}

func TestSetMonthDays_RejectsMonthOutsideEnrollment(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedMonthDaysFixture(t, db)
	svc := newFacilityZoneSvc(t, db)

	// Pendaftaran mulai 2025-08-01 → Juli 2025 di luar rentang.
	_, err := svc.SetMonthDays(fx.StudentID, fx.SFID, dto.UpdateFacilityMonthDaysRequest{Month: 7, Year: 2025, Days: daysPtr(0)})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "di luar rentang pendaftaran")
	assert.Equal(t, 0, countExclusionMonths(t, db, fx.StudentID, fx.FacilityID))
}

func TestSetMonthDays_DaysRejectedWhenNoItemForMonth(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedMonthDaysFixture(t, db)
	svc := newFacilityZoneSvc(t, db)

	// Oktober 2025 punya invoice tapi belum punya item fasilitas; bulan ini juga
	// belum ter-skip → tidak ada yang bisa diset jumlah harinya.
	_, err := svc.SetMonthDays(fx.StudentID, fx.SFID, dto.UpdateFacilityMonthDaysRequest{Month: 10, Year: 2025, Days: daysPtr(20)})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "Belum ada tagihan fasilitas")
}

func TestSetMonthDays_RestoresSkipWhenUpdateAfterUnskipFails(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedMonthDaysFixture(t, db)
	svc := newFacilityZoneSvc(t, db)

	_, err := svc.SetMonthDays(fx.StudentID, fx.SFID, dto.UpdateFacilityMonthDaysRequest{Month: 9, Year: 2025, Days: daysPtr(0)})
	require.NoError(t, err)

	// Ubah tarif dasar menjadi flat sebelum restore. Restore akan membuat item
	// tanpa UnitPrice, lalu SetMonthDays harus rollback kembali ke skip.
	require.NoError(t, db.Model(&model.FeeConfigItem{}).
		Where("item_key = ?", "facility_antar_jemput").
		Update("unit", "fixed").Error)

	_, err = svc.SetMonthDays(fx.StudentID, fx.SFID, dto.UpdateFacilityMonthDaysRequest{Month: 9, Year: 2025, Days: daysPtr(12)})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "bertarif flat")
	assert.Equal(t, 1, countExclusionMonths(t, db, fx.StudentID, fx.FacilityID), "gagal restore harus mengembalikan skip")

	inv := findMonthlyInvoice(t, db, fx.StudentID, 9, 2025)
	count, _ := countInvoiceItems(t, db, inv.ID, "facility")
	assert.Equal(t, int64(0), count, "rollback harus menghapus kembali item yang sempat dipulihkan")
}

func TestSetMonthDays_DaysOnSkippedMonthWithoutInvoiceKeepsSkip(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedMonthDaysFixture(t, db)
	svc := newFacilityZoneSvc(t, db)

	// November memiliki invoice pada fixture; gunakan bulan di luar daftar invoice
	// tetapi tetap dalam tahun ajaran untuk mensimulasikan invoice belum dibuat.
	_, err := svc.SetMonthDays(fx.StudentID, fx.SFID, dto.UpdateFacilityMonthDaysRequest{Month: 7, Year: 2025, Days: daysPtr(0)})
	require.Error(t, err, "Juli berada sebelum start_date sehingga tidak valid")

	// Gunakan bulan valid dengan invoice dihapus agar kondisi benar-benar invoice
	// belum ada, lalu pastikan percobaan memulihkan N hari tidak mencabut skip.
	var inv model.Invoice
	require.NoError(t, db.Where("student_id = ? AND month = ? AND year = ?", fx.StudentID, 11, 2025).First(&inv).Error)
	require.NoError(t, db.Unscoped().Delete(&inv).Error)
	require.NoError(t, newTestBillingExclusionSvc(t, db).SkipFacilityMonth(fx.StudentID, fx.FacilityID, 11, 2025))

	_, err = svc.SetMonthDays(fx.StudentID, fx.SFID, dto.UpdateFacilityMonthDaysRequest{Month: 11, Year: 2025, Days: daysPtr(12)})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "Invoice fasilitas bulan ini belum dibuat")
	assert.Equal(t, 1, countExclusionMonths(t, db, fx.StudentID, fx.FacilityID))
}

func TestGetStudentsByFacility_ReportsMonthExcluded(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedMonthDaysFixture(t, db)
	svc := newFacilityZoneSvc(t, db)

	params := dto.FacilityStudentQueryParams{AcademicYearID: fx.AcademicYear.ID, Month: 9, Year: 2025, Page: 1, Limit: 50}

	before, err := svc.GetStudentsByFacility(fx.FacilityID, params)
	require.NoError(t, err)
	require.Len(t, before.Data, 1)
	assert.False(t, before.Data[0].MonthExcluded)

	_, err = svc.SetMonthDays(fx.StudentID, fx.SFID, dto.UpdateFacilityMonthDaysRequest{Month: 9, Year: 2025, Days: daysPtr(0)})
	require.NoError(t, err)

	after, err := svc.GetStudentsByFacility(fx.FacilityID, params)
	require.NoError(t, err)
	require.Len(t, after.Data, 1)
	assert.True(t, after.Data[0].MonthExcluded, "bulan ter-skip harus ditandai")
}

func TestGetCurrentMonthDays_ReportsExcludedForCurrentMonth(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedExclusionInvoiceFixture(t, db)
	svc := newFacilityZoneSvc(t, db)

	var sf model.StudentFacility
	require.NoError(t, db.Where("student_id = ? AND facility_id = ?", fx.StudentID, fx.FacilityID).First(&sf).Error)

	// Baris exclusion ditulis langsung: bulan berjalan (hari ini) di luar rentang
	// tahun ajaran fixture, sedangkan yang diuji di sini adalah jalur BACA.
	now := time.Now()
	require.NoError(t, db.Create(&model.BillingMonthExclusion{
		StudentID: fx.StudentID, EntityType: "facility", EntityRefID: fx.FacilityID,
		Month: uint(now.Month()), Year: uint(now.Year()), AcademicYearID: fx.AcademicYear.ID,
	}).Error)

	resp, err := svc.GetCurrentMonthDays(fx.StudentID, sf.ID)
	require.NoError(t, err)
	assert.True(t, resp.Excluded, "bulan ter-skip harus dilaporkan walau invoice belum dibuat")
	assert.Equal(t, uint(0), resp.CurrentDays)
}
