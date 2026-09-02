package absen

import (
	"errors"

	"api/internal/modules/sdm/periode"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service { return &Service{repo: repo} }

func (s *Service) List(periodeInput string) ([]Response, error) {
	p, err := periode.Parse(periodeInput)
	if err != nil {
		return nil, err
	}
	rows, err := s.repo.FindByPeriode(p)
	if err != nil {
		return nil, err
	}
	out := make([]Response, 0, len(rows))
	for i := range rows {
		out = append(out, toResponse(&rows[i]))
	}
	return out, nil
}

func (s *Service) Upsert(req UpsertRequest) (int, error) {
	p, err := periode.Parse(req.Periode)
	if err != nil {
		return 0, err
	}
	// Validasi semua karyawan ada — cegah data yatim.
	seen := map[uint]bool{}
	for _, e := range req.Items {
		if seen[e.EmployeeID] {
			continue
		}
		ok, err := s.repo.EmployeeExists(e.EmployeeID)
		if err != nil {
			return 0, err
		}
		if !ok {
			return 0, errors.New("Ada karyawan yang tidak ditemukan")
		}
		seen[e.EmployeeID] = true
	}
	if err := s.repo.UpsertBulk(p, req.Items); err != nil {
		return 0, err
	}
	return len(req.Items), nil
}

func (s *Service) Delete(periodeInput string) error {
	p, err := periode.Parse(periodeInput)
	if err != nil {
		return err
	}
	return s.repo.DeleteByPeriode(p)
}
