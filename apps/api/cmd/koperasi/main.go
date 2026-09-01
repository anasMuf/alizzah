// Command koperasi adalah binary API modul Koperasi. Dideploy & direstart
// terpisah dari school-api (cmd/api) demi isolasi fault, namun berbagi database
// yang sama sehingga seam lintas-modul tetap satu transaksi DB.
//
// Lihat docs/architecture/adr-002-deployment-multi-binary.md.
package main

import (
	"flag"
	"log"

	"api/config"
	"api/internal/bootstrap"
	"api/internal/modules/koperasi"
	"api/internal/modules/koperasi/barang"
	"api/internal/modules/sdm"
	"api/internal/shared"
)

func main() {
	config.LoadEnv()
	db := config.DBInit()
	flag.Parse()

	deps := shared.New(db)
	mod := koperasi.New(deps)

	// koperasi-api memigrasi tabel miliknya sendiri (koperasi_*) → deploy independen.
	if err := db.AutoMigrate(mod.Models()...); err != nil {
		log.Fatal("Gagal AutoMigrate koperasi:", err)
	}

	// Hapus tabel modal lama (M1c)
	if db.Migrator().HasTable("koperasi_capital_injections") {
		db.Migrator().DropTable("koperasi_capital_injections")
	}
	db.Exec(`DELETE FROM koperasi_cash_transactions WHERE source_type = ?`, "capital_injection")

	// Migrasi data ke model varian (B1): barang lama → varian Default, item lama → variant_id.
	barang.MigrateVariants(db)

	// Seed data master (anggota, pemasok, barang) bila masih kosong.
	koperasi.Seed(db)

	// Sumber kanonik karyawan adalah modul SDM → pastikan koperasi_employees
	// adalah VIEW di atas sdm_employees (idempotent; dipanggil juga oleh cmd/sdm).
	if err := sdm.EnsureEmployeeView(db); err != nil {
		log.Fatalf("EnsureEmployeeView gagal: %v", err)
	}

	e := bootstrap.NewEcho()
	mod.RegisterRoutes(bootstrap.APIGroup(e))

	// Port dari env KOPERASI_PORT (default 8081) — terpisah dari PORT milik
	// school-api agar keduanya bisa jalan bersama di satu host saat dev.
	log.Println("koperasi-api starting...")
	bootstrap.Run(e, bootstrap.Port("KOPERASI_PORT", "8081"))
}
