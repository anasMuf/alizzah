package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func dtoSetMonths(months ...dto.BillingExclusionMonth) dto.SetBillingExclusionsRequest {
	return dto.SetBillingExclusionsRequest{Months: months}
}

func TestSetExclusions_AddSkipRemovesUnpaidItem(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedExclusionInvoiceFixture(t, db)

	// Oct invoice punya item pasta unpaid
	var inv model.Invoice
	require.NoError(t, db.Where("student_id = ? AND month = ? AND year = ?", fx.StudentID, 10, 2025).First(&inv).Error)
	require.NoError(t, db.Create(&model.InvoiceItem{InvoiceID: inv.ID, Name: "Robotika", Category: "pasta", Amount: 100000, IsMandatory: true}).Error)

	svc := NewBillingExclusionService(
		db,
		repository.NewBillingMonthExclusionRepository(db),
		repository.NewAcademicYearRepository(db),
		newTestInvoiceGen(t, db),
	)

	resp, err := svc.SetExclusions(fx.StudentID, "extracurricular", fx.ExID, dtoSetMonths(
		dto.BillingExclusionMonth{Month: 10, Year: 2025},
	))
	require.NoError(t, err)
	require.Len(t, resp.Months, 1)
	assert.Equal(t, uint(10), resp.Months[0].Month)

	// Item unpaid harus hilang dari invoice Oktober
	count, _ := countInvoiceItems(t, db, inv.ID, "pasta")
	assert.Equal(t, int64(0), count, "item unpaid harus dihapus saat bulan di-skip")
}

func TestSetExclusions_KeepPaidItem(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedExclusionInvoiceFixture(t, db)

	var inv model.Invoice
	require.NoError(t, db.Where("student_id = ? AND month = ? AND year = ?", fx.StudentID, 10, 2025).First(&inv).Error)
	require.NoError(t, db.Create(&model.InvoiceItem{InvoiceID: inv.ID, Name: "Robotika", Category: "pasta", Amount: 100000, IsMandatory: true, PaidAmount: 100000, Status: "paid"}).Error)

	svc := NewBillingExclusionService(
		db,
		repository.NewBillingMonthExclusionRepository(db),
		repository.NewAcademicYearRepository(db),
		newTestInvoiceGen(t, db),
	)

	_, err := svc.SetExclusions(fx.StudentID, "extracurricular", fx.ExID, dtoSetMonths(
		dto.BillingExclusionMonth{Month: 10, Year: 2025},
	))
	require.NoError(t, err)

	// Item paid tidak boleh dihapus (integritas pembayaran)
	count, _ := countInvoiceItems(t, db, inv.ID, "pasta")
	assert.Equal(t, int64(1), count, "item paid tidak boleh dihapus")
}

func TestSetExclusions_ClearRestoresItem(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedExclusionInvoiceFixture(t, db)

	var inv model.Invoice
	require.NoError(t, db.Where("student_id = ? AND month = ? AND year = ?", fx.StudentID, 10, 2025).First(&inv).Error)

	svc := NewBillingExclusionService(
		db,
		repository.NewBillingMonthExclusionRepository(db),
		repository.NewAcademicYearRepository(db),
		newTestInvoiceGen(t, db),
	)

	// 1. Skip Oktober → item ditambahkan dulu lalu dihapus
	_, err := svc.SetExclusions(fx.StudentID, "extracurricular", fx.ExID, dtoSetMonths(
		dto.BillingExclusionMonth{Month: 10, Year: 2025},
	))
	require.NoError(t, err)

	// 2. Cabut skip (daftar kosong) → item harus dikembalikan
	resp, err := svc.SetExclusions(fx.StudentID, "extracurricular", fx.ExID, dtoSetMonths())
	require.NoError(t, err)
	assert.Len(t, resp.Months, 0)

	count, total := countInvoiceItems(t, db, inv.ID, "pasta")
	assert.Equal(t, int64(1), count, "item harus dikembalikan saat skip dicabut")
	assert.Equal(t, 100000.0, total)
}

func TestSetExclusions_DedupeAndReplaceAll(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedExclusionInvoiceFixture(t, db)

	svc := NewBillingExclusionService(
		db,
		repository.NewBillingMonthExclusionRepository(db),
		repository.NewAcademicYearRepository(db),
		newTestInvoiceGen(t, db),
	)

	// Duplikat Oktober dikirim dua kali → harus di-dedupe
	_, err := svc.SetExclusions(fx.StudentID, "extracurricular", fx.ExID, dtoSetMonths(
		dto.BillingExclusionMonth{Month: 10, Year: 2025},
		dto.BillingExclusionMonth{Month: 10, Year: 2025},
		dto.BillingExclusionMonth{Month: 11, Year: 2025},
	))
	require.NoError(t, err)

	resp, err := svc.GetByStudentAndEntity(fx.StudentID, "extracurricular", fx.ExID)
	require.NoError(t, err)
	require.Len(t, resp.Months, 2)

	// Replace-all: set ulang hanya Januari → Oktober & November hilang
	_, err = svc.SetExclusions(fx.StudentID, "extracurricular", fx.ExID, dtoSetMonths(
		dto.BillingExclusionMonth{Month: 1, Year: 2026},
	))
	require.NoError(t, err)

	resp, err = svc.GetByStudentAndEntity(fx.StudentID, "extracurricular", fx.ExID)
	require.NoError(t, err)
	require.Len(t, resp.Months, 1)
	assert.Equal(t, uint(1), resp.Months[0].Month)
	assert.Equal(t, uint(2026), resp.Months[0].Year)
}

func TestSetExclusions_RejectsOutsideAcademicYear(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedExclusionInvoiceFixture(t, db)

	svc := NewBillingExclusionService(
		db,
		repository.NewBillingMonthExclusionRepository(db),
		repository.NewAcademicYearRepository(db),
		newTestInvoiceGen(t, db),
	)

	// Juni 2025 sebelum tahun ajaran 2025/2026 (mulai Juli 2025)
	_, err := svc.SetExclusions(fx.StudentID, "extracurricular", fx.ExID, dtoSetMonths(
		dto.BillingExclusionMonth{Month: 6, Year: 2025},
	))
	require.Error(t, err)
	assert.Contains(t, err.Error(), "di luar tahun ajaran aktif")
}

func TestSetExclusions_RejectsInvalidEntityType(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedExclusionInvoiceFixture(t, db)

	svc := NewBillingExclusionService(
		db,
		repository.NewBillingMonthExclusionRepository(db),
		repository.NewAcademicYearRepository(db),
		newTestInvoiceGen(t, db),
	)

	_, err := svc.SetExclusions(fx.StudentID, "daycare", fx.ExID, dtoSetMonths())
	require.Error(t, err)
	assert.Contains(t, err.Error(), "entity_type tidak valid")
}

func TestSetExclusions_FacilitySkipAndClear(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedExclusionInvoiceFixture(t, db)

	// Invoice Oktober punya item fasilitas unpaid
	var inv model.Invoice
	require.NoError(t, db.Where("student_id = ? AND month = ? AND year = ?", fx.StudentID, 10, 2025).First(&inv).Error)
	fid := fx.FacilityID
	require.NoError(t, db.Create(&model.InvoiceItem{InvoiceID: inv.ID, Name: "Antar Jemput", Category: "facility", Amount: 50000, IsMandatory: true, FacilityID: &fid}).Error)

	svc := NewBillingExclusionService(
		db,
		repository.NewBillingMonthExclusionRepository(db),
		repository.NewAcademicYearRepository(db),
		newTestInvoiceGen(t, db),
	)

	// Skip Oktober (facility) → item unpaid harus hilang
	resp, err := svc.SetExclusions(fx.StudentID, "facility", fx.FacilityID, dtoSetMonths(
		dto.BillingExclusionMonth{Month: 10, Year: 2025},
	))
	require.NoError(t, err)
	require.Len(t, resp.Months, 1)
	assert.Equal(t, uint(10), resp.Months[0].Month)

	count, _ := countInvoiceItems(t, db, inv.ID, "facility")
	assert.Equal(t, int64(0), count, "item facility unpaid harus dihapus saat bulan di-skip")

	// Cabut skip (daftar kosong) → item facility harus dikembalikan
	resp, err = svc.SetExclusions(fx.StudentID, "facility", fx.FacilityID, dtoSetMonths())
	require.NoError(t, err)
	assert.Len(t, resp.Months, 0)

	count, total := countInvoiceItems(t, db, inv.ID, "facility")
	assert.Equal(t, int64(1), count, "item facility harus dikembalikan saat skip dicabut")
	assert.Equal(t, 50000.0, total)
}
