package pinjaman

import (
	"time"

	"api/internal/modules/koperasi/anggota"
	"api/model"
)

// Loan adalah pinjaman anggota koperasi. TANPA bunga (D4): total tagihan = principal,
// angsuran = principal/tenor. Pencairan = kas koperasi keluar (debit).
type Loan struct {
	model.PrimaryKey
	AcademicYearID  uint      `gorm:"not null;index" json:"academic_year_id"`
	MemberID        uint      `gorm:"not null;index" json:"member_id"`
	Purpose         string    `gorm:"size:255" json:"purpose"`
	Principal       float64   `gorm:"type:decimal(15,2);not null" json:"principal"`
	Tenor           int       `gorm:"not null" json:"tenor"`
	RepaymentMethod string    `gorm:"size:20;not null" json:"repayment_method"` // potong_gaji | manual
	LoanDate        time.Time `gorm:"type:date;not null" json:"loan_date"`
	PaidAmount      float64   `gorm:"type:decimal(15,2);not null;default:0" json:"paid_amount"`
	Status          string    `gorm:"size:20;not null;default:unpaid" json:"status"` // unpaid | partial | paid
	Notes           string    `gorm:"type:text" json:"notes"`
	CreatedBy       uint      `gorm:"not null" json:"created_by"`
	model.BaseModelTimeAt

	Member       anggota.Member    `gorm:"foreignKey:MemberID" json:"-"`
	Installments []LoanInstallment `gorm:"foreignKey:LoanID" json:"installments"`
	Creator      model.User        `gorm:"foreignKey:CreatedBy" json:"-"`
}

func (Loan) TableName() string { return "koperasi_loans" }

// LoanInstallment adalah jadwal angsuran (di-generate dari tenor). Pembayaran
// dialokasikan terurut ke angsuran (fleksibel: pas/lebih/sekaligus).
type LoanInstallment struct {
	model.PrimaryKey
	LoanID     uint       `gorm:"not null;index" json:"loan_id"`
	Sequence   int        `gorm:"not null" json:"sequence"`
	AmountDue  float64    `gorm:"type:decimal(15,2);not null" json:"amount_due"`
	AmountPaid float64    `gorm:"type:decimal(15,2);not null;default:0" json:"amount_paid"`
	DueDate    *time.Time `gorm:"type:date" json:"due_date"`
	Status     string     `gorm:"size:20;not null;default:unpaid" json:"status"`
	model.BaseModelTimeAt
}

func (LoanInstallment) TableName() string { return "koperasi_loan_installments" }
