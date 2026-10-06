package pinjam

import (
	"errors"
	"regexp"
	"time"

	"api/internal/modules/sdm/periode"
)

var periodeRegex = regexp.MustCompile(`^\d{6}$`)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service { return &Service{repo: repo} }

// List — daftar pinjaman, filter opsional berdasarkan status.
func (s *Service) List(search string, status string) ([]Item, error) {
	rows, err := s.repo.FindAll(search, status == "lunas", status == "belum_lunas")
	if err != nil {
		return nil, err
	}
	out := make([]Item, 0, len(rows))
	for i := range rows {
		out = append(out, *toItem(&rows[i]))
	}
	return out, nil
}

// Get — detail pinjaman + riwayat angsuran.
func (s *Service) Get(id uint) (*DetailResponse, error) {
	p, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	details, err := s.repo.FindDetails(id)
	if err != nil {
		return nil, err
	}
	resp := &DetailResponse{Item: *toItem(p)}
	for _, d := range details {
		resp.Angsuran = append(resp.Angsuran, AngsuranItem{
			ID: d.ID, Periode: periode.Format(d.Periode), Angsuran: d.Angsuran,
			Tanggal: d.CreatedAt.Format("2006-01-02"),
		})
	}
	return resp, nil
}

// Create — buat pinjaman baru, ditambahkan ke baris akumulatif karyawan
// (pola lama: satu baris `pinjam` per guru; status LUNAS di-reset bila
// meminjam lagi setelah lunas).
func (s *Service) Create(req CreateRequest) (*Item, error) {
	ok, err := s.repo.EmployeeExists(req.EmployeeID)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, errors.New("Karyawan tidak ditemukan")
	}

	existing, err := s.repo.FindByEmployee(req.EmployeeID)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	if existing == nil {
		existing = &Pinjam{
			EmployeeID: req.EmployeeID,
			TglPinjam:  today,
			Jumlah:     req.Jumlah,
			Sisa:       req.Jumlah,
			IsLunas:    false,
		}
		if err := s.repo.Create(existing); err != nil {
			return nil, err
		}
		return toItem(existing), nil
	}

	// Baris sudah ada → akumulasi.
	existing.Jumlah += req.Jumlah
	existing.Sisa += req.Jumlah
	existing.TglPinjam = today
	if existing.IsLunas {
		// Pinjam baru setelah lunas → reset status.
		existing.IsLunas = false
		existing.TglLunas = nil
	}
	if err := s.repo.Update(existing); err != nil {
		return nil, err
	}
	return toItem(existing), nil
}

// Pay — bayar angsuran untuk periode tertentu; mencatat potongan gaji di
// `sdm_pinjam_detail` (sumber kolom angsuran pada slip gaji periode tsb).
func (s *Service) Pay(id uint, req PayRequest) (*Item, error) {
	p, err := periode.Parse(req.Periode)
	if err != nil {
		return nil, err
	}
	pinj, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if pinj.IsLunas {
		return nil, errors.New("Pinjaman sudah lunas")
	}

	totalAng := pinj.AngsuranTerbayar + req.Angsuran
	totalSisa := pinj.Jumlah - totalAng
	if totalSisa < 0 {
		totalSisa = 0
	}
	pinj.AngsuranTerbayar = totalAng
	pinj.Sisa = totalSisa

	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	if totalSisa == 0 {
		pinj.IsLunas = true
		pinj.TglLunas = &today
	}
	if err := s.repo.Update(pinj); err != nil {
		return nil, err
	}
	if err := s.repo.CreateDetail(&PinjamDetail{
		Periode: p, PinjamID: pinj.ID, Angsuran: req.Angsuran,
	}); err != nil {
		return nil, err
	}
	return toItem(pinj), nil
}

func (s *Service) Delete(id uint) error {
	if _, err := s.repo.FindByID(id); err != nil {
		return err
	}
	return s.repo.Delete(id)
}

func toItem(p *Pinjam) *Item {
	item := &Item{
		ID: p.ID, EmployeeID: p.EmployeeID,
		TglPinjam: p.TglPinjam.Format("2006-01-02"),
		Jumlah:    p.Jumlah, AngsuranTerbayar: p.AngsuranTerbayar,
		Sisa: p.Sisa, IsLunas: p.IsLunas,
	}
	if p.Employee != nil {
		item.NamaKaryawan = p.Employee.Nama
	}
	if p.TglLunas != nil {
		s := p.TglLunas.Format("2006-01-02")
		item.TglLunas = &s
	}
	return item
}
