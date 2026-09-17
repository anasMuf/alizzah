package service

import (
	"api/model"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestRegenerateForStudent_PreservesManualAndArrears memastikan invoice yang
// diinput admin (type arrears/manual) tidak ikut terhapus oleh regenerate,
// sementara invoice hasil generate tetap dihapus & dibuat ulang.
func TestRegenerateForStudent_PreservesManualAndArrears(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	// RegenerateForStudent melakukan hard-delete payment_items.
	require.NoError(t, db.AutoMigrate(&model.Payment{}, &model.PaymentItem{}))

	fx := seedExclusionBaseFixture(t, db, false)
	ayID := fx.AcademicYear.ID
	studentID := fx.StudentID

	// Invoice hasil generate — harus terhapus (ID lama hilang).
	generated := model.Invoice{StudentID: studentID, AcademicYearID: ayID, Type: "initial", Status: "unpaid", TotalAmount: 100000}
	require.NoError(t, db.Create(&generated).Error)
	require.NoError(t, db.Create(&model.InvoiceItem{
		InvoiceID: generated.ID, Name: "Biaya Awal", Category: "initial", Amount: 100000, Status: "unpaid",
	}).Error)

	// Invoice tunggakan — harus TETAP ADA beserta itemnya.
	arrears := model.Invoice{StudentID: studentID, AcademicYearID: ayID, Type: "arrears", Status: "unpaid", TotalAmount: 500000, Notes: "Tunggakan SPP 2024/2025"}
	require.NoError(t, db.Create(&arrears).Error)
	require.NoError(t, db.Create(&model.InvoiceItem{
		InvoiceID: arrears.ID, Name: "Tunggakan TA 2024/2025", Category: "arrears", Amount: 500000, Status: "unpaid",
	}).Error)

	// Invoice manual rinci — harus TETAP ADA beserta itemnya.
	manual := model.Invoice{StudentID: studentID, AcademicYearID: ayID, Type: "manual", Status: "unpaid", TotalAmount: 250000, Notes: "Seragam"}
	require.NoError(t, db.Create(&manual).Error)
	require.NoError(t, db.Create(&model.InvoiceItem{
		InvoiceID: manual.ID, Name: "Seragam", Category: "other", Amount: 250000, Status: "unpaid",
	}).Error)

	svc := newTestInvoiceGen(t, db)
	require.NoError(t, svc.RegenerateForStudent(studentID))

	var count int64

	// Guard R.7: invoice admin tidak terhapus.
	require.NoError(t, db.Model(&model.Invoice{}).Where("id = ?", arrears.ID).Count(&count).Error)
	assert.Equal(t, int64(1), count, "invoice arrears harus tetap ada setelah regenerate")

	require.NoError(t, db.Model(&model.Invoice{}).Where("id = ?", manual.ID).Count(&count).Error)
	assert.Equal(t, int64(1), count, "invoice manual harus tetap ada setelah regenerate")

	require.NoError(t, db.Model(&model.InvoiceItem{}).Where("invoice_id = ?", arrears.ID).Count(&count).Error)
	assert.Equal(t, int64(1), count, "item invoice arrears harus tetap ada")

	require.NoError(t, db.Model(&model.InvoiceItem{}).Where("invoice_id = ?", manual.ID).Count(&count).Error)
	assert.Equal(t, int64(1), count, "item invoice manual harus tetap ada")

	// Bukti regenerate benar-benar berjalan (bukan vacuous): invoice generate lama hilang.
	require.NoError(t, db.Model(&model.Invoice{}).Where("id = ?", generated.ID).Count(&count).Error)
	assert.Equal(t, int64(0), count, "invoice hasil generate harus terhapus oleh regenerate")
}
