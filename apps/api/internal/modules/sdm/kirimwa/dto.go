package kirimwa

import "time"

// SendRequest — body endpoint kirim (single & massal).
type SendRequest struct {
	Periode string `json:"periode" validate:"required"`
}

// MarkSentRequest — body endpoint "tandai terkirim" (per karyawan / massal).
type MarkSentRequest struct {
	Periode    string `json:"periode" validate:"required"`
	EmployeeID uint   `json:"employee_id"` // 0 = massal (semua baris gagal/belum pasti)
}

// MarkSentResult — jumlah baris yang berubah statusnya menjadi `sent`.
type MarkSentResult struct {
	Updated int `json:"updated"`
}

// SendResult — hasil pengiriman satu karyawan (sinkron).
type SendResult struct {
	EmployeeID uint   `json:"employee_id"`
	Nama       string `json:"nama"`
	Status     string `json:"status"`
	Message    string `json:"message"`
}

// EnqueueResult — ringkasan penjadwalan kirim massal (async).
type EnqueueResult struct {
	Enqueued    int `json:"enqueued"`     // masuk antrian
	Skipped     int `json:"skipped"`      // dilewati (tanpa data gaji / no_telp kosong)
	AlreadySent int `json:"already_sent"` // sudah terkirim → tidak dikirim ulang
	Processing  int `json:"processing"`   // sedang diproses worker → dilewati agar tidak dobel
}

// StatusItem — status pengiriman satu karyawan pada satu periode.
type StatusItem struct {
	EmployeeID uint       `json:"employee_id"`
	Nama       string     `json:"nama"`
	NoTelp     string     `json:"no_telp"`
	Status     string     `json:"status"`
	PesanError string     `json:"pesan_error"`
	Attempts   int        `json:"attempts"`
	WaktuKirim *time.Time `json:"waktu_kirim"`
}
