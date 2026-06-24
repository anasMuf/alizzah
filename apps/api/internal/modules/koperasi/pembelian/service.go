package pembelian

import (
	"errors"
	"fmt"
	"time"

	"api/internal/modules/koperasi/barang"
	"api/internal/modules/koperasi/pemasok"
	"api/internal/modules/koperasi/pembayaran"
	"api/model"
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

// resolveVariant menentukan varian sebuah item: pakai variant_id bila dikirim,
// kalau tidak resolve product_id → varian "Default" barang (kompatibilitas picker lama).
func (s *svc) resolveVariant(tx *gorm.DB, it CreateItemRequest) (*barang.Variant, error) {
	if it.VariantID != nil && *it.VariantID > 0 {
		v, err := s.barangRepo.FindVariantByIDWithTx(tx, *it.VariantID)
		if err != nil {
			return nil, errors.New("Varian barang tidak ditemukan")
		}
		return v, nil
	}
	if it.ProductID > 0 {
		v, err := s.barangRepo.DefaultVariantWithTx(tx, it.ProductID)
		if err != nil {
			return nil, errors.New("Barang tidak ditemukan")
		}
		return v, nil
	}
	return nil, errors.New("Item pembelian tidak valid: product_id atau variant_id wajib diisi")
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
			variant, err := s.resolveVariant(tx, it)
			if err != nil {
				return err
			}
			prod, err := s.barangRepo.FindByIDWithTx(tx, variant.ProductID)
			if err != nil {
				return errors.New("Barang tidak ditemukan")
			}
			sub := float64(it.Quantity) * it.UnitPrice
			total += sub
			items = append(items, PurchaseItem{
				ProductID: prod.ID, ProductName: prod.Name,
				VariantID: variant.ID, VariantName: variant.Name,
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
		// Stok bertambah (restock) di level varian. Harga modal TIDAK auto-update (D5).
		for _, it := range p.Items {
			if err := s.barangRepo.AdjustVariantStockWithTx(tx, it.VariantID, it.Quantity); err != nil {
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

			// Bridge: catat pengeluaran di tabel sekolah (expenses + cash_transactions)
			if err := s.recordSchoolExpense(tx, req.AcademicYearID, date, paid,
				fmt.Sprintf("Pembelian koperasi #%d: %s", p.ID, req.ReferenceNumber),
				createdBy); err != nil {
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
		if err := s.paymentSvc.Record(tx, pembayaran.RecordInput{
			AcademicYearID: p.AcademicYearID, RefType: "purchase", RefID: p.ID, Direction: "out",
			Amount: req.Amount, Date: date, Method: method, Category: "pembelian",
			Description: "Pembayaran pembelian", Notes: req.Notes, CreatedBy: createdBy,
		}); err != nil {
			return err
		}

		// Bridge: catat pengeluaran di tabel sekolah
		return s.recordSchoolExpense(tx, p.AcademicYearID, date, req.Amount,
			fmt.Sprintf("Pembayaran pembelian koperasi #%d", p.ID),
			createdBy)
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

// recordSchoolExpense mencatat pengeluaran di tabel sekolah (expenses + cash_transactions)
// sebagai jembatan agar transaksi koperasi muncul di laporan keuangan sekolah.
func (s *svc) recordSchoolExpense(tx *gorm.DB, academicYearID uint, date time.Time, amount float64, description string, createdBy uint) error {
	// Cari sub-kategori "Koperasi" yang sudah ada
	var kopCategory model.ExpenseCategory
	if err := tx.Where("name = ? AND parent_id IS NOT NULL", "Koperasi").First(&kopCategory).Error; err != nil {
		return fmt.Errorf("Sub-kategori 'Koperasi' tidak ditemukan: %w", err)
	}

	// Buat record expenses
	expense := model.Expense{
		AcademicYearID:    academicYearID,
		ExpenseCategoryID: kopCategory.ID,
		ExpenseDate:       date,
		Amount:            amount,
		Description:       description,
		CreatedBy:         createdBy,
	}
	if err := tx.Create(&expense).Error; err != nil {
		return fmt.Errorf("Gagal mencatat pengeluaran koperasi: %w", err)
	}

	// Buat cash_transactions debit (source_type = "expense" agar sinkron)
	cashTxn := model.CashTransaction{
		AcademicYearID:  academicYearID,
		TransactionDate: date,
		TransactionType: "debit",
		Amount:          amount,
		SourceType:      "expense",
		SourceID:        &expense.ID,
		Description:     description,
		CreatedBy:       createdBy,
	}
	if err := tx.Create(&cashTxn).Error; err != nil {
		return fmt.Errorf("Gagal mencatat transaksi kas koperasi: %w", err)
	}

	return nil
}
