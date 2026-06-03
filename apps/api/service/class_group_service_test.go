package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"gorm.io/gorm"
)

func seedCloneData(t *testing.T, db *gorm.DB) (fromAY, toAY model.AcademicYear) {
	t.Helper()

	fromAY = model.AcademicYear{Name: "2024/2025", StartDate: time.Date(2024, 7, 15, 0, 0, 0, 0, time.UTC), EndDate: time.Date(2025, 6, 30, 0, 0, 0, 0, time.UTC)}
	db.Create(&fromAY)
	toAY = model.AcademicYear{Name: "2025/2026", StartDate: time.Date(2025, 7, 14, 0, 0, 0, 0, time.UTC), EndDate: time.Date(2026, 6, 30, 0, 0, 0, 0, time.UTC)}
	db.Create(&toAY)

	// Create source class groups
	groups := []model.ClassGroup{
		{AcademicYearID: fromAY.ID, Name: "Mutiara 1", Level: "mutiara", Schedule: []byte(`{"weekdays":{"days":["senin","rabu"]}}`)},
		{AcademicYearID: fromAY.ID, Name: "Mutiara 2", Level: "mutiara", Schedule: []byte(`{"weekdays":{"days":["selasa","kamis"]}}`)},
		{AcademicYearID: fromAY.ID, Name: "Intan 1", Level: "intan", Schedule: []byte(`{"weekdays":{"days":["senin","selasa","rabu","kamis"]}}`)},
	}
	for i := range groups {
		db.Create(&groups[i])
	}

	return
}

func newTestClassGroupService(db *gorm.DB) ClassGroupService {
	return NewClassGroupService(repository.NewClassGroupRepository(db))
}

func TestCloneToYear_Success(t *testing.T) {
	db := setupTestDB(t)
	fromAY, toAY := seedCloneData(t, db)
	svc := newTestClassGroupService(db)

	result, err := svc.CloneToYear(dto.CloneClassGroupsRequest{
		FromAcademicYearID: fromAY.ID,
		ToAcademicYearID:   toAY.ID,
	})

	assert.NoError(t, err)
	assert.Equal(t, 3, result.Created)
	assert.Equal(t, 0, result.Skipped)
	assert.Len(t, result.Groups, 3)

	// Verify actual DB records
	var count int64
	db.Model(&model.ClassGroup{}).Where("academic_year_id = ?", toAY.ID).Count(&count)
	assert.Equal(t, int64(3), count)

	// Verify schedule was copied
	var cloned model.ClassGroup
	db.Where("academic_year_id = ? AND name = ?", toAY.ID, "Mutiara 1").First(&cloned)
	assert.Contains(t, string(cloned.Schedule), "senin")
}

func TestCloneToYear_SkipsDuplicates(t *testing.T) {
	db := setupTestDB(t)
	fromAY, toAY := seedCloneData(t, db)

	// Pre-create one class in target year
	db.Create(&model.ClassGroup{AcademicYearID: toAY.ID, Name: "Mutiara 1", Level: "mutiara", Schedule: []byte(`{}`)})

	svc := newTestClassGroupService(db)

	result, err := svc.CloneToYear(dto.CloneClassGroupsRequest{
		FromAcademicYearID: fromAY.ID,
		ToAcademicYearID:   toAY.ID,
	})

	assert.NoError(t, err)
	assert.Equal(t, 2, result.Created)
	assert.Equal(t, 1, result.Skipped)
}

func TestCloneToYear_SameYear(t *testing.T) {
	db := setupTestDB(t)
	fromAY, _ := seedCloneData(t, db)
	svc := newTestClassGroupService(db)

	_, err := svc.CloneToYear(dto.CloneClassGroupsRequest{
		FromAcademicYearID: fromAY.ID,
		ToAcademicYearID:   fromAY.ID,
	})

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "tidak boleh sama")
}

func TestCloneToYear_EmptySource(t *testing.T) {
	db := setupTestDB(t)
	_, toAY := seedCloneData(t, db)

	// Create a third empty year
	emptyAY := model.AcademicYear{Name: "2026/2027", StartDate: time.Date(2026, 7, 1, 0, 0, 0, 0, time.UTC), EndDate: time.Date(2027, 6, 30, 0, 0, 0, 0, time.UTC)}
	db.Create(&emptyAY)

	svc := newTestClassGroupService(db)

	_, err := svc.CloneToYear(dto.CloneClassGroupsRequest{
		FromAcademicYearID: emptyAY.ID,
		ToAcademicYearID:   toAY.ID,
	})

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "Tidak ada rombel")
}

func TestCloneToYear_Idempotent(t *testing.T) {
	db := setupTestDB(t)
	fromAY, toAY := seedCloneData(t, db)
	svc := newTestClassGroupService(db)

	// First clone
	result1, err := svc.CloneToYear(dto.CloneClassGroupsRequest{
		FromAcademicYearID: fromAY.ID,
		ToAcademicYearID:   toAY.ID,
	})
	assert.NoError(t, err)
	assert.Equal(t, 3, result1.Created)

	// Second clone — all should be skipped
	result2, err := svc.CloneToYear(dto.CloneClassGroupsRequest{
		FromAcademicYearID: fromAY.ID,
		ToAcademicYearID:   toAY.ID,
	})
	assert.NoError(t, err)
	assert.Equal(t, 0, result2.Created)
	assert.Equal(t, 3, result2.Skipped)
}
