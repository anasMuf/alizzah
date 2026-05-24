package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"errors"
	"fmt"
	"time"

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

	page := params.Page
	if page < 1 {
		page = 1
	}
	limit := params.Limit
	if limit < 1 {
		limit = 20
	}

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
	if len(req.Items) == 0 && req.SavingsDeposit == 0 {
		return nil, errors.New("Minimal ada item pembayaran atau setoran tabungan")
	}

	student, err := s.studentRepo.FindByID(req.StudentID)
	if err != nil || student.Status != "active" {
		return nil, errors.New("Siswa tidak ditemukan atau tidak aktif")
	}

	if req.Source == "savings" {
		balance, _ := s.savingsRepo.GetBalance(req.StudentID, "general")
		totalItems := float64(0)
		for _, item := range req.Items {
			totalItems += item.Amount
		}
		if totalItems > balance {
			return nil, fmt.Errorf("Saldo tabungan tidak mencukupi. Saldo: %.0f, Dibutuhkan: %.0f", balance, totalItems)
		}
	}

	paymentDate, _ := time.Parse("2006-01-02", req.PaymentDate)

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

		// [B] Create payment record
		result = &model.Payment{
			StudentID:      req.StudentID,
			AcademicYearID: req.AcademicYearID,
			PaymentDate:    paymentDate,
			TotalAmount:    totalAmount,
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
			invoiceItem, _ := s.invoiceItemRepo.FindByID(item.InvoiceItemID)
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

		// [F] Cash source → WriteCashCredit
		if req.Source == "cash" && totalAmount > 0 {
			if err := s.txnWriter.WriteCashCredit(req.AcademicYearID, paymentDate, totalAmount, "payment", &result.ID, fmt.Sprintf("Pembayaran %s", student.FullName), createdBy, tx); err != nil {
				return err
			}
		}

		// [G] Savings source → debit general savings
		if req.Source == "savings" && totalAmount > 0 {
			savings, err := s.savingsRepo.FindByStudentAndType(req.StudentID, "general")
			if err != nil {
				return errors.New("Tabungan umum siswa tidak ditemukan")
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
			if err := s.savingsRepo.UpdateBalance(savings.ID, savings.Balance-totalAmount, tx); err != nil {
				return err
			}
			if err := s.txnWriter.WriteVaultDebit(req.AcademicYearID, paymentDate, totalAmount, "savings_withdrawal", &result.ID, fmt.Sprintf("Penggunaan tabungan %s", student.FullName), createdBy, tx); err != nil {
				return err
			}
		}

		// [H] Savings deposit
		if req.SavingsDeposit > 0 {
			savings, err := s.savingsRepo.FindByStudentAndType(req.StudentID, "general")
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
			if err := s.savingsRepo.UpdateBalance(savings.ID, savings.Balance+req.SavingsDeposit, tx); err != nil {
				return err
			}
			if err := s.txnWriter.WriteVaultCredit(req.AcademicYearID, paymentDate, req.SavingsDeposit, "savings_deposit", &result.ID, fmt.Sprintf("Setoran tabungan %s", student.FullName), createdBy, tx); err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	saved, _ := s.paymentRepo.FindByID(result.ID)
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
		ID:      p.ID,
		Student: mapPaymentStudentBrief(p.Student),
		PaymentDate: p.PaymentDate.Format("2006-01-02"),
		TotalAmount: p.TotalAmount,
		Source:      p.Source,
		CreatedBy:   dto.UserBriefResponse{ID: p.Creator.ID, FullName: p.Creator.FullName},
		CreatedAt:   p.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

func mapPaymentToDetailResponse(p model.Payment) dto.PaymentDetailResponse {
	resp := dto.PaymentDetailResponse{
		ID:      p.ID,
		Student: mapPaymentStudentBrief(p.Student),
		PaymentDate: p.PaymentDate.Format("2006-01-02"),
		TotalAmount: p.TotalAmount,
		Source:      p.Source,
		CreatedBy:   dto.UserBriefResponse{ID: p.Creator.ID, FullName: p.Creator.FullName},
		CreatedAt:   p.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
	if p.Notes != "" {
		resp.Notes = &p.Notes
	}
	var items []dto.PaymentItemResponse
	for _, item := range p.Items {
		items = append(items, dto.PaymentItemResponse{
			ID: item.ID, InvoiceItemID: item.InvoiceItemID, InvoiceItemName: item.InvoiceItem.Name, Amount: item.Amount,
		})
	}
	resp.Items = items
	return resp
}
