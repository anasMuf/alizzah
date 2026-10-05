package kirimwa

import "time"

// SendRequest — body endpoint kirim (single & massal).
type SendRequest struct {
	Periode string `json:"periode" validate:"required"`
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
	Enqueued int `json:"enqueued"` // masuk antrian
	Skipped  int `json:"skipped"`  // dilewati (no_telp kosong)
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
