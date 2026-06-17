package anggota

import (
	"errors"

	"gorm.io/gorm"
)

type Service interface {
	List(search string, activeOnly bool) ([]Response, error)
	Get(id uint) (*Response, error)
	Create(req CreateRequest) (*Response, error)
	BulkCreate(req BulkCreateRequest) ([]Response, error)
	Update(id uint, req CreateRequest) (*Response, error)
	Delete(id uint) error
	GetDetail(id uint) (*DetailResponse, error)
}

type service struct{ repo Repository }

func NewService(repo Repository) Service { return &service{repo: repo} }

func (s *service) List(search string, activeOnly bool) ([]Response, error) {
	members, err := s.repo.FindAll(search, activeOnly)
	if err != nil {
		return nil, err
	}
	out := make([]Response, 0, len(members))
	for _, m := range members {
		out = append(out, toResponse(m))
	}
	return out, nil
}

func (s *service) Get(id uint) (*Response, error) {
	m, err := s.repo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("Anggota tidak ditemukan")
		}
		return nil, err
	}
	resp := toResponse(*m)
	return &resp, nil
}

func (s *service) GetDetail(id uint) (*DetailResponse, error) {
	m, err := s.repo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("Anggota tidak ditemukan")
		}
		return nil, err
	}
	loanSummary, _ := s.repo.GetLoanSummary(id)

	resp := DetailResponse{
		Response:    toResponse(*m),
		LoanSummary: loanSummary,
	}
	return &resp, nil
}

func (s *service) Create(req CreateRequest) (*Response, error) {
	active := true
	if req.IsActive != nil {
		active = *req.IsActive
	}
	m := &Member{
		FullName:   req.FullName,
		MemberType: req.MemberType,
		Phone:      req.Phone,
		Address:    req.Address,
		IsActive:   active,
		EmployeeID: req.EmployeeID,
	}
	if err := s.repo.Create(m); err != nil {
		return nil, err
	}
	resp := toResponse(*m)
	return &resp, nil
}

func (s *service) BulkCreate(req BulkCreateRequest) ([]Response, error) {
	members := make([]Member, 0, len(req.Members))
	for _, r := range req.Members {
		active := true
		if r.IsActive != nil {
			active = *r.IsActive
		}
		members = append(members, Member{
			FullName:   r.FullName,
			MemberType: r.MemberType,
			Phone:      r.Phone,
			Address:    r.Address,
			IsActive:   active,
			EmployeeID: r.EmployeeID,
		})
	}
	if err := s.repo.BulkCreate(members); err != nil {
		return nil, err
	}
	
	out := make([]Response, 0, len(members))
	for _, m := range members {
		out = append(out, toResponse(m))
	}
	return out, nil
}

func (s *service) Update(id uint, req CreateRequest) (*Response, error) {
	m, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.New("Anggota tidak ditemukan")
	}
	m.FullName = req.FullName
	m.MemberType = req.MemberType
	m.Phone = req.Phone
	m.Address = req.Address
	m.EmployeeID = req.EmployeeID
	if req.IsActive != nil {
		m.IsActive = *req.IsActive
	}
	if err := s.repo.Update(m); err != nil {
		return nil, err
	}
	resp := toResponse(*m)
	return &resp, nil
}

func (s *service) Delete(id uint) error {
	if _, err := s.repo.FindByID(id); err != nil {
		return errors.New("Anggota tidak ditemukan")
	}
	return s.repo.Delete(id)
}
