package master

import (
	"errors"
	"strings"
)

// Service memuat logika bisnis master HR: validasi, normalisasi nama, dan
// aturan single-row (kehadiran). Error dikembalikan sebagai string Indonesia
// agar langsung aman ditampilkan ke pengguna.
type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service { return &Service{repo: repo} }

// ── Golongan ──

func (s *Service) ListGolongan() ([]GolonganResponse, error) {
	rows, err := s.repo.FindAllGolongan()
	if err != nil {
		return nil, err
	}
	out := make([]GolonganResponse, 0, len(rows))
	for _, g := range rows {
		out = append(out, *toGolonganResponse(&g))
	}
	return out, nil
}

func (s *Service) CreateGolongan(req GolonganRequest) (*GolonganResponse, error) {
	if dup, _ := s.repo.FindGolonganByCode(req.Kode); dup != nil {
		return nil, errors.New("Kode golongan sudah dipakai")
	}
	g := &Golongan{
		Kode: req.Kode, FromDay: req.FromDay, ToDay: req.ToDay,
		Keterangan: strings.TrimSpace(req.Keterangan), Nilai: req.Nilai,
	}
	if err := s.repo.create(g); err != nil {
		return nil, err
	}
	return toGolonganResponse(g), nil
}

func (s *Service) UpdateGolongan(id uint, req GolonganRequest) (*GolonganResponse, error) {
	var g Golongan
	if err := find(s.repo, &g, id); err != nil {
		return nil, err
	}
	if g.Kode != req.Kode {
		if dup, _ := s.repo.FindGolonganByCode(req.Kode); dup != nil && dup.ID != id {
			return nil, errors.New("Kode golongan sudah dipakai")
		}
	}
	g.Kode = req.Kode
	g.FromDay = req.FromDay
	g.ToDay = req.ToDay
	g.Keterangan = strings.TrimSpace(req.Keterangan)
	g.Nilai = req.Nilai
	if err := s.repo.save(&g); err != nil {
		return nil, err
	}
	return toGolonganResponse(&g), nil
}

func (s *Service) DeleteGolongan(id uint) error {
	var g Golongan
	if err := find(s.repo, &g, id); err != nil {
		return err
	}
	// Cegah hapus golongan yang masih dipakai karyawan.
	var count int64
	if err := s.repo.db.Model(&employeeRef{}).Where("golongan_id = ?", id).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return errors.New("Golongan masih dipakai oleh karyawan")
	}
	return s.repo.delete(&Golongan{}, id)
}

func toGolonganResponse(g *Golongan) *GolonganResponse {
	return &GolonganResponse{
		ID: g.ID, Kode: g.Kode, FromDay: g.FromDay, ToDay: g.ToDay,
		Keterangan: g.Keterangan, Nilai: g.Nilai,
	}
}

// ── Tarif Kehadiran ──

func (s *Service) GetKehadiran() (*KehadiranResponse, error) {
	row, err := s.repo.GetKehadiran()
	if err != nil {
		return nil, err
	}
	if row == nil {
		return &KehadiranResponse{ID: 0, NilaiPerHari: 0}, nil
	}
	return &KehadiranResponse{ID: row.ID, NilaiPerHari: row.NilaiPerHari}, nil
}

func (s *Service) UpdateKehadiran(req KehadiranRequest) (*KehadiranResponse, error) {
	row, err := s.repo.GetKehadiran()
	if err != nil {
		return nil, err
	}
	if row == nil {
		row = &TarifKehadiran{}
	}
	row.NilaiPerHari = req.NilaiPerHari
	if err := s.repo.SaveKehadiran(row); err != nil {
		return nil, err
	}
	return &KehadiranResponse{ID: row.ID, NilaiPerHari: row.NilaiPerHari}, nil
}

// ── Kedisiplinan ──

func (s *Service) ListKedisiplinan() ([]KedisiplinanResponse, error) {
	var rows []Kedisiplinan
	if err := list(s.repo, &rows, "id ASC"); err != nil {
		return nil, err
	}
	out := make([]KedisiplinanResponse, 0, len(rows))
	for _, k := range rows {
		out = append(out, KedisiplinanResponse{ID: k.ID, Kode: k.Kode, Nama: k.Nama, Nilai: k.Nilai})
	}
	return out, nil
}

func (s *Service) CreateKedisiplinan(req KedisiplinanRequest) (*KedisiplinanResponse, error) {
	m, _ := s.repo.GetAllKedisiplinanMap()
	if _, exists := m[req.Kode]; exists {
		return nil, errors.New("Kode kedisiplinan sudah dipakai")
	}
	k := &Kedisiplinan{Kode: req.Kode, Nama: req.Nama, Nilai: req.Nilai}
	if err := s.repo.create(k); err != nil {
		return nil, err
	}
	return &KedisiplinanResponse{ID: k.ID, Kode: k.Kode, Nama: k.Nama, Nilai: k.Nilai}, nil
}

func (s *Service) UpdateKedisiplinan(id uint, req KedisiplinanRequest) (*KedisiplinanResponse, error) {
	var k Kedisiplinan
	if err := find(s.repo, &k, id); err != nil {
		return nil, err
	}
	k.Kode = req.Kode
	k.Nama = req.Nama
	k.Nilai = req.Nilai
	if err := s.repo.save(&k); err != nil {
		return nil, err
	}
	return &KedisiplinanResponse{ID: k.ID, Kode: k.Kode, Nama: k.Nama, Nilai: k.Nilai}, nil
}

func (s *Service) DeleteKedisiplinan(id uint) error {
	var k Kedisiplinan
	if err := find(s.repo, &k, id); err != nil {
		return err
	}
	return s.repo.delete(&Kedisiplinan{}, id)
}

// ── Fungsional ──

func (s *Service) ListFungsional() ([]ItemResponse, error) {
	var rows []Fungsional
	if err := list(s.repo, &rows, "nama ASC"); err != nil {
		return nil, err
	}
	out := make([]ItemResponse, 0, len(rows))
	for _, f := range rows {
		v := f.Nilai
		out = append(out, *toItemResponse(f.ID, f.Nama, &v))
	}
	return out, nil
}

func (s *Service) CreateFungsional(req ItemRequest) (*ItemResponse, error) {
	if req.Nilai == nil {
		return nil, errors.New("Nilai wajib diisi")
	}
	f := &Fungsional{Nama: strings.TrimSpace(req.Nama), Nilai: *req.Nilai}
	if err := s.repo.create(f); err != nil {
		if isDuplicateErr(err) {
			return nil, errors.New("Nama sudah dipakai")
		}
		return nil, err
	}
	return toItemResponse(f.ID, f.Nama, &f.Nilai), nil
}

func (s *Service) UpdateFungsional(id uint, req ItemRequest) (*ItemResponse, error) {
	var f Fungsional
	if err := find(s.repo, &f, id); err != nil {
		return nil, err
	}
	if req.Nilai != nil {
		f.Nilai = *req.Nilai
	}
	f.Nama = strings.TrimSpace(req.Nama)
	if err := s.repo.save(&f); err != nil {
		if isDuplicateErr(err) {
			return nil, errors.New("Nama sudah dipakai")
		}
		return nil, err
	}
	return toItemResponse(f.ID, f.Nama, &f.Nilai), nil
}

func (s *Service) DeleteFungsional(id uint) error {
	var f Fungsional
	if err := find(s.repo, &f, id); err != nil {
		return err
	}
	var count int64
	if err := s.repo.db.Model(&fungsionalDetailRef{}).Where("fungsional_id = ?", id).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return errors.New("Fungsional masih dilampirkan ke karyawan")
	}
	return s.repo.delete(&Fungsional{}, id)
}

// ── Tugas Tambahan ──

func (s *Service) ListTugasTambahan() ([]ItemResponse, error) {
	var rows []TugasTambahan
	if err := list(s.repo, &rows, "nama ASC"); err != nil {
		return nil, err
	}
	out := make([]ItemResponse, 0, len(rows))
	for _, t := range rows {
		out = append(out, *toItemResponse(t.ID, t.Nama, nil))
	}
	return out, nil
}

func (s *Service) CreateTugasTambahan(req ItemRequest) (*ItemResponse, error) {
	t := &TugasTambahan{Nama: strings.TrimSpace(req.Nama)}
	if err := s.repo.create(t); err != nil {
		if isDuplicateErr(err) {
			return nil, errors.New("Nama sudah dipakai")
		}
		return nil, err
	}
	return toItemResponse(t.ID, t.Nama, nil), nil
}

func (s *Service) UpdateTugasTambahan(id uint, req ItemRequest) (*ItemResponse, error) {
	var t TugasTambahan
	if err := find(s.repo, &t, id); err != nil {
		return nil, err
	}
	t.Nama = strings.TrimSpace(req.Nama)
	if err := s.repo.save(&t); err != nil {
		if isDuplicateErr(err) {
			return nil, errors.New("Nama sudah dipakai")
		}
		return nil, err
	}
	return toItemResponse(t.ID, t.Nama, nil), nil
}

func (s *Service) DeleteTugasTambahan(id uint) error {
	var t TugasTambahan
	if err := find(s.repo, &t, id); err != nil {
		return err
	}
	var count int64
	if err := s.repo.db.Model(&tugasTambahanDetailRef{}).Where("tugas_tambahan_id = ?", id).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return errors.New("Tugas tambahan masih dilampirkan ke karyawan")
	}
	return s.repo.delete(&TugasTambahan{}, id)
}

// ── Penanggung Jawab ──

func (s *Service) ListPenanggungJawab() ([]ItemResponse, error) {
	var rows []PenanggungJawab
	if err := list(s.repo, &rows, "nama ASC"); err != nil {
		return nil, err
	}
	out := make([]ItemResponse, 0, len(rows))
	for _, p := range rows {
		v := p.Nilai
		out = append(out, *toItemResponse(p.ID, p.Nama, &v))
	}
	return out, nil
}

func (s *Service) CreatePenanggungJawab(req ItemRequest) (*ItemResponse, error) {
	if req.Nilai == nil {
		return nil, errors.New("Nilai wajib diisi")
	}
	p := &PenanggungJawab{Nama: strings.TrimSpace(req.Nama), Nilai: *req.Nilai}
	if err := s.repo.create(p); err != nil {
		if isDuplicateErr(err) {
			return nil, errors.New("Nama sudah dipakai")
		}
		return nil, err
	}
	return toItemResponse(p.ID, p.Nama, &p.Nilai), nil
}

func (s *Service) UpdatePenanggungJawab(id uint, req ItemRequest) (*ItemResponse, error) {
	var p PenanggungJawab
	if err := find(s.repo, &p, id); err != nil {
		return nil, err
	}
	if req.Nilai != nil {
		p.Nilai = *req.Nilai
	}
	p.Nama = strings.TrimSpace(req.Nama)
	if err := s.repo.save(&p); err != nil {
		if isDuplicateErr(err) {
			return nil, errors.New("Nama sudah dipakai")
		}
		return nil, err
	}
	return toItemResponse(p.ID, p.Nama, &p.Nilai), nil
}

func (s *Service) DeletePenanggungJawab(id uint) error {
	var p PenanggungJawab
	if err := find(s.repo, &p, id); err != nil {
		return err
	}
	var count int64
	if err := s.repo.db.Model(&penanggungJawabDetailRef{}).Where("penanggung_jawab_id = ?", id).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return errors.New("Penanggung jawab masih dilampirkan ke karyawan")
	}
	return s.repo.delete(&PenanggungJawab{}, id)
}

// ── Lain-lain ──

func (s *Service) ListLainlain() ([]ItemResponse, error) {
	var rows []Lainlain
	if err := list(s.repo, &rows, "nama ASC"); err != nil {
		return nil, err
	}
	out := make([]ItemResponse, 0, len(rows))
	for _, l := range rows {
		out = append(out, *toItemResponse(l.ID, l.Nama, nil))
	}
	return out, nil
}

// GetOrCreateLainlain mencari master lain-lain berdasarkan nama (case-insensitive),
// membuat bila belum ada — dipakai saat melampirkan ke karyawan.
func (s *Service) GetOrCreateLainlain(nama string) (*Lainlain, error) {
	return s.repo.GetOrCreateLainlainForAttach(nama)
}

func normalizeName(nama string) string {
	return strings.ToLower(strings.TrimSpace(nama))
}
