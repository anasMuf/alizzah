package repository

import (
	"api/model"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupReportSoftDeleteTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	if err := db.AutoMigrate(
		&model.User{},
		&model.AcademicYear{},
		&model.Student{},
		&model.Payment{},
		&model.PaymentItem{},
		&model.Invoice{},
		&model.InvoiceItem{},
		&model.ExpenseCategory{},
		&model.Expense{},
		&model.IncomeCategory{},
		&model.IncomeTransaction{},
	); err != nil {
		t.Fatalf("failed to migrate test db: %v", err)
	}
	return db
}

// seedReportFixtures: 1 siswa + 1 invoice berisi 2 item (1 valid, 1 soft-deleted),
// 1 payment dengan 2 payment_items (1 valid, 1 soft-deleted), dan 2 expense (1 valid, 1 soft-deleted).
func seedReportFixtures(t *testing.T, db *gorm.DB) (ayID, invoiceID uint) {
	t.Helper()

	user := model.User{Email: "admin@test.com", Password: "hashed", Role: "superadmin", FullName: "Admin"}
	assert.NoError(t, db.Create(&user).Error)

	ay := model.AcademicYear{
		Name:      "2026/2027",
		StartDate: time.Date(2026, 7, 13, 0, 0, 0, 0, time.UTC),
		EndDate:   time.Date(2027, 6, 30, 0, 0, 0, 0, time.UTC),
		IsActive:  true,
	}
	assert.NoError(t, db.Create(&ay).Error)

	student := model.Student{
		FullName:   "Siswa Test",
		BirthPlace: "Jakarta",
		BirthDate:  time.Date(2015, 1, 1, 0, 0, 0, 0, time.UTC),
		Gender:     "L",
	}
	assert.NoError(t, db.Create(&student).Error)

	month := uint(1)
	year := uint(2026)
	invoice := model.Invoice{
		StudentID: student.ID, AcademicYearID: ay.ID,
		Type: "monthly", Month: &month, Year: &year,
		Status: "partial", TotalAmount: 100000, PaidAmount: 40000,
	}
	assert.NoError(t, db.Create(&invoice).Error)

	itemValid := model.InvoiceItem{InvoiceID: invoice.ID, Name: "SPP", Category: "monthly_spp", Amount: 100000, PaidAmount: 40000, Status: "partial"}
	assert.NoError(t, db.Create(&itemValid).Error)
	itemDeleted := model.InvoiceItem{InvoiceID: invoice.ID, Name: "Detail Lama", Category: "initial", Amount: 50000, PaidAmount: 0, Status: "unpaid"}
	assert.NoError(t, db.Create(&itemDeleted).Error)
	assert.NoError(t, db.Delete(&itemDeleted).Error) // soft-delete item detail lama

	payment := model.Payment{StudentID: student.ID, AcademicYearID: ay.ID, PaymentDate: time.Date(2026, 8, 1, 0, 0, 0, 0, time.UTC), TotalAmount: 40000, SavingsDeposit: 0, Source: "cash", CreatedBy: user.ID}
	assert.NoError(t, db.Create(&payment).Error)

	piValid := model.PaymentItem{PaymentID: payment.ID, InvoiceItemID: itemValid.ID, Amount: 40000}
	assert.NoError(t, db.Create(&piValid).Error)
	piDeleted := model.PaymentItem{PaymentID: payment.ID, InvoiceItemID: itemValid.ID, Amount: 30000}
	assert.NoError(t, db.Create(&piDeleted).Error)
	assert.NoError(t, db.Delete(&piDeleted).Error) // soft-delete payment item

	expCat := model.ExpenseCategory{Name: "Operasional", InvoiceCategory: "monthly_spp"}
	assert.NoError(t, db.Create(&expCat).Error)

	expValid := model.Expense{AcademicYearID: ay.ID, ExpenseCategoryID: expCat.ID, ExpenseDate: time.Date(2026, 8, 2, 0, 0, 0, 0, time.UTC), Amount: 15000, Description: "Valid", CreatedBy: user.ID}
	assert.NoError(t, db.Create(&expValid).Error)
	expDeleted := model.Expense{AcademicYearID: ay.ID, ExpenseCategoryID: expCat.ID, ExpenseDate: time.Date(2026, 8, 2, 0, 0, 0, 0, time.UTC), Amount: 9000, Description: "Dihapus", CreatedBy: user.ID}
	assert.NoError(t, db.Create(&expDeleted).Error)
	assert.NoError(t, db.Delete(&expDeleted).Error) // soft-delete expense

	return ay.ID, invoice.ID
}

func TestSumInvoiceByCategory_ExcludesSoftDeleted(t *testing.T) {
	db := setupReportSoftDeleteTestDB(t)
	ayID, _ := seedReportFixtures(t, db)

	repo := NewReportRepository(db)
	results, err := repo.SumInvoiceByCategory(ayID, 1, 2026)
	assert.NoError(t, err)

	var billedMonthly float64
	for _, r := range results {
		if r.Category == "monthly_spp" {
			billedMonthly = r.Billed
		}
		assert.NotEqual(t, "initial", r.Category, "item soft-deleted tidak boleh dihitung")
	}
	assert.Equal(t, 100000.0, billedMonthly)
}

func TestSumPenerimaan_ExcludesSoftDeleted(t *testing.T) {
	db := setupReportSoftDeleteTestDB(t)
	ayID, _ := seedReportFixtures(t, db)

	repo := NewReportRepository(db)
	// Rentang sengaja dilebarkan (Jul–Sep) karena sqlite membandingkan kolom date
	// sebagai teks; fokus test adalah filter soft-delete, bukan filter tanggal.
	start := time.Date(2026, 7, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 9, 30, 0, 0, 0, 0, time.UTC)

	total, err := repo.SumPenerimaan(ayID, start, end, "")
	assert.NoError(t, err)
	assert.Equal(t, 40000.0, total, "payment_item soft-deleted tidak boleh dihitung")

	byCat, err := repo.SumPenerimaanByInvoiceCategory(ayID, start, end)
	assert.NoError(t, err)
	assert.Equal(t, 40000.0, byCat["monthly_spp"])
}

func TestSumExpense_ExcludesSoftDeleted(t *testing.T) {
	db := setupReportSoftDeleteTestDB(t)
	ayID, _ := seedReportFixtures(t, db)

	repo := NewReportRepository(db)
	start := time.Date(2026, 7, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 9, 30, 0, 0, 0, 0, time.UTC)

	byCat, err := repo.SumExpenseByCategory(ayID, start, end)
	assert.NoError(t, err)
	var total float64
	for _, c := range byCat {
		total += c.Amount
	}
	assert.Equal(t, 15000.0, total, "expense soft-deleted tidak boleh dihitung")

	sum, err := repo.SumPengeluaran(ayID, start, end, "")
	assert.NoError(t, err)
	assert.Equal(t, 15000.0, sum)
}
