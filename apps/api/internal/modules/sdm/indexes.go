package sdm

import (
	"fmt"
	"strings"

	"gorm.io/gorm"
)

// detailUniqueIndexes mendefinisikan keunikan lampiran HR per karyawan.
// Index sengaja partial (`WHERE deleted_at IS NULL`) karena tabel lampiran
// memakai soft delete: baris yang sudah dilepas (detach) tidak boleh lagi
// menghalangi pemasangan ulang item yang sama.
var detailUniqueIndexes = [...]struct {
	name    string
	table   string
	columns []string
}{
	{"uq_fungsional_guru", "sdm_fungsional_detail", []string{"fungsional_id", "employee_id"}},
	{"uq_tugas_tambahan_guru", "sdm_tugas_tambahan_detail", []string{"tugas_tambahan_id", "employee_id"}},
	{"uq_pj_guru", "sdm_penanggung_jawab_detail", []string{"penanggung_jawab_id", "employee_id"}},
	{"uq_lainlain_guru", "sdm_lainlain_detail", []string{"lainlain_id", "employee_id"}},
}

// EnsureIndexes menyelaraskan index lampiran HR ke bentuk partial unique.
// Dipanggil setelah AutoMigrate: index lama (tanpa filter deleted_at) diganti,
// sehingga detach lalu attach ulang tidak memicu duplicate key. Idempotent dan
// aman dijalankan setiap start.
//
// DROP + CREATE dijalankan dalam satu transaksi (DDL PostgreSQL transaksional):
// tidak ada jendela tanpa unique index yang bisa disisipi baris duplikat, dan
// kegagalan CREATE membatalkan DROP sehingga index lama tetap utuh.
func EnsureIndexes(db *gorm.DB) error {
	isPostgres := db.Dialector.Name() == "postgres"
	for _, ix := range detailUniqueIndexes {
		if isPostgres {
			// Lewati bila index sudah berbentuk partial — restart normal tidak
			// perlu mengambil ACCESS EXCLUSIVE lock untuk drop/recreate.
			var ok int64
			if err := db.Raw(
				`SELECT count(*) FROM pg_indexes
				 WHERE schemaname = current_schema() AND indexname = ?
				   AND indexdef LIKE '%deleted_at IS NULL%'`, ix.name,
			).Scan(&ok).Error; err != nil {
				return fmt.Errorf("gagal memeriksa index %s: %w", ix.name, err)
			}
			if ok > 0 {
				continue
			}
		}

		stmt := fmt.Sprintf(
			"CREATE UNIQUE INDEX IF NOT EXISTS %s ON %s (%s) WHERE deleted_at IS NULL",
			ix.name, ix.table, strings.Join(ix.columns, ", "),
		)
		if err := db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Exec("DROP INDEX IF EXISTS " + ix.name).Error; err != nil {
				return err
			}
			return tx.Exec(stmt).Error
		}); err != nil {
			return fmt.Errorf("gagal menyiapkan index %s: %w", ix.name, err)
		}
	}
	return nil
}
