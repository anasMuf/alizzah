package pinjam

// CreateRequest — pinjaman baru (ditambahkan ke saldo akumulatif karyawan).
type CreateRequest struct {
	EmployeeID uint `json:"employee_id" validate:"required"`
	Jumlah     int  `json:"jumlah" validate:"required,gt=0"`
}

// PayRequest — bayar angsuran untuk periode tertentu.
// Periode menerima "YYYY-MM" atau "YYYY-MM-05" (dinormalisasi ke day=payday).
type PayRequest struct {
	Periode  string `json:"periode" validate:"required,max=10"`
	Angsuran int    `json:"angsuran" validate:"required,gt=0"`
}

// Item — baris daftar pinjaman.
type Item struct {
	ID               uint    `json:"id"`
	EmployeeID       uint    `json:"employee_id"`
	NamaKaryawan     string  `json:"nama"`
	TglPinjam        string  `json:"tgl_pinjam"`
	Jumlah           int     `json:"jumlah"`
	AngsuranTerbayar int     `json:"angsuran_terbayar"`
	Sisa             int     `json:"sisa"`
	IsLunas          bool    `json:"is_lunas"`
	TglLunas         *string `json:"tgl_lunas"`
}

// DetailResponse — pinjaman + riwayat angsuran.
type DetailResponse struct {
	Item
	Angsuran []AngsuranItem `json:"angsuran"`
}

// AngsuranItem — riwayat angsuran (periode dalam format YYYY-MM-05).
type AngsuranItem struct {
	ID       uint   `json:"id"`
	Periode  string `json:"periode"`
	Angsuran int    `json:"angsuran"`
	Tanggal  string `json:"tanggal"`
}
