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

			// If variant ID is nil, resolve to the first variant of this product.
			var variantID uint
			var variantName string
			var costPrice float64

			if item.KoperasiVariantID == nil {
				// Resolve variant automatically
				var activeVariant barang.Variant
				err := tx.Where("product_id = ? AND is_active = ?", *item.KoperasiProductID, true).
					Order("id ASC").
					First(&activeVariant).Error
				if err != nil {
					// Fallback to any variant if no active one found
					err = tx.Where("product_id = ?", *item.KoperasiProductID).
						Order("id ASC").
						First(&activeVariant).Error
				}
				if err == nil {
					variantID = activeVariant.ID
					variantName = activeVariant.Name
					costPrice = activeVariant.CostPrice
				}
			} else {
				// Fetch the specific variant
				var specificVariant barang.Variant
				if err := tx.First(&specificVariant, *item.KoperasiVariantID).Error; err == nil {
					variantID = specificVariant.ID
					variantName = specificVariant.Name
					costPrice = specificVariant.CostPrice
				}
			}

			if variantID > 0 {
				saleItem.VariantID = variantID
				saleItem.VariantName = variantName
				saleItem.UnitCost = costPrice

				// Decrease stock by 1
				if err := s.barangRepo.AdjustVariantStockWithTx(tx, variantID, -1); err != nil {
					return fmt.Errorf("gagal memotong stok varian: %w", err)
				}
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
