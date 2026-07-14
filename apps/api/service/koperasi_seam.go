package service

import (
	"fmt"
	"time"

	"api/internal/modules/koperasi/barang"
	"api/internal/modules/koperasi/kas"
	"api/internal/modules/koperasi/pembayaran"
	"api/internal/modules/koperasi/penjualan"
	"api/model"

	"gorm.io/gorm"
)

type KoperasiPaymentItem struct {
	InvoiceItemID     uint
	Amount            float64 // jumlah yang terbayar untuk item ini
	IsKoperasi        bool
	KoperasiProductID *uint
	KoperasiVariantID *uint
	ItemName          string
}

type KoperasiSeamService interface {
	ProcessPaymentItems(tx *gorm.DB, paymentID uint, studentID uint,
		academicYearID uint, paymentDate time.Time,
		items []KoperasiPaymentItem, createdBy uint) error
	ReversePaymentItems(tx *gorm.DB, paymentID uint) error
}

type koperasiSeamService struct {
	db         *gorm.DB
	kasWriter  kas.Writer
	barangRepo barang.Repository
}

func NewKoperasiSeamService(db *gorm.DB, kasWriter kas.Writer, barangRepo barang.Repository) KoperasiSeamService {
	return &koperasiSeamService{
		db:         db,
		kasWriter:  kasWriter,
		barangRepo: barangRepo,
	}
}

func (s *koperasiSeamService) ProcessPaymentItems(tx *gorm.DB, paymentID uint, studentID uint,
	academicYearID uint, paymentDate time.Time,
	items []KoperasiPaymentItem, createdBy uint) error {

	if len(items) == 0 {
		return nil
	}

	// 1. Get student's name
	var student model.Student
	if err := tx.First(&student, studentID).Error; err != nil {
		return fmt.Errorf("gagal mengambil data siswa: %w", err)
	}

	totalAmount := 0.0
	for _, item := range items {
		totalAmount += item.Amount
	}

	// 2. Create the Sale
	sale := &penjualan.Sale{
		AcademicYearID: academicYearID,
		StudentID:      &studentID,
		PaymentID:      &paymentID,
		BuyerName:      student.FullName,
		SaleDate:       paymentDate,
		TotalAmount:    totalAmount,
		PaidAmount:     totalAmount,
		Status:         "paid",
		Source:         "registrasi",
		Notes:          fmt.Sprintf("Otomatis dari pembayaran registrasi/SPP (Payment ID: %d)", paymentID),
		CreatedBy:      createdBy,
	}

	if err := tx.Create(sale).Error; err != nil {
		return fmt.Errorf("gagal mencatat penjualan koperasi: %w", err)
	}

	// 3. Process each item as a SaleItem
	for _, item := range items {
		saleItem := &penjualan.SaleItem{
			SaleID:      sale.ID,
			ProductName: item.ItemName,
			Quantity:    1,
			UnitPrice:   item.Amount,
			Subtotal:    item.Amount,
		}

		if item.KoperasiProductID != nil {
			saleItem.ProductID = *item.KoperasiProductID

			// Resolve variant: pakai KoperasiVariantID bila dikirim, kalau tidak
			// resolve otomatis via DefaultVariantWithTx (varian aktif pertama).
			var variantID uint
			var variantName string
			var costPrice float64

			if item.KoperasiVariantID != nil && *item.KoperasiVariantID > 0 {
				v, err := s.barangRepo.FindVariantByIDWithTx(tx, *item.KoperasiVariantID)
				if err != nil {
					return fmt.Errorf("varian koperasi (id=%d) tidak ditemukan: %w", *item.KoperasiVariantID, err)
				}
				variantID = v.ID
				variantName = v.Name
				costPrice = v.CostPrice
			} else {
				v, err := s.barangRepo.DefaultVariantWithTx(tx, *item.KoperasiProductID)
				if err != nil {
					// Fallback: cari varian non-aktif sekalipun
					var fallback barang.Variant
					if err2 := tx.Where("product_id = ?", *item.KoperasiProductID).
						Order("id ASC").First(&fallback).Error; err2 != nil {
						return fmt.Errorf("barang koperasi (product_id=%d) tidak memiliki varian: %w", *item.KoperasiProductID, err)
					}
					variantID = fallback.ID
					variantName = fallback.Name
					costPrice = fallback.CostPrice
				} else {
					variantID = v.ID
					variantName = v.Name
					costPrice = v.CostPrice
				}
			}

			saleItem.VariantID = variantID
			saleItem.VariantName = variantName
			saleItem.UnitCost = costPrice

			// Kurangi stok
			if err := s.barangRepo.AdjustVariantStockWithTx(tx, variantID, -1); err != nil {
				return fmt.Errorf("gagal memotong stok varian: %w", err)
			}
		}

		if err := tx.Create(saleItem).Error; err != nil {
			return fmt.Errorf("gagal membuat item penjualan: %w", err)
		}
	}

	// 4. Record payment & write cash transaction using pembayaran.Service
	kopPaymentRepo := pembayaran.NewRepository(s.db)
	kopPaymentSvc := pembayaran.NewService(kopPaymentRepo, s.kasWriter)

	input := pembayaran.RecordInput{
		AcademicYearID: academicYearID,
		RefType:        "sale",
		RefID:          sale.ID,
		Direction:      "in",
		Amount:         totalAmount,
		Date:           paymentDate,
		Method:         "cash",
		Category:       "penjualan",
		Description:    fmt.Sprintf("Penjualan koperasi via registrasi %s", student.FullName),
		CreatedBy:      createdBy,
	}

	if err := kopPaymentSvc.Record(tx, input); err != nil {
		return fmt.Errorf("gagal mencatat pembayaran kas koperasi: %w", err)
	}

	return nil
}

// ReversePaymentItems membatalkan seluruh efek koperasi dari satu payment.
// Mencakup: hapus sale items, kembalikan stok variant, hapus koperasi payments,
// hapus koperasi cash transactions, hapus sales.
func (s *koperasiSeamService) ReversePaymentItems(tx *gorm.DB, paymentID uint) error {
	// 1. Cari semua Sale dengan payment_id = paymentID
	var sales []penjualan.Sale
	if err := tx.Where("payment_id = ?", paymentID).Find(&sales).Error; err != nil {
		return fmt.Errorf("gagal mencari sale koperasi: %w", err)
	}
	if len(sales) == 0 {
		return nil
	}

	for _, sale := range sales {
		// 2. Ambil sale items untuk restore stok
		var saleItems []penjualan.SaleItem
		if err := tx.Where("sale_id = ?", sale.ID).Find(&saleItems).Error; err != nil {
			return fmt.Errorf("gagal mengambil sale items: %w", err)
		}

		// 3. Kembalikan stok (+1) untuk setiap variant
		for _, si := range saleItems {
			if si.VariantID > 0 {
				if err := s.barangRepo.AdjustVariantStockWithTx(tx, si.VariantID, 1); err != nil {
					return fmt.Errorf("gagal mengembalikan stok varian %d: %w", si.VariantID, err)
				}
			}
		}

		// 4. Hapus sale items
		if err := tx.Where("sale_id = ?", sale.ID).Delete(&penjualan.SaleItem{}).Error; err != nil {
			return fmt.Errorf("gagal menghapus sale items: %w", err)
		}

		// 5. Hapus koperasi payment records (ref_type=sale, ref_id=sale.ID)
		if err := tx.Where("ref_type = ? AND ref_id = ?", "sale", sale.ID).
			Delete(&pembayaran.Payment{}).Error; err != nil {
			return fmt.Errorf("gagal menghapus koperasi payment: %w", err)
		}

		// 6. Hapus koperasi cash transactions (source_type=sale_payment, source_id=sale.ID)
		if err := tx.Where("source_type = ? AND source_id = ?", "sale_payment", sale.ID).
			Delete(&kas.CashTransaction{}).Error; err != nil {
			return fmt.Errorf("gagal menghapus koperasi cash txn: %w", err)
		}

		// 7. Hapus sale
		if err := tx.Delete(&sale).Error; err != nil {
			return fmt.Errorf("gagal menghapus sale koperasi: %w", err)
		}
	}

	return nil
}
