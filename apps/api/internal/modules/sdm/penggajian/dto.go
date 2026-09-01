// Package penggajian menghitung gaji bulanan karyawan dengan rumus yang
// dipertahankan persis dari aplikasi lama (lihat docs/old/penggajian/docs/
// 03-logika-bisnis-kalkulasi-gaji.md). Berbeda dengan lama (SQL view dinamis),
// kalkulasi dipindahkan ke service layer sehingga mudah diuji unit.
//
// Komponen gaji: HR Pokok, Kehadiran, Kedisiplinan (siaga+piket+bonus),
// Fungsional, Tugas Tambahan, Penanggung Jawab, Lain-lain, − Angsuran Pinjaman.
package penggajian

// Response — satu baris gaji karyawan untuk satu periode.
type Response struct {
	EmployeeID   uint   `json:"employee_id"`
	NamaKaryawan string `json:"nama"`
	GolonganKode string `json:"golongan_kode"`

	// HR Pokok
	HRPokok     int  `json:"hr_pokok"`
	Sertifikasi bool `json:"sertifikasi"`
	Impasing    bool `json:"impasing"`

	// HR Kehadiran
	JumlahHadir int `json:"jumlah_hadir"`
	Kehadiran   int `json:"kehadiran"`

	// HR Kedisiplinan
	JumlahSiaga    int `json:"jumlah_siaga"`
	Siaga          int `json:"siaga"`
	JumlahPiket    int `json:"jumlah_piket"`
	Piket          int `json:"piket"`
	JumlahTelat    int `json:"jumlah_telat"`
	BonusTerlambat int `json:"bonus_terlambat"`
	JumlahPulang   int `json:"jumlah_pulang"`
	BonusPulang    int `json:"bonus_pulang_awal"`

	// Subtotal
	SubtotalAbsen int `json:"subtotal_absen"`
	SubtotalF     int `json:"subtotal_f"`
	SubtotalT     int `json:"subtotal_t"`
	SubtotalP     int `json:"subtotal_p"`
	SubtotalL     int `json:"subtotal_l"`
	Angsuran      int `json:"angsuran"`
	TotalGaji     int `json:"total_gaji"`
}

// SlipItem — baris komponen untuk slip gaji (nama + nominal).
type SlipItem struct {
	Nama    string `json:"nama"`
	Nominal int    `json:"nominal"`
}

// SlipResponse — slip gaji detail 1 karyawan.
type SlipResponse struct {
	Response
	RincianFungsional      []SlipItem `json:"rincian_fungsional"`
	RincianTugasTambahan   []SlipItem `json:"rincian_tugas_tambahan"`
	RincianPenanggungJawab []SlipItem `json:"rincian_penanggung_jawab"`
	RincianLainlain        []SlipItem `json:"rincian_lainlain"`
}

// SummaryResponse — statistik dashboard modul SDM.
type SummaryResponse struct {
	JumlahKaryawanAktif int            `json:"jumlah_karyawan_aktif"`
	JumlahGolongan      int            `json:"jumlah_golongan"`
	PinjamanAktif       int            `json:"pinjaman_aktif"`
	TotalSisaPinjaman   int            `json:"total_sisa_pinjaman"`
	TotalGajiBulanIni   int            `json:"total_gaji_bulan_ini"`
	PerBulan            []BulanGaji    `json:"per_bulan"`
	GuruPerGolongan     []GolonganStat `json:"guru_per_golongan"`
}

type BulanGaji struct {
	Bulan     string `json:"bulan"` // 01–12
	TotalGaji int    `json:"total_gaji"`
}

type GolonganStat struct {
	Kode   string `json:"kode"`
	Jumlah int    `json:"jumlah"`
}

// PayrollStatusResponse — hasil GET /penggajian: preview (dinamis) atau
// finalized (snapshot tersimpan).
type PayrollStatusResponse struct {
	Status      string     `json:"status"` // preview | finalized
	FinalizedAt *string    `json:"finalized_at,omitempty"`
	FinalizedBy string     `json:"finalized_by,omitempty"`
	TotalGaji   int        `json:"total_gaji"`
	Rows        []Response `json:"rows"`
}

// FinalizeRequest — body POST /penggajian/finalize & /unlock.
type FinalizeRequest struct {
	Periode string `json:"periode" validate:"required,max=10"`
}

// RekapBulan — ringkasan satu bulan dalam rekap per Tahun Ajaran.
type RekapBulan struct {
	Periode        string `json:"periode"` // YYYY-MM-05
	Label          string `json:"label"`   // "Agustus 2025"
	Status         string `json:"status"`  // preview | finalized
	TotalGaji      int    `json:"total_gaji"`
	JumlahKaryawan int    `json:"jumlah_karyawan"`
}

// RekapResponse — rekap gaji seluruh bulan dalam rentang Tahun Ajaran.
type RekapResponse struct {
	AcademicYearID   uint         `json:"academic_year_id"`
	AcademicYearName string       `json:"academic_year_name"`
	PerBulan         []RekapBulan `json:"per_bulan"`
	TotalGaji        int          `json:"total_gaji"`
}
