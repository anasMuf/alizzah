package kas

import (
	"api/dto"
	"api/internal/shared"
	"fmt"
	"time"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type Service interface {
	GetBalance(academicYearID uint) (*BalanceResponse, error)
	GetTransactions(params QueryParams) ([]TransactionResponse, *dto.Meta, error)
	TransferToVault(createdBy uint, req TransferRequest, academicYearID uint) error
}

func NewService(db *gorm.DB, repo Repository) Service {
	return &svc{db: db, repo: repo, writer: shared.NewWriter()}
}

type svc struct {
	db     *gorm.DB
	repo   Repository
	writer *shared.Writer
}

func (s *svc) GetBalance(academicYearID uint) (*BalanceResponse, error) {
	balance, err := s.repo.GetCurrentBalance(academicYearID)
	if err != nil {
		return nil, fmt.Errorf("gagal membaca saldo kas: %w", err)
	}
	lastClosing, err := s.repo.GetLastClosingDate(academicYearID)
	if err != nil {
		return nil, fmt.Errorf("gagal membaca tanggal tutup buku terakhir: %w", err)
	}
	todayCredit, todayDebit, err := s.repo.GetTodaySummary(academicYearID)
	if err != nil {
		return nil, fmt.Errorf("gagal membaca ringkasan kas hari ini: %w", err)
	}
	var lc *string
	if lastClosing != nil {
		s := lastClosing.Format("2006-01-02")
		lc = &s
	}
	return &BalanceResponse{
		Balance: balance, LastClosingDate: lc,
		TodayCredit: todayCredit, TodayDebit: todayDebit,
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

func (s *svc) TransferToVault(createdBy uint, req TransferRequest, academicYearID uint) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("SELECT pg_advisory_xact_lock(?)", academicYearID).Error; err != nil {
			return fmt.Errorf("gagal memperoleh lock: %w", err)
		}
		balance, err := s.repo.GetCurrentBalanceWithTx(academicYearID, tx)
		if err != nil {
			return fmt.Errorf("gagal membaca saldo kas: %w", err)
		}
		if req.Amount > balance {
			return echo.NewHTTPError(422, fmt.Sprintf(
				"Saldo kas tidak mencukupi. Saldo: %.0f, Transfer: %.0f",
				balance, req.Amount,
			))
		}
		now := time.Now()
		if err := s.writer.WriteCashDebit(tx, academicYearID, now, req.Amount, "transfer_to_vault", nil, req.Description, createdBy); err != nil {
			return err
		}
		return s.writer.WriteVaultCredit(tx, academicYearID, now, req.Amount, "transfer_from_cash", nil, req.Description, createdBy)
	})
}
