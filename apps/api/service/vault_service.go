package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"fmt"
)

type VaultService interface {
	GetBalance(academicYearID uint) (*dto.VaultBalanceResponse, error)
	GetTransactions(params dto.VaultTransactionQueryParams) ([]dto.VaultTransactionResponse, *dto.Meta, error)
}

type vaultService struct {
	vaultRepo   repository.VaultTransactionRepository
	savingsRepo repository.StudentSavingsRepository
}

func NewVaultService(vaultRepo repository.VaultTransactionRepository, savingsRepo repository.StudentSavingsRepository) VaultService {
	return &vaultService{
		vaultRepo:   vaultRepo,
		savingsRepo: savingsRepo,
	}
}

func (s *vaultService) GetBalance(academicYearID uint) (*dto.VaultBalanceResponse, error) {
	balance, err := s.vaultRepo.GetCurrentBalance(academicYearID)
	if err != nil {
		return nil, fmt.Errorf("gagal membaca saldo vault: %w", err)
	}

	totalGeneral, err := s.savingsRepo.SumBalanceByType(academicYearID, "general")
	if err != nil {
		return nil, fmt.Errorf("gagal membaca total tabungan umum: %w", err)
	}
	totalMandatory, err := s.savingsRepo.SumBalanceByType(academicYearID, "mandatory")
	if err != nil {
		return nil, fmt.Errorf("gagal membaca total tabungan wajib: %w", err)
	}

	return &dto.VaultBalanceResponse{
		Balance:               balance,
		TotalSavingsGeneral:   totalGeneral,
		TotalSavingsMandatory: totalMandatory,
	}, nil
}

func (s *vaultService) GetTransactions(params dto.VaultTransactionQueryParams) ([]dto.VaultTransactionResponse, *dto.Meta, error) {
	txns, total, err := s.vaultRepo.FindAll(params)
	if err != nil {
		return nil, nil, err
	}

	responses := make([]dto.VaultTransactionResponse, len(txns))
	for i, t := range txns {
		responses[i] = mapVaultTransactionToResponse(t)
	}

	meta := &dto.Meta{
		Page:  params.Page,
		Limit: params.Limit,
		Total: total,
	}

	return responses, meta, nil
}

func mapVaultTransactionToResponse(t model.VaultTransaction) dto.VaultTransactionResponse {
	return dto.VaultTransactionResponse{
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
