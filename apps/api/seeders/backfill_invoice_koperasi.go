package seeders

import (
	"log"

	"gorm.io/gorm"
)

// BackfillInvoiceKoperasiFlags menandai invoice_items lama yang berasal dari
// fee item koperasi (fee_config_items.is_koperasi = true) tetapi flag-nya belum
// ter-denormalisasi (is_koperasi = false). Tanpa flag ini, pembayaran item
// tersebut tidak memicu pencatatan ke kas koperasi (seam payment→koperasi di
// payment_service.go).
//
// Hanya item yang BELUM lunas (status <> 'paid') yang di-backfill: untuk item
// yang sudah lunas, pembayarannya sudah terjadi sehingga seam tidak bisa
// dijalankan retroaktif.
//
// Match by fee_config (per tahun ajaran invoice) + name + category. Idempotent:
// hanya menyentuh baris dengan is_koperasi = false.
func BackfillInvoiceKoperasiFlags(db *gorm.DB) {
	// Correlated subquery (bukan UPDATE..FROM..JOIN yang mereferensikan target
	// `ii` di dalam ON — pola itu tidak reliabel di Postgres). EXISTS menyaring
	// baris yang punya fee item koperasi padanan; subquery SET mengambil
	// koperasi_product_id padanannya.
	res := db.Exec(`
		UPDATE invoice_items AS ii
		SET is_koperasi = true,
		    koperasi_product_id = (
		        SELECT fci.koperasi_product_id
		        FROM fee_config_items fci
		        JOIN fee_configs fc ON fc.id = fci.fee_config_id
		        JOIN invoices inv ON inv.academic_year_id = fc.academic_year_id
		        WHERE inv.id = ii.invoice_id
		          AND fci.name = ii.name
		          AND fci.category = ii.category
		          AND fci.is_koperasi = true
		        LIMIT 1
		    )
		WHERE ii.is_koperasi = false
		  AND ii.status <> 'paid'
		  AND EXISTS (
		        SELECT 1
		        FROM fee_config_items fci
		        JOIN fee_configs fc ON fc.id = fci.fee_config_id
		        JOIN invoices inv ON inv.academic_year_id = fc.academic_year_id
		        WHERE inv.id = ii.invoice_id
		          AND fci.name = ii.name
		          AND fci.category = ii.category
		          AND fci.is_koperasi = true
		    )
	`)
	if res.Error != nil {
		log.Println("BackfillInvoiceKoperasiFlags: gagal backfill:", res.Error)
		return
	}
	if res.RowsAffected > 0 {
		log.Printf("BackfillInvoiceKoperasiFlags: %d invoice_item belum lunas di-backfill flag koperasi", res.RowsAffected)
	}
}
