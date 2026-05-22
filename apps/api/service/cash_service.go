package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"fmt"
	"time"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type CashService interface {
	GetBalance(academicYearID uint) (*dto.CashBalanceResponse, error)
	GetTransactions(params dto.CashTransactionQueryParams) ([]dto.CashTransactionResponse, *dto.Meta, error)
	TransferToVault(createdBy uint, req dto.TransferToCashRequest, academicYearID uint) error
}

type cashService struct {
	db       *gorm.DB
	cashRepo repository.CashTransactionRepository
	txWriter TransactionWriterService
}

func NewCashService(db *gorm.DB, cashRepo repository.CashTransactionRepository, txWriter TransactionWriterService) CashService {
	return &cashService{
		db:       db,
		cashRepo: cashRepo,
		txWriter: txWriter,
	}
}

func (s *cashService) GetBalance(academicYearID uint) (*dto.CashBalanceResponse, error) {
	balance, _ := s.cashRepo.GetCurrentBalance(academicYearID)
	lastClosing, _ := s.cashRepo.GetLastClosingDate(academicYearID)
	todayCredit, todayDebit, _ := s.cashRepo.GetTodaySummary(academicYearID)

	var lastClosingStr *string
	if lastClosing != nil {
		str := lastClosing.Format("2006-01-02")
		lastClosingStr = &str
	}

	return &dto.CashBalanceResponse{
		Balance:         balance,
		LastClosingDate: lastClosingStr,
		TodayCredit:     todayCredit,
		TodayDebit:      todayDebit,
	}, nil
}

func (s *cashService) GetTransactions(params dto.CashTransactionQueryParams) ([]dto.CashTransactionResponse, *dto.Meta, error) {
	txns, total, err := s.cashRepo.FindAll(params)
	if err != nil {
		return nil, nil, err
	}

	responses := make([]dto.CashTransactionResponse, len(txns))
	for i, t := range txns {
		responses[i] = mapCashTransactionToResponse(t)
	}

	meta := &dto.Meta{
		Page:  params.Page,
		Limit: params.Limit,
		Total: total,
	}

	return responses, meta, nil
}

func (s *cashService) TransferToVault(createdBy uint, req dto.TransferToCashRequest, academicYearID uint) error {
	balance, _ := s.cashRepo.GetCurrentBalance(academicYearID)
	if req.Amount > balance {
		return echo.NewHTTPError(422, fmt.Sprintf(
			"Saldo kas tidak mencukupi. Saldo: %.0f, Transfer: %.0f",
			balance, req.Amount,
		))
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		now := time.Now()
		if err := s.txWriter.WriteCashDebit(
			academicYearID, now, req.Amount,
			"transfer_to_vault", nil, req.Description, createdBy, tx,
		); err != nil {
			return err
		}
		return s.txWriter.WriteVaultCredit(
			academicYearID, now, req.Amount,
			"transfer_from_cash", nil, req.Description, createdBy, tx,
		)
	})
}

func mapCashTransactionToResponse(t model.CashTransaction) dto.CashTransactionResponse {
	return dto.CashTransactionResponse{
		ID:              t.ID,
		TransactionDate: t.TransactionDate.Format("2006-01-02"),
		TransactionType: t.TransactionType,
		Amount:          t.Amount,
		SourceType:      t.SourceType,
		SourceID:        t.SourceID,
		Description:     t.Description,
		CreatedBy: dto.UserBriefResponse{
			ID:       t.Creator.ID,
			FullName: t.Creator.FullName,
		},
	}
}
