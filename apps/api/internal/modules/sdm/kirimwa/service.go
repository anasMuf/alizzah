package kirimwa

import (
	"context"
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"

	"api/internal/modules/sdm/guru"
	"api/internal/modules/sdm/penggajian"
	"api/internal/modules/sdm/periode"
	"api/internal/modules/sdm/publik"
)

const (
	batchSize   = 20                      // jumlah antrian per siklus worker
	pollEvery   = 5 * time.Second         // jeda antar siklus worker
	sendSpacing = 1500 * time.Millisecond // jeda antar kirim (hindari rate-limit WA)
)

// openingDoa — kalimat pembuka pesan, sama dengan teks pembuka PDF slip.
const openingDoa = "Alhamdulillah… Alloh Ar Rozzaq memberikan Rizki Halal melalui PAUD Unggulan AL IZZAH.\nSemoga Barokah & membawa banyak manfaat."

// Service merangkai data karyawan/gaji + tautan publik + klien Wablas.
type Service struct {
	repo   *Repository
	guru   *guru.Service
	peng   *penggajian.Service
	wablas *Client
}

func NewService(repo *Repository, guruSvc *guru.Service, pengSvc *penggajian.Service, wablas *Client) *Service {
	return &Service{repo: repo, guru: guruSvc, peng: pengSvc, wablas: wablas}
}

// BuildMessage menyusun teks WA: pembuka doa + tautan slip + saran unduh PDF.
func BuildMessage(nama, labelPeriode string, total int, url string) string {
	var b strings.Builder
	fmt.Fprintf(&b, "Assalamu'alaikum, %s.\n\n", nama)
	b.WriteString(openingDoa)
	b.WriteString("\n\nSlip gaji periode ")
	b.WriteString(labelPeriode)
	if total > 0 {
		fmt.Fprintf(&b, " (%s)", rupiah(total))
	}
	b.WriteString(" dapat dilihat pada tautan berikut:\n")
	b.WriteString(url)
	b.WriteString("\n\nTautan bersifat sementara. Mohon unduh PDF-nya untuk simpanan pribadi.")
	b.WriteString("\n\n_Pesan otomatis dari sistem penggajian._")
	return b.String()
}

// EnqueueAll memasukkan seluruh karyawan aktif yang punya no_telp ke antrian
// (status pending) untuk diproses worker. Yang no_telp kosong dilewati.
func (s *Service) EnqueueAll(periodeInput string) (*EnqueueResult, error) {
	p, err := periode.Parse(periodeInput)
	if err != nil {
		return nil, err
	}
	emps, err := s.guru.List("", nil, true)
	if err != nil {
		return nil, err
	}
	res := &EnqueueResult{}
	for _, e := range emps {
		if strings.TrimSpace(e.NoTelp) == "" {
			res.Skipped++
			continue
		}
		row := &KirimWA{
			EmployeeID: e.ID,
			Periode:    p,
			NoTelp:     e.NoTelp,
			Status:     StatusPending,
		}
		if err := s.repo.Upsert(row); err != nil {
			return nil, err
		}
		res.Enqueued++
	}
	return res, nil
}

// SendOne mengirim slip 1 karyawan secara sinkron (untuk tombol per baris).
// Status dikembalikan tanpa memakai antrian.
func (s *Service) SendOne(employeeID uint, periodeInput string) (*SendResult, error) {
	p, err := periode.Parse(periodeInput)
	if err != nil {
		return nil, err
	}
	emp, err := s.guru.Get(employeeID)
	if err != nil {
		return nil, err
	}
	if strings.TrimSpace(emp.NoTelp) == "" {
		return &SendResult{
			EmployeeID: employeeID,
			Nama:       emp.Nama,
			Status:     StatusFailed,
			Message:    "Nomor WA belum diisi untuk karyawan ini",
		}, nil
	}
	return s.sendAndRecord(employeeID, emp.Nama, emp.NoTelp, p), nil
}

// sendAndRecord mengirim pesan kini & menyimpan status akhir (sent/failed).
func (s *Service) sendAndRecord(employeeID uint, nama, noTelp string, p time.Time) *SendResult {
	total := 0
	if slip, err := s.peng.Slip(periode.Format(p), employeeID); err == nil && slip != nil {
		total = slip.TotalGaji
	}
	token, _ := publik.Sign(employeeID)
	msg := BuildMessage(nama, periode.MonthLabel(p), total, publik.PublicURL(token))

	row := &KirimWA{EmployeeID: employeeID, Periode: p, NoTelp: noTelp, Attempts: 1}
	sendErr := s.wablas.SendMessage(noTelp, msg)
	applyResult(row, sendErr)
	if err := s.repo.Upsert(row); err != nil {
		log.Printf("[sdm-kirimwa] gagal simpan status karyawan %d: %v", employeeID, err)
	}

	res := &SendResult{EmployeeID: employeeID, Nama: nama, Status: row.Status, Message: "Terkirim"}
	if sendErr != nil {
		res.Message = sendErr.Error()
	}
	return res
}

// StatusList mengembalikan status pengiriman seluruh baris pada satu periode.
func (s *Service) StatusList(periodeInput string) ([]StatusItem, error) {
	p, err := periode.Parse(periodeInput)
	if err != nil {
		return nil, err
	}
	rows, err := s.repo.ListByPeriode(p)
	if err != nil {
		return nil, err
	}
	emps, err := s.guru.List("", nil, false)
	if err != nil {
		return nil, err
	}
	nama := make(map[uint]string, len(emps))
	for _, e := range emps {
		nama[e.ID] = e.Nama
	}
	out := make([]StatusItem, 0, len(rows))
	for _, r := range rows {
		out = append(out, StatusItem{
			EmployeeID: r.EmployeeID,
			Nama:       nama[r.EmployeeID],
			NoTelp:     r.NoTelp,
			Status:     r.Status,
			PesanError: r.PesanError,
			Attempts:   r.Attempts,
			WaktuKirim: r.WaktuKirim,
		})
	}
	return out, nil
}

// Run menjalankan worker latar sampai ctx dibatalkan. Worker tidak aktif bila
// Wablas belum dikonfigurasi (biar dev tanpa kredensial tetap aman).
func (s *Service) Run(ctx context.Context) {
	if !s.wablas.Configured() {
		log.Println("[sdm-kirimwa] Wablas belum dikonfigurasi — worker tidak aktif")
		return
	}
	log.Println("[sdm-kirimwa] worker antrian WA aktif")
	ticker := time.NewTicker(pollEvery)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			log.Println("[sdm-kirimwa] worker berhenti")
			return
		case <-ticker.C:
			s.processPending()
		}
	}
}

func (s *Service) processPending() {
	rows, err := s.repo.Pending(batchSize)
	if err != nil {
		log.Printf("[sdm-kirimwa] gagal ambil antrian: %v", err)
		return
	}
	for i := range rows {
		row := rows[i]
		emp, err := s.guru.Get(row.EmployeeID)
		if err != nil {
			row.Attempts++
			row.Status = StatusFailed
			row.PesanError = "Karyawan tidak ditemukan"
			_ = s.repo.Save(&row)
			continue
		}
		total := 0
		if slip, serr := s.peng.Slip(periode.Format(row.Periode), row.EmployeeID); serr == nil && slip != nil {
			total = slip.TotalGaji
		}
		token, _ := publik.Sign(row.EmployeeID)
		msg := BuildMessage(emp.Nama, periode.MonthLabel(row.Periode), total, publik.PublicURL(token))

		sendErr := s.wablas.SendMessage(emp.NoTelp, msg)
		row.Attempts++
		applyResult(&row, sendErr)
		if err := s.repo.Save(&row); err != nil {
			log.Printf("[sdm-kirimwa] gagal simpan status karyawan %d: %v", row.EmployeeID, err)
		}
		time.Sleep(sendSpacing)
	}
}

// applyResult menetapkan status/err/waktu pada baris berdasarkan hasil kirim.
func applyResult(row *KirimWA, sendErr error) {
	if sendErr == nil {
		now := time.Now()
		row.Status = StatusSent
		row.PesanError = ""
		row.WaktuKirim = &now
		return
	}
	row.Status = StatusFailed
	row.PesanError = truncate(sendErr.Error(), 255)
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max]
}

// rupiah memberi format ribuan titik, mis. 1810000 → "Rp 1.810.000".
func rupiah(n int) string {
	s := strconv.Itoa(n)
	neg := strings.HasPrefix(s, "-")
	if neg {
		s = s[1:]
	}
	var b strings.Builder
	for i, c := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			b.WriteByte('.')
		}
		b.WriteRune(c)
	}
	out := "Rp " + b.String()
	if neg {
		return "-" + out
	}
	return out
}
