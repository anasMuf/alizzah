package pembelian

import (
	"errors"
	"time"

	"api/internal/modules/koperasi/barang"
	"api/internal/modules/koperasi/pemasok"
	"api/internal/modules/koperasi/pembayaran"
	"api/repository"

	"gorm.io/gorm"
)

type Service interface {
	Create(req CreateRequest, createdBy uint) (*Response, error)
	List(p QueryParams) ([]Response, int64, error)
	Get(id uint) (*Response, error)
	Pay(id uint, req PaymentRequest, createdBy uint) (*Response, error)
}

type svc struct {
	db           *gorm.DB
	repo         Repository
	barangRepo   barang.Repository
	supplierRepo pemasok.Repository
	paymentSvc   pembayaran.Service
	ayRepo       repository.AcademicYearRepository
}

func NewService(
	db *gorm.DB,
	repo Repository,
	barangRepo barang.Repository,
	supplierRepo pemasok.Repository,
	paymentSvc pembayaran.Service,
	ayRepo repository.AcademicYearRepository,
) Service {
	return &svc{db: db, repo: repo, barangRepo: barangRepo, supplierRepo: supplierRepo, paymentSvc: paymentSvc, ayRepo: ayRepo}
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

func (s *svc) Create(req CreateRequest, createdBy uint) (*Response, error) {
	if _, err := s.ayRepo.FindByID(req.AcademicYearID); err != nil {
		return nil, errors.New("Tahun ajaran tidak ditemukan")
	}
	if _, err := s.supplierRepo.FindByID(req.SupplierID); err != nil {
		return nil, errors.New("Pemasok tidak ditemukan")
	}
	date, err := time.Parse("2006-01-02", req.PurchaseDate)
	if err != nil {
		return nil, errors.New("Format purchase_date tidak valid (YYYY-MM-DD)")
	}

	var purchaseID uint
	err = s.db.Transaction(func(tx *gorm.DB) error {
		var total float64
		items := make([]PurchaseItem, 0, len(req.Items))
		for _, it := range req.Items {
			prod, err := s.barangRepo.FindByIDWithTx(tx, it.ProductID)
			if err != nil {
				return errors.New("Barang tidak ditemukan")
			}
			sub := float64(it.Quantity) * it.UnitPrice
			total += sub
			items = append(items, PurchaseItem{
				ProductID: prod.ID, ProductName: prod.Name,
				Quantity: it.Quantity, UnitPrice: it.UnitPrice, Subtotal: sub,
			})
		}
		if req.InitialPayment > total {
			return errors.New("Pembayaran awal tidak boleh melebihi total")
		}
		paid := req.InitialPayment

		p := &Purchase{
			AcademicYearID:  req.AcademicYearID,
			SupplierID:      req.SupplierID,
			PurchaseDate:    date,
			ReferenceNumber: req.ReferenceNumber,
			TotalAmount:     total,
			PaidAmount:      paid,
			Status:          statusFor(paid, total),
			Notes:           req.Notes,
			CreatedBy:       createdBy,
			Items:           items,
		}
		if err := s.repo.CreateWithTx(p, tx); err != nil {
			return err
		}
		// Stok bertambah (restock). Harga modal TIDAK auto-update (D5).
		for _, it := range p.Items {
			if err := s.barangRepo.AdjustStockWithTx(tx, it.ProductID, it.Quantity); err != nil {
				return err
			}
		}
		// Pembayaran awal (uang keluar → kas koperasi debit).
		if paid > 0 {
			method := req.PaymentMethod
			if method == "" {
				method = "cash"
			}
			if err := s.paymentSvc.Record(tx, pembayaran.RecordInput{
				AcademicYearID: req.AcademicYearID, RefType: "purchase", RefID: p.ID, Direction: "out",
				Amount: paid, Date: date, Method: method, Category: "pembelian",
				Description: "Pembayaran pembelian", CreatedBy: createdBy,
			}); err != nil {
				return err
			}
		}
		purchaseID = p.ID
		return nil
	})
	if err != nil {
		return nil, err
	}
	return s.Get(purchaseID)
}

func (s *svc) Pay(id uint, req PaymentRequest, createdBy uint) (*Response, error) {
	p, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.New("Pembelian tidak ditemukan")
	}
	remaining := p.TotalAmount - p.PaidAmount
	if req.Amount > remaining {
		return nil, errors.New("Pembayaran melebihi sisa hutang")
	}
	date, err := time.Parse("2006-01-02", req.PaymentDate)
	if err != nil {
		return nil, errors.New("Format payment_date tidak valid (YYYY-MM-DD)")
	}

	err = s.db.Transaction(func(tx *gorm.DB) error {
		newPaid := p.PaidAmount + req.Amount
		if err := s.repo.UpdatePaymentWithTx(tx, p.ID, newPaid, statusFor(newPaid, p.TotalAmount)); err != nil {
			return err
		}
		method := req.Method
		if method == "" {
			method = "cash"
		}
		return s.paymentSvc.Record(tx, pembayaran.RecordInput{
			AcademicYearID: p.AcademicYearID, RefType: "purchase", RefID: p.ID, Direction: "out",
			Amount: req.Amount, Date: date, Method: method, Category: "pembelian",
			Description: "Pembayaran pembelian", Notes: req.Notes, CreatedBy: createdBy,
		})
	})
	if err != nil {
		return nil, err
	}
	return s.Get(id)
}

func (s *svc) List(p QueryParams) ([]Response, int64, error) {
	purchases, total, err := s.repo.FindAll(p)
	if err != nil {
		return nil, 0, err
	}
	out := make([]Response, 0, len(purchases))
	for _, pr := range purchases {
		out = append(out, toResponse(pr))
	}
	return out, total, nil
}

func (s *svc) Get(id uint) (*Response, error) {
	p, err := s.repo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("Pembelian tidak ditemukan")
		}
		return nil, err
	}
	resp := toResponse(*p)
	return &resp, nil
}
