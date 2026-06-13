package pinjaman

import (
	"errors"
	"math"
	"time"

	"api/internal/modules/koperasi/anggota"
	"api/internal/modules/koperasi/kas"
	"api/internal/modules/koperasi/pembayaran"
	"api/repository"

	"gorm.io/gorm"
)

type Service interface {
	Create(req CreateRequest, createdBy uint) (*Response, error)
	List(p QueryParams) ([]Response, int64, error)
	Get(id uint) (*Response, error)
	Pay(id uint, req PaymentRequest, createdBy uint) (*Response, error)
	Summary(academicYearID uint) ([]SummaryItem, error)
}

type svc struct {
	db         *gorm.DB
	repo       Repository
	memberRepo anggota.Repository
	cashWriter kas.Writer
	paymentSvc pembayaran.Service
	ayRepo     repository.AcademicYearRepository
}

func NewService(
	db *gorm.DB,
	repo Repository,
	memberRepo anggota.Repository,
	cashWriter kas.Writer,
	paymentSvc pembayaran.Service,
	ayRepo repository.AcademicYearRepository,
) Service {
	return &svc{db: db, repo: repo, memberRepo: memberRepo, cashWriter: cashWriter, paymentSvc: paymentSvc, ayRepo: ayRepo}
}

func statusFor(paid, total float64) string {
	if paid <= 0 {
		return "unpaid"
	}
	if paid < total {
		return "partial"
	}
	return "paid"
}

func round2(v float64) float64 { return math.Round(v*100) / 100 }

func (s *svc) Create(req CreateRequest, createdBy uint) (*Response, error) {
	if _, err := s.ayRepo.FindByID(req.AcademicYearID); err != nil {
		return nil, errors.New("Tahun ajaran tidak ditemukan")
	}
	m, err := s.memberRepo.FindByID(req.MemberID)
	if err != nil {
		return nil, errors.New("Anggota tidak ditemukan")
	}
	if !m.IsActive {
		return nil, errors.New("Tidak bisa: anggota tidak aktif")
	}
	date, err := time.Parse("2006-01-02", req.LoanDate)
	if err != nil {
		return nil, errors.New("Format loan_date tidak valid (YYYY-MM-DD)")
	}

	// Generate jadwal angsuran (TANPA bunga): per = principal/tenor, sisa pembulatan
	// diserap angsuran terakhir agar Σ = principal.
	per := round2(req.Principal / float64(req.Tenor))
	installments := make([]LoanInstallment, 0, req.Tenor)
	var allocated float64
	for i := 1; i <= req.Tenor; i++ {
		amt := per
		if i == req.Tenor {
			amt = round2(req.Principal - allocated)
		} else {
			allocated = round2(allocated + per)
		}
		installments = append(installments, LoanInstallment{Sequence: i, AmountDue: amt, Status: "unpaid"})
	}

	var loanID uint
	err = s.db.Transaction(func(tx *gorm.DB) error {
		loan := &Loan{
			AcademicYearID:  req.AcademicYearID,
			MemberID:        req.MemberID,
			Purpose:         req.Purpose,
			Principal:       req.Principal,
			Tenor:           req.Tenor,
			RepaymentMethod: req.RepaymentMethod,
			LoanDate:        date,
			PaidAmount:      0,
			Status:          "unpaid",
			Notes:           req.Notes,
			CreatedBy:       createdBy,
			Installments:    installments,
		}
		if err := s.repo.CreateWithTx(loan, tx); err != nil {
			return err
		}
		// Pencairan: kas koperasi KELUAR ke anggota (debit).
		if _, err := s.cashWriter.WriteDebit(req.AcademicYearID, date, req.Principal, "loan_disbursement", &loan.ID, "pinjaman", "Pencairan pinjaman anggota", createdBy, tx); err != nil {
			return err
		}
		loanID = loan.ID
		return nil
	})
	if err != nil {
		return nil, err
	}
	return s.Get(loanID)
}

func (s *svc) Pay(id uint, req PaymentRequest, createdBy uint) (*Response, error) {
	loan, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.New("Pinjaman tidak ditemukan")
	}
	remaining := loan.Principal - loan.PaidAmount
	if req.Amount > remaining {
		return nil, errors.New("Pembayaran melebihi sisa pinjaman")
	}
	date, err := time.Parse("2006-01-02", req.PaymentDate)
	if err != nil {
		return nil, errors.New("Format payment_date tidak valid (YYYY-MM-DD)")
	}
	method := req.Method
	if method == "" {
		if loan.RepaymentMethod == "potong_gaji" {
			method = "potong_gaji"
		} else {
			method = "cash"
		}
	}

	err = s.db.Transaction(func(tx *gorm.DB) error {
		// Alokasi pembayaran ke angsuran terurut (fleksibel: pas/lebih/sekaligus).
		insts, err := s.repo.FindInstallmentsWithTx(tx, loan.ID)
		if err != nil {
			return err
		}
		rem := req.Amount
		for i := range insts {
			if rem <= 0 {
				break
			}
			inst := &insts[i]
			due := round2(inst.AmountDue - inst.AmountPaid)
			if due <= 0 {
				continue
			}
			pay := rem
			if due < pay {
				pay = due
			}
			inst.AmountPaid = round2(inst.AmountPaid + pay)
			inst.Status = statusFor(inst.AmountPaid, inst.AmountDue)
			if err := s.repo.UpdateInstallmentWithTx(tx, inst); err != nil {
				return err
			}
			rem = round2(rem - pay)
		}
		newPaid := round2(loan.PaidAmount + req.Amount)
		if err := s.repo.UpdatePaymentWithTx(tx, loan.ID, newPaid, statusFor(newPaid, loan.Principal)); err != nil {
			return err
		}
		// Angsuran masuk → kas koperasi credit.
		return s.paymentSvc.Record(tx, pembayaran.RecordInput{
			AcademicYearID: loan.AcademicYearID, RefType: "loan", RefID: loan.ID, Direction: "in",
			Amount: req.Amount, Date: date, Method: method, Category: "angsuran",
			Description: "Angsuran pinjaman", Notes: req.Notes, CreatedBy: createdBy,
		})
	})
	if err != nil {
		return nil, err
	}
	return s.Get(id)
}

func (s *svc) List(p QueryParams) ([]Response, int64, error) {
	loans, total, err := s.repo.FindAll(p)
	if err != nil {
		return nil, 0, err
	}
	out := make([]Response, 0, len(loans))
	for _, l := range loans {
		out = append(out, toResponse(l, false))
	}
	return out, total, nil
}

func (s *svc) Get(id uint) (*Response, error) {
	loan, err := s.repo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("Pinjaman tidak ditemukan")
		}
		return nil, err
	}
	resp := toResponse(*loan, true)
	return &resp, nil
}

func (s *svc) Summary(academicYearID uint) ([]SummaryItem, error) {
	items, err := s.repo.Summary(academicYearID)
	if err != nil {
		return nil, err
	}
	for i := range items {
		items[i].Remaining = round2(items[i].TotalPrincipal - items[i].TotalPaid)
	}
	return items, nil
}
