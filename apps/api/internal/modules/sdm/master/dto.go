package master

// ── Golongan ──

type GolonganRequest struct {
	Kode       string `json:"kode" validate:"required,oneof=A B C D E F"`
	FromDay    *int   `json:"from_day"`
	ToDay      *int   `json:"to_day"`
	Keterangan string `json:"keterangan" validate:"max=120"`
	Nilai      int    `json:"nilai" validate:"required,gte=0"`
}

type GolonganResponse struct {
	ID         uint   `json:"id"`
	Kode       string `json:"kode"`
	FromDay    *int   `json:"from_day"`
	ToDay      *int   `json:"to_day"`
	Keterangan string `json:"keterangan"`
	Nilai      int    `json:"nilai"`
}

// ── Tarif Kehadiran ──

type KehadiranRequest struct {
	NilaiPerHari int `json:"nilai_per_hari" validate:"required,gte=0"`
}

type KehadiranResponse struct {
	ID           uint `json:"id"`
	NilaiPerHari int  `json:"nilai_per_hari"`
}

// ── Kedisiplinan ──

type KedisiplinanRequest struct {
	Kode  string `json:"kode" validate:"required,oneof=siaga terlambat piket pulang_awal"`
	Nama  string `json:"nama" validate:"required,max=50"`
	Nilai int    `json:"nilai" validate:"gte=0"`
}

type KedisiplinanResponse struct {
	ID    uint   `json:"id"`
	Kode  string `json:"kode"`
	Nama  string `json:"nama"`
	Nilai int    `json:"nilai"`
}

// ── Fungsional / Tugas Tambahan / Penanggung Jawab / Lain-lain ──

// ItemRequest dipakai untuk master bernama (fungsional, tugas tambahan,
// penanggung jawab) dengan/atau tanpa nominal.
type ItemRequest struct {
	Nama  string `json:"nama" validate:"required,max=80"`
	Nilai *int   `json:"nilai"`
}

type ItemResponse struct {
	ID    uint   `json:"id"`
	Nama  string `json:"nama"`
	Nilai *int   `json:"nilai"`
}

// LainlainRequest — buat master lain-lain on-the-fly (tanpa nominal; nominal
// disimpan di detail per pemasangan).
type LainlainRequest struct {
	Nama string `json:"nama" validate:"required,max=80"`
}

func toItemResponse(id uint, nama string, nilai *int) *ItemResponse {
	return &ItemResponse{ID: id, Nama: nama, Nilai: nilai}
}
