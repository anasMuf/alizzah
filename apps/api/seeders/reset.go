package seeders

import (
	"log"
	"strings"

	"gorm.io/gorm"
)

// SeederGroup mendefinisikan grup tabel dan fungsi seeder-nya.
type SeederGroup struct {
	Tables []string          // tabel yang di-truncate (CASCADE otomatis hapus child)
	Seed   func(db *gorm.DB) // fungsi seeder yang dipanggil ulang
}

// AvailableGroups berisi semua grup yang bisa di-reset secara selektif.
// Key = nama grup yang dipakai di CLI flag.
var AvailableGroups = map[string]SeederGroup{
	"users": {
		Tables: []string{"users"},
		Seed:   SeedUsers,
	},
	"academic_years": {
		Tables: []string{"academic_years"},
		Seed:   SeedAcademicYears,
	},
	"class_groups": {
		Tables: []string{"class_groups"},
		Seed:   SeedClassGroups,
	},
	"extracurriculars": {
		Tables: []string{"extracurriculars"},
		Seed:   SeedExtracurriculars,
	},
	"fee_configs": {
		Tables: []string{"fee_configs"},
		Seed:   SeedFeeConfigs,
	},
	"expense_categories": {
		Tables: []string{"expense_categories"},
		Seed:   SeedExpenseCategories,
	},
	"students": {
		Tables: []string{"students", "guardians"},
		Seed:   SeedStudentsFromLegacy,
	},
	"effective_days": {
		Tables: []string{"effective_days"},
		Seed:   SeedEffectiveDays,
	},
	"transactions": {
		Tables: []string{
			"daily_closings",
			"income_transactions",
			"cash_transactions",
			"vault_transactions",
			"expenses",
			"savings_transactions",
			"payment_items",
			"payments",
			"student_savings",
			"invoice_installments",
			"invoice_items",
			"invoices",
			"student_extracurriculars",
		},
		Seed: SeedSampleTransactions,
	},
}

// allTablesOrdered berisi semua tabel untuk reset total.
// Urutan: child tables dulu agar TRUNCATE CASCADE berjalan lancar.
var allTablesOrdered = []string{
	// Batch 7
	"daily_closings",
	// Income transactions
	"income_transactions",
	// Batch 6
	"cash_transactions",
	"vault_transactions",
	"expenses",
	"savings_transactions",
	"payment_items",
	"payments",
	"student_savings",
	"expense_categories",
	// Batch 5
	"invoice_installments",
	"invoice_items",
	"invoices",
	// Batch 4
	"fee_config_items",
	"fee_configs",
	// Batch 3
	"student_extracurriculars",
	"student_academic_events",
	"daycare_enrollments",
	"effective_days",
	"student_enrollments",
	"extracurriculars",
	// Batch 2
	"student_guardians",
	"guardians",
	"students",
	"class_groups",
	// Batch 1
	"academic_years",
	"users",
}

// ResetAll menghapus semua data dari seluruh tabel yang di-manage seeder.
func ResetAll(db *gorm.DB) {
	log.Println("=== RESEED ALL: Menghapus semua data... ===")
	truncateTables(db, allTablesOrdered)
	log.Println("=== RESEED ALL: Semua data berhasil dihapus ===")
}

// ResetGroups menghapus data dan seed ulang untuk grup tertentu.
// groupNames: comma-separated, misal "fee_configs,students"
func ResetGroups(db *gorm.DB, groupNames string) {
	names := strings.Split(groupNames, ",")

	// Validasi semua nama grup
	for _, name := range names {
		name = strings.TrimSpace(name)
		if _, ok := AvailableGroups[name]; !ok {
			log.Printf("RESEED ERROR: grup '%s' tidak dikenal.", name)
			log.Printf("Grup tersedia: %s", availableGroupNames())
			return
		}
	}

	// Truncate tabel per grup
	for _, name := range names {
		name = strings.TrimSpace(name)
		group := AvailableGroups[name]
		log.Printf("=== RESEED [%s]: Menghapus data... ===", name)
		truncateTables(db, group.Tables)
	}

	// Seed ulang per grup
	for _, name := range names {
		name = strings.TrimSpace(name)
		group := AvailableGroups[name]
		log.Printf("=== RESEED [%s]: Menjalankan seeder... ===", name)
		group.Seed(db)
	}
}

func truncateTables(db *gorm.DB, tables []string) {
	for _, table := range tables {
		if err := db.Exec("TRUNCATE TABLE " + table + " RESTART IDENTITY CASCADE").Error; err != nil {
			log.Printf("  Warning: gagal truncate %s: %v", table, err)
		} else {
			log.Printf("  Truncated: %s", table)
		}
	}
}

func availableGroupNames() string {
	names := make([]string, 0, len(AvailableGroups))
	for k := range AvailableGroups {
		names = append(names, k)
	}
	return strings.Join(names, ", ")
}
