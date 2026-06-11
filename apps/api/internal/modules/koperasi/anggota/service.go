package anggota

import (
	"errors"

	"gorm.io/gorm"
)

type Service interface {
	List(search string, activeOnly bool) ([]Response, error)
	Get(id uint) (*Response, error)
	Create(req CreateRequest) (*Response, error)
	Update(id uint, req CreateRequest) (*Response, error)
	Delete(id uint) error
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
	}
	if err := s.repo.Create(m); err != nil {
		return nil, err
	}
	resp := toResponse(*m)
	return &resp, nil
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
