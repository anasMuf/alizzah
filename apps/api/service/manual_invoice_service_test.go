package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"api/utility"
	"errors"
	"net/http"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// setupManualInvoiceTestDB menyiapkan sqlite in-memory untuk menguji CreateManual
// (tagihan manual & tunggakan historis).
func setupManualInvoiceTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	// sqlite :memory: adalah PER-KONEKSI; pin ke satu koneksi agar konsisten.
	sqlDB, err := db.DB()
	require.NoError(t, err)
	sqlDB.SetMaxOpenConns(1)

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
		&model.Payment{},
		&model.PaymentItem{},
	))
	return db
}

type manualInvoiceFixture struct {
	StudentID uint
	// ActiveAcademicYear adalah TA aktif (is_active=true) yang PUNYA item tarif
	// aktif — satu-satunya TA yang sah untuk tagihan rinci (type=manual).
	ActiveAcademicYear model.AcademicYear
	// PastAcademicYear adalah TA non-aktif — rumah tunggakan historis
	// (type=arrears), karena mode total hanya sah untuk TA selain TA aktif.
	PastAcademicYear model.AcademicYear
}

func seedManualInvoiceFixture(t *testing.T, db *gorm.DB) manualInvoiceFixture {
	t.Helper()

	past := model.AcademicYear{
		Name:      "2024/2025",
		StartDate: time.Date(2024, 7, 15, 0, 0, 0, 0, time.UTC),
		EndDate:   time.Date(2025, 6, 30, 0, 0, 0, 0, time.UTC),
		IsActive:  false,
	}
	require.NoError(t, db.Create(&past).Error)

	active := model.AcademicYear{
		Name:      "2025/2026",
		StartDate: time.Date(2025, 7, 15, 0, 0, 0, 0, time.UTC),
		EndDate:   time.Date(2026, 6, 30, 0, 0, 0, 0, time.UTC),
		IsActive:  true,
	}
	require.NoError(t, db.Create(&active).Error)

	fc := model.FeeConfig{AcademicYearID: active.ID}
	require.NoError(t, db.Create(&fc).Error)
	require.NoError(t, db.Create(&model.FeeConfigItem{
		FeeConfigID: fc.ID,
		Category:    "monthly_spp",
		ItemKey:     "spp_all_all",
		Name:        "SPP",
		Level:       "all",
		Gender:      "all",
		Amount:      250000,
		Unit:        "fixed",
		IsActive:    true,
	}).Error)

	student := model.Student{
		FullName:   "Ahmad Test",
		BirthPlace: "Bogor",
		BirthDate:  time.Date(2018, 1, 1, 0, 0, 0, 0, time.UTC),
		Gender:     "L",
	}
	require.NoError(t, db.Create(&student).Error)

	return manualInvoiceFixture{StudentID: student.ID, ActiveAcademicYear: active, PastAcademicYear: past}
}

// softDeleteItemTarifAktif menyembunyikan seluruh item tarif aktif sehingga
// mode rinci terhalang untuk TA aktif (meniru TA baru yang belum diatur tarifnya).
func softDeleteItemTarifAktif(t *testing.T, db *gorm.DB) {
	t.Helper()
	require.NoError(t, db.Where("is_active = ?", true).Delete(&model.FeeConfigItem{}).Error)
}

func newTestManualInvoiceService(t *testing.T, db *gorm.DB) InvoiceService {
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
		nil, // exclSvc tidak dipakai CreateManual
	)
}

func assertAppErrorCode(t *testing.T, err error, code int) {
	t.Helper()
	require.Error(t, err)
	var appErr *utility.AppError
	require.True(t, errors.As(err, &appErr), "error harus *utility.AppError, dapat: %T", err)
	assert.Equal(t, code, appErr.Code, "status code tidak sesuai: %s", appErr.Message)
}

func TestCreateManual_Arrears_Success(t *testing.T) {
	db := setupManualInvoiceTestDB(t)
	fx := seedManualInvoiceFixture(t, db)
	svc := newTestManualInvoiceService(t, db)

	resp, err := svc.CreateManual(dto.CreateInvoiceRequest{
		StudentID:      fx.StudentID,
		AcademicYearID: fx.PastAcademicYear.ID,
		Type:           "arrears",
		Notes:          "Tunggakan SPP Ganjil 2024/2025",
		Items: []dto.CreateInvoiceItemRequest{
			{Name: "Tunggakan TA 2024/2025", Category: "monthly_spp", Amount: 1500000},
		},
	})
	require.NoError(t, err)

	assert.Equal(t, "arrears", resp.Type)
	assert.Equal(t, "unpaid", resp.Status)
	assert.Equal(t, 1500000.0, resp.TotalAmount)
	assert.Equal(t, 0.0, resp.PaidAmount)
	assert.Nil(t, resp.Month, "month harus NULL untuk tagihan manual")
	assert.Nil(t, resp.Year, "year harus NULL untuk tagihan manual")
	assert.Equal(t, fx.PastAcademicYear.ID, resp.AcademicYear.ID, "invoice harus dimiliki tahun ajaran asal")

	require.Len(t, resp.Items, 1)
	assert.Equal(t, "arrears", resp.Items[0].Category, "category item tunggakan dipaksa 'arrears'")
	assert.Equal(t, 1500000.0, resp.Items[0].Amount)
	assert.Equal(t, "unpaid", resp.Items[0].Status)
	assert.False(t, resp.Items[0].IsMandatory)
}

func TestCreateManual_Manual_MultipleItems_TotalComputedServerSide(t *testing.T) {
	db := setupManualInvoiceTestDB(t)
	fx := seedManualInvoiceFixture(t, db)
	svc := newTestManualInvoiceService(t, db)

	resp, err := svc.CreateManual(dto.CreateInvoiceRequest{
		StudentID:      fx.StudentID,
		AcademicYearID: fx.ActiveAcademicYear.ID,
		Type:           "manual",
		Notes:          "Seragam & uang kegiatan",
		Items: []dto.CreateInvoiceItemRequest{
			{Name: "Seragam", Category: "other", Amount: 100000},
			{Name: "Uang Kegiatan", Category: "other", Amount: 250000},
			{Name: "Denda", Category: "other", Amount: 40000},
		},
	})
	require.NoError(t, err)

	assert.Equal(t, "manual", resp.Type)
	assert.Equal(t, 390000.0, resp.TotalAmount, "total harus jumlah item, dihitung server")
	require.Len(t, resp.Items, 3)
}

func TestCreateManual_Arrears_MultipleItems_Rejected(t *testing.T) {
	db := setupManualInvoiceTestDB(t)
	fx := seedManualInvoiceFixture(t, db)
	svc := newTestManualInvoiceService(t, db)

	_, err := svc.CreateManual(dto.CreateInvoiceRequest{
		StudentID:      fx.StudentID,
		AcademicYearID: fx.PastAcademicYear.ID,
		Type:           "arrears",
		Notes:          "Tunggakan",
		Items: []dto.CreateInvoiceItemRequest{
			{Name: "A", Category: "arrears", Amount: 100000},
			{Name: "B", Category: "arrears", Amount: 200000},
		},
	})
	assertAppErrorCode(t, err, http.StatusUnprocessableEntity)
}

func TestCreateManual_Arrears_EmptyNotes_Rejected(t *testing.T) {
	db := setupManualInvoiceTestDB(t)
	fx := seedManualInvoiceFixture(t, db)
	svc := newTestManualInvoiceService(t, db)

	for _, notes := range []string{"", "   "} {
		_, err := svc.CreateManual(dto.CreateInvoiceRequest{
			StudentID:      fx.StudentID,
			AcademicYearID: fx.PastAcademicYear.ID,
			Type:           "arrears",
			Notes:          notes,
			Items: []dto.CreateInvoiceItemRequest{
				{Name: "Tunggakan", Category: "arrears", Amount: 100000},
			},
		})
		assertAppErrorCode(t, err, http.StatusUnprocessableEntity)
	}

	// Pastikan tidak ada invoice yang terbuat dari percobaan gagal.
	var count int64
	require.NoError(t, db.Model(&model.Invoice{}).Count(&count).Error)
	assert.Equal(t, int64(0), count, "percobaan gagal tidak boleh menyimpan invoice")
}

func TestCreateManual_EmptyItems_Rejected(t *testing.T) {
	db := setupManualInvoiceTestDB(t)
	fx := seedManualInvoiceFixture(t, db)
	svc := newTestManualInvoiceService(t, db)

	_, err := svc.CreateManual(dto.CreateInvoiceRequest{
		StudentID:      fx.StudentID,
		AcademicYearID: fx.PastAcademicYear.ID,
		Type:           "manual",
		Items:          nil,
	})
	assertAppErrorCode(t, err, http.StatusUnprocessableEntity)
}

func TestCreateManual_NonPositiveAmount_Rejected(t *testing.T) {
	db := setupManualInvoiceTestDB(t)
	fx := seedManualInvoiceFixture(t, db)
	svc := newTestManualInvoiceService(t, db)

	for _, amount := range []float64{0, -100} {
		_, err := svc.CreateManual(dto.CreateInvoiceRequest{
			StudentID:      fx.StudentID,
			AcademicYearID: fx.ActiveAcademicYear.ID,
			Type:           "manual",
			Items: []dto.CreateInvoiceItemRequest{
				{Name: "Item", Category: "other", Amount: amount},
			},
		})
		assertAppErrorCode(t, err, http.StatusUnprocessableEntity)
	}

	var count int64
	require.NoError(t, db.Model(&model.Invoice{}).Count(&count).Error)
	assert.Equal(t, int64(0), count, "percobaan gagal tidak boleh menyimpan invoice")
}

func TestCreateManual_StudentNotFound(t *testing.T) {
	db := setupManualInvoiceTestDB(t)
	fx := seedManualInvoiceFixture(t, db)
	svc := newTestManualInvoiceService(t, db)

	_, err := svc.CreateManual(dto.CreateInvoiceRequest{
		StudentID:      99999,
		AcademicYearID: fx.PastAcademicYear.ID,
		Type:           "manual",
		Items: []dto.CreateInvoiceItemRequest{
			{Name: "Item", Category: "other", Amount: 100000},
		},
	})
	assertAppErrorCode(t, err, http.StatusNotFound)
}

func TestCreateManual_AcademicYearNotFound(t *testing.T) {
	db := setupManualInvoiceTestDB(t)
	fx := seedManualInvoiceFixture(t, db)
	svc := newTestManualInvoiceService(t, db)

	_, err := svc.CreateManual(dto.CreateInvoiceRequest{
		StudentID:      fx.StudentID,
		AcademicYearID: 99999,
		Type:           "manual",
		Items: []dto.CreateInvoiceItemRequest{
			{Name: "Item", Category: "other", Amount: 100000},
		},
	})
	assertAppErrorCode(t, err, http.StatusNotFound)
}

func TestCreateManual_DueDate(t *testing.T) {
	db := setupManualInvoiceTestDB(t)
	fx := seedManualInvoiceFixture(t, db)
	svc := newTestManualInvoiceService(t, db)

	// Format diterima
	resp, err := svc.CreateManual(dto.CreateInvoiceRequest{
		StudentID:      fx.StudentID,
		AcademicYearID: fx.PastAcademicYear.ID,
		Type:           "arrears",
		Notes:          "Tunggakan",
		DueDate:        "2026-10-01",
		Items:          []dto.CreateInvoiceItemRequest{{Name: "Tunggakan", Category: "arrears", Amount: 100000}},
	})
	require.NoError(t, err)
	require.NotNil(t, resp.DueDate)
	assert.Equal(t, "2026-10-01", *resp.DueDate)

	// Format tidak diterima
	_, err = svc.CreateManual(dto.CreateInvoiceRequest{
		StudentID:      fx.StudentID,
		AcademicYearID: fx.PastAcademicYear.ID,
		Type:           "arrears",
		Notes:          "Tunggakan",
		DueDate:        "bukan-tanggal",
		Items:          []dto.CreateInvoiceItemRequest{{Name: "Tunggakan", Category: "arrears", Amount: 100000}},
	})
	assertAppErrorCode(t, err, http.StatusUnprocessableEntity)
}

// TestCreateInvoiceRequest_ValidationTags memverifikasi tag `validate` pada DTO
// yang hanya dieksekusi di handler (c.Validate), bukan di service.
func TestCreateInvoiceRequest_ValidationTags(t *testing.T) {
	v := utility.NewValidator()

	base := dto.CreateInvoiceRequest{
		StudentID:      1,
		AcademicYearID: 1,
		Type:           "arrears",
		Notes:          "Tunggakan",
		Items:          []dto.CreateInvoiceItemRequest{{Name: "Tunggakan", Category: "arrears", Amount: 100000}},
	}
	require.NoError(t, v.Struct(base), "request dasar harus valid")

	t.Run("type tidak dikenal ditolak", func(t *testing.T) {
		req := base
		req.Type = "bogus"
		require.Error(t, v.Struct(req))
	})

	t.Run("items kosong ditolak", func(t *testing.T) {
		req := base
		req.Items = nil
		require.Error(t, v.Struct(req))
	})

	t.Run("item tanpa nama ditolak", func(t *testing.T) {
		req := base
		req.Items = []dto.CreateInvoiceItemRequest{{Category: "arrears", Amount: 1000}}
		require.Error(t, v.Struct(req))
	})

	t.Run("tanggal RFC3339 diterima", func(t *testing.T) {
		req := base
		req.DueDate = "2026-10-01T00:00:00Z"
		require.NoError(t, v.Struct(req))
	})

	t.Run("tanggal tidak valid ditolak", func(t *testing.T) {
		req := base
		req.DueDate = "bukan-tanggal"
		require.Error(t, v.Struct(req))
	})
}

// --- Penegakan mode-vs-TA ---

// TestInvoiceModeViolation menguji tabel aturan murni — cermin dari
// describe("modeAvailability") di manual-invoice.test.ts.
func TestInvoiceModeViolation(t *testing.T) {
	cases := []struct {
		name        string
		typ         string
		isActive    bool
		tariffItems int64
		wantRefused bool
	}{
		{"manual di TA aktif bertarif", "manual", true, 1, false},
		{"manual di TA aktif tanpa tarif", "manual", true, 0, true},
		{"manual di TA lampau", "manual", false, 5, true},
		{"arrears di TA aktif", "arrears", true, 5, true},
		{"arrears di TA lampau", "arrears", false, 0, false},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := invoiceModeViolation(tc.typ, tc.isActive, tc.tariffItems)
			if tc.wantRefused {
				assert.NotEmpty(t, got, "kombinasi tidak sah harus punya alasan")
			} else {
				assert.Empty(t, got, "kombinasi sah tidak boleh punya alasan")
			}
		})
	}

	t.Run("sebab menyebut item tarif", func(t *testing.T) {
		assert.Contains(t, invoiceModeViolation("manual", true, 0), "item tarif")
	})

	t.Run("sebab menyebut tahun ajaran aktif", func(t *testing.T) {
		assert.Contains(t, invoiceModeViolation("arrears", true, 1), "aktif")
		assert.Contains(t, invoiceModeViolation("manual", false, 1), "aktif")
	})
}

func TestCreateManual_Arrears_OnActiveYear_Rejected(t *testing.T) {
	db := setupManualInvoiceTestDB(t)
	fx := seedManualInvoiceFixture(t, db)
	svc := newTestManualInvoiceService(t, db)

	_, err := svc.CreateManual(dto.CreateInvoiceRequest{
		StudentID:      fx.StudentID,
		AcademicYearID: fx.ActiveAcademicYear.ID,
		Type:           "arrears",
		Notes:          "Tunggakan di TA aktif",
		Items:          []dto.CreateInvoiceItemRequest{{Name: "Tunggakan", Category: "arrears", Amount: 100000}},
	})
	assertAppErrorCode(t, err, http.StatusUnprocessableEntity)

	var count int64
	require.NoError(t, db.Model(&model.Invoice{}).Count(&count).Error)
	assert.Equal(t, int64(0), count, "percobaan gagal tidak boleh menyimpan invoice")
}

func TestCreateManual_Manual_OnPastYear_Rejected(t *testing.T) {
	db := setupManualInvoiceTestDB(t)
	fx := seedManualInvoiceFixture(t, db)
	svc := newTestManualInvoiceService(t, db)

	_, err := svc.CreateManual(dto.CreateInvoiceRequest{
		StudentID:      fx.StudentID,
		AcademicYearID: fx.PastAcademicYear.ID,
		Type:           "manual",
		Notes:          "Rinci di TA lampau",
		Items:          []dto.CreateInvoiceItemRequest{{Name: "Item", Category: "other", Amount: 100000}},
	})
	assertAppErrorCode(t, err, http.StatusUnprocessableEntity)
}

func TestCreateManual_Manual_ActiveYearWithoutTariff_Rejected(t *testing.T) {
	db := setupManualInvoiceTestDB(t)
	fx := seedManualInvoiceFixture(t, db)
	svc := newTestManualInvoiceService(t, db)

	// TA baru yang belum diatur tarifnya: TA aktif, tapi tidak ada item tarif
	// aktif. Kedua mode terhalang (arrears karena TA aktif, manual karena tarif).
	softDeleteItemTarifAktif(t, db)

	_, err := svc.CreateManual(dto.CreateInvoiceRequest{
		StudentID:      fx.StudentID,
		AcademicYearID: fx.ActiveAcademicYear.ID,
		Type:           "manual",
		Items:          []dto.CreateInvoiceItemRequest{{Name: "Item", Category: "other", Amount: 100000}},
	})
	assertAppErrorCode(t, err, http.StatusUnprocessableEntity)
}

func TestCreateManual_Manual_ActiveYearWithInactiveTariff_Rejected(t *testing.T) {
	db := setupManualInvoiceTestDB(t)
	fx := seedManualInvoiceFixture(t, db)
	svc := newTestManualInvoiceService(t, db)

	// Item tarif ADA tetapi tidak aktif. Sengaja di-nonaktifkan (BUKAN di-soft-delete)
	// agar predikat `is_active = true` pada CountActiveItemsByAcademicYear benar-benar
	// teruji: soft-delete akan tersaring oleh deleted_at, sehingga menghapus predikat
	// is_active tidak akan membuat test itu merah.
	require.NoError(t, db.Model(&model.FeeConfigItem{}).
		Where("is_active = ?", true).
		Update("is_active", false).Error)

	_, err := svc.CreateManual(dto.CreateInvoiceRequest{
		StudentID:      fx.StudentID,
		AcademicYearID: fx.ActiveAcademicYear.ID,
		Type:           "manual",
		Items:          []dto.CreateInvoiceItemRequest{{Name: "Item", Category: "other", Amount: 100000}},
	})
	assertAppErrorCode(t, err, http.StatusUnprocessableEntity)
}

func TestCreateManual_ModeCheckedBeforeItemContent(t *testing.T) {
	db := setupManualInvoiceTestDB(t)
	fx := seedManualInvoiceFixture(t, db)
	svc := newTestManualInvoiceService(t, db)

	// Mode tidak sah + nominal tidak sah: yang dilaporkan harus masalah mode,
	// bukan masalah nominal — kesesuaian mode diperiksa lebih dulu.
	_, err := svc.CreateManual(dto.CreateInvoiceRequest{
		StudentID:      fx.StudentID,
		AcademicYearID: fx.PastAcademicYear.ID,
		Type:           "manual",
		Items:          []dto.CreateInvoiceItemRequest{{Name: "Item", Category: "other", Amount: 0}},
	})
	require.Error(t, err)
	var appErr *utility.AppError
	require.True(t, errors.As(err, &appErr), "error harus *utility.AppError")
	assert.Contains(t, appErr.Message, "Mode rinci")
}

// --- Delete ---

// createArrearsViaService membuat satu invoice tunggakan lewat service (jalur
// yang sama dengan produksi) dan mengembalikannya.
func createArrearsViaService(t *testing.T, svc InvoiceService, fx manualInvoiceFixture) *dto.InvoiceDetailResponse {
	t.Helper()
	resp, err := svc.CreateManual(dto.CreateInvoiceRequest{
		StudentID:      fx.StudentID,
		AcademicYearID: fx.PastAcademicYear.ID,
		Type:           "arrears",
		Notes:          "Tunggakan SPP 2024/2025",
		Items: []dto.CreateInvoiceItemRequest{
			{Name: "Tunggakan TA 2024/2025", Category: "arrears", Amount: 100000},
		},
	})
	require.NoError(t, err)
	return resp
}

func TestDeleteInvoice_Success(t *testing.T) {
	db := setupManualInvoiceTestDB(t)
	fx := seedManualInvoiceFixture(t, db)
	svc := newTestManualInvoiceService(t, db)

	created := createArrearsViaService(t, svc, fx)
	itemID := created.Items[0].ID

	require.NoError(t, svc.Delete(created.ID))

	// Hilang dari query normal
	_, err := svc.GetByID(created.ID)
	assert.Error(t, err, "invoice harus tidak ditemukan setelah dihapus")

	// Soft delete: baris masih ada, deleted_at terisi
	var invRow model.Invoice
	require.NoError(t, db.Unscoped().First(&invRow, created.ID).Error, "baris invoice harus masih ada (soft delete)")
	assert.True(t, invRow.DeletedAt.Valid, "deleted_at invoice harus terisi")

	var itemRow model.InvoiceItem
	require.NoError(t, db.Unscoped().First(&itemRow, itemID).Error, "baris item harus masih ada (soft delete)")
	assert.True(t, itemRow.DeletedAt.Valid, "item harus ikut ter-soft-delete agar tidak bisa dibayar")

	// Invoice yang dihapus hilang dari daftar tagihan siswa.
	// (SumUnpaidByStudent tidak dipakai di sini karena memakai SQL khusus PostgreSQL
	//  — make_date(...)::int — sehingga tidak dapat dijalankan di sqlite.)
	invoices, err := repository.NewInvoiceRepository(db).FindByStudentID(fx.StudentID, "", "", 0, true)
	require.NoError(t, err)
	assert.Len(t, invoices, 0, "invoice yang dihapus tidak boleh muncul di daftar tagihan siswa")
}

func TestDeleteInvoice_GeneratedType_Rejected(t *testing.T) {
	db := setupManualInvoiceTestDB(t)
	fx := seedManualInvoiceFixture(t, db)
	svc := newTestManualInvoiceService(t, db)

	generated := model.Invoice{StudentID: fx.StudentID, AcademicYearID: fx.PastAcademicYear.ID, Type: "monthly", Status: "unpaid", TotalAmount: 100000}
	require.NoError(t, db.Create(&generated).Error)

	err := svc.Delete(generated.ID)
	assertAppErrorCode(t, err, http.StatusConflict)

	// Masih ada
	var count int64
	require.NoError(t, db.Model(&model.Invoice{}).Where("id = ?", generated.ID).Count(&count).Error)
	assert.Equal(t, int64(1), count)
}

func TestDeleteInvoice_AlreadyPaid_Rejected(t *testing.T) {
	db := setupManualInvoiceTestDB(t)
	fx := seedManualInvoiceFixture(t, db)
	svc := newTestManualInvoiceService(t, db)

	created := createArrearsViaService(t, svc, fx)
	require.NoError(t, db.Model(&model.Invoice{}).Where("id = ?", created.ID).Update("paid_amount", 50000).Error)

	err := svc.Delete(created.ID)
	assertAppErrorCode(t, err, http.StatusConflict)
}

func TestDeleteInvoice_HasPaymentItem_Rejected(t *testing.T) {
	db := setupManualInvoiceTestDB(t)
	fx := seedManualInvoiceFixture(t, db)
	svc := newTestManualInvoiceService(t, db)

	created := createArrearsViaService(t, svc, fx)

	// Simulasi data tidak konsisten: ada payment_item tapi invoice.paid_amount = 0.
	user := model.User{Email: "kasir@test.com", Password: "h", Role: "keuangan", FullName: "Kasir"}
	require.NoError(t, db.Create(&user).Error)
	payment := model.Payment{
		StudentID: fx.StudentID, AcademicYearID: fx.PastAcademicYear.ID,
		PaymentDate: time.Now(), TotalAmount: 10000, Source: "cash", CreatedBy: user.ID,
	}
	require.NoError(t, db.Create(&payment).Error)
	require.NoError(t, db.Create(&model.PaymentItem{
		PaymentID: payment.ID, InvoiceItemID: created.Items[0].ID, Amount: 10000,
	}).Error)

	err := svc.Delete(created.ID)
	assertAppErrorCode(t, err, http.StatusConflict)
}

func TestDeleteInvoice_NotFound(t *testing.T) {
	db := setupManualInvoiceTestDB(t)
	svc := newTestManualInvoiceService(t, db)

	err := svc.Delete(99999)
	assertAppErrorCode(t, err, http.StatusNotFound)
}

// --- Update ---

func TestUpdateInvoice_NotesAndDueDate_Success(t *testing.T) {
	db := setupManualInvoiceTestDB(t)
	fx := seedManualInvoiceFixture(t, db)
	svc := newTestManualInvoiceService(t, db)

	created := createArrearsViaService(t, svc, fx)

	res, err := svc.Update(created.ID, dto.UpdateInvoiceRequest{
		Notes:   "  Tunggakan SPP Ganjil 2024/2025 (revisi)  ",
		DueDate: "2026-10-01",
	})
	require.NoError(t, err)

	require.NotNil(t, res.Notes)
	assert.Equal(t, "Tunggakan SPP Ganjil 2024/2025 (revisi)", *res.Notes, "notes harus di-trim")
	require.NotNil(t, res.DueDate)
	assert.Equal(t, "2026-10-01", *res.DueDate)

	// Item, total, dan status tidak boleh tersentuh.
	assert.Equal(t, created.TotalAmount, res.TotalAmount)
	assert.Equal(t, created.PaidAmount, res.PaidAmount)
	assert.Equal(t, created.Status, res.Status)
	require.Len(t, res.Items, len(created.Items))
	assert.Equal(t, created.Items[0].Amount, res.Items[0].Amount)
}

func TestUpdateInvoice_ClearDueDate(t *testing.T) {
	db := setupManualInvoiceTestDB(t)
	fx := seedManualInvoiceFixture(t, db)
	svc := newTestManualInvoiceService(t, db)

	created := createArrearsViaService(t, svc, fx)
	_, err := svc.Update(created.ID, dto.UpdateInvoiceRequest{Notes: "Tunggakan", DueDate: "2026-10-01"})
	require.NoError(t, err)

	res, err := svc.Update(created.ID, dto.UpdateInvoiceRequest{Notes: "Tunggakan", DueDate: ""})
	require.NoError(t, err)
	assert.Nil(t, res.DueDate, "due_date kosong harus menghapus jatuh tempo")
}

func TestUpdateInvoice_Manual_EmptyNotes_Allowed(t *testing.T) {
	db := setupManualInvoiceTestDB(t)
	fx := seedManualInvoiceFixture(t, db)
	svc := newTestManualInvoiceService(t, db)

	created, err := svc.CreateManual(dto.CreateInvoiceRequest{
		StudentID:      fx.StudentID,
		AcademicYearID: fx.ActiveAcademicYear.ID,
		Type:           "manual",
		Notes:          "Seragam",
		Items:          []dto.CreateInvoiceItemRequest{{Name: "Seragam", Category: "other", Amount: 100000}},
	})
	require.NoError(t, err)

	res, err := svc.Update(created.ID, dto.UpdateInvoiceRequest{Notes: ""})
	require.NoError(t, err, "notes kosong hanya ditolak untuk type arrears")
	// mapper sengaja memetakan notes kosong menjadi nil (bukan pointer ke string kosong),
	// jadi yang diverifikasi adalah nilai di DB.
	assert.Nil(t, res.Notes)

	var row model.Invoice
	require.NoError(t, db.First(&row, created.ID).Error)
	assert.Equal(t, "", row.Notes)
}

func TestUpdateInvoice_Arrears_EmptyNotes_Rejected(t *testing.T) {
	db := setupManualInvoiceTestDB(t)
	fx := seedManualInvoiceFixture(t, db)
	svc := newTestManualInvoiceService(t, db)

	created := createArrearsViaService(t, svc, fx)

	for _, notes := range []string{"", "   "} {
		_, err := svc.Update(created.ID, dto.UpdateInvoiceRequest{Notes: notes})
		assertAppErrorCode(t, err, http.StatusUnprocessableEntity)
	}

	// Notes lama tidak berubah setelah percobaan gagal.
	res, err := svc.GetByID(created.ID)
	require.NoError(t, err)
	require.NotNil(t, res.Notes)
	assert.Equal(t, "Tunggakan SPP 2024/2025", *res.Notes)
}

func TestUpdateInvoice_InvalidDueDate_Rejected(t *testing.T) {
	db := setupManualInvoiceTestDB(t)
	fx := seedManualInvoiceFixture(t, db)
	svc := newTestManualInvoiceService(t, db)

	created := createArrearsViaService(t, svc, fx)
	_, err := svc.Update(created.ID, dto.UpdateInvoiceRequest{Notes: "Tunggakan", DueDate: "bukan-tanggal"})
	assertAppErrorCode(t, err, http.StatusUnprocessableEntity)
}

func TestUpdateInvoice_NotFound(t *testing.T) {
	db := setupManualInvoiceTestDB(t)
	svc := newTestManualInvoiceService(t, db)

	_, err := svc.Update(99999, dto.UpdateInvoiceRequest{Notes: "x"})
	assertAppErrorCode(t, err, http.StatusNotFound)
}

// --- Mutasi item: guard tagihan tunggakan ---

// TestArrearsItemMutation_Rejected menjaga invarian "arrears = tepat satu item"
// pada endpoint mutasi item, bukan hanya di CreateManual.
func TestArrearsItemMutation_Rejected(t *testing.T) {
	db := setupManualInvoiceTestDB(t)
	fx := seedManualInvoiceFixture(t, db)
	svc := newTestManualInvoiceService(t, db)

	arrears := createArrearsViaService(t, svc, fx)
	itemID := arrears.Items[0].ID
	qty := uint(2)

	_, err := svc.AddItem(arrears.ID, dto.AddInvoiceItemRequest{
		Name: "Item kedua", Category: "arrears", Amount: 1000,
	})
	assertAppErrorCode(t, err, http.StatusConflict)

	_, err = svc.UpdateItem(arrears.ID, itemID, dto.UpdateInvoiceItemRequest{
		Name: "Diubah", Amount: 5000,
	})
	assertAppErrorCode(t, err, http.StatusConflict)

	_, err = svc.UpdateItemQuantity(arrears.ID, itemID, dto.UpdateInvoiceItemQuantityRequest{Quantity: &qty})
	assertAppErrorCode(t, err, http.StatusConflict)

	err = svc.DeleteItem(arrears.ID, itemID)
	assertAppErrorCode(t, err, http.StatusConflict)

	// Invarian terjaga: tunggakan tetap satu item dengan nominal & total awal.
	res, err := svc.GetByID(arrears.ID)
	require.NoError(t, err)
	require.Len(t, res.Items, 1)
	assert.Equal(t, 100000.0, res.Items[0].Amount)
	assert.Equal(t, 100000.0, res.TotalAmount)
}

// TestManualItemMutation_StillAllowed memastikan guard di atas khusus tunggakan —
// tagihan rinci memang boleh dikoreksi itemnya.
func TestManualItemMutation_StillAllowed(t *testing.T) {
	db := setupManualInvoiceTestDB(t)
	fx := seedManualInvoiceFixture(t, db)
	svc := newTestManualInvoiceService(t, db)

	manual, err := svc.CreateManual(dto.CreateInvoiceRequest{
		StudentID:      fx.StudentID,
		AcademicYearID: fx.ActiveAcademicYear.ID,
		Type:           "manual",
		Items: []dto.CreateInvoiceItemRequest{
			{Name: "Seragam", Category: "other", Amount: 100000},
			{Name: "Kegiatan", Category: "other", Amount: 50000},
		},
	})
	require.NoError(t, err)
	require.Len(t, manual.Items, 2)

	require.NoError(t, svc.DeleteItem(manual.ID, manual.Items[0].ID))

	res, err := svc.GetByID(manual.ID)
	require.NoError(t, err)
	require.Len(t, res.Items, 1)
	assert.Equal(t, 50000.0, res.TotalAmount, "total dihitung ulang setelah item dihapus")
}
