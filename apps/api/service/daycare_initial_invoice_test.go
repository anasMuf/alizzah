package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// setupDaycareInitialInvoiceTestDB memakai file SQLite (bukan :memory:) agar
// beberapa koneksi berbagi database yang sama. Ini meniru kondisi produksi di
// mana transaksi Create memegang satu koneksi sementara query lain memakai
// koneksi berbeda — inti dari regresi invoice biaya awal yang hilang.
func setupDaycareInitialInvoiceTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	dbPath := filepath.Join(t.TempDir(), "daycare_initial.db")
	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	require.NoError(t, err)

	require.NoError(t, db.AutoMigrate(
		&model.User{},
		&model.AcademicYear{},
		&model.ClassGroup{},
		&model.Student{},
		&model.StudentEnrollment{},
		&model.FeeConfig{},
		&model.FeeConfigItem{},
		&model.Invoice{},
		&model.InvoiceItem{},
		&model.InvoiceInstallment{},
		&model.DaycareEnrollment{},
		&model.DaycareAttendance{},
		&model.DaycareMonthlyAttendance{},
		&model.BillingMonthExclusion{},
	))
	return db
}

// TestCreatePremiumDaycare_GeneratesInitialInvoice memastikan biaya awal daycare
// premium dibuat saat pendaftaran baru. Regresi ini muncul karena pengecekan
// "enrollment benar-benar premium" di GenerateDaycareInitial membaca tabel lewat
// koneksi di luar transaksi Create, sehingga enrollment yang belum commit tidak
// terlihat dan invoice biaya awal ikut terlewat.
func TestCreatePremiumDaycare_GeneratesInitialInvoice(t *testing.T) {
	db := setupDaycareInitialInvoiceTestDB(t)

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
		FullName:   "Anak Daycare",
		BirthPlace: "Surabaya",
		BirthDate:  time.Date(2024, 10, 15, 0, 0, 0, 0, time.UTC),
		Gender:     "P",
		Status:     "active",
	}
	require.NoError(t, db.Create(&student).Error)

	fc := model.FeeConfig{AcademicYearID: ay.ID}
	require.NoError(t, db.Create(&fc).Error)
	require.NoError(t, db.Create(&model.FeeConfigItem{
		FeeConfigID: fc.ID,
		Category:    "daycare",
		ItemKey:     "daycare_premium_initial",
		Name:        "Biaya Awal Daycare Premium",
		Level:       "all",
		Gender:      "all",
		Amount:      400000,
		Unit:        "fixed",
	}).Error)
	require.NoError(t, db.Create(&model.FeeConfigItem{
		FeeConfigID: fc.ID,
		Category:    "daycare",
		ItemKey:     "daycare_premium_1013_under3_spd",
		Name:        "SPD Premium 10-13 <3th",
		Level:       "all",
		Gender:      "all",
		Amount:      300000,
		Unit:        "fixed",
	}).Error)

	svc := NewDaycareEnrollmentService(
		db,
		repository.NewDaycareEnrollmentRepository(db),
		repository.NewStudentRepository(db),
		repository.NewAcademicYearRepository(db),
		repository.NewDaycareMonthlyAttendanceRepository(db),
		repository.NewInvoiceRepository(db),
		newTestInvoiceGen(t, db),
		repository.NewBillingMonthExclusionRepository(db),
	)

	_, err := svc.Create(user.ID, dto.CreateDaycareEnrollmentRequest{
		StudentID:      student.ID,
		AcademicYearID: ay.ID,
		Category:       "premium",
		TimeSlot:       "10-13",
		AgeGroup:       "under3",
		StartDate:      "2025-08-01",
	})
	require.NoError(t, err)

	var initial model.Invoice
	require.NoError(t, db.Where("student_id = ? AND type = ?", student.ID, "daycare_initial").First(&initial).Error,
		"invoice biaya awal daycare premium harus dibuat saat pendaftaran baru")
	assert.Equal(t, 400000.0, initial.TotalAmount)

	var items []model.InvoiceItem
	require.NoError(t, db.Where("invoice_id = ?", initial.ID).Find(&items).Error)
	require.Len(t, items, 1)
	assert.Equal(t, "daycare", items[0].Category)
	assert.Equal(t, "Biaya Awal Daycare Premium", items[0].Name)
}
