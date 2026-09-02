package repository

import (
	"api/dto"
	"api/model"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupPaymentFilterTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	// sqlite :memory: per-koneksi — pin ke satu koneksi agar preload (query
	// terpisah) dan query utama berbagi database yang sama.
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
		&model.InvoiceItem{},
		&model.Payment{},
		&model.PaymentItem{},
	))
	return db
}

// seedPaymentFilterFixtures menyiapkan 2 siswa (Intan & Berlian) dengan invoice
// Agustus 2026. Pembayaran 1 (petugas X) menutup item SPP + Robotika (pasta)
// milik siswa Intan; pembayaran 2 (petugas Y) menutup item SPP siswa Berlian.
func seedPaymentFilterFixtures(t *testing.T, db *gorm.DB) (intanStudentID uint, payment1, payment2 model.Payment) {
	t.Helper()

	userX := model.User{Email: "x@test.com", Password: "h", Role: "admin", FullName: "Petugas X"}
	require.NoError(t, db.Create(&userX).Error)
	userY := model.User{Email: "y@test.com", Password: "h", Role: "admin", FullName: "Petugas Y"}
	require.NoError(t, db.Create(&userY).Error)

	ay := model.AcademicYear{Name: "2026/2027", StartDate: time.Date(2026, 7, 13, 0, 0, 0, 0, time.UTC), EndDate: time.Date(2027, 6, 30, 0, 0, 0, 0, time.UTC), IsActive: true}
	require.NoError(t, db.Create(&ay).Error)

	cgIntan := model.ClassGroup{AcademicYearID: ay.ID, Name: "Intan 1", Level: "intan", Schedule: []byte(`{}`)}
	require.NoError(t, db.Create(&cgIntan).Error)
	cgBerlian := model.ClassGroup{AcademicYearID: ay.ID, Name: "Berlian 1", Level: "berlian", Schedule: []byte(`{}`)}
	require.NoError(t, db.Create(&cgBerlian).Error)

	studentA := model.Student{FullName: "Anak Intan", BirthPlace: "Jkt", BirthDate: time.Date(2018, 1, 1, 0, 0, 0, 0, time.UTC), Gender: "L", Status: "active"}
	require.NoError(t, db.Create(&studentA).Error)
	studentB := model.Student{FullName: "Anak Berlian", BirthPlace: "Jkt", BirthDate: time.Date(2018, 1, 1, 0, 0, 0, 0, time.UTC), Gender: "P", Status: "active"}
	require.NoError(t, db.Create(&studentB).Error)

	require.NoError(t, db.Create(&model.StudentEnrollment{StudentID: studentA.ID, ClassGroupID: cgIntan.ID, AcademicYearID: ay.ID, StartDate: ay.StartDate, Status: "active", EnrollmentType: "new", CreatedBy: userX.ID}).Error)
	require.NoError(t, db.Create(&model.StudentEnrollment{StudentID: studentB.ID, ClassGroupID: cgBerlian.ID, AcademicYearID: ay.ID, StartDate: ay.StartDate, Status: "active", EnrollmentType: "new", CreatedBy: userY.ID}).Error)

	m8, y26 := uint(8), uint(2026)
	invA := model.Invoice{StudentID: studentA.ID, AcademicYearID: ay.ID, Type: "monthly", Month: &m8, Year: &y26, Status: "partial", TotalAmount: 150000, PaidAmount: 100000}
	require.NoError(t, db.Create(&invA).Error)
	invB := model.Invoice{StudentID: studentB.ID, AcademicYearID: ay.ID, Type: "monthly", Month: &m8, Year: &y26, Status: "paid", TotalAmount: 150000, PaidAmount: 150000}
	require.NoError(t, db.Create(&invB).Error)

	sppA := model.InvoiceItem{InvoiceID: invA.ID, Name: "SPP Agustus", Category: "monthly_spp", Amount: 150000, PaidAmount: 100000, Status: "partial", IsMandatory: true}
	require.NoError(t, db.Create(&sppA).Error)
	pastaA := model.InvoiceItem{InvoiceID: invA.ID, Name: "Robotika", Category: "pasta", Amount: 50000, PaidAmount: 50000, Status: "paid", IsMandatory: true}
	require.NoError(t, db.Create(&pastaA).Error)
	sppB := model.InvoiceItem{InvoiceID: invB.ID, Name: "SPP Agustus", Category: "monthly_spp", Amount: 150000, PaidAmount: 150000, Status: "paid", IsMandatory: true}
	require.NoError(t, db.Create(&sppB).Error)

	payment1 = model.Payment{StudentID: studentA.ID, AcademicYearID: ay.ID, PaymentDate: time.Date(2026, 8, 5, 0, 0, 0, 0, time.UTC), TotalAmount: 150000, Source: "cash", CreatedBy: userX.ID}
	require.NoError(t, db.Create(&payment1).Error)
	payment2 = model.Payment{StudentID: studentB.ID, AcademicYearID: ay.ID, PaymentDate: time.Date(2026, 8, 6, 0, 0, 0, 0, time.UTC), TotalAmount: 150000, Source: "cash", CreatedBy: userY.ID}
	require.NoError(t, db.Create(&payment2).Error)

	require.NoError(t, db.Create(&model.PaymentItem{PaymentID: payment1.ID, InvoiceItemID: sppA.ID, Amount: 100000}).Error)
	require.NoError(t, db.Create(&model.PaymentItem{PaymentID: payment1.ID, InvoiceItemID: pastaA.ID, Amount: 50000}).Error)
	require.NoError(t, db.Create(&model.PaymentItem{PaymentID: payment2.ID, InvoiceItemID: sppB.ID, Amount: 150000}).Error)

	return studentA.ID, payment1, payment2
}

func TestPaymentFindAll_Filters(t *testing.T) {
	db := setupPaymentFilterTestDB(t)
	_, payment1, _ := seedPaymentFilterFixtures(t, db)
	repo := NewPaymentRepository(db)

	t.Run("tanpa filter — semua payment", func(t *testing.T) {
		payments, total, err := repo.FindAll(dto.PaymentQueryParams{})
		require.NoError(t, err)
		assert.Equal(t, int64(2), total)
		assert.Len(t, payments, 2)
	})

	t.Run("filter jenjang (level) intan", func(t *testing.T) {
		payments, total, err := repo.FindAll(dto.PaymentQueryParams{Level: "intan"})
		require.NoError(t, err)
		assert.Equal(t, int64(1), total)
		require.Len(t, payments, 1)
		assert.Equal(t, payment1.ID, payments[0].ID)
	})

	t.Run("filter rombel intan (class_group_id)", func(t *testing.T) {
		var cg model.ClassGroup
		require.NoError(t, db.Where("level = ?", "intan").First(&cg).Error)
		payments, total, err := repo.FindAll(dto.PaymentQueryParams{ClassGroupID: cg.ID})
		require.NoError(t, err)
		assert.Equal(t, int64(1), total)
		require.Len(t, payments, 1)
		assert.Equal(t, payment1.ID, payments[0].ID)
	})

	t.Run("filter petugas (created_by)", func(t *testing.T) {
		payments, total, err := repo.FindAll(dto.PaymentQueryParams{CreatedBy: payment1.CreatedBy})
		require.NoError(t, err)
		assert.Equal(t, int64(1), total)
		require.Len(t, payments, 1)
		assert.Equal(t, payment1.ID, payments[0].ID)
	})

	t.Run("filter kategori item pasta", func(t *testing.T) {
		payments, total, err := repo.FindAll(dto.PaymentQueryParams{Category: "pasta"})
		require.NoError(t, err)
		assert.Equal(t, int64(1), total)
		require.Len(t, payments, 1)
		assert.Equal(t, payment1.ID, payments[0].ID)
	})

	t.Run("filter periode tagihan Agustus 2026", func(t *testing.T) {
		payments, total, err := repo.FindAll(dto.PaymentQueryParams{Month: 8, Year: 2026})
		require.NoError(t, err)
		assert.Equal(t, int64(2), total)
		assert.Len(t, payments, 2)
	})

	t.Run("filter periode tagihan di luar bulan invoice — kosong", func(t *testing.T) {
		payments, total, err := repo.FindAll(dto.PaymentQueryParams{Month: 1, Year: 2027})
		require.NoError(t, err)
		assert.Equal(t, int64(0), total)
		assert.Empty(t, payments)
	})

	t.Run("response menyertakan rincian item + periode invoice", func(t *testing.T) {
		payments, _, err := repo.FindAll(dto.PaymentQueryParams{StudentID: payment1.StudentID})
		require.NoError(t, err)
		require.Len(t, payments, 1)
		require.Len(t, payments[0].Items, 2, "payment harus memuat item-nya (preload)")

		var gotPasta bool
		for _, it := range payments[0].Items {
			if it.InvoiceItem.Category == "pasta" {
				gotPasta = true
			}
			require.NotNil(t, it.InvoiceItem.Invoice.Month)
			require.NotNil(t, it.InvoiceItem.Invoice.Year)
			assert.Equal(t, uint(8), *it.InvoiceItem.Invoice.Month)
			assert.Equal(t, uint(2026), *it.InvoiceItem.Invoice.Year)
		}
		assert.True(t, gotPasta, "item pasta harus ikut ter-preload")
	})
}
