package absen

import (
	"errors"
	"time"

	"api/internal/modules/sdm/periode"
	"api/utility"
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
	if err := s.ensureNotFinalized(p); err != nil {
		return 0, err
	}
	// Validasi semua karyawan ada — cegah data yatim (satu query untuk semua id).
	ids := make([]uint, 0, len(req.Items))
	seen := map[uint]bool{}
	for _, e := range req.Items {
		if !seen[e.EmployeeID] {
			seen[e.EmployeeID] = true
			ids = append(ids, e.EmployeeID)
		}
	}
	existing, err := s.repo.ExistingEmployeeIDs(ids)
	if err != nil {
		return 0, err
	}
	for _, id := range ids {
		if !existing[id] {
			return 0, errors.New("Ada karyawan yang tidak ditemukan")
		}
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
	if err := s.ensureNotFinalized(p); err != nil {
		return err
	}
	return s.repo.DeleteByPeriode(p)
}

// ensureNotFinalized menolak perubahan absensi pada periode yang gajinya sudah
// difinalisasi. Koreksi harus lewat Unlock di menu Penggajian terlebih dahulu,
// agar angka yang sudah dibayarkan tidak berubah diam-diam.
func (s *Service) ensureNotFinalized(p time.Time) error {
	finalized, err := s.repo.PayrollFinalized(p)
	if err != nil {
		return err
	}
	if finalized {
		return utility.NewConflictError("Periode penggajian sudah difinalisasi. Buka kembali (Unlock) di menu Penggajian sebelum mengubah absensi.")
	}
	return nil
}
