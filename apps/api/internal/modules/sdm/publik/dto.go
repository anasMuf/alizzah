package publik

import "api/internal/modules/sdm/penggajian"

// EmployeePublic — profil ringkas yang boleh tampil di halaman publik.
type EmployeePublic struct {
	ID           uint    `json:"id"`
	Nama         string  `json:"nama"`
	GolonganKode string  `json:"golongan_kode"`
	TglMasuk     *string `json:"tgl_masuk"`
	Sertifikasi  bool    `json:"sertifikasi"`
	Impasing     bool    `json:"impasing"`
}

// PublicSlipResponse — data halaman publik: profil + riwayat gaji.
type PublicSlipResponse struct {
	Employee EmployeePublic            `json:"employee"`
	Riwayat  []penggajian.RiwayatBulan `json:"riwayat"`
}

// ShareLinkResponse — hasil endpoint admin pembuat tautan.
type ShareLinkResponse struct {
	URL       string `json:"url"`
	ExpiresAt string `json:"expires_at"`
}
