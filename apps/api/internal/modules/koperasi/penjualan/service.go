package penjualan

import (
	"errors"
	"time"

	"api/internal/modules/koperasi/barang"
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
	db          *gorm.DB
	repo        Repository
	barangRepo  barang.Repository
	studentRepo repository.StudentRepository
	paymentSvc  pembayaran.Service
	ayRepo      repository.AcademicYearRepository
}

func NewService(
	db *gorm.DB,
	repo Repository,
	barangRepo barang.Repository,
	studentRepo repository.StudentRepository,
	paymentSvc pembayaran.Service,
	ayRepo repository.AcademicYearRepository,
) Service {
	return &svc{db: db, repo: repo, barangRepo: barangRepo, studentRepo: studentRepo, paymentSvc: paymentSvc, ayRepo: ayRepo}
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
	if req.StudentID != nil {
		if _, err := s.studentRepo.FindByID(*req.StudentID); err != nil {
			return nil, errors.New("Siswa tidak ditemukan")
		}
	}
	date, err := time.Parse("2006-01-02", req.SaleDate)
	if err != nil {
		return nil, errors.New("Format sale_date tidak valid (YYYY-MM-DD)")
	}

	var saleID uint
	err = s.db.Transaction(func(tx *gorm.DB) error {
		var total float64
		items := make([]SaleItem, 0, len(req.Items))
		for _, it := range req.Items {
			prod, err := s.barangRepo.FindByIDWithTx(tx, it.ProductID)
			if err != nil {
				return errors.New("Barang tidak ditemukan")
			}
			if prod.Stock < it.Quantity {
				return errors.New("Tidak bisa menjual, stok barang tidak mencukupi")
			}
			price := prod.SalePrice
			if it.UnitPrice != nil {
				price = *it.UnitPrice
			}
			sub := float64(it.Quantity) * price
			total += sub
			items = append(items, SaleItem{
				ProductID: prod.ID, ProductName: prod.Name,
				Quantity: it.Quantity, UnitPrice: price,
				UnitCost: prod.CostPrice, // snapshot HPP (D5)
				Subtotal: sub,
			})
		}
		if req.InitialPayment > total {
			return errors.New("Pembayaran awal tidak boleh melebihi total")
		}
		paid := req.InitialPayment

		sale := &Sale{
			AcademicYearID: req.AcademicYearID,
			StudentID:      req.StudentID,
			BuyerName:      req.BuyerName,
			SaleDate:       date,
			TotalAmount:    total,
			PaidAmount:     paid,
			Status:         statusFor(paid, total),
			Notes:          req.Notes,
			CreatedBy:      createdBy,
			Items:          items,
		}
		if err := s.repo.CreateWithTx(sale, tx); err != nil {
			return err
		}
		// Stok berkurang (stok-out).
		for _, it := range sale.Items {
			if err := s.barangRepo.AdjustStockWithTx(tx, it.ProductID, -it.Quantity); err != nil {
				return err
			}
		}
		// Pembayaran awal (uang masuk → kas koperasi credit).
		if paid > 0 {
			method := req.PaymentMethod
			if method == "" {
				method = "cash"
			}
			if err := s.paymentSvc.Record(tx, pembayaran.RecordInput{
				AcademicYearID: req.AcademicYearID, RefType: "sale", RefID: sale.ID, Direction: "in",
				Amount: paid, Date: date, Method: method, Category: "penjualan",
				Description: "Pembayaran penjualan", CreatedBy: createdBy,
			}); err != nil {
				return err
			}
		}
		saleID = sale.ID
		return nil
	})
	if err != nil {
		return nil, err
	}
	return s.Get(saleID)
}

func (s *svc) Pay(id uint, req PaymentRequest, createdBy uint) (*Response, error) {
	sale, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.New("Penjualan tidak ditemukan")
	}
	remaining := sale.TotalAmount - sale.PaidAmount
	if req.Amount > remaining {
		return nil, errors.New("Pembayaran melebihi sisa piutang")
	}
	date, err := time.Parse("2006-01-02", req.PaymentDate)
	if err != nil {
		return nil, errors.New("Format payment_date tidak valid (YYYY-MM-DD)")
	}

	err = s.db.Transaction(func(tx *gorm.DB) error {
		newPaid := sale.PaidAmount + req.Amount
		if err := s.repo.UpdatePaymentWithTx(tx, sale.ID, newPaid, statusFor(newPaid, sale.TotalAmount)); err != nil {
			return err
		}
		method := req.Method
		if method == "" {
			method = "cash"
		}
		return s.paymentSvc.Record(tx, pembayaran.RecordInput{
			AcademicYearID: sale.AcademicYearID, RefType: "sale", RefID: sale.ID, Direction: "in",
			Amount: req.Amount, Date: date, Method: method, Category: "penjualan",
			Description: "Pembayaran penjualan", Notes: req.Notes, CreatedBy: createdBy,
		})
	})
	if err != nil {
		return nil, err
	}
	return s.Get(id)
}

func (s *svc) List(p QueryParams) ([]Response, int64, error) {
	sales, total, err := s.repo.FindAll(p)
	if err != nil {
		return nil, 0, err
	}
	out := make([]Response, 0, len(sales))
	for _, sl := range sales {
		out = append(out, toResponse(sl))
	}
	return out, total, nil
}

func (s *svc) Get(id uint) (*Response, error) {
	sale, err := s.repo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("Penjualan tidak ditemukan")
		}
		return nil, err
	}
	resp := toResponse(*sale)
	return &resp, nil
}
