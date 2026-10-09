// Package bridge mengendalikan jembatan lintas-modul koperasi → ledger keuangan
// sekolah (tabel `expenses` + `cash_transactions`).
//
// Jembatan berada di fitur:
//   - "lain-lain" (internal/modules/koperasi/lainlain) — transaksi lain-lain;
//   - "pembelian" (internal/modules/koperasi/pembelian) — pembelian & pembayarannya.
//
// Default NONAKTIF agar modul koperasi terpisah dari laporan keuangan sekolah.
// Saat nonaktif, transaksi koperasi hanya tercatat di ledger koperasi
// (koperasi_cash_transactions) dan input pengeluaran koperasi ke sekolah
// dilakukan manual via catatan expense kategori "Koperasi".
//
// Lihat docs/koperasi/status-dan-lanjutan.md §6.
package bridge

import "os"

// Enabled membaca env KOPERASI_BRIDGE_ENABLED (default: false).
func Enabled() bool {
	return os.Getenv("KOPERASI_BRIDGE_ENABLED") == "true"
}
