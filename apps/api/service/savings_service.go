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

type SavingsService interface {
	GetByStudentID(studentID uint) (*dto.StudentSavingsResponse, error)
	GetTransactions(studentID uint, params dto.SavingsTransactionQueryParams) ([]dto.SavingsTransactionResponse, *dto.Meta, error)
	GuardianWithdrawal(studentID, createdBy uint, req dto.SavingsWithdrawalRequest) (*dto.WithdrawalResponse, error)
	GetBalance(studentID uint, savingsType string) (float64, error)
	InitForNewStudent(studentID uint, level string, tx *gorm.DB) error
	// Internal — used by graduation service
	DebitMandatory(studentID uint, amount float64, sourceType string, sourceID *uint, notes string, createdBy uint, tx *gorm.DB) error
	CreditGeneral(studentID uint, amount float64, sourceType string, sourceID *uint, notes string, createdBy uint, tx *gorm.DB) error
}

type savingsService struct {
	db            *gorm.DB
	savingsRepo   repository.StudentSavingsRepository
	txnRepo       repository.SavingsTransactionRepository
	fcRepo        repository.FeeConfigRepository
	ayRepo        repository.AcademicYearRepository
	txnWriter     TransactionWriterService
}

func NewSavingsService(
	db *gorm.DB,
	savingsRepo repository.StudentSavingsRepository,
	txnRepo repository.SavingsTransactionRepository,
	fcRepo repository.FeeConfigRepository,
	ayRepo repository.AcademicYearRepository,
	txnWriter TransactionWriterService,
) SavingsService {
	return &savingsService{
		db:          db,
		savingsRepo: savingsRepo,
		txnRepo:     txnRepo,
		fcRepo:      fcRepo,
		ayRepo:      ayRepo,
		txnWriter:   txnWriter,
	}
}

func (s *savingsService) GetByStudentID(studentID uint) (*dto.StudentSavingsResponse, error) {
	savingsList, err := s.savingsRepo.FindByStudentID(studentID)
	if err != nil {
		return nil, err
	}

	resp := &dto.StudentSavingsResponse{}
	for _, sv := range savingsList {
		br := &dto.SavingsBalanceResponse{
			ID:      sv.ID,
			Type:    sv.Type,
			Balance: sv.Balance,
		}
		if sv.Type == "general" {
			resp.General = br
		} else if sv.Type == "mandatory" {
			resp.Mandatory = br
		}
	}

	return resp, nil
}

func (s *savingsService) GetTransactions(studentID uint, params dto.SavingsTransactionQueryParams) ([]dto.SavingsTransactionResponse, *dto.Meta, error) {
	savingsList, err := s.savingsRepo.FindByStudentID(studentID)
	if err != nil {
		return nil, nil, err
	}

	var allTxns []dto.SavingsTransactionResponse
	var total int64

	for _, sv := range savingsList {
		if params.Type != "" && sv.Type != params.Type {
			continue
		}
		txns, count, err := s.txnRepo.FindByStudentSavingsID(sv.ID, params)
		if err != nil {
			return nil, nil, err
		}
		total += count
		for _, t := range txns {
			resp := dto.SavingsTransactionResponse{
				ID:              t.ID,
				SavingsType:     sv.Type,
				TransactionType: t.TransactionType,
				Amount:          t.Amount,
				AdminFee:        t.AdminFee,
				NetAmount:       t.NetAmount,
				SourceType:      t.SourceType,
				CreatedAt:       t.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			}
			if t.Notes != "" {
				resp.Notes = &t.Notes
			}
			allTxns = append(allTxns, resp)
		}
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
	return allTxns, meta, nil
}

func (s *savingsService) GuardianWithdrawal(studentID, createdBy uint, req dto.SavingsWithdrawalRequest) (*dto.WithdrawalResponse, error) {
	savings, err := s.savingsRepo.FindByStudentAndType(studentID, "general")
	if err != nil {
		return nil, errors.New("Tabungan umum siswa tidak ditemukan")
	}

	if req.Amount > savings.Balance {
		return nil, fmt.Errorf("Saldo tidak mencukupi. Saldo: %.0f, Diminta: %.0f", savings.Balance, req.Amount)
	}

	// Get active academic year for fee config
	activeAY, err := s.ayRepo.FindActive()
	if err != nil {
		return nil, errors.New("Tahun ajaran aktif tidak ditemukan")
	}

	// Get savings_admin_rate from fee_config
	adminRate := float64(0)
	fc, err := s.fcRepo.FindByAcademicYearID(activeAY.ID)
	if err == nil && fc != nil {
		adminRate = fc.SavingsAdminRate
	}

	adminFee := req.Amount * (adminRate / 100)
	netAmount := req.Amount - adminFee
	now := time.Now()

	var remainingBalance float64
	err = s.db.Transaction(func(tx *gorm.DB) error {
		stxn := &model.SavingsTransaction{
			StudentSavingsID: savings.ID,
			TransactionType:  "debit",
			Amount:           req.Amount,
			AdminFee:         adminFee,
			NetAmount:        netAmount,
			SourceType:       "guardian_withdrawal",
			Notes:            req.Notes,
			CreatedBy:        createdBy,
		}
		if err := s.txnRepo.CreateWithTx(stxn, tx); err != nil {
			return err
		}

		remainingBalance = savings.Balance - req.Amount
		if err := s.savingsRepo.UpdateBalance(savings.ID, remainingBalance, tx); err != nil {
			return err
		}

		if err := s.txnWriter.WriteVaultDebit(activeAY.ID, now, netAmount, "savings_withdrawal", nil, fmt.Sprintf("Penarikan tabungan siswa ID:%d", studentID), createdBy, tx); err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return &dto.WithdrawalResponse{
		Amount:           req.Amount,
		AdminFee:         adminFee,
		NetAmount:        netAmount,
		RemainingBalance: remainingBalance,
	}, nil
}

func (s *savingsService) GetBalance(studentID uint, savingsType string) (float64, error) {
	return s.savingsRepo.GetBalance(studentID, savingsType)
}

func (s *savingsService) InitForNewStudent(studentID uint, level string, tx *gorm.DB) error {
	general := &model.StudentSavings{StudentID: studentID, Type: "general", Balance: 0}
	if err := s.savingsRepo.WithTx(tx).Create(general); err != nil {
		return err
	}
	if level == "berlian" {
		mandatory := &model.StudentSavings{StudentID: studentID, Type: "mandatory", Balance: 0}
		return s.savingsRepo.WithTx(tx).Create(mandatory)
	}
	return nil
}

func (s *savingsService) DebitMandatory(studentID uint, amount float64, sourceType string, sourceID *uint, notes string, createdBy uint, tx *gorm.DB) error {
	savings, err := s.savingsRepo.FindByStudentAndType(studentID, "mandatory")
	if err != nil {
		return errors.New("Tabungan wajib siswa tidak ditemukan")
	}

	stxn := &model.SavingsTransaction{
		StudentSavingsID: savings.ID,
		TransactionType:  "debit",
		Amount:           amount,
		NetAmount:        amount,
		SourceType:       sourceType,
		SourceID:         sourceID,
		Notes:            notes,
		CreatedBy:        createdBy,
	}
	if err := s.txnRepo.CreateWithTx(stxn, tx); err != nil {
		return err
	}

	return s.savingsRepo.UpdateBalance(savings.ID, savings.Balance-amount, tx)
}

func (s *savingsService) CreditGeneral(studentID uint, amount float64, sourceType string, sourceID *uint, notes string, createdBy uint, tx *gorm.DB) error {
	savings, err := s.savingsRepo.FindByStudentAndType(studentID, "general")
	if err != nil {
		return errors.New("Tabungan umum siswa tidak ditemukan")
	}

	stxn := &model.SavingsTransaction{
		StudentSavingsID: savings.ID,
		TransactionType:  "credit",
		Amount:           amount,
		NetAmount:        amount,
		SourceType:       sourceType,
		SourceID:         sourceID,
		Notes:            notes,
		CreatedBy:        createdBy,
	}
	if err := s.txnRepo.CreateWithTx(stxn, tx); err != nil {
		return err
	}

	return s.savingsRepo.UpdateBalance(savings.ID, savings.Balance+amount, tx)
}
