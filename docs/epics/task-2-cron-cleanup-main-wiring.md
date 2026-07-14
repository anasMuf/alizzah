# Task 2: Cron Scheduler + Cleanup + Main Wiring

> **Epic:** [Backup Database Otomatis & Manual](../epics/backup-database-otomatis-manual.md)
> **Status:** Ready
> **Priority:** P0 (blocking untuk task 3 & 4 — scheduler harus aktif)

---

## Goal

Cron scheduler menjalankan backup setiap 23:00 WIB, cleanup goroutine menghapus file > 7 hari, dan `BackupService` ter-inject ke seluruh sistem via `main.go`. **Setelah task ini selesai, backup otomatis harian sudah berjalan — siap untuk trigger logout + manual endpoint.**

## Dependencies

- ✅ **Task 1** — `BackupService` sudah ada
- Epic requirements R.3, R.6

## Files to Modify

| File | Operasi |
|------|---------|
| `app/api/cmd/api/main.go` | **MODIFY** — init BackupService, startup check, cron, cleanup goroutine |
| `app/api/go.mod` | **MODIFY** — tambah `robfig/cron/v3` |

## Step 1: Study Existing Code

- `app/api/cmd/api/main.go:42-47` — `config.DBInit()` pattern. BackupService init diletakkan setelah DB init.
- `app/api/cmd/api/main.go:617-626` — Background goroutine pattern (token blacklist cleanup). Cleanup goroutine mengikuti pola `time.Sleep` loop.
- `app/api/cmd/api/main.go:380-383` — Cara wire handler dengan dependency injection. Handler logout akan di-modify di Task 3.
- `app/api/config/database.go:13-17` — `config.LoadEnv()` dipanggil sebelum DB init. Backup config env variables sudah tersedia.

## Step 2: Implementation Checklist

### 2a. Tambah dependency `robfig/cron/v3`

- [ ] `cd app/apps/api && go get github.com/robfig/cron/v3@latest`
- [ ] `go mod tidy`
- [ ] Verifikasi: `go build ./cmd/api` sukses

### 2b. Init BackupService di `main.go`

- [ ] Baca env `BACKUP_DIR` (default `~/backups/alizzah-app/` jika kosong):
  ```go
  backupDir := os.Getenv("BACKUP_DIR")
  if backupDir == "" {
      home, _ := os.UserHomeDir()
      backupDir = filepath.Join(home, "backups", "alizzah-app")
  }
  ```
- [ ] Baca `BACKUP_RETENTION_DAYS` (default `7`) dan `BACKUP_TIMEOUT` (default `300` seconds)
- [ ] Buat `BackupConfig` dari env variables (`DB_*` + di atas)
- [ ] `backupSvc := service.NewBackupService(cfg)`
- [ ] Letakkan setelah DB init, sebelum route registration

### 2c. Startup dependency check

- [ ] Panggil `backupSvc.CheckDependencies()` setelah `NewBackupService`
- [ ] Jika error → `log.Fatalf("Backup dependency missing: %v", err)`
- [ ] **Hanya fatal jika `pg_dump` / `pg_restore` tidak ditemukan**. Direktori backup tidak ada → auto-create (sudah di-handle `NewBackupService`)

### 2d. Cron scheduler

- [ ] Import `"github.com/robfig/cron/v3"`
- [ ] Buat cron instance dengan UTC timezone:
  ```go
  c := cron.New(cron.WithLocation(time.UTC))
  ```
- [ ] Daftarkan job: `c.AddFunc("0 16 * * *", func() { backupSvc.Create(context.Background()) })`
- [ ] `c.Start()`
- [ ] Log: `log.Println("Backup scheduler started: daily at 16:00 UTC (23:00 WIB)")`
- [ ] **Catatan:** `cron` expression `0 16 * * *` = setiap hari jam 16:00 UTC = 23:00 WIB

### 2e. Cleanup goroutine

- [ ] Buat goroutine dengan `time.Sleep(24 * time.Hour)` loop (ikuti pola existing line 617-626)
- [ ] Panggil `backupSvc.Cleanup(context.Background())`
- [ ] Log jumlah file dihapus: `log.Printf("Backup cleanup: %d file(s) dihapus", count)`
- [ ] Non-fatal: error cleanup tidak menghentikan loop

### 2f. Graceful shutdown (optional — jika sempat)

- [ ] `defer c.Stop()` — hentikan cron scheduler saat API shutdown
- [ ] Gunakan `bootstrap.Run()` yang sudah ada — cron akan ikut mati saat process exit

## Success Criteria

- [ ] API start → log: "Backup scheduler started: daily at 16:00 UTC (23:00 WIB)"
- [ ] API start → log: "Backup dependency check passed"
- [ ] API fatal exit jika `pg_dump` tidak ditemukan di container
- [ ] `docker run` image baru → backup scheduler aktif tanpa error
- [ ] Cleanup goroutine berjalan setiap 24 jam (verifikasi via log setelah 24 jam)
- [ ] `go mod tidy` clean — tidak ada unused dependency
- [ ] `go build ./cmd/api` sukses
- [ ] Pre-commit hooks passing

## Anti-Patterns (FORBIDDEN)

- ❌ **NO cron expression hardcode selain di kode** — tidak pakai config file atau env untuk cron
- ❌ **NO cron library selain `robfig/cron/v3`** — konsistensi
- ❌ **NO blocking di cron job** — `Create()` sudah handle timeout via context
- ❌ **NO fatal exit jika direktori backup gagal dibuat** — log warning saja
