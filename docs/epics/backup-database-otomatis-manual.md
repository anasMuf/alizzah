# Epic: Backup Database Otomatis & Manual

> **Status:** Design Complete — Ready for First Task
> **Created:** 2026-07-14
> **Type:** New Feature

---

## Requirements (IMMUTABLE)

- R.1: Backup adalah **full PostgreSQL dump format custom** (`pg_dump -Fc`) seluruh database. Format custom (`-Fc`) compressed by default — tidak perlu `gzip` terpisah. Bisa direstore via `pg_restore` (selective table, parallel) atau dikonversi ke plain SQL via `pg_restore -f file.sql backup.dump`.
- R.2: Backup file disimpan di `~/backups/alizzah-app/` pada VPS Debian, dengan nama `alizzah_backup_YYYY-MM-DD_HH-MM_WIB.dump`.
- R.3: Backup **otomatis setiap hari pukul 23:00 WIB** via cron scheduler di dalam proses Go API (menggunakan library `robfig/cron/v3`). Cron dipaksa ke timezone **UTC** (`cron.WithLocation(time.UTC)`), sehingga cron expression = `0 16 * * *` (23:00 WIB = 16:00 UTC). Lebih deterministik terlepas dari `TZ` environment container.
- R.4: Backup **otomatis setiap kali user explicit logout** (`POST /v1/auth/logout`) — async/fire-and-forget via goroutine, **dengan debounce 5 menit** (skip jika backup terakhir < 5 menit yang lalu).
- R.5: Backup **manual via API endpoint** `POST /v1/backups`, diproteksi JWT auth + module guard (`ModuleKeuangan`). Response mengembalikan filename, size, dan timestamp.
- R.6: Retention **7 hari** — file lebih tua dari 7 hari dihapus otomatis oleh cleanup goroutine yang berjalan setiap hari.
- R.7: Setiap backup tervalidasi minimal: `pg_restore -l backup.dump` (list TOC — memvalidasi format custom) + file size > 0. Gagal → error dilog.
- R.8: Backup dijalankan via `os/exec` memanggil binary `pg_dump` sistem dengan flag `-Fc` (custom format, compressed by default), menggunakan env `PGPASSWORD` untuk autentikasi. Kredensial diambil dari env `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME` yang sudah ada. Validasi via `pg_restore -l` (list TOC tanpa restore).
- R.9: Startup check: jika `pg_dump` binary tidak ditemukan di `$PATH`, API menolak start dengan fatal log.
- R.10: File backup ditulis ke temporary file dulu, lalu `os.Rename` ke final path (atomic write — mencegah partial file jika proses crash).
- R.11: Dashboard menyediakan tombol "Backup" untuk trigger manual (superadmin / admin dengan akses modul keuangan).
- R.12: Dockerfile runtime (`apps/api/Dockerfile`) wajib menyertakan `postgresql-client` package (via `apk add postgresql-client`) agar binary `pg_dump` dan `pg_restore` tersedia di dalam container.

## Success Criteria (MUST ALL BE TRUE)

- [ ] `go mod tidy` tidak error setelah tambah `robfig/cron/v3`
- [ ] Startup check: API fatal exit jika `pg_dump` tidak ditemukan
- [ ] Dockerfile: `postgresql-client` terinstall di runtime container (verified via `docker run --rm <image> which pg_dump`)
- [ ] Cron scheduler aktif setelah API start dan menjalankan backup pada 16:00 UTC (23:00 WIB) menggunakan `cron.WithLocation(time.UTC)`
- [ ] Backup file terbuat di `~/backups/alizzah-app/` dengan format nama benar
- [ ] `POST /v1/auth/logout` memicu backup async (tidak memblock response)
- [ ] Debounce 5 menit bekerja: dua logout dalam 2 menit → hanya 1 backup
- [ ] `POST /v1/backups` mengembalikan response JSON dengan filename, size, timestamp
- [ ] `POST /v1/backups` di-reject (401/403) untuk user tanpa auth / tanpa akses modul keuangan
- [ ] Cleanup menghapus file > 7 hari; file ≤ 7 hari tetap ada
- [ ] File backup > 0 byte dan lulus `pg_restore -l` (list contents — validasi format custom)
- [ ] File backup bisa direstore: `pg_restore -d dbname file.dump` berhasil
- [ ] File backup bisa dikonversi ke SQL: `pg_restore -f backup.sql file.dump` berhasil
- [ ] `README.md` restore instructions ada di `~/backups/alizzah-app/`
- [ ] Error backup dilog ke file `~/backups/alizzah-app/backup_errors.log`
- [ ] `go build` sukses (binary `cmd/api`)
- [ ] `npm run build` (dashboard) sukses
- [ ] Pre-commit hooks passing
- [ ] Tidak ada perubahan pada endpoint auth yang sudah ada (selain trigger backup async)

## Anti-Patterns (FORBIDDEN)

- ❌ **NO synchronous backup on logout** (UX: user tidak boleh menunggu pg_dump selesai sebelum logout response — backup harus async via goroutine)
- ❌ **NO backup tanpa debounce** (resource: multiple logout berdekatan tidak boleh menghasilkan redundant dumps — debounce 5 menit wajib)
- ❌ **NO backup file tanpa validasi** (integrity: setiap file harus lulus `pg_restore -l` + size > 0 check — silent corruption tidak boleh terjadi)
- ❌ **NO hardcoded path backup** (config: path backup harus dari env `BACKUP_DIR` dengan default `~/backups/alizzah-app/` — jangan hardcode di kode)
- ❌ **NO backup blocking startup** (availability: API harus tetap start meskipun direktori backup belum ada — auto-create direktori, log warning jika gagal, tapi jangan fatal)
- ❌ **NO perubahan format response `/v1/auth/logout`** (backward compatibility: response logout tidak boleh berubah — backup adalah side effect invisible)
- ❌ **NO cron library selain `robfig/cron/v3`** (consistency: library ini adalah de-facto standard Go cron, sudah terbukti di production, dan paling ringan)
- ❌ **NO model database untuk backup record** (simplicity: tracking backup via filesystem sudah cukup — tidak perlu tabel `backups` di database. Filesystem adalah source of truth.)
- ❌ **NO backup jika `pg_dump` binary tidak ditemukan** (safety: startup check wajib — jangan deploy tanpa dependency)

## Approach

Menambahkan sistem backup full PostgreSQL dump dengan tiga trigger path — cron harian (23:00 WIB), explicit logout (async + debounce), dan manual API endpoint. Backup dijalankan via `os/exec` memanggil `pg_dump -Fc` (format custom, compressed by default — tidak perlu pipe ke `gzip`). File `.dump` disimpan ke direktori `~/backups/alizzah-app/`. Restore via `pg_restore`; konversi ke plain SQL via `pg_restore -f file.sql`. Cleanup goroutine menghapus file > 7 hari.

Scheduler menggunakan library `robfig/cron/v3` — satu-satunya dependency baru. Tidak ada model database baru; tracking backup via filesystem. Integrasi minimal ke kode existing: satu baris goroutine di handler logout, satu route baru di `main.go`, dan satu service baru (`BackupService`).

Dashboard mendapat tombol "Backup" sederhana di halaman pengaturan keuangan (atau topbar, jika diinginkan) — memanggil `POST /v1/backups` via TanStack Query mutation.

## Architecture

```
┌─ Trigger Paths ─────────────────────────────────────────────┐
│                                                              │
│  1. Logout ──→ AuthHandler.Logout()                         │
│                └─ go backupSvc.CreateAsync()  (debounce 5m) │
│                                                              │
│  2. Cron ────→ robfig/cron @ 0 16 * * *                     │
│                └─ backupSvc.Create()                         │
│                                                              │
│  3. Manual ──→ POST /v1/backups                             │
│                └─ BackupHandler.Create()                     │
│                   └─ backupSvc.Create()                      │
└──────────────────────────────────────────────────────────────┘

┌─ BackupService ─────────────────────────────────────────────┐
│                                                              │
│  Create(ctx) → exec pg_dump -Fc → tmp file → rename           │
│  CreateAsync(ctx) → go Create(ctx) + debounce check         │
│  Cleanup(ctx) → walk dir, delete files &gt; 7 days             │
│  Verify(path) → pg_restore -l + stat size &gt; 0                │
│  LastBackupTime() → cek mtime file terbaru (untuk debounce) │
│                                                              │
│  Config:                                                     │
│    BackupDir   ← env BACKUP_DIR  (default ~/backups/alizzah-app/)
│    DBUser      ← env DB_USER                                 │
│    DBPassword  ← env DB_PASSWORD                             │
│    DBHost      ← env DB_HOST                                 │
│    DBPort      ← env DB_PORT                                 │
│    DBName      ← env DB_NAME                                 │
│    RetentionDays ← 7 (configurable via env BACKUP_RETENTION) │
└──────────────────────────────────────────────────────────────┘

┌─ Filesystem ────────────────────────────────────────────────┐
│  ~/backups/alizzah-app/                                      │
│  ├── alizzah_backup_2026-07-14_23-00_WIB.dump               │
│  ├── alizzah_backup_2026-07-13_23-00_WIB.dump               │
│  ├── ...                                                     │
│  ├── backup_errors.log                                       │
│  └── README.md  (restore instructions)                       │
└──────────────────────────────────────────────────────────────┘

┌─ Frontend (React) ──────────────────────────────────────────┐
│  features/backup/BackupButton.tsx                            │
│  └─ usePostV1Backups() mutation                              │
│  └─ Tampil di halaman keuangan / topbar                     │
│  api/endpoints/backup/backup.ts  (regenerated via Orval)     │
└──────────────────────────────────────────────────────────────┘
```

### Integration ke `main.go` (perubahan minimal)

```go
// 1. Buat BackupService
backupDir := os.Getenv("BACKUP_DIR")
if backupDir == "" {
    home, _ := os.UserHomeDir()
    backupDir = filepath.Join(home, "backups", "alizzah-app")
}
backupSvc := service.NewBackupService(service.BackupConfig{
    BackupDir:     backupDir,
    DBUser:        os.Getenv("DB_USER"),
    DBPassword:    os.Getenv("DB_PASSWORD"),
    DBHost:        os.Getenv("DB_HOST"),
    DBPort:        os.Getenv("DB_PORT"),
    DBName:        os.Getenv("DB_NAME"),
    RetentionDays: 7,
})

// 2. Startup check: pg_dump exists
if err := backupSvc.CheckDependencies(); err != nil {
    log.Fatalf("Backup dependency missing: %v", err)
}

// 3. Inject ke AuthHandler
authHandler := handler.NewAuthHandler(authService, blacklistRepo, backupSvc)

// 4. Manual backup route
backupHandler := handler.NewBackupHandler(backupSvc)
api.POST("/backups", backupHandler.Create,
    middleware.JWTAuth(tokenBlacklistRepo),
    guard.RequireModule(middleware.ModuleKeuangan))

// 5. Mulai cron scheduler (daily 23:00 WIB)
go backupSvc.StartScheduler()

// 6. Cleanup goroutine (existing pattern)
go func() {
    for {
        time.Sleep(24 * time.Hour)
        backupSvc.Cleanup(context.Background())
    }
}()
```

## Design Rationale

### Problem

Saat ini sistem Al-Izzah Manajemen tidak memiliki mekanisme backup database sama sekali. Jika terjadi kegagalan server, human error (salah edit/delete data), atau corrupt database, seluruh data keuangan, siswa, pembayaran, dan konfigurasi hilang permanen. Sistem membutuhkan backup otomatis harian (23:00 WIB — setelah jam operasional) dan backup saat logout (sebelum operator meninggalkan sistem) sebagai safety net tambahan, plus opsi backup manual untuk snapshot sebelum operasi berisiko (batch invoice, tutup buku).

### Research Findings

**Codebase:**
- `app/api/cmd/api/main.go:617-626` — Background goroutine pattern existing: token blacklist cleanup berjalan tiap 10 menit via `time.Sleep` loop. Backup scheduler + cleanup mengikuti pola yang sama.
- `app/api/handler/auth_handler.go:65-88` — `Logout()` handler sudah blacklist token dan return response. Backup trigger cukup tambah 1 baris `go backupSvc.CreateAsync()` setelah blacklist.
- `app/api/middleware/module.go:18-23` — Module guard sudah support `ModuleKeuangan`, `ModuleLaporan`, dll. Manual backup endpoint bisa langsung pakai `guard.RequireModule(middleware.ModuleKeuangan)`.
- `app/api/config/database.go:20-29` — Semua DB env variable (`DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME`) sudah dibaca dari env. Backup service bisa reuse langsung.
- `app/api/go.mod` — Tidak ada cron library existing. Perlu tambah `robfig/cron/v3`.

**External:**
- `robfig/cron/v3` — 14k+ stars GitHub, de-facto standard Go cron library. Support cron expression + timezone-aware scheduling. Ringan (no external dependencies).
- `pg_dump` — Tool standar PostgreSQL, bagian dari `postgresql-client` package. Syntax: `PGPASSWORD=xxx pg_dump -U user -h host -p port dbname`.
- `pg_dump -Fc` — format custom PostgreSQL, compressed by default. Tidak perlu library eksternal.
- `pg_restore -l` — validasi integritas dump tanpa restore (list TOC).

### Approaches Considered

#### 1. Go cron in-process + pg_dump via os/exec ✓

**What it is:** Tambahkan `robfig/cron/v3` ke proses Go API yang sudah ada. Backup dijalankan via `os/exec` memanggil `pg_dump -Fc` (format custom, compressed by default). Backup-on-logout via goroutine async. Manual backup via API endpoint.

**Investigation:**
- Reviewed `main.go:617-626` — background goroutine pattern already exists
- Checked `go.mod` — no cron library, `robfig/cron` is lightweight (~1 file)
- Verified `PGPASSWORD` env approach works and is standard practice
- Tested debounce concept: `BackupService.LastBackupTime()` checks mtime of latest file

**Pros:**
- No new deployment artifacts (no separate cron job, no systemd unit)
- Consistent with existing goroutine pattern in `main.go`
- Single process = simpler ops (no coordination between backup process and API)
- Debounce built-in (in-memory state)
- Manual backup via API gives operators self-service access

**Cons:**
- Jika API process mati/kras, scheduled backup tidak jalan (mitigated: backup juga trigger di logout + manual)
- Backup berjalan di thread yang sama — memory pressure dari `pg_dump` tidak terisolasi
- Perlu dependency baru (`robfig/cron`)

**Chosen because:** Minimal invasif — satu service baru, satu endpoint baru, satu line di handler logout. Mengikuti pola existing. Tidak perlu perubahan deployment.

#### 2. System cron job (Debian crontab) ❌

**What it is:** Buat crontab entry di server Debian yang memanggil script shell untuk backup. Backup-on-logout tetap via Go. Manual backup via SSH/CLI.

**Why we looked at this:** Backup jalan meskipun API mati. Terisolasi dari proses Go.

**Investigation:**
- Crontab perlu dikelola terpisah dari kode (Ansible/script deployment)
- Koordinasi antara cron dan Go process untuk debounce lebih kompleks (perlu file lock)
- `pg_dump` credential management di script shell (perlu env file atau hardcode)

**Pros:**
- Backup tetap jalan jika API crash
- Independent process, no memory sharing

**Cons:**
- Dua mekanisme berbeda untuk scheduled vs event-triggered backup
- Crontab management di luar codebase → rawan out-of-sync
- Credential handling di shell script lebih riskan
- Tidak ada debounce alami (perlu file lock)

**⚠️ REJECTED BECAUSE:** Menambah kompleksitas deployment (crontab management) tanpa benefit signifikan. Jika API crash, backup-on-logout dan daily schedule keduanya mati — cron tidak menyelesaikan ini. Solusi yang benar adalah monitoring API uptime, bukan backup via cron.

**🚫 DO NOT REVISIT UNLESS:** API sering crash di production dan backup menjadi critical concern yang terpisah.

#### 3. Separate backup binary / systemd timer ❌

**What it is:** Binary terpisah (`cmd/backup-scheduler`) yang hanya menjalankan scheduled backup. Dikelola sebagai systemd service + timer.

**Why we looked at this:** Clean separation of concerns — backup scheduler tidak bergantung pada API.

**Investigation:**
- Pattern existing: `cmd/koperasi` adalah binary terpisah untuk modul koperasi. Backup scheduler bisa mengikuti pola ini.
- Systemd timer mirip dengan cron tapi managed via systemd.

**Pros:**
- Clean separation — backup scheduler punya lifecycle sendiri
- Backup tetap jalan jika API restart / redeploy
- Bisa di-monitor secara independen

**Cons:**
- Deployment complexity: dua binary, dua systemd unit
- Backup-on-logout tetap perlu komunikasi ke backup scheduler (via API call or shared state)
- Overkill untuk scope saat ini (single VPS, single instance)

**⚠️ REJECTED BECAUSE:** Over-engineering untuk single VPS deployment. Menambah operational overhead tanpa benefit jelas. Bisa dipertimbangkan ulang jika app scale ke multi-instance.

**🚫 DO NOT REVISIT UNLESS:** Deploy ke multi-instance / Kubernetes yang memerlukan backup scheduler terpisah.

### Scope Boundaries

**In scope:**
- `BackupService` di `service/backup_service.go` (create, verify, cleanup, debounce)
- `BackupHandler` di `handler/backup_handler.go` (manual trigger endpoint)
- Cron scheduler integration di `main.go` (daily 23:00 WIB)
- Modifikasi `AuthHandler.Logout()` — tambah 1 baris async backup trigger
- `POST /v1/backups` route di `main.go` dengan JWT + module guard
- `robfig/cron/v3` dependency di `go.mod`
- Cleanup goroutine (hapus file > 7 hari)
- Startup check `pg_dump` availability
- Dockerfile: tambah `postgresql-client` package ke runtime stage (`apk add postgresql-client`)
- `README.md` dengan restore instructions di backup directory
- `backup_errors.log` untuk error logging
- Dashboard: tombol "Backup" di halaman keuangan
- API spec update (Swagger annotation di handler baru)
- Orval regenerate untuk frontend API client

**Out of scope (deferred/never):**
- Backup ke cloud storage (S3/MinIO) — deferred, bisa ditambahkan nanti dengan interface yang sama
- Backup selective tables — deferred, full dump sudah mencukupi
- Backup restore via API/UI — deferred, restore via CLI lebih aman untuk saat ini
- Backup encryption — deferred, filesystem-level encryption di VPS sudah cukup
- Monitoring/alerting untuk backup failure — deferred, untuk saat ini logging ke file + manual check cukup
- Backup otomatis setelah daily closing (tutup buku) — insight valid, tapi out of scope untuk epic ini
- Multiple API replicas coordination — tidak relevan untuk single VPS deployment

### Open Questions

- **Timezone server?** ✓ Diputuskan: cron scheduler menggunakan UTC via `cron.WithLocation(time.UTC)`. Cron expression tetap `0 16 * * *` (23:00 WIB = 16:00 UTC). Container mungkin punya `TZ=Asia/Jakarta`, tapi scheduler memaksa UTC — lebih deterministik terlepas dari environment.
- **Ukuran database?** Tidak diketahui — mempengaruhi durasi backup. Format custom (`-Fc`) terkompresi otomatis, biasanya 5-10x lebih kecil dari DB size. Monitoring pertama kali untuk estimasi.
- **Disk space?** Pastikan `~/backups/alizzah-app/` punya cukup space untuk 7 hari × ukuran backup. Bisa di-check di startup dan warning jika < 1GB.
- **Permission `pg_dump`?** ✓ DB user punya permission `CONNECT` + `SELECT` — confirmed. Tidak perlu superuser.
- **`pg_dump` di Docker?** Runtime container (`alpine:3.20`) belum punya `pg_dump`. Harus tambah `postgresql-client` di Dockerfile (`apk add postgresql-client`). Startup check akan fatal exit jika binary tidak ditemukan — aman.

## Design Discovery (Reference Context)

### Key Decisions Made

| Question | User Answer | Implication |
|----------|-------------|-------------|
| Apa yang di-backup? | Full PostgreSQL dump format custom (`pg_dump -Fc`) | `os/exec` pg_dump -Fc, compressed by default |
| Tempat penyimpanan? | `~/backups/alizzah-app/` di VPS Debian | Path configurable via env `BACKUP_DIR` |
| Cara scheduled backup? | Go cron scheduler in-process (`robfig/cron`) | Tambah dependency, ikuti pola goroutine existing |
| Backup on token expiry? | Tidak perlu — covered oleh daily 23:00 WIB | Hanya explicit logout + cron harian |
| Retention backup? | 7 hari | Cleanup goroutine hapus file > 7 hari |
| Manual backup trigger? | API endpoint + dashboard button | `POST /v1/backups` + tombol di UI |
| Backup on logout mode? | Async / fire-and-forget | Goroutine, tidak memblock response |
| File naming? | `alizzah_backup_YYYY-MM-DD_HH-MM_WIB.dump` | Format custom, compressed, timestamped |

### Research Deep-Dives

#### robfig/cron Integration
**Question explored:** Apakah `robfig/cron/v3` cocok untuk in-process scheduling?
**Sources consulted:**
- `robfig/cron` GitHub — 14k+ stars, standard library for Go cron
- GoDoc — mendukung cron expression + `@every` syntax + timezone via `cron.WithLocation()`
- `app/api/cmd/api/main.go:617-626` — existing background goroutine pattern

**Findings:**
- `cron.New(cron.WithLocation(time.UTC))` — bisa set timezone
- `c.AddFunc("0 16 * * *", backupFn)` — simple API, no boilerplate
- Goroutine-based internal scheduler — tidak blocking main thread
- Thread-safe — bisa add/remove jobs runtime

**Conclusion:** Cocok, ringan, dan konsisten dengan pola background goroutine existing.

#### pg_dump via os/exec
**Question explored:** Bagaimana menjalankan `pg_dump` dari Go dengan aman?
**Sources consulted:**
- Go `os/exec` documentation
- PostgreSQL `pg_dump` docs — env variable `PGPASSWORD` didukung
- `app/api/config/database.go:20-29` — env variables already loaded

**Findings:**
- `PGPASSWORD` env var menghindari password di command line (keamanan)
- `exec.Command("pg_dump", "-U", user, "-h", host, "-p", port, dbName)` — clean
- Output file langsung disimpan — `pg_dump -Fc` sudah compressed, tidak perlu pipe ke `gzip`
- `cmd.Env = append(os.Environ(), "PGPASSWORD="+password)` — inject env tanpa leak

**Conclusion:** Aman dan straightforward. Pattern umum di Go backup tools.

#### Debounce Strategy
**Question explored:** Bagaimana mencegah redundant backup dari multiple rapid logouts?
**Sources consulted:**
- Konsep debounce/throttle — standard pattern di event-driven systems
- Filesystem metadata — `os.Stat()` untuk cek mtime file terbaru

**Findings:**
- Cek `ModTime()` dari file backup terbaru di direktori
- Jika < 5 menit → skip
- Simple, tidak perlu in-memory state (survives restart)
- Bisa juga pakai `sync.Mutex` + timestamp in-memory (lebih cepat, tapi reset saat restart)

**Conclusion:** Filesystem-based check (cek mtime file terbaru) lebih robust karena survive restart. 5 menit sudah cukup untuk mencegah burst.

### Dead-End Paths

#### System cron job (crontab)
**Why explored:** Backup jalan meskipun API mati.
**Investigation:** Perlu kelola crontab terpisah, credential handling di shell script, koordinasi debounce lebih kompleks.
**Why abandoned:** Deployment complexity tidak sebanding dengan benefit. Jika API crash, monitoring uptime yang harusnya diperbaiki, bukan workaround via cron.

#### Separate backup binary
**Why explored:** Clean separation of concerns, ikuti pattern `cmd/koperasi`.
**Investigation:** Dua binary, dua systemd unit, backup-on-logout tetap perlu inter-process communication.
**Why abandoned:** Over-engineering untuk single VPS deployment. Bisa dipertimbangkan ulang saat multi-instance.

### Open Concerns Raised

- "Bagaimana jika `pg_dump` tidak terinstall?" → Startup check: fatal log dan refuse to start. Deploy script wajib install `postgresql-client`.
- "Bagaimana jika disk penuh?" → Backup gagal, dilog ke `backup_errors.log`. Daily schedule + cleanup akan tetap berusaha. Warning disk space bisa ditambahkan nanti.
- "Apa backup mengganggu performa API?" → `pg_dump` hanya membaca (SELECT), tidak lock tabel. Impact minimal terutama di 23:00 WIB (jam sepi).
- "Kenapa tidak backup via GORM/database driver?" → `pg_dump` menghasilkan format standar PostgreSQL yang bisa direstore langsung via `psql`. Backup via Go code akan lebih lambat dan tidak menghasilkan format portable.
