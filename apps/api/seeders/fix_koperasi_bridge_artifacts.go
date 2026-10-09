package seeders

import (
	"log"

	"gorm.io/gorm"
)

// FixKoperasiBridgeArtifacts membersihkan artefak "bridge" koperasi→sekolah.
//
// Latar: dua fitur koperasi menyalin transaksi koperasi ke ledger keuangan
// sekolah:
//   - "lain-lain" (internal/modules/koperasi/lainlain) — income & expense;
//   - "pembelian" (internal/modules/koperasi/pembelian) — pengeluaran pembelian.
//
// Penyalinan income menghasilkan cash_transactions.source_type = 'koperasi_income';
// penyalinan expense menghasilkan baris `expenses` kategori "Koperasi" + satu
// cash_transactions 'expense'.
//
// Bridge kini dikendalikan env KOPERASI_BRIDGE_ENABLED (default false, lihat
// internal/modules/koperasi/bridge). Saat nonaktif, salinan di ledger sekolah
// menjadi artefak yang harus dibersihkan agar modul koperasi benar-benar
// terpisah dari laporan keuangan sekolah.
//
// Hanya baris yang dapat dipastikan berasal dari bridge yang disentuh:
//   - income: seluruh cash_transactions dengan source_type='koperasi_income'
//     (hanya bridge yang menulis nilai ini — input manual memakai 'expense').
//   - expense (lain-lain): `expenses` kategori "Koperasi" yang PERSIS sama
//     (amount + tanggal + deskripsi) dengan koperasi_misc_transactions flow 'expense'.
//   - expense (pembelian): `expenses` kategori "Koperasi" berdeskripsi
//     "Pembelian koperasi #…" / "Pembayaran pembelian koperasi #…".
//
// Penghapusan mengikuti perilaku aplikasi: cash_transactions dihapus permanen
// (tidak punya deleted_at), expenses di-soft-delete (deleted_at).
//
// Idempotent: baris yang sudah bersih tidak terpengaruh.
func FixKoperasiBridgeArtifacts(db *gorm.DB) {
	const bridgeExpensesCTE = `
		WITH bridge_expenses AS (
			SELECT e.id
			FROM expenses e
			JOIN expense_categories c ON c.id = e.expense_category_id
			WHERE e.deleted_at IS NULL
			  AND c.name = 'Koperasi'
			  AND (
			      EXISTS (
			          SELECT 1 FROM koperasi_misc_transactions m
			          WHERE m.deleted_at IS NULL
			            AND m.flow = 'expense'
			            AND m.amount = e.amount
			            AND m.transaction_date = e.expense_date
			            AND m.description = e.description
			      )
			      OR e.description LIKE 'Pembelian koperasi #%'
			      OR e.description LIKE 'Pembayaran pembelian koperasi #%'
			  )
		)`

	err := db.Transaction(func(tx *gorm.DB) error {
		// 1. Income bridge — hanya bridge yang membuat source_type='koperasi_income'.
		income := tx.Exec(`DELETE FROM cash_transactions WHERE source_type = 'koperasi_income'`)
		if income.Error != nil {
			return income.Error
		}

		// 2. Expense bridge — hapus cash_transactions 'expense' yang menunjuk ke
		//    expenses bridge, lalu soft-delete expenses-nya.
		cash := tx.Exec(bridgeExpensesCTE + `
			DELETE FROM cash_transactions
			WHERE source_type = 'expense'
			  AND source_id IN (SELECT id FROM bridge_expenses)`)
		if cash.Error != nil {
			return cash.Error
		}

		exp := tx.Exec(bridgeExpensesCTE + `
			UPDATE expenses SET deleted_at = now()
			WHERE id IN (SELECT id FROM bridge_expenses)`)
		if exp.Error != nil {
			return exp.Error
		}

		if income.RowsAffected > 0 || cash.RowsAffected > 0 || exp.RowsAffected > 0 {
			log.Printf("[FixKoperasiBridgeArtifacts] dibersihkan: cash_transactions koperasi_income=%d, cash_transactions expense=%d, expenses=%d",
				income.RowsAffected, cash.RowsAffected, exp.RowsAffected)
		} else {
			log.Println("[FixKoperasiBridgeArtifacts] tidak ada artefak bridge koperasi→sekolah")
		}
		return nil
	})
	if err != nil {
		log.Printf("[FixKoperasiBridgeArtifacts] gagal: %v", err)
	}
}
