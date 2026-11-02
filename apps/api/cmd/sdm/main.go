// Command sdm adalah binary API modul SDM/HR — Penggajian. Dideploy & direstart
// terpisah dari school-api (cmd/api) dan koperasi-api (cmd/koperasi) demi
// isolasi fault, namun berbagi database yang sama.
//
// Lihat docs/architecture/adr-002-deployment-multi-binary.md dan docs/sdm/plan.md.
package main

import (
	"context"
	"flag"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"api/config"
	"api/internal/bootstrap"
	"api/internal/modules/sdm"
	"api/internal/modules/sdm/publik"
	"api/internal/shared"
	"api/middleware"
	"api/model"
	"api/repository"
	"api/service"
)

func main() {
	config.LoadEnv()
	// Endpoint publik (tautan slip) hanya aman bila kunci HMAC tersedia.
	if err := publik.ValidateConfig(); err != nil {
		log.Fatalf("Konfigurasi tautan publik tidak valid: %v", err)
	}
	db := config.DBInit()
	flag.Parse()

	deps := shared.New(db)
	mod := sdm.New(deps)

	// sdm-api memigrasi tabel miliknya sendiri (sdm_* + audit_entries) → deploy
	// independen. audit_entries ikut dimigrasi agar audit trail tetap jalan di
	// deployment yang tidak pernah menjalankan school-api.
	models := append(mod.Models(), &model.AuditEntry{})
	if err := db.AutoMigrate(models...); err != nil {
		log.Fatal("Gagal AutoMigrate sdm:", err)
	}

	// Index lampiran HR: partial unique (WHERE deleted_at IS NULL) agar item yang
	// sudah di-detach bisa dipasang ulang tanpa duplicate key.
	if err := sdm.EnsureIndexes(db); err != nil {
		log.Fatal("Gagal menyiapkan index sdm:", err)
	}

	// Seed data master & karyawan (idempotent, dari dump penggajian lama).
	sdm.Seed(db)

	// Sumber kanonik karyawan = modul SDM → pastikan koperasi_employees adalah
	// view atas sdm_employees (idempotent; juga dipanggil oleh cmd/koperasi).
	if err := sdm.EnsureEmployeeView(db); err != nil {
		log.Fatalf("EnsureEmployeeView gagal: %v", err)
	}

	// Audit trail — semua request mutasi (non-GET) di modul SDM dicatat ke tabel
	// audit_entries yang sama dengan school-api, lalu tampil di menu Log dashboard.
	auditService := service.NewAuditService(repository.NewAuditEntryRepository(db))

	e := bootstrap.NewEcho()
	api := bootstrap.APIGroup(e)
	// Dipasang di level grup: body capture pre-hook, ekstraksi user post-hook
	// (setelah JWTAuth per-route menyetel context).
	api.Use(middleware.NewAuditMiddleware(auditService).Capture)
	mod.RegisterRoutes(api)

	// Worker latar (antrian kirim slip WA) — berhenti saat proses dimatikan.
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	mod.StartWorkers(ctx)

	// Audit log cleanup: hapus entry > 7 hari, jalan tiap jam. Duplikasi dari
	// cmd/api agar retensi tetap berjalan bila sdm-api dideploy tanpa school-api.
	// Aman bila keduanya aktif (DELETE idempotent).
	go func() {
		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				if deleted, err := auditService.Cleanup(service.DefaultAuditRetentionDays); err != nil {
					log.Printf("[audit] cleanup error: %v", err)
				} else if deleted > 0 {
					log.Printf("[audit] cleanup: %d entries dihapus (retensi %d hari)", deleted, service.DefaultAuditRetentionDays)
				}
			}
		}
	}()

	// Port dari env SDM_PORT (default 8082) — terpisah dari PORT/KOPERASI_PORT
	// agar tiga binary bisa jalan bersama di satu host saat dev.
	log.Println("sdm-api starting...")
	bootstrap.Run(e, bootstrap.Port("SDM_PORT", "8082"))
}
