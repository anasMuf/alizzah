package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"api/utility"
	"errors"
	"fmt"

	"gorm.io/gorm"
)

type PaymentService interface {
	GetAll(params dto.PaymentQueryParams) ([]dto.PaymentListResponse, *dto.Meta, error)
	GetByID(id uint) (*dto.PaymentDetailResponse, error)
	GetByStudentID(studentID uint, params dto.StudentPaymentQueryParams) ([]dto.PaymentListResponse, error)
	Create(createdBy uint, req dto.CreatePaymentRequest) (*dto.PaymentDetailResponse, error)
}

type paymentService struct {
	db              *gorm.DB
	paymentRepo     repository.PaymentRepository
	paymentItemRepo repository.PaymentItemRepository
	invoiceItemRepo repository.InvoiceItemRepository
	invoiceService  InvoiceService
	savingsRepo     repository.StudentSavingsRepository
	savingsTxnRepo  repository.SavingsTransactionRepository
	studentRepo     repository.StudentRepository
	txnWriter       TransactionWriterService
	koperasiSeam    KoperasiSeamService
}

func NewPaymentService(
	db *gorm.DB,
	paymentRepo repository.PaymentRepository,
	paymentItemRepo repository.PaymentItemRepository,
	invoiceItemRepo repository.InvoiceItemRepository,
	invoiceService InvoiceService,
	savingsRepo repository.StudentSavingsRepository,
	savingsTxnRepo repository.SavingsTransactionRepository,
	studentRepo repository.StudentRepository,
	txnWriter TransactionWriterService,
	koperasiSeam KoperasiSeamService,
) PaymentService {
	return &paymentService{
		db:              db,
		paymentRepo:     paymentRepo,
		paymentItemRepo: paymentItemRepo,
		invoiceItemRepo: invoiceItemRepo,
		invoiceService:  invoiceService,
		savingsRepo:     savingsRepo,
		savingsTxnRepo:  savingsTxnRepo,
		studentRepo:     studentRepo,
		txnWriter:       txnWriter,
		koperasiSeam:    koperasiSeam,
	}
}

func (s *paymentService) GetAll(params dto.PaymentQueryParams) ([]dto.PaymentListResponse, *dto.Meta, error) {
	payments, total, err := s.paymentRepo.FindAll(params)
	if err != nil {
		return nil, nil, err
	}

	var responses []dto.PaymentListResponse
	for _, p := range payments {
		responses = append(responses, mapPaymentToListResponse(p))
	}

	page, limit := utility.NormalizePagination(params.Page, params.Limit)

	meta := &dto.Meta{Page: page, Limit: limit, Total: total}
	return responses, meta, nil
}

func (s *paymentService) GetByID(id uint) (*dto.PaymentDetailResponse, error) {
	payment, err := s.paymentRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("Pembayaran tidak ditemukan")
		}
		return nil, err
	}
	resp := mapPaymentToDetailResponse(*payment)
	return &resp, nil
}

func (s *paymentService) GetByStudentID(studentID uint, params dto.StudentPaymentQueryParams) ([]dto.PaymentListResponse, error) {
	payments, err := s.paymentRepo.FindByStudentID(studentID, params)
	if err != nil {
		return nil, err
	}
	var responses []dto.PaymentListResponse
	for _, p := range payments {
		responses = append(responses, mapPaymentToListResponse(p))
	}
	return responses, nil
}

func (s *paymentService) Create(createdBy uint, req dto.CreatePaymentRequest) (*dto.PaymentDetailResponse, error) {
	if len(req.Items) == 0 && len(req.IncidentalItems) == 0 && req.SavingsDeposit == 0 {
		return nil, errors.New("Minimal ada item pembayaran, item insidental, atau setoran tabungan")
	}

	student, err := s.studentRepo.FindByID(req.StudentID)
	if err != nil || student.Status != "active" {
		return nil, errors.New("Siswa tidak ditemukan atau tidak aktif")
	}

	paymentDate, err := utility.ParseDate(req.PaymentDate)
	if err != nil {
		return nil, fmt.Errorf("Format payment_date tidak valid (YYYY-MM-DD): %w", err)
	}

	var result *model.Payment
	err = s.db.Transaction(func(tx *gorm.DB) error {
		// [A] Validate and collect invoice items
		totalAmount := float64(0)
		invoiceIDs := map[uint]bool{}
		var paymentItems []model.PaymentItem

		for _, item := range req.Items {
			invoiceItem, err := s.invoiceItemRepo.FindByID(item.InvoiceItemID)
			if err != nil {
				return fmt.Errorf("Item tagihan %d tidak ditemukan", item.InvoiceItemID)
			}
			remaining := invoiceItem.Amount - invoiceItem.PaidAmount
			if item.Amount > remaining {
				return fmt.Errorf("Jumlah pembayaran item '%s' melebihi sisa tagihan (sisa: %.0f)", invoiceItem.Name, remaining)
			}
			totalAmount += item.Amount
			invoiceIDs[invoiceItem.InvoiceID] = true
			paymentItems = append(paymentItems, model.PaymentItem{
				InvoiceItemID: item.InvoiceItemID,
				Amount:        item.Amount,
			})
		}

		// [A2] Process incidental items → buat invoice insidental + item, langsung lunas
		if len(req.IncidentalItems) > 0 {
			incidentalInvoice := &model.Invoice{
				StudentID:      req.StudentID,
				AcademicYearID: req.AcademicYearID,
				Type:           "incidental",
				Status:         "unpaid",
				TotalAmount:    0,
				PaidAmount:     0,
				Notes:          "Invoice insidental dari pembayaran",
			}
			if err := tx.Create(incidentalInvoice).Error; err != nil {
				return fmt.Errorf("Gagal membuat invoice insidental: %v", err)
			}

			txItemRepo := s.invoiceItemRepo.WithTx(tx)
			for _, incItem := range req.IncidentalItems {
				invoiceItem := &model.InvoiceItem{
					InvoiceID:   incidentalInvoice.ID,
					Name:        incItem.Name,
					Category:    "incidental",
					Amount:      incItem.Amount,
					PaidAmount:  incItem.Amount,
					Status:      "paid",
					IsMandatory: false,
				}
				if err := txItemRepo.Create(invoiceItem); err != nil {
					return fmt.Errorf("Gagal membuat item insidental '%s': %v", incItem.Name, err)
				}

				paymentItems = append(paymentItems, model.PaymentItem{
					InvoiceItemID: invoiceItem.ID,
					Amount:        incItem.Amount,
				})
				totalAmount += incItem.Amount
			}

			invoiceIDs[incidentalInvoice.ID] = true
		}

		// [B] Create payment record
		result = &model.Payment{
			StudentID:      req.StudentID,
			AcademicYearID: req.AcademicYearID,
			PaymentDate:    paymentDate,
			TotalAmount:    totalAmount,
			SavingsDeposit: req.SavingsDeposit,
			Source:         req.Source,
			Notes:          req.Notes,
			CreatedBy:      createdBy,
		}
		if err := s.paymentRepo.WithTx(tx).Create(result); err != nil {
			return err
		}

		// [C] Create payment items
		for i := range paymentItems {
			paymentItems[i].PaymentID = result.ID
		}
		if err := s.paymentItemRepo.WithTx(tx).BulkCreate(paymentItems); err != nil {
			return err
		}

		// [D] Update invoice items
		for _, item := range req.Items {
			invoiceItem, err := s.invoiceItemRepo.FindByID(item.InvoiceItemID)
			if err != nil {
				return fmt.Errorf("gagal mengambil item tagihan %d: %w", item.InvoiceItemID, err)
			}
			newPaid := invoiceItem.PaidAmount + item.Amount
			newStatus := "partial"
			if newPaid >= invoiceItem.Amount {
				newStatus = "paid"
			}
			if err := s.invoiceItemRepo.WithTx(tx).UpdatePaidAmount(item.InvoiceItemID, newPaid, newStatus); err != nil {
				return err
			}
		}

		// [E] Update invoice status
		for invoiceID := range invoiceIDs {
			if err := s.invoiceService.UpdateInvoiceStatus(invoiceID, tx); err != nil {
				return err
			}
		}

		// [F] Cash source → WriteCashCredit (invoice items + savings deposit)
		if req.Source == "cash" && (totalAmount > 0 || req.SavingsDeposit > 0) {
			cashAmount := totalAmount + req.SavingsDeposit
			desc := fmt.Sprintf("Pembayaran %s", student.FullName)
			if totalAmount == 0 && req.SavingsDeposit > 0 {
				desc = fmt.Sprintf("Setoran tabungan %s", student.FullName)
			}
			if err := s.txnWriter.WriteCashCredit(req.AcademicYearID, paymentDate, cashAmount, "payment", &result.ID, desc, createdBy, tx); err != nil {
				return err
			}
		}

		// [G] Savings source → debit general savings
		if req.Source == "savings" && totalAmount > 0 {
			savings, err := s.savingsRepo.FindByStudentAndTypeForUpdate(tx, req.StudentID, "general")
			if err != nil {
				return errors.New("Tabungan umum siswa tidak ditemukan")
			}
			if totalAmount > savings.Balance {
				return fmt.Errorf("Saldo tabungan tidak mencukupi. Saldo: %.0f, Dibutuhkan: %.0f", savings.Balance, totalAmount)
			}
			stxn := &model.SavingsTransaction{
				StudentSavingsID: savings.ID,
				TransactionType:  "debit",
				Amount:           totalAmount,
				NetAmount:        totalAmount,
				SourceType:       "payment_usage",
				SourceID:         &result.ID,
				Notes:            "Pembayaran dari tabungan umum",
				CreatedBy:        createdBy,
			}
			if err := s.savingsTxnRepo.CreateWithTx(stxn, tx); err != nil {
				return err
			}
			if err := s.savingsRepo.DebitBalance(tx, savings.ID, totalAmount); err != nil {
				return fmt.Errorf("gagal mendebit tabungan: %w", err)
			}
			if err := s.txnWriter.WriteVaultDebit(req.AcademicYearID, paymentDate, totalAmount, "savings_withdrawal", &result.ID, fmt.Sprintf("Penggunaan tabungan %s", student.FullName), createdBy, tx); err != nil {
				return err
			}
		}

		// [H] Savings deposit
		if req.SavingsDeposit > 0 {
			savings, err := s.savingsRepo.FindByStudentAndTypeForUpdate(tx, req.StudentID, "general")
			if err != nil {
				// Create if not exists
				savings = &model.StudentSavings{StudentID: req.StudentID, Type: "general", Balance: 0}
				if err := s.savingsRepo.WithTx(tx).Create(savings); err != nil {
					return err
				}
			}
			stxn := &model.SavingsTransaction{
				StudentSavingsID: savings.ID,
				TransactionType:  "credit",
				Amount:           req.SavingsDeposit,
				NetAmount:        req.SavingsDeposit,
				SourceType:       "payment_deposit",
				SourceID:         &result.ID,
				Notes:            "Setoran tabungan",
				CreatedBy:        createdBy,
			}
			if err := s.savingsTxnRepo.CreateWithTx(stxn, tx); err != nil {
				return err
			}
			if err := s.savingsRepo.CreditBalance(tx, savings.ID, req.SavingsDeposit); err != nil {
				return fmt.Errorf("gagal mengkredit tabungan: %w", err)
			}
			if err := s.txnWriter.WriteVaultCredit(req.AcademicYearID, paymentDate, req.SavingsDeposit, "savings_deposit", &result.ID, fmt.Sprintf("Setoran tabungan %s", student.FullName), createdBy, tx); err != nil {
				return err
			}
			// Transfer dari kas ke brangkas agar uang tidak double-count
			if err := s.txnWriter.WriteCashDebit(req.AcademicYearID, paymentDate, req.SavingsDeposit, "transfer_to_vault", &result.ID, fmt.Sprintf("Transfer ke brangkas: setoran %s", student.FullName), createdBy, tx); err != nil {
				return err
			}
		}

		// [G-Koperasi] Seam: deteksi item koperasi yang terbayar → catat penjualan + kas koperasi
		if s.koperasiSeam != nil {
			var koperasiItems []KoperasiPaymentItem
			txInvoiceItemRepo := s.invoiceItemRepo.WithTx(tx)
			for _, item := range req.Items {
				invoiceItem, _ := txInvoiceItemRepo.FindByID(item.InvoiceItemID)
				if invoiceItem != nil && invoiceItem.IsKoperasi {
					koperasiItems = append(koperasiItems, KoperasiPaymentItem{
						InvoiceItemID:     item.InvoiceItemID,
						Amount:            item.Amount,
						IsKoperasi:        true,
						KoperasiProductID: invoiceItem.KoperasiProductID,
						KoperasiVariantID: invoiceItem.KoperasiVariantID,
						ItemName:          invoiceItem.Name,
					})
				}
			}
			if len(koperasiItems) > 0 {
				if err := s.koperasiSeam.ProcessPaymentItems(
					tx, result.ID, req.StudentID, req.AcademicYearID,
					paymentDate, koperasiItems, createdBy,
				); err != nil {
					return err
				}

				// Hitung total porsi koperasi
				koperasiTotal := float64(0)
				for _, ki := range koperasiItems {
					koperasiTotal += ki.Amount
				}

				if koperasiTotal > 0 {
					// Cari sub-kategori "Koperasi" yang sudah ada untuk dicatat di tabel expenses
					var kopCategory model.ExpenseCategory
					if err := tx.Where("name = ? AND parent_id IS NOT NULL", "Koperasi").First(&kopCategory).Error; err != nil {
						return fmt.Errorf("Sub-kategori 'Koperasi' tidak ditemukan: %w", err)
					}

					// Buat record expenses agar muncul di laporan pengeluaran sekolah
					expense := model.Expense{
						AcademicYearID:    req.AcademicYearID,
						ExpenseCategoryID: kopCategory.ID,
						ExpenseDate:       paymentDate,
						Amount:            koperasiTotal,
						Description:       fmt.Sprintf("Transfer porsi Koperasi via Pembayaran %s", student.FullName),
						CreatedBy:         createdBy,
					}
					if err := tx.Create(&expense).Error; err != nil {
						return fmt.Errorf("Gagal mencatat pengeluaran koperasi: %w", err)
					}

					// Catat pengeluaran di cash_transactions dengan source_type "expense"
					// agar sinkron dengan record expenses di atas
					desc := fmt.Sprintf("Transfer porsi Koperasi via Pembayaran %s", student.FullName)
					if req.Source == "cash" {
						if err := s.txnWriter.WriteCashDebit(req.AcademicYearID, paymentDate, koperasiTotal, "expense", &expense.ID, desc, createdBy, tx); err != nil {
							return err
						}
					} else if req.Source == "savings" {
						if err := s.txnWriter.WriteVaultDebit(req.AcademicYearID, paymentDate, koperasiTotal, "expense", &expense.ID, desc, createdBy, tx); err != nil {
							return err
						}
					}
				}
			}
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	saved, err := s.paymentRepo.FindByID(result.ID)
	if err != nil {
		return nil, fmt.Errorf("gagal mengambil data pembayaran: %w", err)
	}
	resp := mapPaymentToDetailResponse(*saved)
	return &resp, nil
}

// Mappers
func mapPaymentStudentBrief(s model.Student) dto.StudentBriefResponse {
	brief := dto.StudentBriefResponse{
		ID: s.ID, FullName: s.FullName, Gender: s.Gender, Status: s.Status,
	}
	for _, enr := range s.Enrollments {
		if enr.Status == "active" {
			brief.ActiveEnrollment = &dto.EnrollmentBriefForStudent{
				ClassGroupID: enr.ClassGroupID,
				ClassGroup: dto.ClassGroupBriefResponse{
					ID: enr.ClassGroup.ID, Name: enr.ClassGroup.Name, Level: enr.ClassGroup.Level,
				},
			}
			break
		}
	}
	return brief
}

func mapPaymentToListResponse(p model.Payment) dto.PaymentListResponse {
	return dto.PaymentListResponse{
		ID:             p.ID,
		Student:        mapPaymentStudentBrief(p.Student),
		PaymentDate:    p.PaymentDate.Format("2006-01-02"),
		TotalAmount:    p.TotalAmount,
		SavingsDeposit: p.SavingsDeposit,
		Source:         p.Source,
		CreatedBy:      dto.UserBriefResponse{ID: p.Creator.ID, FullName: p.Creator.FullName},
		CreatedAt:      p.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

func mapPaymentToDetailResponse(p model.Payment) dto.PaymentDetailResponse {
	resp := dto.PaymentDetailResponse{
		ID:             p.ID,
		Student:        mapPaymentStudentBrief(p.Student),
		PaymentDate:    p.PaymentDate.Format("2006-01-02"),
		TotalAmount:    p.TotalAmount,
		SavingsDeposit: p.SavingsDeposit,
		Source:         p.Source,
		CreatedBy:      dto.UserBriefResponse{ID: p.Creator.ID, FullName: p.Creator.FullName},
		CreatedAt:      p.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
	if p.Notes != "" {
		resp.Notes = &p.Notes
	}
	var items []dto.PaymentItemResponse
	for _, item := range p.Items {
		items = append(items, dto.PaymentItemResponse{
			ID: item.ID, InvoiceItemID: item.InvoiceItemID, InvoiceItemName: item.InvoiceItem.Name, Category: item.InvoiceItem.Category, Amount: item.Amount,
		})
	}
	resp.Items = items
	return resp
}
