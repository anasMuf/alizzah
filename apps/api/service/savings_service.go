package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"api/utility"
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
	db          *gorm.DB
	savingsRepo repository.StudentSavingsRepository
	txnRepo     repository.SavingsTransactionRepository
	fcRepo      repository.FeeConfigRepository
	ayRepo      repository.AcademicYearRepository
	txnWriter   TransactionWriterService
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

	// Build map savingsID → type + filter list
	savingsTypeMap := make(map[uint]string, len(savingsList))
	savingsIDs := make([]uint, 0, len(savingsList))
	for _, sv := range savingsList {
		if params.Type != "" && sv.Type != params.Type {
			continue
		}
		savingsIDs = append(savingsIDs, sv.ID)
		savingsTypeMap[sv.ID] = sv.Type
	}

	if len(savingsIDs) == 0 {
		return []dto.SavingsTransactionResponse{}, &dto.Meta{Page: 1, Limit: 20, Total: 0}, nil
	}

	// Single batch query instead of N+1
	txns, err := s.txnRepo.FindBySavingsIDs(savingsIDs, params)
	if err != nil {
		return nil, nil, err
	}

	allTxns := make([]dto.SavingsTransactionResponse, 0, len(txns))
	for _, t := range txns {
		resp := dto.SavingsTransactionResponse{
			ID:              t.ID,
			SavingsType:     savingsTypeMap[t.StudentSavingsID],
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

	page, limit := utility.NormalizePagination(params.Page, params.Limit)
	meta := &dto.Meta{Page: page, Limit: limit, Total: int64(len(allTxns))}
	return allTxns, meta, nil
}

func (s *savingsService) GuardianWithdrawal(studentID, createdBy uint, req dto.SavingsWithdrawalRequest) (*dto.WithdrawalResponse, error) {
	var adminFee, netAmount, remainingBalance float64
	err := s.db.Transaction(func(tx *gorm.DB) error {
		// Layer 1: Lock row & baca saldo terkini
		savings, err := s.savingsRepo.FindByStudentAndTypeForUpdate(tx, studentID, "general")
		if err != nil {
			return errors.New("Tabungan umum siswa tidak ditemukan")
		}
		if req.Amount > savings.Balance {
			return fmt.Errorf("Saldo tidak mencukupi. Saldo: %.0f, Diminta: %.0f", savings.Balance, req.Amount)
		}

		// Baca konfigurasi dalam transaksi
		activeAY, err := s.ayRepo.FindActive()
		if err != nil {
			return errors.New("Tahun ajaran aktif tidak ditemukan")
		}

		adminRate := float64(0)
		fc, err := s.fcRepo.FindByAcademicYearID(activeAY.ID)
		if err == nil && fc != nil {
			adminRate = fc.SavingsAdminRate
		}

		adminFee = float64(0)
		if req.ApplyAdminFee {
			adminFee = req.Amount * (adminRate / 100)
		}
		netAmount = req.Amount - adminFee

		// Buat SavingsTransaction record
		stxn := &model.SavingsTransaction{
			StudentSavingsID: savings.ID,
			TransactionType:  "credit",
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

		// Layer 2: Optimistic locking — UPDATE balance hanya jika cukup
		if err := s.savingsRepo.SubtractBalance(tx, savings.ID, req.Amount); err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("Saldo tidak mencukupi atau terjadi transaksi bersamaan")
			}
			return err
		}

		remainingBalance = savings.Balance - req.Amount

		if err := s.txnWriter.WriteVaultDebit(activeAY.ID, time.Now(), netAmount, "savings_withdrawal", nil, fmt.Sprintf("Penarikan tabungan siswa ID:%d", studentID), createdBy, tx); err != nil {
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
	if level == "berlian" || level == "mutiara" {
		mandatory := &model.StudentSavings{StudentID: studentID, Type: "mandatory", Balance: 0}
		return s.savingsRepo.WithTx(tx).Create(mandatory)
	}
	return nil
}

func (s *savingsService) DebitMandatory(studentID uint, amount float64, sourceType string, sourceID *uint, notes string, createdBy uint, tx *gorm.DB) error {
	savings, err := s.savingsRepo.FindByStudentAndTypeForUpdate(tx, studentID, "mandatory")
	if err != nil {
		return errors.New("Tabungan wajib siswa tidak ditemukan")
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

	if err := s.savingsRepo.SubtractBalance(tx, savings.ID, amount); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("Saldo tabungan wajib tidak mencukupi")
		}
		return err
	}
	return nil
}

func (s *savingsService) CreditGeneral(studentID uint, amount float64, sourceType string, sourceID *uint, notes string, createdBy uint, tx *gorm.DB) error {
	savings, err := s.savingsRepo.FindByStudentAndTypeForUpdate(tx, studentID, "general")
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

	return s.savingsRepo.AddBalance(tx, savings.ID, amount)
}
