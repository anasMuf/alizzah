package service

import (
	"api/model"
	"api/repository"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestUnenrollExtracurricular_DeletesBillingExclusions(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedExclusionBaseFixture(t, db, false)

	var se model.StudentExtracurricular
	require.NoError(t, db.Where("student_id = ? AND extracurricular_id = ?", fx.StudentID, fx.ExID).First(&se).Error)

	exclRepo := repository.NewBillingMonthExclusionRepository(db)
	require.NoError(t, exclRepo.Replace(db, fx.StudentID, "extracurricular", fx.ExID, []model.BillingMonthExclusion{
		{StudentID: fx.StudentID, EntityType: "extracurricular", EntityRefID: fx.ExID, Month: 9, Year: 2025, AcademicYearID: fx.AcademicYear.ID},
	}))

	svc := NewStudentExtracurricularService(
		db,
		repository.NewStudentExtracurricularRepository(db),
		repository.NewStudentRepository(db),
		repository.NewExtracurricularRepository(db),
		repository.NewAcademicYearRepository(db),
		repository.NewStudentEnrollmentRepository(db),
		newTestInvoiceGen(t, db),
		exclRepo,
	)

	err := svc.Unenroll(fx.StudentID, se.ID)
	require.NoError(t, err)

	// Enrollment ditutup
	var reloaded model.StudentExtracurricular
	require.NoError(t, db.First(&reloaded, se.ID).Error)
	assert.NotNil(t, reloaded.EndDate, "end_date harus ter-set saat unenroll")

	// R.8: exclusion ikut terhapus
	exclusions, err := exclRepo.FindByStudentAndEntity(fx.StudentID, "extracurricular", fx.ExID)
	require.NoError(t, err)
	assert.Len(t, exclusions, 0, "exclusion harus dihapus saat unenroll")
}

func TestUnenrollFacility_DeletesBillingExclusions(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	fx := seedExclusionBaseFixture(t, db, false)

	var sf model.StudentFacility
	require.NoError(t, db.Where("student_id = ? AND facility_id = ?", fx.StudentID, fx.FacilityID).First(&sf).Error)

	exclRepo := repository.NewBillingMonthExclusionRepository(db)
	require.NoError(t, exclRepo.Replace(db, fx.StudentID, "facility", fx.FacilityID, []model.BillingMonthExclusion{
		{StudentID: fx.StudentID, EntityType: "facility", EntityRefID: fx.FacilityID, Month: 9, Year: 2025, AcademicYearID: fx.AcademicYear.ID},
	}))

	svc := NewStudentFacilityService(
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
		exclRepo,
	)

	err := svc.Unenroll(fx.StudentID, sf.ID)
	require.NoError(t, err)

	// Enrollment ditutup
	var reloaded model.StudentFacility
	require.NoError(t, db.First(&reloaded, sf.ID).Error)
	assert.NotNil(t, reloaded.EndDate, "end_date harus ter-set saat unenroll")

	// R.8: exclusion ikut terhapus
	exclusions, err := exclRepo.FindByStudentAndEntity(fx.StudentID, "facility", fx.FacilityID)
	require.NoError(t, err)
	assert.Len(t, exclusions, 0, "exclusion harus dihapus saat unenroll")
}
