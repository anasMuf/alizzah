package repository

import (
	"api/model"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupBillingExclusionTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	if err := db.AutoMigrate(&model.BillingMonthExclusion{}); err != nil {
		t.Fatalf("failed to migrate test db: %v", err)
	}
	return db
}

func seedExclusionFixtures(t *testing.T, db *gorm.DB) (studentID, exID, facilityID uint) {
	t.Helper()
	studentID = 1
	exID = 10
	facilityID = 20
	repo := NewBillingMonthExclusionRepository(db)
	err := repo.Replace(db, studentID, "extracurricular", exID, []model.BillingMonthExclusion{
		{StudentID: studentID, EntityType: "extracurricular", EntityRefID: exID, Month: 9, Year: 2026, AcademicYearID: 1},
		{StudentID: studentID, EntityType: "extracurricular", EntityRefID: exID, Month: 10, Year: 2026, AcademicYearID: 1},
	})
	require.NoError(t, err)
	return studentID, exID, facilityID
}

func TestBillingExclusion_Exists(t *testing.T) {
	db := setupBillingExclusionTestDB(t)
	studentID, exID, _ := seedExclusionFixtures(t, db)

	repo := NewBillingMonthExclusionRepository(db)

	ok, err := repo.Exists(studentID, "extracurricular", exID, 9, 2026)
	assert.NoError(t, err)
	assert.True(t, ok, "bulan 9/2026 harus ter-exclude")

	ok, err = repo.Exists(studentID, "extracurricular", exID, 8, 2026)
	assert.NoError(t, err)
	assert.False(t, ok, "bulan 8/2026 tidak ter-exclude")

	ok, err = repo.Exists(studentID, "facility", 20, 9, 2026)
	assert.NoError(t, err)
	assert.False(t, ok, "entity berbeda tidak ter-exclude")
}

func TestBillingExclusion_FindByStudentAndEntity(t *testing.T) {
	db := setupBillingExclusionTestDB(t)
	studentID, exID, facilityID := seedExclusionFixtures(t, db)

	// Tambahkan exclusion fasilitas — harus tidak tercampur dengan ekskul
	repo := NewBillingMonthExclusionRepository(db)
	require.NoError(t, repo.Replace(db, studentID, "facility", facilityID, []model.BillingMonthExclusion{
		{StudentID: studentID, EntityType: "facility", EntityRefID: facilityID, Month: 11, Year: 2026, AcademicYearID: 1},
	}))

	exs, err := repo.FindByStudentAndEntity(studentID, "extracurricular", exID)
	assert.NoError(t, err)
	require.Len(t, exs, 2)
	assert.Equal(t, uint(9), exs[0].Month, "urut naik berdasarkan bulan")
	assert.Equal(t, uint(10), exs[1].Month)

	fs, err := repo.FindByStudentAndEntity(studentID, "facility", facilityID)
	assert.NoError(t, err)
	require.Len(t, fs, 1)
	assert.Equal(t, uint(11), fs[0].Month)
}

func TestBillingExclusion_Replace_EmptyClearsAll(t *testing.T) {
	db := setupBillingExclusionTestDB(t)
	studentID, exID, _ := seedExclusionFixtures(t, db)

	repo := NewBillingMonthExclusionRepository(db)
	// Daftar kosong = hapus semua exclusion (replace-all source of truth)
	require.NoError(t, repo.Replace(db, studentID, "extracurricular", exID, nil))

	exs, err := repo.FindByStudentAndEntity(studentID, "extracurricular", exID)
	assert.NoError(t, err)
	assert.Len(t, exs, 0)
}

func TestBillingExclusion_Replace_NoUniqueConflictOnReinsert(t *testing.T) {
	db := setupBillingExclusionTestDB(t)
	studentID, exID, _ := seedExclusionFixtures(t, db)

	repo := NewBillingMonthExclusionRepository(db)
	// Replace ulang dengan bulan yang sama — harus sukses (hard delete, bukan soft)
	require.NoError(t, repo.Replace(db, studentID, "extracurricular", exID, []model.BillingMonthExclusion{
		{StudentID: studentID, EntityType: "extracurricular", EntityRefID: exID, Month: 9, Year: 2026, AcademicYearID: 1},
	}))

	exs, err := repo.FindByStudentAndEntity(studentID, "extracurricular", exID)
	assert.NoError(t, err)
	require.Len(t, exs, 1)
	assert.Equal(t, uint(9), exs[0].Month)
}

func TestBillingExclusion_Replace_TransactionalRollback(t *testing.T) {
	db := setupBillingExclusionTestDB(t)
	studentID, exID, _ := seedExclusionFixtures(t, db)

	repo := NewBillingMonthExclusionRepository(db)

	// Simulasikan transaksi yang gagal di tengah: Replace sukses, lalu insert
	// langsung duplikat (student, entity_type, entity_ref, month, year) yang
	// melanggar unique index. (Replace kedua tidak memadai untuk uji ini karena
	// dia menghapus dulu baris yang sama, bukan memicu duplikat.)
	err := db.Transaction(func(tx *gorm.DB) error {
		if err := repo.Replace(tx, studentID, "extracurricular", exID, []model.BillingMonthExclusion{
			{StudentID: studentID, EntityType: "extracurricular", EntityRefID: exID, Month: 12, Year: 2026, AcademicYearID: 1},
		}); err != nil {
			return err
		}
		dup := model.BillingMonthExclusion{
			StudentID: studentID, EntityType: "extracurricular", EntityRefID: exID,
			Month: 12, Year: 2026, AcademicYearID: 1,
		}
		return tx.Create(&dup).Error
	})
	assert.Error(t, err, "transaksi harus gagal karena unique constraint")

	// Rollback: daftar lama (9, 10) harus tetap utuh
	exs, err := repo.FindByStudentAndEntity(studentID, "extracurricular", exID)
	assert.NoError(t, err)
	require.Len(t, exs, 2, "rollback harus mengembalikan daftar lama")
}

func TestBillingExclusion_DeleteByStudentAndEntity(t *testing.T) {
	db := setupBillingExclusionTestDB(t)
	studentID, exID, facilityID := seedExclusionFixtures(t, db)

	repo := NewBillingMonthExclusionRepository(db)
	require.NoError(t, repo.Replace(db, studentID, "facility", facilityID, []model.BillingMonthExclusion{
		{StudentID: studentID, EntityType: "facility", EntityRefID: facilityID, Month: 11, Year: 2026, AcademicYearID: 1},
	}))

	// Hapus exclusion ekskul — exclusion fasilitas tidak boleh ikut terhapus
	require.NoError(t, repo.DeleteByStudentAndEntity(studentID, "extracurricular", exID))

	exs, err := repo.FindByStudentAndEntity(studentID, "extracurricular", exID)
	assert.NoError(t, err)
	assert.Len(t, exs, 0)

	fs, err := repo.FindByStudentAndEntity(studentID, "facility", facilityID)
	assert.NoError(t, err)
	require.Len(t, fs, 1, "exclusion entity lain tidak boleh terhapus")
}
