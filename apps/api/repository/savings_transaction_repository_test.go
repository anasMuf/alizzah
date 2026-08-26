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

func setupSavingsTxnTestDB(t *testing.T) *gorm.DB {
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
		&model.StudentSavings{},
		&model.SavingsTransaction{},
	); err != nil {
		t.Fatalf("failed to migrate test db: %v", err)
	}
	return db
}

// seedSavingsFixtures membuat 1 siswa dengan 1 akun tabungan umum berisi 2
// setoran: satu valid (payment masih ada) dan satu soft-deleted (payment
// dibatalkan → transaksi "yatim" yang harus tidak terlihat di mutasi).
func seedSavingsFixtures(t *testing.T, db *gorm.DB) (studentID, savingsID uint, validTxn, deletedTxn model.SavingsTransaction) {
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

	savings := model.StudentSavings{StudentID: student.ID, Type: "general", Balance: 0}
	assert.NoError(t, db.Create(&savings).Error)

	payValid := model.Payment{StudentID: student.ID, AcademicYearID: ay.ID, PaymentDate: time.Now(), TotalAmount: 0, SavingsDeposit: 10000, Source: "cash", CreatedBy: user.ID}
	assert.NoError(t, db.Create(&payValid).Error)
	payDeleted := model.Payment{StudentID: student.ID, AcademicYearID: ay.ID, PaymentDate: time.Now(), TotalAmount: 0, SavingsDeposit: 20000, Source: "cash", CreatedBy: user.ID}
	assert.NoError(t, db.Create(&payDeleted).Error)

	validTxn = model.SavingsTransaction{
		StudentSavingsID: savings.ID, TransactionType: "debit",
		Amount: 10000, NetAmount: 10000,
		SourceType: "payment_deposit", SourceID: &payValid.ID, CreatedBy: user.ID,
	}
	assert.NoError(t, db.Create(&validTxn).Error)

	deletedTxn = model.SavingsTransaction{
		StudentSavingsID: savings.ID, TransactionType: "debit",
		Amount: 20000, NetAmount: 20000,
		SourceType: "payment_deposit", SourceID: &payDeleted.ID, CreatedBy: user.ID,
	}
	assert.NoError(t, db.Create(&deletedTxn).Error)

	// Soft delete → transaksi "yatim" (payment dibatalkan, deleted_at terisi)
	assert.NoError(t, db.Delete(&deletedTxn).Error)
	assert.False(t, deletedTxn.DeletedAt.Time.IsZero(), "txn harus ter-soft-delete")

	return student.ID, savings.ID, validTxn, deletedTxn
}

func TestFindAllByStudentID_ExcludesSoftDeleted(t *testing.T) {
	db := setupSavingsTxnTestDB(t)
	studentID, _, validTxn, deletedTxn := seedSavingsFixtures(t, db)

	repo := NewSavingsTransactionRepository(db)
	start := time.Date(2026, 7, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 12, 31, 0, 0, 0, 0, time.UTC)

	txns, err := repo.FindAllByStudentID(studentID, start, end)
	assert.NoError(t, err)
	require.Len(t, txns, 1)
	assert.Equal(t, validTxn.ID, txns[0].ID)
	assert.NotEqual(t, deletedTxn.ID, txns[0].ID)
}

func TestSumDebitCreditByStudentBefore_ExcludesSoftDeleted(t *testing.T) {
	db := setupSavingsTxnTestDB(t)
	studentID, _, _, _ := seedSavingsFixtures(t, db)

	repo := NewSavingsTransactionRepository(db)
	end := time.Date(2026, 12, 31, 0, 0, 0, 0, time.UTC)

	debit, err := repo.SumDebitByStudentBefore(studentID, end)
	assert.NoError(t, err)
	assert.Equal(t, 10000.0, debit, "debit hanya dari transaksi valid (soft-deleted diabaikan)")

	credit, err := repo.SumCreditByStudentBefore(studentID, end)
	assert.NoError(t, err)
	assert.Equal(t, 0.0, credit)
}

func TestFindBySavingsIDs_ExcludesSoftDeleted(t *testing.T) {
	db := setupSavingsTxnTestDB(t)
	_, savingsID, validTxn, deletedTxn := seedSavingsFixtures(t, db)

	repo := NewSavingsTransactionRepository(db)
	txns, err := repo.FindBySavingsIDs([]uint{savingsID}, dto.SavingsTransactionQueryParams{})
	assert.NoError(t, err)
	require.Len(t, txns, 1)
	assert.Equal(t, validTxn.ID, txns[0].ID)
	assert.NotEqual(t, deletedTxn.ID, txns[0].ID)
}

func TestReportRepository_SavingsSums_ExcludeSoftDeleted(t *testing.T) {
	db := setupSavingsTxnTestDB(t)
	_, _, _, _ = seedSavingsFixtures(t, db)

	repo := NewReportRepository(db)
	start := time.Date(2026, 7, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 12, 31, 0, 0, 0, 0, time.UTC)

	debit, err := repo.SumSavingsDebit(start, end, "general")
	assert.NoError(t, err)
	assert.Equal(t, 10000.0, debit, "laporan tabungan bulanan hanya menghitung transaksi valid")

	credit, err := repo.SumSavingsCredit(start, end, "general")
	assert.NoError(t, err)
	assert.Equal(t, 0.0, credit)
}

func TestReverseSavingsBalance_NoClampToZero(t *testing.T) {
	// Simulasi bug clamp-to-0: saldo 38.000, reversal setoran 104.000.
	// Saldo harus ERROR (bukan di-clamp ke 0) — ini dijaga oleh SubtractBalance
	// yang mensyaratkan balance >= amount.
	db := setupSavingsTxnTestDB(t)

	user := model.User{Email: "u@t.com", Password: "h", Role: "admin", FullName: "U"}
	assert.NoError(t, db.Create(&user).Error)
	student := model.Student{FullName: "S", BirthPlace: "B", BirthDate: time.Date(2015, 1, 1, 0, 0, 0, 0, time.UTC), Gender: "L"}
	assert.NoError(t, db.Create(&student).Error)
	savings := model.StudentSavings{StudentID: student.ID, Type: "general", Balance: 38000}
	assert.NoError(t, db.Create(&savings).Error)

	repo := NewStudentSavingsRepository(db)
	err := repo.SubtractBalance(db, savings.ID, 104000)
	assert.ErrorIs(t, err, gorm.ErrRecordNotFound, "saldo tidak boleh negatif / di-clamp")

	var updated model.StudentSavings
	assert.NoError(t, db.First(&updated, savings.ID).Error)
	assert.Equal(t, 38000.0, updated.Balance, "saldo tidak berubah")
}
