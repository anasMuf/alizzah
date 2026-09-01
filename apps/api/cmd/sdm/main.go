// Command sdm adalah binary API modul SDM/HR — Penggajian. Dideploy & direstart
// terpisah dari school-api (cmd/api) dan koperasi-api (cmd/koperasi) demi
// isolasi fault, namun berbagi database yang sama.
//
// Lihat docs/architecture/adr-002-deployment-multi-binary.md dan docs/sdm/plan.md.
package main

import (
	"flag"
	"log"

	"api/config"
	"api/internal/bootstrap"
	"api/internal/modules/sdm"
	"api/internal/shared"
)

func main() {
	config.LoadEnv()
	db := config.DBInit()
	flag.Parse()

	deps := shared.New(db)
	mod := sdm.New(deps)

	// sdm-api memigrasi tabel miliknya sendiri (sdm_*) → deploy independen.
	if err := db.AutoMigrate(mod.Models()...); err != nil {
		log.Fatal("Gagal AutoMigrate sdm:", err)
	}

	// Seed data master & karyawan (idempotent, dari dump penggajian lama).
	sdm.Seed(db)

	// Sumber kanonik karyawan = modul SDM → pastikan koperasi_employees adalah
	// view atas sdm_employees (idempotent; juga dipanggil oleh cmd/koperasi).
	if err := sdm.EnsureEmployeeView(db); err != nil {
		log.Fatalf("EnsureEmployeeView gagal: %v", err)
	}

	e := bootstrap.NewEcho()
	mod.RegisterRoutes(bootstrap.APIGroup(e))

	// Port dari env SDM_PORT (default 8082) — terpisah dari PORT/KOPERASI_PORT
	// agar tiga binary bisa jalan bersama di satu host saat dev.
	log.Println("sdm-api starting...")
	bootstrap.Run(e, bootstrap.Port("SDM_PORT", "8082"))
}
