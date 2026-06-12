package kas

type Service interface {
	Balance(academicYearID uint) (BalanceResponse, error)
	Transactions(p QueryParams) ([]TransactionResponse, int64, error)
}

type service struct{ repo Repository }

func NewService(repo Repository) Service { return &service{repo: repo} }

func (s *service) Balance(academicYearID uint) (BalanceResponse, error) {
	bal, err := s.repo.GetBalance(academicYearID)
	if err != nil {
		return BalanceResponse{}, err
	}
	return BalanceResponse{AcademicYearID: academicYearID, Balance: bal}, nil
}

func (s *service) Transactions(p QueryParams) ([]TransactionResponse, int64, error) {
	txns, total, err := s.repo.FindAll(p)
	if err != nil {
		return nil, 0, err
	}
	out := make([]TransactionResponse, 0, len(txns))
	for _, ct := range txns {
		out = append(out, toResponse(ct))
	}
	return out, total, nil
}
