package kas

import (
	"time"

	"gorm.io/gorm"
)

// Writer menulis baris ke jurnal kas koperasi. Selalu dipanggil DI DALAM transaksi DB
// oleh fitur lain (modal, penjualan, pembelian, pinjaman) agar mutasi kas atomik
// bersama dokumen sumbernya. Mengembalikan ID baris kas yang dibuat.
type Writer interface {
	WriteCredit(academicYearID uint, date time.Time, amount float64, sourceType string, sourceID *uint, category, description string, createdBy uint, tx *gorm.DB) (uint, error)
	WriteDebit(academicYearID uint, date time.Time, amount float64, sourceType string, sourceID *uint, category, description string, createdBy uint, tx *gorm.DB) (uint, error)
}

type writer struct{}

func NewWriter() Writer { return &writer{} }

func (w *writer) write(ttype string, academicYearID uint, date time.Time, amount float64, sourceType string, sourceID *uint, category, description string, createdBy uint, tx *gorm.DB) (uint, error) {
	ct := &CashTransaction{
		AcademicYearID:  academicYearID,
		TransactionDate: date,
		TransactionType: ttype,
		Amount:          amount,
		SourceType:      sourceType,
		SourceID:        sourceID,
		Category:        category,
		Description:     description,
		CreatedBy:       createdBy,
	}
	if err := tx.Create(ct).Error; err != nil {
		return 0, err
	}
	return ct.ID, nil
}

func (w *writer) WriteCredit(academicYearID uint, date time.Time, amount float64, sourceType string, sourceID *uint, category, description string, createdBy uint, tx *gorm.DB) (uint, error) {
	return w.write("debit", academicYearID, date, amount, sourceType, sourceID, category, description, createdBy, tx)
}

func (w *writer) WriteDebit(academicYearID uint, date time.Time, amount float64, sourceType string, sourceID *uint, category, description string, createdBy uint, tx *gorm.DB) (uint, error) {
	return w.write("credit", academicYearID, date, amount, sourceType, sourceID, category, description, createdBy, tx)
}
