// Command koperasi adalah binary API modul Koperasi. Dideploy & direstart
// terpisah dari school-api (cmd/api) demi isolasi fault, namun berbagi database
// yang sama sehingga seam lintas-modul tetap satu transaksi DB.
//
// Lihat docs/architecture/adr-002-deployment-multi-binary.md.
package main

import (
	"log"

	"api/config"
	"api/internal/bootstrap"
	"api/internal/modules/koperasi"
	"api/internal/shared"
)

func main() {
	config.LoadEnv()
	db := config.DBInit()

	deps := shared.New(db)
	mod := koperasi.New(deps)

	// koperasi-api memigrasi tabel miliknya sendiri (koperasi_*) → deploy independen.
	if err := db.AutoMigrate(mod.Models()...); err != nil {
		log.Fatal("Gagal AutoMigrate koperasi:", err)
	}

	// Seed data master (anggota, pemasok, barang) bila masih kosong.
	koperasi.Seed(db)

	e := bootstrap.NewEcho()
	mod.RegisterRoutes(bootstrap.APIGroup(e))

	// Port dari env KOPERASI_PORT (default 8081) — terpisah dari PORT milik
	// school-api agar keduanya bisa jalan bersama di satu host saat dev.
	log.Println("koperasi-api starting...")
	bootstrap.Run(e, bootstrap.Port("KOPERASI_PORT", "8081"))
}
