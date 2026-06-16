package master

import (
	"errors"
	"strings"

	"gorm.io/gorm"
)

type Service interface {
	List(kind, search string) ([]Response, error)
	Create(kind string, req CreateRequest) (*Response, error)
	Update(kind string, id uint, req CreateRequest) (*Response, error)
	Delete(kind string, id uint) error
}

type service struct{ repo Repository }

func NewService(repo Repository) Service { return &service{repo: repo} }

// label memberi nama Indonesia per jenis untuk pesan error yang ramah.
func label(kind string) string {
	if kind == KindUnit {
		return "Satuan"
	}
	return "Kategori"
}

func (s *service) List(kind, search string) ([]Response, error) {
	rows, err := s.repo.FindAll(kind, search)
	if err != nil {
		return nil, err
	}
	out := make([]Response, 0, len(rows))
	for _, m := range rows {
		out = append(out, toResponse(m))
	}
	return out, nil
}

func (s *service) Create(kind string, req CreateRequest) (*Response, error) {
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return nil, errors.New("Nama " + strings.ToLower(label(kind)) + " wajib diisi")
	}
	exists, err := s.repo.ExistsName(kind, name, 0)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, errors.New(label(kind) + ` "` + name + `" sudah ada`)
	}
	m := &MasterData{Kind: kind, Name: name}
	if err := s.repo.Create(m); err != nil {
		return nil, err
	}
	resp := toResponse(*m)
	return &resp, nil
}

func (s *service) Update(kind string, id uint, req CreateRequest) (*Response, error) {
	m, err := s.repo.FindByID(kind, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New(label(kind) + " tidak ditemukan")
		}
		return nil, err
	}
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return nil, errors.New("Nama " + strings.ToLower(label(kind)) + " wajib diisi")
	}
	exists, err := s.repo.ExistsName(kind, name, id)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, errors.New(label(kind) + ` "` + name + `" sudah ada`)
	}
	m.Name = name
	if err := s.repo.Update(m); err != nil {
		return nil, err
	}
	resp := toResponse(*m)
	return &resp, nil
}

func (s *service) Delete(kind string, id uint) error {
	if _, err := s.repo.FindByID(kind, id); err != nil {
		return errors.New(label(kind) + " tidak ditemukan")
	}
	return s.repo.Delete(kind, id)
}
