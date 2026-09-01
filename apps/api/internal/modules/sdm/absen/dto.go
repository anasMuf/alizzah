package absen

import (
	"api/internal/modules/sdm/periode"
)

// AbsenEntry — satu baris input absensi (per karyawan).
type AbsenEntry struct {
	EmployeeID     uint `json:"employee_id" validate:"required"`
	Hadir          int  `json:"hadir" validate:"gte=0"`
	HadirSiaga     int  `json:"hadir_siaga" validate:"gte=0"`
	HadirTerlambat int  `json:"hadir_terlambat" validate:"gte=0"`
	HadirPiket     int  `json:"hadir_piket" validate:"gte=0"`
	PulangAwal     int  `json:"pulang_awal" validate:"gte=0"`
}

// UpsertRequest — simpan absensi satu periode (bulk upsert).
// Periode menerima "YYYY-MM" atau "YYYY-MM-05" (dinormalisasi ke day=payday).
type UpsertRequest struct {
	Periode string       `json:"periode" validate:"required,max=10"`
	Items   []AbsenEntry `json:"items" validate:"required,dive"`
}

// Response — baris absensi + informasi karyawan (untuk tampilan).
type Response struct {
	ID             uint   `json:"id"`
	Periode        string `json:"periode"` // YYYY-MM-05
	EmployeeID     uint   `json:"employee_id"`
	NamaKaryawan   string `json:"nama"`
	Hadir          int    `json:"hadir"`
	HadirSiaga     int    `json:"hadir_siaga"`
	HadirTerlambat int    `json:"hadir_terlambat"`
	HadirPiket     int    `json:"hadir_piket"`
	PulangAwal     int    `json:"pulang_awal"`
}

func toResponse(a *Absen) Response {
	r := Response{
		ID: a.ID, Periode: periode.Format(a.Periode), EmployeeID: a.EmployeeID,
		Hadir: a.Hadir, HadirSiaga: a.HadirSiaga, HadirTerlambat: a.HadirTerlambat,
		HadirPiket: a.HadirPiket, PulangAwal: a.PulangAwal,
	}
	if a.Employee != nil {
		r.NamaKaryawan = a.Employee.Nama
	}
	return r
}
