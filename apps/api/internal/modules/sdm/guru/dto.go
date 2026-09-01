package guru

// ── Request ──

type EmployeeRequest struct {
	Nama        string `json:"nama" validate:"required,max=100"`
	TglMasuk    string `json:"tgl_masuk" validate:"omitempty,dateonly"`
	GolonganID  *uint  `json:"golongan_id"`
	Sertifikasi bool   `json:"sertifikasi"`
	Impasing    bool   `json:"impasing"`
	IsActive    bool   `json:"is_active"`
}

type AttachFungsionalRequest struct {
	FungsionalID uint `json:"fungsional_id" validate:"required"`
}

type AttachTugasTambahanRequest struct {
	TugasTambahanID uint `json:"tugas_tambahan_id" validate:"required"`
	Nilai           int  `json:"nilai" validate:"gte=0"`
}

type AttachPenanggungJawabRequest struct {
	PenanggungJawabID uint `json:"penanggung_jawab_id" validate:"required"`
}

type AttachLainlainRequest struct {
	Nama  string `json:"nama" validate:"required,max=80"`
	Nilai int    `json:"nilai" validate:"gte=0"`
}

// ── Response ──

type GolonganBrief struct {
	ID         uint   `json:"id"`
	Kode       string `json:"kode"`
	Nilai      int    `json:"nilai"`
	Keterangan string `json:"keterangan"`
}

// EmployeeItem — ringkas, untuk daftar karyawan.
type EmployeeItem struct {
	ID          uint           `json:"id"`
	LegacyID    *int           `json:"legacy_id"`
	Nama        string         `json:"nama"`
	TglMasuk    *string        `json:"tgl_masuk"`
	GolonganID  *uint          `json:"golongan_id"`
	Golongan    *GolonganBrief `json:"golongan,omitempty"`
	EffectiveID uint           `json:"effective_golongan_id"`
	Sertifikasi bool           `json:"sertifikasi"`
	Impasing    bool           `json:"impasing"`
	IsActive    bool           `json:"is_active"`
}

// FungsionalItem / TugasTambahanItem / PenanggungJawabItem / LainlainItem —
// item lampiran HR beserta master-nya.
type FungsionalItem struct {
	ID           uint   `json:"id"`
	FungsionalID uint   `json:"fungsional_id"`
	Nama         string `json:"nama"`
	Nilai        int    `json:"nilai"`
}

type TugasTambahanItem struct {
	ID              uint   `json:"id"`
	TugasTambahanID uint   `json:"tugas_tambahan_id"`
	Nama            string `json:"nama"`
	Nilai           int    `json:"nilai"`
}

type PenanggungJawabItem struct {
	ID                uint   `json:"id"`
	PenanggungJawabID uint   `json:"penanggung_jawab_id"`
	Nama              string `json:"nama"`
	Nilai             int    `json:"nilai"`
}

type LainlainItem struct {
	ID         uint   `json:"id"`
	LainlainID uint   `json:"lainlain_id"`
	Nama       string `json:"nama"`
	Nilai      int    `json:"nilai"`
}

// HRBundle — seluruh lampiran HR milik satu karyawan.
type HRBundle struct {
	Fungsional      []FungsionalItem      `json:"fungsional"`
	TugasTambahan   []TugasTambahanItem   `json:"tugas_tambahan"`
	PenanggungJawab []PenanggungJawabItem `json:"penanggung_jawab"`
	Lainlain        []LainlainItem        `json:"lainlain"`
}

// EmployeeDetail — data lengkap karyawan + lampiran HR.
type EmployeeDetail struct {
	EmployeeItem
	HR HRBundle `json:"hr"`
}
