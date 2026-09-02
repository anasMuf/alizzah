package guru

import (
	"errors"
	"strings"
	"time"

	"api/internal/modules/sdm/master"
)

// Service memuat logika bisnis karyawan & lampiran HR.
type Service struct {
	repo       *Repository
	masterRepo *master.Repository
}

func NewService(repo *Repository, masterRepo *master.Repository) *Service {
	return &Service{repo: repo, masterRepo: masterRepo}
}

// ResolveEffectiveGolongan menentukan golongan efektif karyawan pada tanggal
// `asOf`: hitung selisih hari sejak tgl_masuk lalu cari rentang golongan
// (from_day < hari <= to_day, urutan id). Bila tidak ada kecocokan (jeda antar
// golongan / tgl_masuk NULL) → fallback ke golongan tersimpan, lalu golongan
// terendah. Ini menggantikan mutasi `id_pk` per-request di aplikasi lama (F5).
func ResolveEffectiveGolongan(allGolongan []master.Golongan, emp *Employee, asOf time.Time) uint {
	if emp.TglMasuk != nil {
		days := int(asOf.Sub(*emp.TglMasuk).Hours() / 24)
		for _, g := range allGolongan {
			if g.FromDay != nil && g.ToDay != nil && days > *g.FromDay && days <= *g.ToDay {
				return g.ID
			}
		}
	}
	if emp.GolonganID != nil {
		return *emp.GolonganID
	}
	if len(allGolongan) > 0 {
		return allGolongan[0].ID
	}
	return 0
}

// ── List / Detail ──

func (s *Service) List(search string, golonganID *uint, activeOnly bool) ([]EmployeeItem, error) {
	rows, err := s.repo.FindAll(search, golonganID, activeOnly)
	if err != nil {
		return nil, err
	}
	allGolongan, _ := s.masterRepo.FindAllGolongan()
	now := time.Now()
	out := make([]EmployeeItem, 0, len(rows))
	for i := range rows {
		item := toEmployeeItem(&rows[i], allGolongan, now)
		out = append(out, *item)
	}
	return out, nil
}

func (s *Service) Get(id uint) (*EmployeeDetail, error) {
	emp, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	allGolongan, _ := s.masterRepo.FindAllGolongan()
	bundle, err := s.repo.GetHRBundle(id)
	if err != nil {
		return nil, err
	}
	item := toEmployeeItem(emp, allGolongan, time.Now())
	return &EmployeeDetail{EmployeeItem: *item, HR: *bundle}, nil
}

// ── CRUD ──

func (s *Service) Create(req EmployeeRequest) (*EmployeeItem, error) {
	emp := &Employee{
		Nama:        strings.TrimSpace(req.Nama),
		GolonganID:  req.GolonganID,
		Sertifikasi: req.Sertifikasi,
		Impasing:    req.Impasing,
		IsActive:    req.IsActive,
	}
	tgl, err := parseDate(req.TglMasuk)
	if err != nil {
		return nil, errors.New("Format tanggal masuk tidak valid")
	}
	emp.TglMasuk = tgl
	if req.GolonganID != nil {
		ok, _ := s.repo.MasterExists("sdm_golongan", *req.GolonganID)
		if !ok {
			return nil, errors.New("Golongan tidak ditemukan")
		}
	}
	if err := s.repo.Create(emp); err != nil {
		return nil, err
	}
	allGolongan, _ := s.masterRepo.FindAllGolongan()
	return toEmployeeItem(emp, allGolongan, time.Now()), nil
}

func (s *Service) Update(id uint, req EmployeeRequest) (*EmployeeItem, error) {
	emp, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	emp.Nama = strings.TrimSpace(req.Nama)
	emp.GolonganID = req.GolonganID
	emp.Sertifikasi = req.Sertifikasi
	emp.Impasing = req.Impasing
	emp.IsActive = req.IsActive
	tgl, err := parseDate(req.TglMasuk)
	if err != nil {
		return nil, errors.New("Format tanggal masuk tidak valid")
	}
	emp.TglMasuk = tgl
	if req.GolonganID != nil {
		ok, _ := s.repo.MasterExists("sdm_golongan", *req.GolonganID)
		if !ok {
			return nil, errors.New("Golongan tidak ditemukan")
		}
	}
	if err := s.repo.Update(emp); err != nil {
		return nil, err
	}
	allGolongan, _ := s.masterRepo.FindAllGolongan()
	return toEmployeeItem(emp, allGolongan, time.Now()), nil
}

func (s *Service) Delete(id uint) error {
	emp, err := s.repo.FindByID(id)
	if err != nil {
		return err
	}
	hasTxn, err := s.repo.HasTransactionData(id)
	if err != nil {
		return err
	}
	if hasTxn {
		return errors.New("Karyawan punya riwayat absen/pinjaman — nonaktifkan saja, tidak bisa dihapus")
	}
	_ = emp
	return s.repo.Delete(id)
}

// ── Lampiran HR ──

func (s *Service) AttachFungsional(employeeID uint, req AttachFungsionalRequest) error {
	if _, err := s.repo.FindByID(employeeID); err != nil {
		return err
	}
	ok, _ := s.repo.MasterExists("sdm_fungsional", req.FungsionalID)
	if !ok {
		return errors.New("Fungsional tidak ditemukan")
	}
	return s.repo.CreateFungsional(&FungsionalDetail{FungsionalID: req.FungsionalID, EmployeeID: employeeID})
}

func (s *Service) DetachFungsional(employeeID, detailID uint) error {
	return s.repo.DeleteFungsional(detailID, employeeID)
}

func (s *Service) AttachTugasTambahan(employeeID uint, req AttachTugasTambahanRequest) error {
	if _, err := s.repo.FindByID(employeeID); err != nil {
		return err
	}
	ok, _ := s.repo.MasterExists("sdm_tugas_tambahan", req.TugasTambahanID)
	if !ok {
		return errors.New("Tugas tambahan tidak ditemukan")
	}
	return s.repo.CreateTugasTambahan(&TugasTambahanDetail{
		TugasTambahanID: req.TugasTambahanID, EmployeeID: employeeID, Nilai: req.Nilai,
	})
}

func (s *Service) DetachTugasTambahan(employeeID, detailID uint) error {
	return s.repo.DeleteTugasTambahan(detailID, employeeID)
}

func (s *Service) AttachPenanggungJawab(employeeID uint, req AttachPenanggungJawabRequest) error {
	if _, err := s.repo.FindByID(employeeID); err != nil {
		return err
	}
	ok, _ := s.repo.MasterExists("sdm_penanggung_jawab", req.PenanggungJawabID)
	if !ok {
		return errors.New("Penanggung jawab tidak ditemukan")
	}
	return s.repo.CreatePenanggungJawab(&PenanggungJawabDetail{
		PenanggungJawabID: req.PenanggungJawabID, EmployeeID: employeeID,
	})
}

func (s *Service) DetachPenanggungJawab(employeeID, detailID uint) error {
	return s.repo.DeletePenanggungJawab(detailID, employeeID)
}

func (s *Service) AttachLainlain(employeeID uint, req AttachLainlainRequest) error {
	if _, err := s.repo.FindByID(employeeID); err != nil {
		return err
	}
	// Master lain-lain dibuat on-the-fly bila nama belum ada.
	item, err := s.masterRepo.GetOrCreateLainlainForAttach(req.Nama)
	if err != nil {
		return err
	}
	return s.repo.CreateLainlain(&LainlainDetail{
		LainlainID: item.ID, EmployeeID: employeeID, Nilai: req.Nilai,
	})
}

func (s *Service) DetachLainlain(employeeID, detailID uint) error {
	return s.repo.DeleteLainlain(detailID, employeeID)
}

// ── helpers ──

func toEmployeeItem(emp *Employee, allGolongan []master.Golongan, asOf time.Time) *EmployeeItem {
	item := &EmployeeItem{
		ID:          emp.ID,
		LegacyID:    emp.LegacyID,
		Nama:        emp.Nama,
		GolonganID:  emp.GolonganID,
		EffectiveID: ResolveEffectiveGolongan(allGolongan, emp, asOf),
		Sertifikasi: emp.Sertifikasi,
		Impasing:    emp.Impasing,
		IsActive:    emp.IsActive,
	}
	if emp.TglMasuk != nil {
		s := emp.TglMasuk.Format("2006-01-02")
		item.TglMasuk = &s
	}
	if emp.Golongan != nil {
		item.Golongan = &GolonganBrief{
			ID: emp.Golongan.ID, Kode: emp.Golongan.Kode,
			Nilai: emp.Golongan.Nilai, Keterangan: emp.Golongan.Keterangan,
		}
	}
	return item
}

func parseDate(s string) (*time.Time, error) {
	if s == "" {
		return nil, nil
	}
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return nil, err
	}
	return &t, nil
}
