package guru

import (
	"errors"
	"fmt"
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
// `asOf` berdasarkan masa kerja (tgl_masuk). Rentang golongan bersifat
// setengah terbuka [from_day, to_day); `to_day` nil = tanpa batas atas.
// Dipilih band dengan from_day TERBESAR yang cocok, sehingga tahan terhadap
// urutan baris maupun rentang yang beririsan/celah. Bila tgl_masuk NULL atau
// tak ada band cocok → fallback ke golongan tersimpan, lalu golongan terendah.
// Ini menggantikan mutasi `id_pk` per-request di aplikasi lama (F5).
func ResolveEffectiveGolongan(allGolongan []master.Golongan, emp *Employee, asOf time.Time) uint {
	return ResolveEffectiveGolonganAt(allGolongan, nil, emp, asOf)
}

// ResolveEffectiveGolonganAt seperti ResolveEffectiveGolongan tetapi
// mempertimbangkan riwayat penugasan golongan lebih dulu: bila ada baris dengan
// effective_date <= asOf, golongan baris terbaru itulah yang dipakai (override
// eksplisit / audit). Bila tidak ada, jatuh ke perhitungan rentang masa kerja.
func ResolveEffectiveGolonganAt(allGolongan []master.Golongan, history []GolonganHistory, emp *Employee, asOf time.Time) uint {
	// 1. Penugasan eksplisit terbaru yang sudah berlaku.
	var best *GolonganHistory
	for i := range history {
		h := &history[i]
		if h.GolonganID == 0 || h.EffectiveDate.After(asOf) {
			continue
		}
		if best == nil || h.EffectiveDate.After(best.EffectiveDate) {
			best = h
		}
	}
	if best != nil {
		return best.GolonganID
	}

	// 2. Fallback: rentang masa kerja (setengah terbuka, pilih from_day terbesar).
	if emp.TglMasuk != nil {
		days := calendarDays(*emp.TglMasuk, asOf)
		var band *master.Golongan
		for i := range allGolongan {
			g := &allGolongan[i]
			if g.FromDay == nil || days < *g.FromDay {
				continue
			}
			if g.ToDay != nil && days >= *g.ToDay {
				continue
			}
			if band == nil || *g.FromDay > *band.FromDay {
				band = g
			}
		}
		if band != nil {
			return band.ID
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

// calendarDays menghitung selisih hari kalender (mengabaikan jam) antara `from`
// dan `to` — mencegah off-by-one ketika `to` membawa komponen waktu (mis.
// time.Now()).
func calendarDays(from, to time.Time) int {
	f := time.Date(from.Year(), from.Month(), from.Day(), 0, 0, 0, 0, from.Location())
	t := time.Date(to.Year(), to.Month(), to.Day(), 0, 0, 0, 0, to.Location())
	return int(t.Sub(f).Hours() / 24)
}

// ── List / Detail ──

func (s *Service) List(search string, golonganID *uint, activeOnly bool) ([]EmployeeItem, error) {
	rows, err := s.repo.FindAll(search, golonganID, activeOnly)
	if err != nil {
		return nil, err
	}
	allGolongan, _ := s.masterRepo.FindAllGolongan()
	return toEmployeeItems(rows, allGolongan, s.historyByEmp(employeeIDs(rows)), time.Now()), nil
}

// ListPaged mengembalikan halaman karyawan (urut id) + total baris terfilter.
func (s *Service) ListPaged(search string, golonganID *uint, activeOnly bool, page, limit int) ([]EmployeeItem, int64, error) {
	rows, total, err := s.repo.FindPaged(search, golonganID, activeOnly, page, limit)
	if err != nil {
		return nil, 0, err
	}
	allGolongan, _ := s.masterRepo.FindAllGolongan()
	return toEmployeeItems(rows, allGolongan, s.historyByEmp(employeeIDs(rows)), time.Now()), total, nil
}

// historyByEmp memuat riwayat golongan untuk sekumpulan karyawan (satu query)
// lalu mengelompokkannya per employee_id.
func (s *Service) historyByEmp(ids []uint) map[uint][]GolonganHistory {
	rows, err := s.repo.FindHistoryByEmployeeIDs(ids)
	if err != nil {
		return nil
	}
	m := make(map[uint][]GolonganHistory, len(ids))
	for i := range rows {
		m[rows[i].EmployeeID] = append(m[rows[i].EmployeeID], rows[i])
	}
	return m
}

func employeeIDs(rows []Employee) []uint {
	ids := make([]uint, len(rows))
	for i := range rows {
		ids[i] = rows[i].ID
	}
	return ids
}

func toEmployeeItems(rows []Employee, allGolongan []master.Golongan, histByEmp map[uint][]GolonganHistory, asOf time.Time) []EmployeeItem {
	out := make([]EmployeeItem, 0, len(rows))
	for i := range rows {
		out = append(out, *toEmployeeItem(&rows[i], allGolongan, histByEmp[rows[i].ID], asOf))
	}
	return out
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
	item := toEmployeeItem(emp, allGolongan, s.historyByEmp([]uint{id})[id], time.Now())
	return &EmployeeDetail{EmployeeItem: *item, HR: *bundle}, nil
}

// ── CRUD ──

func (s *Service) Create(req EmployeeRequest) (*EmployeeItem, error) {
	emp := &Employee{
		Nama:        strings.TrimSpace(req.Nama),
		NoTelp:      normalizePhone(req.NoTelp),
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
	return toEmployeeItem(emp, allGolongan, nil, time.Now()), nil
}

func (s *Service) Update(id uint, req EmployeeRequest) (*EmployeeItem, error) {
	emp, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	emp.Nama = strings.TrimSpace(req.Nama)
	emp.NoTelp = normalizePhone(req.NoTelp)
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
	return toEmployeeItem(emp, allGolongan, s.historyByEmp([]uint{id})[id], time.Now()), nil
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

// ── Riwayat golongan (penugasan effective-dated) ──

func toGolonganHistoryItem(h *GolonganHistory) GolonganHistoryItem {
	item := GolonganHistoryItem{
		ID:            h.ID,
		EmployeeID:    h.EmployeeID,
		GolonganID:    h.GolonganID,
		EffectiveDate: h.EffectiveDate.Format("2006-01-02"),
		Reason:        h.Reason,
	}
	if h.Golongan != nil {
		item.GolonganKode = h.Golongan.Kode
	}
	return item
}

func (s *Service) ListGolonganHistory(employeeID uint) ([]GolonganHistoryItem, error) {
	if _, err := s.repo.FindByID(employeeID); err != nil {
		return nil, err
	}
	rows, err := s.repo.FindHistory(employeeID)
	if err != nil {
		return nil, err
	}
	out := make([]GolonganHistoryItem, 0, len(rows))
	for i := range rows {
		out = append(out, toGolonganHistoryItem(&rows[i]))
	}
	return out, nil
}

func (s *Service) AddGolonganHistory(employeeID uint, req GolonganHistoryRequest, userID *uint) (*GolonganHistoryItem, error) {
	if _, err := s.repo.FindByID(employeeID); err != nil {
		return nil, err
	}
	ok, _ := s.repo.MasterExists("sdm_golongan", req.GolonganID)
	if !ok {
		return nil, errors.New("Golongan tidak ditemukan")
	}
	tgl, err := parseDate(req.EffectiveDate)
	if err != nil || tgl == nil {
		return nil, errors.New("Tanggal berlaku tidak valid")
	}
	h := &GolonganHistory{
		EmployeeID:    employeeID,
		GolonganID:    req.GolonganID,
		EffectiveDate: *tgl,
		Reason:        strings.TrimSpace(req.Reason),
		UserID:        userID,
	}
	if err := s.repo.UpsertHistory(h); err != nil {
		return nil, err
	}
	// Muat ulang agar memperoleh ID & kode golongan.
	rows, err := s.repo.FindHistory(employeeID)
	if err != nil {
		return nil, err
	}
	for i := range rows {
		if rows[i].EffectiveDate.Equal(*tgl) {
			item := toGolonganHistoryItem(&rows[i])
			return &item, nil
		}
	}
	return nil, errors.New("Gagal menyimpan riwayat golongan")
}

func (s *Service) DeleteGolonganHistory(employeeID, id uint) error {
	return s.repo.DeleteHistory(id, employeeID)
}

// ── helpers ──

func toEmployeeItem(emp *Employee, allGolongan []master.Golongan, hist []GolonganHistory, asOf time.Time) *EmployeeItem {
	item := &EmployeeItem{
		ID:          emp.ID,
		LegacyID:    emp.LegacyID,
		Nama:        emp.Nama,
		NoTelp:      emp.NoTelp,
		GolonganID:  emp.GolonganID,
		EffectiveID: ResolveEffectiveGolonganAt(allGolongan, hist, emp, asOf),
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

// normalizePhone menormalkan nomor telepon Indonesia ke format kanonik
// "+62xxxxxxxxx" (digit saja setelah '+'). Menerima input apa pun: "0812…",
// "812…", "+62 812…", "62-812…". Kosong → "".
func normalizePhone(s string) string {
	digits := strings.Map(func(r rune) rune {
		if r >= '0' && r <= '9' {
			return r
		}
		return -1
	}, s)
	if digits == "" {
		return ""
	}
	switch {
	case strings.HasPrefix(digits, "62"):
		return "+" + digits
	case strings.HasPrefix(digits, "0"):
		return "+62" + digits[1:]
	default:
		return "+62" + digits
	}
}

// Import menambah/memperbarui karyawan secara massal (bulk). Baris dengan ID yang
// ada → update; baris tanpa ID → tambah baru. Best-effort: baris yang gagal
// dicatat di Errors tanpa membatalkan baris lain.
func (s *Service) Import(rows []ImportRow) (*ImportResult, error) {
	allGolongan, _ := s.masterRepo.FindAllGolongan()
	byKode := map[string]uint{}
	for _, g := range allGolongan {
		byKode[strings.ToUpper(g.Kode)] = g.ID
	}

	res := &ImportResult{Errors: []string{}}
	for i, row := range rows {
		line := i + 1
		fail := func(msg string) {
			res.Failed++
			res.Errors = append(res.Errors, fmt.Sprintf("baris %d: %s", line, msg))
		}

		nama := strings.TrimSpace(row.Nama)
		if nama == "" {
			fail("nama kosong")
			continue
		}

		var golonganID *uint
		if k := strings.ToUpper(strings.TrimSpace(row.GolonganKode)); k != "" {
			id, ok := byKode[k]
			if !ok {
				fail("golongan '" + row.GolonganKode + "' tidak dikenal")
				continue
			}
			golonganID = &id
		}

		tgl, err := parseDate(row.TglMasuk)
		if err != nil {
			fail("tanggal masuk tidak valid")
			continue
		}

		if row.ID > 0 {
			emp, err := s.repo.FindByID(row.ID)
			if err != nil {
				fail("ID karyawan tidak ditemukan")
				continue
			}
			emp.Nama = nama
			emp.NoTelp = normalizePhone(row.NoTelp)
			emp.TglMasuk = tgl
			emp.GolonganID = golonganID
			emp.Sertifikasi = row.Sertifikasi
			emp.Impasing = row.Impasing
			emp.IsActive = row.IsActive
			if err := s.repo.Update(emp); err != nil {
				fail(err.Error())
				continue
			}
			res.Updated++
			continue
		}

		emp := &Employee{
			Nama:        nama,
			NoTelp:      normalizePhone(row.NoTelp),
			TglMasuk:    tgl,
			GolonganID:  golonganID,
			Sertifikasi: row.Sertifikasi,
			Impasing:    row.Impasing,
			IsActive:    row.IsActive,
		}
		if err := s.repo.Create(emp); err != nil {
			fail(err.Error())
			continue
		}
		res.Created++
	}
	return res, nil
}
