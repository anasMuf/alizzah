package service

import (
	"api/model"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestRegenerateForStudent_PreservesPaidAndPartialInvoices memastikan invoice
// yang sudah memiliki pembayaran tidak dihapus dan payment_items-nya tetap utuh.
func TestRegenerateForStudent_PreservesPaidAndPartialInvoices(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	require.NoError(t, db.AutoMigrate(&model.Payment{}, &model.PaymentItem{}))

	fx := seedExclusionBaseFixture(t, db, false)
	ayID := fx.AcademicYear.ID
	studentID := fx.StudentID

	monthPaid, yearPaid := uint(8), uint(2025)
	paidInv := model.Invoice{
		StudentID: studentID, AcademicYearID: ayID, Type: "monthly",
		Month: &monthPaid, Year: &yearPaid,
		Status: "paid", TotalAmount: 300000, PaidAmount: 300000,
	}
	require.NoError(t, db.Create(&paidInv).Error)
	paidItem := model.InvoiceItem{
		InvoiceID: paidInv.ID, Name: "SPP TK (Sem 1)", Category: "monthly_spp",
		Amount: 300000, PaidAmount: 300000, Status: "paid",
	}
	require.NoError(t, db.Create(&paidItem).Error)

	monthPartial, yearPartial := uint(9), uint(2025)
	partialInv := model.Invoice{
		StudentID: studentID, AcademicYearID: ayID, Type: "monthly",
		Month: &monthPartial, Year: &yearPartial,
		Status: "partial", TotalAmount: 300000, PaidAmount: 150000,
	}
	require.NoError(t, db.Create(&partialInv).Error)
	partialItem := model.InvoiceItem{
		InvoiceID: partialInv.ID, Name: "SPP TK (Sem 1)", Category: "monthly_spp",
		Amount: 300000, PaidAmount: 150000, Status: "partial",
	}
	require.NoError(t, db.Create(&partialItem).Error)

	// Invoice belum lunas — boleh dihapus & di-generate ulang.
	monthUnpaid, yearUnpaid := uint(10), uint(2025)
	unpaidInv := model.Invoice{
		StudentID: studentID, AcademicYearID: ayID, Type: "monthly",
		Month: &monthUnpaid, Year: &yearUnpaid,
		Status: "unpaid", TotalAmount: 100000,
	}
	require.NoError(t, db.Create(&unpaidInv).Error)
	require.NoError(t, db.Create(&model.InvoiceItem{
		InvoiceID: unpaidInv.ID, Name: "Robotika", Category: "pasta",
		Amount: 100000, Status: "unpaid",
	}).Error)

	// payment_items yang menautkan pembayaran ke item invoice.
	payment := model.Payment{
		StudentID: studentID, AcademicYearID: ayID,
		PaymentDate: time.Date(2025, 8, 10, 0, 0, 0, 0, time.UTC),
		TotalAmount: 450000, Source: "cash", CreatedBy: 1,
	}
	require.NoError(t, db.Create(&payment).Error)
	require.NoError(t, db.Create(&model.PaymentItem{PaymentID: payment.ID, InvoiceItemID: paidItem.ID, Amount: 300000}).Error)
	require.NoError(t, db.Create(&model.PaymentItem{PaymentID: payment.ID, InvoiceItemID: partialItem.ID, Amount: 150000}).Error)

	svc := newTestInvoiceGen(t, db)
	require.NoError(t, svc.RegenerateForStudent(studentID))

	// Invoice paid & partial harus tetap ada.
	var count int64
	require.NoError(t, db.Model(&model.Invoice{}).Where("id = ?", paidInv.ID).Count(&count).Error)
	assert.Equal(t, int64(1), count, "invoice paid harus dipertahankan")
	require.NoError(t, db.Model(&model.Invoice{}).Where("id = ?", partialInv.ID).Count(&count).Error)
	assert.Equal(t, int64(1), count, "invoice partial harus dipertahankan")

	// payment_items tidak boleh hilang.
	require.NoError(t, db.Model(&model.PaymentItem{}).Where("invoice_item_id IN ?", []uint{paidItem.ID, partialItem.ID}).Count(&count).Error)
	assert.Equal(t, int64(2), count, "payment_items pada invoice paid/partial harus utuh")

	// Invoice unpaid lama harus terhapus (tetap di-generate ulang sebagai invoice baru).
	require.NoError(t, db.Model(&model.Invoice{}).Where("id = ?", unpaidInv.ID).Count(&count).Error)
	assert.Equal(t, int64(0), count, "invoice unpaid lama harus dihapus oleh regenerate")
}

// TestRegenerateForStudent_DeactivatesAbkOnPartialInvoice memastikan saat status
// ABK dinonaktifkan, item SPP pada invoice partial kembali ke tarif normal tanpa
// menghapus invoice/pembayaran yang sudah ada.
func TestRegenerateForStudent_DeactivatesAbkOnPartialInvoice(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	require.NoError(t, db.AutoMigrate(&model.Payment{}, &model.PaymentItem{}))

	fx := seedExclusionBaseFixture(t, db, false)
	ayID := fx.AcademicYear.ID
	studentID := fx.StudentID

	month, year := uint(9), uint(2025)
	inv := model.Invoice{
		StudentID: studentID, AcademicYearID: ayID, Type: "monthly",
		Month: &month, Year: &year,
		Status: "partial", TotalAmount: 300000, PaidAmount: 150000,
	}
	require.NoError(t, db.Create(&inv).Error)
	item := model.InvoiceItem{
		InvoiceID: inv.ID, Name: "SPP TK (Sem 1) (ABK)", Category: "monthly_spp",
		Amount: 300000, PaidAmount: 150000, Status: "partial",
	}
	require.NoError(t, db.Create(&item).Error)

	svc := newTestInvoiceGen(t, db)
	require.NoError(t, svc.RegenerateForStudent(studentID))

	var got model.InvoiceItem
	require.NoError(t, db.First(&got, item.ID).Error)
	assert.Equal(t, 150000.0, got.Amount, "SPP harus kembali ke tarif normal")
	assert.Equal(t, "SPP TK (Sem 1)", got.Name, "suffix (ABK) harus hilang")
	assert.Equal(t, 150000.0, got.PaidAmount, "paid_amount tidak boleh berubah")
	assert.Equal(t, "paid", got.Status)

	var gotInv model.Invoice
	require.NoError(t, db.First(&gotInv, inv.ID).Error)
	assert.Equal(t, 150000.0, gotInv.TotalAmount)
	assert.Equal(t, 150000.0, gotInv.PaidAmount)
	assert.Equal(t, "paid", gotInv.Status)
}

// TestRegenerateForStudent_DoesNotReduceFullyPaidAbkItem memastikan item SPP
// yang sudah lunas tidak diturunkan saat ABK dinonaktifkan (menghindari
// paid_amount > amount / kredit yang tidak dimodelkan).
func TestRegenerateForStudent_DoesNotReduceFullyPaidAbkItem(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	require.NoError(t, db.AutoMigrate(&model.Payment{}, &model.PaymentItem{}))

	fx := seedExclusionBaseFixture(t, db, false)
	ayID := fx.AcademicYear.ID
	studentID := fx.StudentID

	month, year := uint(9), uint(2025)
	inv := model.Invoice{
		StudentID: studentID, AcademicYearID: ayID, Type: "monthly",
		Month: &month, Year: &year,
		Status: "partial", TotalAmount: 400000, PaidAmount: 300000,
	}
	require.NoError(t, db.Create(&inv).Error)
	item := model.InvoiceItem{
		InvoiceID: inv.ID, Name: "SPP TK (Sem 1) (ABK)", Category: "monthly_spp",
		Amount: 300000, PaidAmount: 300000, Status: "paid",
	}
	require.NoError(t, db.Create(&item).Error)
	require.NoError(t, db.Create(&model.InvoiceItem{
		InvoiceID: inv.ID, Name: "Infaq Harian (10 hari)", Category: "monthly_infaq",
		Amount: 100000, Status: "unpaid",
	}).Error)

	svc := newTestInvoiceGen(t, db)
	require.NoError(t, svc.RegenerateForStudent(studentID))

	var got model.InvoiceItem
	require.NoError(t, db.First(&got, item.ID).Error)
	assert.Equal(t, 300000.0, got.Amount, "item SPP yang sudah lunas tidak boleh diubah")
	assert.Equal(t, "SPP TK (Sem 1) (ABK)", got.Name)
	assert.Equal(t, 300000.0, got.PaidAmount)
	assert.Equal(t, "paid", got.Status)
}

// TestRegenerateForStudent_ActivatesAbkOnPartialInvoice memastikan saat status
// ABK diaktifkan, item SPP pada invoice partial dikalikan 2 tanpa menghapus
// invoice/pembayaran yang sudah ada.
func TestRegenerateForStudent_ActivatesAbkOnPartialInvoice(t *testing.T) {
	db := setupBillingExclusionInvoiceTestDB(t)
	require.NoError(t, db.AutoMigrate(&model.Payment{}, &model.PaymentItem{}))

	fx := seedExclusionBaseFixture(t, db, false)
	ayID := fx.AcademicYear.ID
	studentID := fx.StudentID

	require.NoError(t, db.Create(&model.StudentExceptionality{
		StudentID: studentID, IsActive: true,
	}).Error)

	month, year := uint(9), uint(2025)
	inv := model.Invoice{
		StudentID: studentID, AcademicYearID: ayID, Type: "monthly",
		Month: &month, Year: &year,
		Status: "partial", TotalAmount: 150000, PaidAmount: 50000,
	}
	require.NoError(t, db.Create(&inv).Error)
	item := model.InvoiceItem{
		InvoiceID: inv.ID, Name: "SPP TK (Sem 1)", Category: "monthly_spp",
		Amount: 150000, PaidAmount: 50000, Status: "partial",
	}
	require.NoError(t, db.Create(&item).Error)

	svc := newTestInvoiceGen(t, db)
	require.NoError(t, svc.RegenerateForStudent(studentID))

	var got model.InvoiceItem
	require.NoError(t, db.First(&got, item.ID).Error)
	assert.Equal(t, 300000.0, got.Amount, "SPP harus dikalikan 2")
	assert.Equal(t, "SPP TK (Sem 1) (ABK)", got.Name)
	assert.Equal(t, 50000.0, got.PaidAmount, "paid_amount tidak boleh berubah")
	assert.Equal(t, "partial", got.Status)

	var gotInv model.Invoice
	require.NoError(t, db.First(&gotInv, inv.ID).Error)
	assert.Equal(t, 300000.0, gotInv.TotalAmount)
	assert.Equal(t, 50000.0, gotInv.PaidAmount)
	assert.Equal(t, "partial", gotInv.Status)
}
