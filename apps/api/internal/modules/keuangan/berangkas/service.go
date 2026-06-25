package berangkas

import (
	"api/dto"
	"api/repository"
	"fmt"
	"gorm.io/gorm"
)

type Service interface {
	GetBalance(academicYearID uint) (*BalanceResponse, error)
	GetTransactions(params QueryParams) ([]TransactionResponse, *dto.Meta, error)
}

func NewService(db *gorm.DB, repo Repository) Service {
	return &svc{db: db, repo: repo}
}

type svc struct {
	db   *gorm.DB
	repo Repository
}

func (s *svc) GetBalance(academicYearID uint) (*BalanceResponse, error) {
	balance, err := s.repo.GetCurrentBalance(academicYearID)
	if err != nil {
		return nil, fmt.Errorf("gagal membaca saldo vault: %w", err)
	}
	// Cross-reference: StudentSavingsRepository masih di flat package.
	savingsRepo := repository.NewStudentSavingsRepository(s.db)
	totalGeneral, err := savingsRepo.SumBalanceByType(academicYearID, "general")
	if err != nil {
		return nil, fmt.Errorf("gagal membaca total tabungan umum: %w", err)
	}
	totalMandatory, err := savingsRepo.SumBalanceByType(academicYearID, "mandatory")
	if err != nil {
		return nil, fmt.Errorf("gagal membaca total tabungan wajib: %w", err)
	}
	return &BalanceResponse{
		Balance: balance, TotalSavingsGeneral: totalGeneral,
		TotalSavingsMandatory: totalMandatory,
	}, nil
}

func (s *svc) GetTransactions(params QueryParams) ([]TransactionResponse, *dto.Meta, error) {
	txns, total, err := s.repo.FindAll(params)
	if err != nil {
		return nil, nil, err
	}
	resps := make([]TransactionResponse, len(txns))
	for i, t := range txns {
		resps[i] = TransactionResponse{
			ID: t.ID, TransactionDate: t.TransactionDate.Format("2006-01-02"),
			TransactionType: t.TransactionType, Amount: t.Amount,
			SourceType: t.SourceType, SourceID: t.SourceID, Description: t.Description,
			CreatedBy: dto.UserBriefResponse{ID: t.Creator.ID, FullName: t.Creator.FullName},
		}
	}
	return resps, &dto.Meta{Page: params.Page, Limit: params.Limit, Total: total}, nil
}
