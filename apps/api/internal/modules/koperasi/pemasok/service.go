package pemasok

import (
	"errors"

	"gorm.io/gorm"
)

type Service interface {
	List(search string) ([]Response, error)
	Get(id uint) (*Response, error)
	Create(req CreateRequest) (*Response, error)
	Update(id uint, req CreateRequest) (*Response, error)
	Delete(id uint) error
}

type service struct{ repo Repository }

func NewService(repo Repository) Service { return &service{repo: repo} }

func (s *service) List(search string) ([]Response, error) {
	suppliers, err := s.repo.FindAll(search)
	if err != nil {
		return nil, err
	}
	out := make([]Response, 0, len(suppliers))
	for _, sup := range suppliers {
		out = append(out, toResponse(sup))
	}
	return out, nil
}

func (s *service) Get(id uint) (*Response, error) {
	sup, err := s.repo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("Pemasok tidak ditemukan")
		}
		return nil, err
	}
	resp := toResponse(*sup)
	return &resp, nil
}

func (s *service) Create(req CreateRequest) (*Response, error) {
	sup := &Supplier{
		Name:          req.Name,
		ContactPerson: req.ContactPerson,
		Phone:         req.Phone,
		Address:       req.Address,
	}
	if err := s.repo.Create(sup); err != nil {
		return nil, err
	}
	resp := toResponse(*sup)
	return &resp, nil
}

func (s *service) Update(id uint, req CreateRequest) (*Response, error) {
	sup, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.New("Pemasok tidak ditemukan")
	}
	sup.Name = req.Name
	sup.ContactPerson = req.ContactPerson
	sup.Phone = req.Phone
	sup.Address = req.Address
	if err := s.repo.Update(sup); err != nil {
		return nil, err
	}
	resp := toResponse(*sup)
	return &resp, nil
}

func (s *service) Delete(id uint) error {
	if _, err := s.repo.FindByID(id); err != nil {
		return errors.New("Pemasok tidak ditemukan")
	}
	return s.repo.Delete(id)
}
