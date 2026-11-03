package kirimwa

import (
	"errors"
	"strings"
	"testing"
	"time"

	"api/internal/modules/sdm/guru"
	"api/internal/modules/sdm/master"
)

func TestNormalizePhone(t *testing.T) {
	cases := []struct {
		in   string
		want string
		ok   bool
	}{
		{"08123456789", "628123456789", true},
		{"+62 812-3456-789", "628123456789", true},
		{"628123456789", "628123456789", true},
		{"8123456789", "628123456789", true},
		{"", "", false},
		{"   ", "", false},
	}
	for _, c := range cases {
		got, ok := NormalizePhone(c.in)
		if ok != c.ok || got != c.want {
			t.Errorf("NormalizePhone(%q) = (%q,%v), mau (%q,%v)", c.in, got, ok, c.want, c.ok)
		}
	}
}

func TestBuildMessage(t *testing.T) {
	msg := BuildMessage("Abdul Rohim", "Oktober 2026", 1810000, "https://x/s/abc")
	for _, want := range []string{
		"Assalamu'alaikum, Abdul Rohim",
		"Alhamdulillah",
		"Semoga Barokah & membawa banyak manfaat",
		"Oktober 2026",
		"Rp 1.810.000",
		"https://x/s/abc",
	} {
		if !strings.Contains(msg, want) {
			t.Errorf("pesan tidak memuat %q:\n%s", want, msg)
		}
	}
}

func TestMapWablasStatus(t *testing.T) {
	cases := []struct {
		in   string
		want string
		ok   bool
	}{
		{"delivered", StatusSent, true},
		{"READ", StatusSent, true},
		{"sent", StatusSent, true},
		{"received", StatusSent, true},
		{"cancel", StatusFailed, true},
		{"rejected", StatusFailed, true},
		{"pending", "", false},
		{"", "", false},
	}
	for _, c := range cases {
		got, ok := mapWablasStatus(c.in)
		if got != c.want || ok != c.ok {
			t.Errorf("mapWablasStatus(%q) = (%q,%v), mau (%q,%v)", c.in, got, ok, c.want, c.ok)
		}
	}
}

// TestApplyResult_TimeoutJadiUnknown memastikan kegagalan jaringan/timeout tidak
// dicap `failed` (yang akan memicu kirim ulang otomatis & pesan dobel).
func TestApplyResult_TimeoutJadiUnknown(t *testing.T) {
	row := &KirimWA{}
	applyResult(row, &TransportError{Err: errors.New("context deadline exceeded")})
	if row.Status != StatusUnknown {
		t.Fatalf("status timeout = %q, mau %q", row.Status, StatusUnknown)
	}
	if row.WaktuKirim != nil {
		t.Error("waktu_kirim tidak boleh diisi untuk status unknown")
	}
	if !strings.Contains(row.PesanError, "Belum pasti") {
		t.Errorf("pesan_error = %q, mau menjelaskan status belum pasti", row.PesanError)
	}

	// Penolakan tegas dari Wablas tetap `failed`.
	row = &KirimWA{}
	applyResult(row, errors.New("token device tidak valid"))
	if row.Status != StatusFailed {
		t.Fatalf("status ditolak = %q, mau %q", row.Status, StatusFailed)
	}
}

func TestRupiah(t *testing.T) {
	cases := map[int]string{
		0:       "Rp 0",
		500:     "Rp 500",
		1000:    "Rp 1.000",
		1810000: "Rp 1.810.000",
	}
	for in, want := range cases {
		if got := rupiah(in); got != want {
			t.Errorf("rupiah(%d) = %q, mau %q", in, got, want)
		}
	}
}

// TestEnqueue_SkipYangSudahTerkirim memastikan "Kirim Semua" tidak mengantrekan
// ulang baris `sent`/`processing` (penyebab pesan dobel), sementara baris `failed`
// boleh masuk antrian lagi.
func TestEnqueue_SkipYangSudahTerkirim(t *testing.T) {
	db := newTestDB(t)
	repo := NewRepository(db)
	p := time.Date(2026, 10, 5, 0, 0, 0, 0, time.Local)

	for emp, st := range map[uint]string{
		2: StatusSent,
		3: StatusProcessing,
		4: StatusFailed,
	} {
		if err := repo.Upsert(&KirimWA{EmployeeID: emp, Periode: p, NoTelp: "6281", Status: st}); err != nil {
			t.Fatalf("upsert karyawan %d: %v", emp, err)
		}
	}

	emps := []guru.EmployeeItem{
		{ID: 1, NoTelp: "62801"}, // belum pernah dikirim
		{ID: 2, NoTelp: "62802"}, // sudah terkirim
		{ID: 3, NoTelp: "62803"}, // sedang diproses
		{ID: 4, NoTelp: "62804"}, // gagal → boleh diantrekan lagi
		{ID: 5, NoTelp: ""},      // tanpa no. WA
		{ID: 6, NoTelp: "62806"}, // tanpa data gaji periode
	}
	adaData := map[uint]bool{1: true, 2: true, 3: true, 4: true, 5: true}
	statusByEmp := map[uint]string{2: StatusSent, 3: StatusProcessing, 4: StatusFailed}

	res, err := (&Service{repo: repo}).enqueue(p, emps, adaData, statusByEmp)
	if err != nil {
		t.Fatalf("enqueue: %v", err)
	}
	if res.Enqueued != 2 || res.AlreadySent != 1 || res.Processing != 1 || res.Skipped != 2 {
		t.Fatalf("hasil antrean = %+v, mau 2 masuk / 1 sent / 1 processing / 2 dilewati", res)
	}

	status := func(emp uint) KirimWA {
		var row KirimWA
		if err := db.Where("employee_id = ? AND periode = ?", emp, p).First(&row).Error; err != nil {
			t.Fatalf("baca karyawan %d: %v", emp, err)
		}
		return row
	}
	if got := status(2); got.Status != StatusSent {
		t.Errorf("karyawan 2 status = %q, mau tetap %q", got.Status, StatusSent)
	}
	if got := status(3); got.Status != StatusProcessing {
		t.Errorf("karyawan 3 status = %q, mau tetap %q", got.Status, StatusProcessing)
	}
	if got := status(4); got.Status != StatusPending {
		t.Errorf("karyawan 4 status = %q, mau %q (diantrekan ulang)", got.Status, StatusPending)
	}

	// Upsert ulang untuk karyawan 2 tidak boleh terjadi — nomornya tetap yang lama.
	if got := status(2); got.NoTelp != "6281" {
		t.Errorf("karyawan 2 no_telp = %q, mau tidak berubah", got.NoTelp)
	}
}

// TestRetryFailed_HanyaBarisGagal menguji endpoint "Kirim Ulang yang Gagal":
// hanya baris `failed` yang kembali ke antrian, baris `sent` tidak disentuh,
// dan nomor WA diambil dari data karyawan terbaru bila ada.
func TestRetryFailed_HanyaBarisGagal(t *testing.T) {
	db := newTestDB(t)
	if err := db.AutoMigrate(
		&guru.Employee{}, &guru.GolonganHistory{},
		&guru.FungsionalDetail{}, &guru.TugasTambahanDetail{},
		&guru.PenanggungJawabDetail{}, &guru.LainlainDetail{},
		&master.Golongan{}, &master.Fungsional{}, &master.TugasTambahan{},
		&master.PenanggungJawab{}, &master.Lainlain{},
	); err != nil {
		t.Fatalf("migrate tabel guru: %v", err)
	}
	// Nomor karyawan sudah dikoreksi setelah pengiriman gagal.
	if err := db.Create(&guru.Employee{Nama: "Budi", NoTelp: "6281999", IsActive: true}).Error; err != nil {
		t.Fatalf("buat karyawan: %v", err)
	}

	repo := NewRepository(db)
	p := time.Date(2026, 10, 5, 0, 0, 0, 0, time.Local)
	rows := []KirimWA{
		{EmployeeID: 1, Periode: p, NoTelp: "6281000", Status: StatusFailed, PesanError: "timeout", Attempts: 1},
		{EmployeeID: 2, Periode: p, NoTelp: "6282000", Status: StatusSent, Attempts: 1},
		{EmployeeID: 3, Periode: p, NoTelp: "6283000", Status: StatusFailed, PesanError: "timeout", Attempts: 1},
	}
	for i := range rows {
		if err := db.Create(&rows[i]).Error; err != nil {
			t.Fatalf("buat baris kirim wa: %v", err)
		}
	}

	svc := &Service{repo: repo, guru: guru.NewService(guru.NewRepository(db), master.NewRepository(db))}
	res, err := svc.RetryFailed("2026-10")
	if err != nil {
		t.Fatalf("RetryFailed: %v", err)
	}
	if res.Enqueued != 2 || res.Skipped != 0 {
		t.Fatalf("hasil retry = %+v, mau 2 masuk antrian", res)
	}

	status := func(emp uint) KirimWA {
		var row KirimWA
		if err := db.Where("employee_id = ? AND periode = ?", emp, p).First(&row).Error; err != nil {
			t.Fatalf("baca karyawan %d: %v", emp, err)
		}
		return row
	}

	// Karyawan 1 (gagal) → pending, pesan_error dibersihkan, nomor diperbarui.
	if got := status(1); got.Status != StatusPending || got.PesanError != "" || got.NoTelp != "6281999" {
		t.Errorf("karyawan 1 = %+v, mau pending + nomor terbaru + pesan_error kosong", got)
	}
	// Karyawan 2 (terkirim) → tidak boleh berubah.
	if got := status(2); got.Status != StatusSent || got.PesanError != "" {
		t.Errorf("karyawan 2 = %+v, mau tetap sent tanpa pesan_error", got)
	}
	// Karyawan 3 (gagal, data karyawan tidak ada) → tetap diantrekan dengan nomor lama.
	if got := status(3); got.Status != StatusPending || got.NoTelp != "6283000" {
		t.Errorf("karyawan 3 = %+v, mau pending dengan nomor lama", got)
	}
}
