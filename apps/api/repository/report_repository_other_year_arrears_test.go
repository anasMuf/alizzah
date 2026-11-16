package repository

import (
	"testing"
	"time"

	"api/model"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/datatypes"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupOtherYearArrearsTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	sqlDB, err := db.DB()
	require.NoError(t, err)
	sqlDB.SetMaxOpenConns(1)

	require.NoError(t, db.AutoMigrate(
		&model.User{},
		&model.AcademicYear{},
		&model.ClassGroup{},
		&model.Student{},
		&model.StudentEnrollment{},
		&model.Invoice{},
	))
	return db
}

type otherYearArrearsFixture struct {
	SelectedAY model.AcademicYear
	PastAY     model.AcademicYear
}

func seedOtherYearArrearsFixture(t *testing.T, db *gorm.DB) otherYearArrearsFixture {
	t.Helper()

	user := model.User{Email: "admin-other-year@test.com", Password: "hashed", Role: "superadmin", FullName: "Admin"}
	require.NoError(t, db.Create(&user).Error)

	past := model.AcademicYear{
		Name:      "2024/2025",
		StartDate: time.Date(2024, 7, 15, 0, 0, 0, 0, time.UTC),
		EndDate:   time.Date(2025, 6, 30, 0, 0, 0, 0, time.UTC),
		IsActive:  false,
	}
	require.NoError(t, db.Create(&past).Error)

	selected := model.AcademicYear{
		Name:      "2025/2026",
		StartDate: time.Date(2025, 7, 15, 0, 0, 0, 0, time.UTC),
		EndDate:   time.Date(2026, 6, 30, 0, 0, 0, 0, time.UTC),
		IsActive:  true,
	}
	require.NoError(t, db.Create(&selected).Error)

	classA := model.ClassGroup{AcademicYearID: selected.ID, Name: "Intan 1", Level: "intan", Schedule: datatypes.JSON([]byte("{}"))}
	require.NoError(t, db.Create(&classA).Error)
	classB := model.ClassGroup{AcademicYearID: selected.ID, Name: "Berlian 2", Level: "berlian", Schedule: datatypes.JSON([]byte("{}"))}
	require.NoError(t, db.Create(&classB).Error)

	newStudent := func(name string) model.Student {
		s := model.Student{
			FullName:   name,
			BirthPlace: "Jakarta",
			BirthDate:  time.Date(2016, 1, 1, 0, 0, 0, 0, time.UTC),
			Gender:     "L",
		}
		require.NoError(t, db.Create(&s).Error)
		return s
	}

	enroll := func(student model.Student, classGroup model.ClassGroup) {
		require.NoError(t, db.Create(&model.StudentEnrollment{
			StudentID:      student.ID,
			ClassGroupID:   classGroup.ID,
			AcademicYearID: selected.ID,
			StartDate:      selected.StartDate,
			Status:         "active",
			EnrollmentType: "new",
			CreatedBy:      user.ID,
		}).Error)
	}

	studentA := newStudent("Siswa Kelas A")
	studentB := newStudent("Siswa Kelas B")
	studentC := newStudent("Siswa Tanpa Enrollment")
	enroll(studentA, classA)
	// Enrollment ganda pada kelas yang sama: subkueri harus memilih satu baris
	// sehingga nominal invoice tidak berlipat.
	enroll(studentA, classA)
	enroll(studentB, classB)

	arrears := func(studentID, ayID uint, total, paid float64, status string) model.Invoice {
		inv := model.Invoice{
			StudentID:      studentID,
			AcademicYearID: ayID,
			Type:           "arrears",
			Status:         status,
			TotalAmount:    total,
			PaidAmount:     paid,
		}
		require.NoError(t, db.Create(&inv).Error)
		return inv
	}

	// Dua tunggakan untuk siswa di kelas A (satu partial) → total 160.000, 1 siswa.
	arrears(studentA.ID, past.ID, 100000, 0, "unpaid")
	arrears(studentA.ID, past.ID, 100000, 40000, "partial")
	// Kelas B.
	arrears(studentB.ID, past.ID, 50000, 0, "unpaid")
	// Siswa tanpa enrollment di TA laporan.
	arrears(studentC.ID, past.ID, 25000, 0, "unpaid")

	// Tidak boleh dihitung di section TA lain: sudah lunas, milik TA laporan,
	// dan soft-deleted. Invoice TA laporan tetap dipakai untuk test
	// GetArrearsByClass di bawah.
	arrears(studentA.ID, past.ID, 100000, 100000, "paid")
	arrears(studentA.ID, selected.ID, 70000, 0, "unpaid")
	deleted := arrears(studentA.ID, past.ID, 90000, 0, "unpaid")
	require.NoError(t, db.Delete(&model.Invoice{}, deleted.ID).Error)

	return otherYearArrearsFixture{SelectedAY: selected, PastAY: past}
}

func TestGetOtherYearArrearsByClass_GroupsByCurrentClassAndExcludesPaidOtherYear(t *testing.T) {
	db := setupOtherYearArrearsTestDB(t)
	fx := seedOtherYearArrearsFixture(t, db)

	results, err := NewReportRepository(db).GetOtherYearArrearsByClass(fx.SelectedAY.ID)
	require.NoError(t, err)
	require.Len(t, results, 3)
	assert.Equal(t, "Intan 1", results[0].ClassGroupName, "urut total_unpaid DESC")
	assert.Equal(t, 160000.0, results[0].TotalUnpaid)

	byClass := map[string]float64{}
	students := map[string]int{}
	for _, r := range results {
		byClass[r.ClassGroupName] = r.TotalUnpaid
		students[r.ClassGroupName] = r.StudentCount
	}

	assert.Equal(t, 160000.0, byClass["Intan 1"])
	assert.Equal(t, 1, students["Intan 1"])
	assert.Equal(t, 50000.0, byClass["Berlian 2"])
	assert.Equal(t, 1, students["Berlian 2"])
	assert.Equal(t, 25000.0, byClass["Tanpa Kelas"])
	assert.Equal(t, 1, students["Tanpa Kelas"])
}

// GetArrearsByClass harus mengikutsertakan tunggakan historis milik TA laporan
// meskipun month/year-nya NULL, sehingga tidak ada arrears yang hilang dari
// kedua section laporan bulanan.
func TestGetArrearsByClass_IncludesSameYearArrearsWithoutMonth(t *testing.T) {
	db := setupOtherYearArrearsTestDB(t)
	fx := seedOtherYearArrearsFixture(t, db)

	results, err := NewReportRepository(db).GetArrearsByClass(fx.SelectedAY.ID, 8, 2025)
	require.NoError(t, err)
	require.Len(t, results, 1)
	assert.Equal(t, "Intan 1", results[0].ClassGroupName)
	assert.Equal(t, 70000.0, results[0].TotalUnpaid)
	assert.Equal(t, 1, results[0].StudentCount)
}
