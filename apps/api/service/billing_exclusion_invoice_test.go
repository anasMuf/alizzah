package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// setupBillingExclusionInvoiceTestDB menyiapkan DB sqlite + semua model yang
// dibutuhkan untuk menguji skip tagihan bulanan (PASTA & fasilitas).
func setupBillingExclusionInvoiceTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	// sqlite :memory: adalah PER-KONEKSI. Pin ke satu koneksi agar query dari
	// goroutine (mis. RemoveFacilityFromFutureInvoices saat Unenroll) dan query
	// test berbagi database yang sama — mencegah flaky "no such table" di CI
	// (setiap koneksi baru melihat :memory: yang kosong).
	sqlDB, err := db.DB()
	require.NoError(t, err)
	sqlDB.SetMaxOpenConns(1)

	err = db.AutoMigrate(
		&model.User{},
		&model.AcademicYear{},
		&model.ClassGroup{},
		&model.Student{},
		&model.StudentEnrollment{},
		&model.FeeConfig{},
		&model.FeeConfigItem{},
		&model.Extracurricular{},
		&model.StudentExtracurricular{},
		&model.Invoice{},
		&model.InvoiceItem{},
		&model.Facility{},
		&model.StudentFacility{},
		&model.EffectiveDay{},
		&model.Dispensation{},
		&model.StudentExceptionality{},
		&model.BillingMonthExclusion{},
	)
	require.NoError(t, err)
	return db
}

type exclusionInvoiceFixture struct {
	StudentID    uint
	AcademicYear model.AcademicYear
	ExID         uint
	FacilityID   uint
}

// seedExclusionBaseFixture membuat: tahun ajaran aktif 2025/2026, siswa dgn
// enrollment aktif level intan, fee config + item pasta "Robotika" & fasilitas
// "Antar Jemput", ekskul Robotika aktif, fasilitas aktif. Bila withInvoices=true,
// invoice bulanan 2025-08..2026-06 ikut dibuat (dipakai uji remove/restore).
func seedExclusionBaseFixture(t *testing.T, db *gorm.DB, withInvoices bool) exclusionInvoiceFixture {
	t.Helper()

	user := model.User{Email: "admin@test.com", Password: "h", Role: "superadmin", FullName: "Admin"}
	require.NoError(t, db.Create(&user).Error)

	ay := model.AcademicYear{Name: "2025/2026", StartDate: time.Date(2025, 7, 14, 0, 0, 0, 0, time.UTC), EndDate: time.Date(2026, 6, 30, 0, 0, 0, 0, time.UTC), IsActive: true}
	require.NoError(t, db.Create(&ay).Error)

	cg := model.ClassGroup{AcademicYearID: ay.ID, Name: "Intan 1", Level: "intan", Schedule: []byte(`{}`)}
	require.NoError(t, db.Create(&cg).Error)

	student := model.Student{FullName: "Anak Test", BirthPlace: "Jakarta", BirthDate: time.Date(2018, 1, 1, 0, 0, 0, 0, time.UTC), Gender: "L", Status: "active"}
	require.NoError(t, db.Create(&student).Error)

	enr := model.StudentEnrollment{StudentID: student.ID, ClassGroupID: cg.ID, AcademicYearID: ay.ID, StartDate: ay.StartDate, Status: "active", EnrollmentType: "new", CreatedBy: user.ID}
	require.NoError(t, db.Create(&enr).Error)

	fc := model.FeeConfig{AcademicYearID: ay.ID}
	require.NoError(t, db.Create(&fc).Error)

	pastaItem := model.FeeConfigItem{FeeConfigID: fc.ID, Category: "pasta", ItemKey: "pasta_robotika", Name: "Robotika", Level: "all", Gender: "all", Amount: 100000, Unit: "fixed", IsMandatory: false}
	require.NoError(t, db.Create(&pastaItem).Error)
	facilityItem := model.FeeConfigItem{FeeConfigID: fc.ID, Category: "facility", ItemKey: "facility_antar_jemput", Name: "Antar Jemput", Level: "all", Gender: "all", Amount: 50000, Unit: "fixed", IsMandatory: false}
	require.NoError(t, db.Create(&facilityItem).Error)

	ex := model.Extracurricular{Name: "Robotika", Type: "pasta"}
	require.NoError(t, db.Create(&ex).Error)

	se := model.StudentExtracurricular{StudentID: student.ID, ExtracurricularID: ex.ID, AcademicYearID: ay.ID, StartDate: time.Date(2025, 8, 1, 0, 0, 0, 0, time.UTC)}
	require.NoError(t, db.Create(&se).Error)

	facility := model.Facility{Name: "Antar Jemput"}
	require.NoError(t, db.Create(&facility).Error)

	sf := model.StudentFacility{StudentID: student.ID, FacilityID: facility.ID, AcademicYearID: ay.ID, StartDate: time.Date(2025, 8, 1, 0, 0, 0, 0, time.UTC)}
	require.NoError(t, db.Create(&sf).Error)

	if withInvoices {
		// Invoice bulanan 2025-08 .. 2026-06 (11 bulan)
		for m := uint(8); m <= 12; m++ {
			createMonthlyInvoice(t, db, student.ID, ay.ID, m, 2025)
		}
		for m := uint(1); m <= 6; m++ {
			createMonthlyInvoice(t, db, student.ID, ay.ID, m, 2026)
		}
	}

	return exclusionInvoiceFixture{StudentID: student.ID, AcademicYear: ay, ExID: ex.ID, FacilityID: facility.ID}
}

func seedExclusionInvoiceFixture(t *testing.T, db *gorm.DB) exclusionInvoiceFixture {
	return seedExclusionBaseFixture(t, db, true)
}

func createMonthlyInvoice(t *testing.T, db *gorm.DB, studentID, ayID, month, year uint) model.Invoice {
	t.Helper()
	inv := model.Invoice{StudentID: studentID, AcademicYearID: ayID, Type: "monthly", Month: &month, Year: &year, Status: "unpaid", TotalAmount: 0}
	require.NoError(t, db.Create(&inv).Error)
	return inv
}

func newTestInvoiceGen(t *testing.T, db *gorm.DB) InvoiceGenerateService {
	return NewInvoiceGenerateService(
		db,
		repository.NewInvoiceRepository(db),
		repository.NewInvoiceItemRepository(db),
		repository.NewFeeConfigRepository(db),
		repository.NewFeeConfigItemRepository(db),
		repository.NewEffectiveDayRepository(db),
		repository.NewStudentEnrollmentRepository(db),
		repository.NewExtracurricularRepository(db),
		repository.NewStudentExtracurricularRepository(db),
		repository.NewAcademicYearRepository(db),
		repository.NewDaycareEnrollmentRepository(db),
		repository.NewFacilityRepository(db),
		repository.NewStudentFacilityRepository(db),
		repository.NewDispensationRepository(db),
		repository.NewStudentExceptionalityRepository(db),
		repository.NewDaycareMonthlyAttendanceRepository(db),
		repository.NewBillingMonthExclusionRepository(db),
	)
}

func dtoGenerateMonthlyParams(studentID, ayID, month, year uint, exIDs []uint) dto.GenerateMonthlyInvoiceParams {
	return dto.GenerateMonthlyInvoiceParams{
		StudentID:          studentID,
		AcademicYearID:     ayID,
		Level:              "intan",
		Gender:             "L",
		Month:              month,
		Year:               year,
		ExtracurricularIDs: exIDs,
	}
}

func countInvoiceItems(t *testing.T, db *gorm.DB, invoiceID uint, category string) (count int64, total float64) {
	t.Helper()
	var items []model.InvoiceItem
	require.NoError(t, db.Where("invoice_id = ? AND category = ?", invoiceID, category).Find(&items).Error)
	for _, it := range items {
		total += it.Amount
	}
	return int64(len(items)), total
}

// --- Remove / Restore per-bulan (ekstrakurikuler) ---

func TestRemoveExtracurricularItemFromMonthly_UnpaidRemovedPaidKept(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedExclusionInvoiceFixture(t, db)

	// Invoice Oktober punya 2 item Robotika: satu unpaid, satu paid
	var inv model.Invoice
	require.NoError(t, db.Where("student_id = ? AND month = ? AND year = ?", fx.StudentID, 10, 2025).First(&inv).Error)
	require.NoError(t, db.Create(&model.InvoiceItem{InvoiceID: inv.ID, Name: "Robotika", Category: "pasta", Amount: 100000, IsMandatory: true}).Error)
	require.NoError(t, db.Create(&model.InvoiceItem{InvoiceID: inv.ID, Name: "Robotika", Category: "pasta", Amount: 100000, IsMandatory: true, PaidAmount: 100000, Status: "paid"}).Error)

	gen := newTestInvoiceGen(t, db)
	err := gen.RemoveExtracurricularItemFromMonthly(fx.StudentID, fx.ExID, 10, 2025)
	require.NoError(t, err)

	count, total := countInvoiceItems(t, db, inv.ID, "pasta")
	assert.Equal(t, int64(1), count, "item paid tidak boleh dihapus")
	assert.Equal(t, 100000.0, total)

	var reloaded model.Invoice
	require.NoError(t, db.First(&reloaded, inv.ID).Error)
	assert.Equal(t, 100000.0, reloaded.TotalAmount, "total harus di-recalculate")
}

func TestRestoreExtracurricularItemToMonthly_Idempotent(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedExclusionInvoiceFixture(t, db)

	var inv model.Invoice
	require.NoError(t, db.Where("student_id = ? AND month = ? AND year = ?", fx.StudentID, 11, 2025).First(&inv).Error)

	gen := newTestInvoiceGen(t, db)
	require.NoError(t, gen.RestoreExtracurricularItemToMonthly(fx.StudentID, fx.ExID, fx.AcademicYear.ID, 11, 2025))

	count, total := countInvoiceItems(t, db, inv.ID, "pasta")
	assert.Equal(t, int64(1), count, "item harus ditambahkan")
	assert.Equal(t, 100000.0, total)

	// Idempotent: panggil kedua kali → tidak duplikat
	require.NoError(t, gen.RestoreExtracurricularItemToMonthly(fx.StudentID, fx.ExID, fx.AcademicYear.ID, 11, 2025))
	count, _ = countInvoiceItems(t, db, inv.ID, "pasta")
	assert.Equal(t, int64(1), count, "restore tidak boleh duplikat")
}

// --- Remove / Restore per-bulan (fasilitas) ---

func TestRemoveFacilityItemFromMonthly_UnpaidRemovedPaidKept(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedExclusionInvoiceFixture(t, db)

	var inv model.Invoice
	require.NoError(t, db.Where("student_id = ? AND month = ? AND year = ?", fx.StudentID, 10, 2025).First(&inv).Error)
	fid := fx.FacilityID
	require.NoError(t, db.Create(&model.InvoiceItem{InvoiceID: inv.ID, Name: "Antar Jemput", Category: "facility", Amount: 50000, IsMandatory: true, FacilityID: &fid}).Error)
	require.NoError(t, db.Create(&model.InvoiceItem{InvoiceID: inv.ID, Name: "Antar Jemput", Category: "facility", Amount: 50000, IsMandatory: true, FacilityID: &fid, PaidAmount: 50000, Status: "paid"}).Error)

	gen := newTestInvoiceGen(t, db)
	require.NoError(t, gen.RemoveFacilityItemFromMonthly(fx.StudentID, fx.FacilityID, 10, 2025))

	count, total := countInvoiceItems(t, db, inv.ID, "facility")
	assert.Equal(t, int64(1), count, "item paid tidak boleh dihapus")
	assert.Equal(t, 50000.0, total)
}

func TestRestoreFacilityItemToMonthly_AddsItem(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedExclusionInvoiceFixture(t, db)

	var inv model.Invoice
	require.NoError(t, db.Where("student_id = ? AND month = ? AND year = ?", fx.StudentID, 11, 2025).First(&inv).Error)

	gen := newTestInvoiceGen(t, db)
	require.NoError(t, gen.RestoreFacilityItemToMonthly(fx.StudentID, fx.FacilityID, fx.AcademicYear.ID, 11, 2025))

	count, total := countInvoiceItems(t, db, inv.ID, "facility")
	assert.Equal(t, int64(1), count)
	assert.Equal(t, 50000.0, total)
}

// --- Aturan B: Unenroll membersihkan item unpaid termasuk bulan sebelumnya ---

func TestRemoveExtracurricularInvoices_RemovesUnpaidIncludingPastMonths(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedExclusionInvoiceFixture(t, db)

	// Enrollment ekskul start 2025-08-01, unenroll November (end_date bulan 11).
	// Item unpaid Agustus (bulan SEBELUM end_date) harus ikut terhapus.
	var augInv model.Invoice
	require.NoError(t, db.Where("student_id = ? AND month = ? AND year = ?", fx.StudentID, 8, 2025).First(&augInv).Error)
	require.NoError(t, db.Create(&model.InvoiceItem{InvoiceID: augInv.ID, Name: "Robotika", Category: "pasta", Amount: 100000, IsMandatory: true}).Error)
	require.NoError(t, db.Create(&model.InvoiceItem{InvoiceID: augInv.ID, Name: "Robotika", Category: "pasta", Amount: 100000, IsMandatory: true, PaidAmount: 100000, Status: "paid"}).Error)

	var novInv model.Invoice
	require.NoError(t, db.Where("student_id = ? AND month = ? AND year = ?", fx.StudentID, 11, 2025).First(&novInv).Error)
	require.NoError(t, db.Create(&model.InvoiceItem{InvoiceID: novInv.ID, Name: "Robotika", Category: "pasta", Amount: 100000, IsMandatory: true}).Error)

	gen := newTestInvoiceGen(t, db)
	// startDate = 2025-08-01 → cutoff Agustus, bukan bulan berjalan/end_date
	require.NoError(t, gen.RemoveExtracurricularInvoices(fx.StudentID, fx.ExID, fx.AcademicYear.ID, time.Date(2025, 8, 1, 0, 0, 0, 0, time.UTC)))

	// Agustus: item unpaid terhapus, item paid tetap
	count, total := countInvoiceItems(t, db, augInv.ID, "pasta")
	assert.Equal(t, int64(1), count, "item paid tidak boleh dihapus")
	assert.Equal(t, 100000.0, total)

	var reloadedAug model.Invoice
	require.NoError(t, db.First(&reloadedAug, augInv.ID).Error)
	assert.Equal(t, 100000.0, reloadedAug.TotalAmount, "total invoice harus di-recalculate")

	// November: item unpaid terhapus
	count, _ = countInvoiceItems(t, db, novInv.ID, "pasta")
	assert.Equal(t, int64(0), count)
}

func TestRemoveFacilityInvoices_RemovesUnpaidIncludingPastMonths(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedExclusionInvoiceFixture(t, db)

	fid := fx.FacilityID
	var augInv model.Invoice
	require.NoError(t, db.Where("student_id = ? AND month = ? AND year = ?", fx.StudentID, 8, 2025).First(&augInv).Error)
	require.NoError(t, db.Create(&model.InvoiceItem{InvoiceID: augInv.ID, Name: "Antar Jemput", Category: "facility", Amount: 50000, IsMandatory: true, FacilityID: &fid}).Error)
	require.NoError(t, db.Create(&model.InvoiceItem{InvoiceID: augInv.ID, Name: "Antar Jemput", Category: "facility", Amount: 50000, IsMandatory: true, FacilityID: &fid, PaidAmount: 50000, Status: "paid"}).Error)

	gen := newTestInvoiceGen(t, db)
	require.NoError(t, gen.RemoveFacilityInvoices(fx.StudentID, fx.FacilityID, fx.AcademicYear.ID, time.Date(2025, 8, 1, 0, 0, 0, 0, time.UTC)))

	count, total := countInvoiceItems(t, db, augInv.ID, "facility")
	assert.Equal(t, int64(1), count, "item paid tidak boleh dihapus")
	assert.Equal(t, 50000.0, total)
}

// --- Preview (dry-run) pembersihan tagihan PASTA ---

func TestPlanExtracurricularCleanupInvoices_ListsOnlyUnpaid(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedExclusionInvoiceFixture(t, db)

	var augInv model.Invoice
	require.NoError(t, db.Where("student_id = ? AND month = ? AND year = ?", fx.StudentID, 8, 2025).First(&augInv).Error)
	require.NoError(t, db.Create(&model.InvoiceItem{InvoiceID: augInv.ID, Name: "Robotika", Category: "pasta", Amount: 100000, IsMandatory: true}).Error)
	require.NoError(t, db.Create(&model.InvoiceItem{InvoiceID: augInv.ID, Name: "Robotika", Category: "pasta", Amount: 100000, IsMandatory: true, PaidAmount: 100000, Status: "paid"}).Error)

	var before model.Invoice
	require.NoError(t, db.First(&before, augInv.ID).Error)

	gen := newTestInvoiceGen(t, db)
	plan, err := gen.PlanExtracurricularCleanupInvoices(fx.StudentID, fx.ExID)
	require.NoError(t, err)

	// Hanya item unpaid yang masuk rencana
	require.Equal(t, 1, plan.TotalItems)
	assert.Equal(t, 100000.0, plan.TotalAmount)
	require.Len(t, plan.Items, 1)
	assert.Equal(t, uint(8), plan.Items[0].Month)
	assert.Equal(t, uint(2025), plan.Items[0].Year)
	assert.Equal(t, "Robotika", plan.Items[0].ItemName)

	// Preview TIDAK boleh mengubah data apa pun
	var after model.Invoice
	require.NoError(t, db.First(&after, augInv.ID).Error)
	assert.Equal(t, before.TotalAmount, after.TotalAmount, "preview tidak boleh mengubah total invoice")
	count, _ := countInvoiceItems(t, db, augInv.ID, "pasta")
	assert.Equal(t, int64(2), count, "preview tidak boleh menghapus item")
}

func TestPlanExtracurricularCleanupInvoices_EmptyWhenNothingUnpaid(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedExclusionInvoiceFixture(t, db)

	var augInv model.Invoice
	require.NoError(t, db.Where("student_id = ? AND month = ? AND year = ?", fx.StudentID, 8, 2025).First(&augInv).Error)
	require.NoError(t, db.Create(&model.InvoiceItem{InvoiceID: augInv.ID, Name: "Robotika", Category: "pasta", Amount: 100000, IsMandatory: true, PaidAmount: 100000, Status: "paid"}).Error)

	gen := newTestInvoiceGen(t, db)
	plan, err := gen.PlanExtracurricularCleanupInvoices(fx.StudentID, fx.ExID)
	require.NoError(t, err)
	assert.Equal(t, 0, plan.TotalItems)
	assert.Len(t, plan.Items, 0)
}

func TestPlanExtracurricularCleanupInvoices_MatchesActualRemove(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedExclusionInvoiceFixture(t, db)

	var augInv model.Invoice
	require.NoError(t, db.Where("student_id = ? AND month = ? AND year = ?", fx.StudentID, 8, 2025).First(&augInv).Error)
	require.NoError(t, db.Create(&model.InvoiceItem{InvoiceID: augInv.ID, Name: "Robotika", Category: "pasta", Amount: 100000, IsMandatory: true}).Error)
	require.NoError(t, db.Create(&model.InvoiceItem{InvoiceID: augInv.ID, Name: "Robotika", Category: "pasta", Amount: 100000, IsMandatory: true, PaidAmount: 100000, Status: "paid"}).Error)

	var novInv model.Invoice
	require.NoError(t, db.Where("student_id = ? AND month = ? AND year = ?", fx.StudentID, 11, 2025).First(&novInv).Error)
	require.NoError(t, db.Create(&model.InvoiceItem{InvoiceID: novInv.ID, Name: "Robotika", Category: "pasta", Amount: 100000, IsMandatory: true}).Error)

	gen := newTestInvoiceGen(t, db)
	plan, err := gen.PlanExtracurricularCleanupInvoices(fx.StudentID, fx.ExID)
	require.NoError(t, err)
	plannedIDs := make(map[uint]bool)
	for _, it := range plan.Items {
		plannedIDs[it.ItemID] = true
	}
	require.NotEmpty(t, plannedIDs)

	require.NoError(t, gen.RemoveExtracurricularInvoices(fx.StudentID, fx.ExID, fx.AcademicYear.ID, time.Date(2025, 8, 1, 0, 0, 0, 0, time.UTC)))

	// Item yang tersisa (pasta) hanya yang PAID — preview harus persis dengan eksekusi
	var remaining []model.InvoiceItem
	require.NoError(t, db.Where("category = ?", "pasta").Find(&remaining).Error)
	for _, r := range remaining {
		assert.False(t, plannedIDs[r.ID], "item yang di-plan untuk dihapus tidak boleh tersisa")
		assert.True(t, r.PaidAmount > 0, "item tersisa harus yang paid")
	}
}

// --- Halaman detail PASTA: filter periode berbasis tagihan ---

func newTestStudentExtracurricularSvc(t *testing.T, db *gorm.DB) StudentExtracurricularService {
	t.Helper()
	return NewStudentExtracurricularService(
		db,
		repository.NewStudentExtracurricularRepository(db),
		repository.NewStudentRepository(db),
		repository.NewExtracurricularRepository(db),
		repository.NewAcademicYearRepository(db),
		repository.NewStudentEnrollmentRepository(db),
		repository.NewFeeConfigRepository(db),
		repository.NewFeeConfigItemRepository(db),
		newTestInvoiceGen(t, db),
		repository.NewBillingMonthExclusionRepository(db),
	)
}

func TestGetStudentsByExtracurricular_BillingInRange(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedExclusionInvoiceFixture(t, db)

	// Siswa A (dari fixture): item Robotika unpaid Agustus 2025
	var augInv model.Invoice
	require.NoError(t, db.Where("student_id = ? AND month = ? AND year = ?", fx.StudentID, 8, 2025).First(&augInv).Error)
	require.NoError(t, db.Create(&model.InvoiceItem{InvoiceID: augInv.ID, Name: "Robotika", Category: "pasta", Amount: 100000, IsMandatory: true}).Error)

	// Siswa B: item Robotika Desember 2025 (di luar rentang Agu-Nov)
	studentB := model.Student{FullName: "Siswa B", BirthPlace: "Jakarta", BirthDate: time.Date(2018, 1, 1, 0, 0, 0, 0, time.UTC), Gender: "P", Status: "active"}
	require.NoError(t, db.Create(&studentB).Error)
	m, y := uint(12), uint(2025)
	decInv := model.Invoice{StudentID: studentB.ID, AcademicYearID: fx.AcademicYear.ID, Type: "monthly", Month: &m, Year: &y, Status: "unpaid", TotalAmount: 0}
	require.NoError(t, db.Create(&decInv).Error)
	require.NoError(t, db.Create(&model.InvoiceItem{InvoiceID: decInv.ID, Name: "Robotika", Category: "pasta", Amount: 100000, IsMandatory: true}).Error)

	svc := newTestStudentExtracurricularSvc(t, db)
	names := func(item *dto.ExtracurricularExportItem) []string {
		var out []string
		for _, s := range item.Students {
			out = append(out, s.FullName)
		}
		return out
	}

	// Rentang Agu-Nov 2025 → hanya siswa A
	item, err := svc.GetStudentsByExtracurricular(fx.ExID, fx.AcademicYear.ID, 8, 2025, 11, 2025)
	require.NoError(t, err)
	assert.Contains(t, names(item), "Anak Test")
	assert.NotContains(t, names(item), "Siswa B")

	// Default setahun penuh (semua param 0) → keduanya muncul
	itemFull, err := svc.GetStudentsByExtracurricular(fx.ExID, fx.AcademicYear.ID, 0, 0, 0, 0)
	require.NoError(t, err)
	assert.Contains(t, names(itemFull), "Anak Test")
	assert.Contains(t, names(itemFull), "Siswa B")
}

func TestGetStudentsByExtracurricular_PaidItemStillCounts(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedExclusionInvoiceFixture(t, db)

	// Item SUDAH DIBAYAR tetap dihitung sebagai "memiliki tagihan"
	var sepInv model.Invoice
	require.NoError(t, db.Where("student_id = ? AND month = ? AND year = ?", fx.StudentID, 9, 2025).First(&sepInv).Error)
	require.NoError(t, db.Create(&model.InvoiceItem{InvoiceID: sepInv.ID, Name: "Robotika", Category: "pasta", Amount: 100000, IsMandatory: true, PaidAmount: 100000, Status: "paid"}).Error)

	svc := newTestStudentExtracurricularSvc(t, db)
	item, err := svc.GetStudentsByExtracurricular(fx.ExID, fx.AcademicYear.ID, 8, 2025, 11, 2025)
	require.NoError(t, err)
	require.Len(t, item.Students, 1)
	assert.Equal(t, "Anak Test", item.Students[0].FullName)
}

// --- Skip di jalur generate ---

func TestAddExtracurricularToMonthlyRange_SkipsExcludedMonth(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedExclusionInvoiceFixture(t, db)

	exclRepo := repository.NewBillingMonthExclusionRepository(db)
	require.NoError(t, exclRepo.Replace(db, fx.StudentID, "extracurricular", fx.ExID, []model.BillingMonthExclusion{
		{StudentID: fx.StudentID, EntityType: "extracurricular", EntityRefID: fx.ExID, Month: 10, Year: 2025, AcademicYearID: fx.AcademicYear.ID},
	}))

	gen := newTestInvoiceGen(t, db)
	require.NoError(t, gen.AddExtracurricularToMonthlyRange(fx.StudentID, fx.ExID, fx.AcademicYear.ID))

	var octInv model.Invoice
	require.NoError(t, db.Where("student_id = ? AND month = ? AND year = ?", fx.StudentID, 10, 2025).First(&octInv).Error)
	count, _ := countInvoiceItems(t, db, octInv.ID, "pasta")
	assert.Equal(t, int64(0), count, "bulan yang di-exclude tidak boleh mendapat item")

	var novInv model.Invoice
	require.NoError(t, db.Where("student_id = ? AND month = ? AND year = ?", fx.StudentID, 11, 2025).First(&novInv).Error)
	count, total := countInvoiceItems(t, db, novInv.ID, "pasta")
	assert.Equal(t, int64(1), count, "bulan lain tetap mendapat item")
	assert.Equal(t, 100000.0, total)
}

func TestGenerateMonthly_SkipsExcludedPasta(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	// Tanpa invoice pre-existing — GenerateMonthly idempotent (skip jika invoice ada),
	// jadi uji ini harus memakai siswa baru tanpa invoice bulanan.
	fx := seedExclusionBaseFixture(t, db, false)

	exclRepo := repository.NewBillingMonthExclusionRepository(db)
	require.NoError(t, exclRepo.Replace(db, fx.StudentID, "extracurricular", fx.ExID, []model.BillingMonthExclusion{
		{StudentID: fx.StudentID, EntityType: "extracurricular", EntityRefID: fx.ExID, Month: 10, Year: 2025, AcademicYearID: fx.AcademicYear.ID},
	}))

	gen := newTestInvoiceGen(t, db)
	err := gen.GenerateMonthly(dtoGenerateMonthlyParams(fx.StudentID, fx.AcademicYear.ID, 10, 2025, []uint{fx.ExID}))
	require.NoError(t, err)

	var inv model.Invoice
	require.NoError(t, db.Where("student_id = ? AND month = ? AND year = ? AND type = ?", fx.StudentID, 10, 2025, "monthly").First(&inv).Error)
	count, _ := countInvoiceItems(t, db, inv.ID, "pasta")
	assert.Equal(t, int64(0), count, "GenerateMonthly harus skip pasta yang di-exclude")

	// Kontrol: bulan 11 tanpa exclusion → pasta tetap masuk
	err = gen.GenerateMonthly(dtoGenerateMonthlyParams(fx.StudentID, fx.AcademicYear.ID, 11, 2025, []uint{fx.ExID}))
	require.NoError(t, err)
	var novInv model.Invoice
	require.NoError(t, db.Where("student_id = ? AND month = ? AND year = ? AND type = ?", fx.StudentID, 11, 2025, "monthly").First(&novInv).Error)
	count, total := countInvoiceItems(t, db, novInv.ID, "pasta")
	assert.Equal(t, int64(1), count)
	assert.Equal(t, 100000.0, total)
}

func TestGenerateMonthly_SkipsExcludedFacility(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedExclusionBaseFixture(t, db, false)

	exclRepo := repository.NewBillingMonthExclusionRepository(db)
	require.NoError(t, exclRepo.Replace(db, fx.StudentID, "facility", fx.FacilityID, []model.BillingMonthExclusion{
		{StudentID: fx.StudentID, EntityType: "facility", EntityRefID: fx.FacilityID, Month: 12, Year: 2025, AcademicYearID: fx.AcademicYear.ID},
	}))

	gen := newTestInvoiceGen(t, db)
	err := gen.GenerateMonthly(dtoGenerateMonthlyParams(fx.StudentID, fx.AcademicYear.ID, 12, 2025, nil))
	require.NoError(t, err)

	var inv model.Invoice
	require.NoError(t, db.Where("student_id = ? AND month = ? AND year = ? AND type = ?", fx.StudentID, 12, 2025, "monthly").First(&inv).Error)
	count, _ := countInvoiceItems(t, db, inv.ID, "facility")
	assert.Equal(t, int64(0), count, "GenerateMonthly harus skip fasilitas yang di-exclude")

	// Kontrol: bulan 1/2026 tanpa exclusion → fasilitas tetap masuk
	err = gen.GenerateMonthly(dtoGenerateMonthlyParams(fx.StudentID, fx.AcademicYear.ID, 1, 2026, nil))
	require.NoError(t, err)
	var janInv model.Invoice
	require.NoError(t, db.Where("student_id = ? AND month = ? AND year = ? AND type = ?", fx.StudentID, 1, 2026, "monthly").First(&janInv).Error)
	count, total := countInvoiceItems(t, db, janInv.ID, "facility")
	assert.Equal(t, int64(1), count)
	assert.Equal(t, 50000.0, total)
}
