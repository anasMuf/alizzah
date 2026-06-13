package pembayaran

import (
	"time"

	"api/internal/modules/koperasi/kas"

	"gorm.io/gorm"
)

// RecordInput adalah parameter untuk mencatat satu pembayaran + mutasi kas.
type RecordInput struct {
	AcademicYearID uint
	RefType        string // sale | purchase | loan
	RefID          uint
	Direction      string // in | out
	Amount         float64
	Date           time.Time
	Method         string // cash | potong_gaji
	Category       string // klasifikasi kas (penjualan/pembelian/angsuran)
	Description    string
	Notes          string
	CreatedBy      uint
}

// Service mencatat pembayaran terhadap dokumen (sale/purchase/loan) sekaligus menulis
// baris kas koperasi. SELALU dipanggil DI DALAM transaksi DB oleh fitur pemilik dokumen,
// yang juga bertanggung jawab memperbarui paid_amount/status dokumennya.
type Service interface {
	Record(tx *gorm.DB, in RecordInput) error
}

type service struct {
	repo       Repository
	cashWriter kas.Writer
}

func NewService(repo Repository, cashWriter kas.Writer) Service {
	return &service{repo: repo, cashWriter: cashWriter}
}

func (s *service) Record(tx *gorm.DB, in RecordInput) error {
	refID := in.RefID
	p := &Payment{
		AcademicYearID: in.AcademicYearID,
		RefType:        in.RefType,
		RefID:          refID,
		Direction:      in.Direction,
		Amount:         in.Amount,
		PaymentDate:    in.Date,
		Method:         in.Method,
		Notes:          in.Notes,
		CreatedBy:      in.CreatedBy,
	}
	if err := s.repo.CreateWithTx(p, tx); err != nil {
		return err
	}

	sourceType := in.RefType + "_payment" // sale_payment | purchase_payment | loan_payment
	var cashTxnID uint
	var err error
	if in.Direction == "in" {
		cashTxnID, err = s.cashWriter.WriteCredit(in.AcademicYearID, in.Date, in.Amount, sourceType, &refID, in.Category, in.Description, in.CreatedBy, tx)
	} else {
		cashTxnID, err = s.cashWriter.WriteDebit(in.AcademicYearID, in.Date, in.Amount, sourceType, &refID, in.Category, in.Description, in.CreatedBy, tx)
	}
	if err != nil {
		return err
	}
	return tx.Model(p).Update("cash_txn_id", cashTxnID).Error
}
