# Task 1: BackupService + Dockerfile + Startup Check

> **Epic:** [Backup Database Otomatis & Manual](../epics/backup-database-otomatis-manual.md)
> **Status:** Ready
> **Priority:** P0 (blocking — semua task lain bergantung pada BackupService)

---

## Goal

`BackupService` siap digunakan: bisa membuat full PostgreSQL dump format custom (`pg_dump -Fc`), memvalidasi hasilnya, dan memberikan metadata (filename, size, timestamp). Docker runtime container sudah menyertakan `pg_dump`. Startup check memastikan dependency tersedia sebelum API menerima request. **Setelah task ini selesai, service bisa dipanggil secara programatik — siap diintegrasikan ke cron, handler, dan logout.**

## Dependencies

- Epic requirements R.1, R.2, R.7, R.8, R.9, R.10, R.12

## Files to Modify / Create

| File | Operasi |
|------|---------|
| `app/api/service/backup_service.go` | **NEW** — BackupService: Create(), Verify(), LastBackupTime(), config |
| `app/api/service/backup_service_test.go` | **NEW** — Unit test: validasi format, error handling, atomic write |
| `app/api/Dockerfile` | **MODIFY** — tambah `postgresql-client` ke `apk add` |
| `app/api/go.mod` | **MODIFY** — tidak ada dependency baru (`os/exec`, `os`, `path/filepath` semua stdlib) |

## Step 1: Study Existing Code

- `app/api/cmd/api/main.go:617-626` — Background goroutine pattern (cleanup token blacklist). Backup scheduler + cleanup akan mengikuti pola ini di task selanjutnya.
- `app/api/config/database.go:20-29` — Cara membaca DB env variables. BackupService akan membaca variabel yang sama.
- `app/api/Dockerfile:20` — Lokasi `RUN apk add` untuk menambahkan `postgresql-client`.
- `app/api/model/model.go:1-9` — Embedded struct `PrimaryKey` & `BaseModelTimeAt` (untuk referensi saja — tidak dipakai di task ini karena backup tidak pakai model database).
- `app/api/service/auth_service.go:21-28` — Pattern constructor service: `func NewXxxService(deps...) XxxService` → ikuti pattern yang sama untuk `NewBackupService`.

## Step 2: Implementation Checklist

### 2a. BackupService (`service/backup_service.go`)

**Struct & Config:**
- [ ] `BackupConfig` struct:
  - `BackupDir string` — dari env `BACKUP_DIR`, default `~/backups/alizzah-app/`
  - `DBUser, DBPassword, DBHost, DBPort, DBName string` — dari env
  - `RetentionDays int` — dari env `BACKUP_RETENTION_DAYS`, default `7`
- [ ] `BackupService` struct (embed `BackupConfig` + `mu sync.Mutex` untuk debounce)
- [ ] `NewBackupService(cfg BackupConfig) *BackupService` — constructor, auto-create `BackupDir` jika belum ada (log warning jika gagal, jangan fatal)

**Core method — `Create(ctx context.Context) (*BackupResult, error)`:**
- [ ] Buat temporary file di `BackupDir` dengan pattern `alizzah_backup_*.tmp`
- [ ] Bangun command: `pg_dump -Fc -U <user> -h <host> -p <port> <dbname>`
- [ ] Set env `PGPASSWORD` di `cmd.Env` (append ke `os.Environ()`)
- [ ] Jalankan via `cmd.Run()` dengan context timeout (default 5 menit via `BACKUP_TIMEOUT`)
- [ ] Baca file size via `stat`
- [ ] Jika sukses: rename temp file ke final name `alizzah_backup_YYYY-MM-DD_HH-MM_WIB.dump` (timestamp saat backup dimulai, timezone WIB)
- [ ] Jika error: hapus temp file, return error

**Validation method — `Verify(filePath string) error`:**
- [ ] Cek file size > 0
- [ ] Jalankan `pg_restore -l <file>.dump` (list TOC tanpa restore) — validasi format custom
- [ ] Return error jika salah satu gagal

**Debounce helper — `LastBackupTime() time.Time`:**
- [ ] Walk `BackupDir`, cari semua file `*.dump`
- [ ] Return `ModTime` paling baru (atau zero time jika tidak ada file)
- [ ] Digunakan di task selanjutnya untuk debounce 5 menit di logout trigger

**Cleanup method — `Cleanup(ctx context.Context) (int, error)`:**
- [ ] Walk `BackupDir`, cari semua file `*.dump`
- [ ] Hapus file yang `ModTime` < `time.Now().AddDate(0, 0, -RetentionDays)`
- [ ] Return jumlah file yang dihapus
- [ ] Non-fatal: log error per file, lanjut ke file berikutnya

**Startup check — `CheckDependencies() error`:**
- [ ] Cek `pg_dump` binary via `exec.LookPath("pg_dump")`
- [ ] Cek `pg_restore` binary via `exec.LookPath("pg_restore")`
- [ ] Return descriptive error jika salah satu tidak ditemukan

**Logging method — `logError(msg string, err error)`:**
- [ ] Append error ke `~/backups/alizzah-app/backup_errors.log` dengan timestamp
- [ ] Format: `[2026-07-14 23:00:00] error message: details`

### 2b. Unit Tests (`service/backup_service_test.go`)

- [ ] `TestCheckDependencies_PgDumpNotFound` — mock `exec.LookPath` return error, pastikan `CheckDependencies()` return error
- [ ] `TestCheckDependencies_Found` — skip jika binary tidak ada di CI; test struktur config saja
- [ ] `TestBackupConfig_Defaults` — test default `RetentionDays = 7`, `BackupDir` fallback
- [ ] `TestVerify_EmptyFile` — buat file kosong, pastikan `Verify()` return error
- [ ] `TestLastBackupTime_EmptyDir` — dir kosong, pastikan return zero time
- [ ] `TestCleanup_NoFiles` — dir kosong, pastikan return 0 deleted

> **Catatan:** Test `Create()` membutuhkan database PostgreSQL — bisa di-skip di unit test (`t.Skip("requires postgres")`) atau menggunakan Docker container di CI. Integration test bisa di task terpisah.

### 2c. Dockerfile (`Dockerfile`)

- [ ] Line 20: tambah `postgresql-client` ke `apk add`:
  ```dockerfile
  # Before:
  RUN apk add --no-cache ca-certificates tzdata wget \
  
  # After:
  RUN apk add --no-cache ca-certificates tzdata wget postgresql-client \
  ```
- [ ] Build image dan verifikasi: `docker run --rm <image> which pg_dump && which pg_restore`
- [ ] `pg_dump` dan `pg_restore` terinstall sebagai dependency `postgresql-client` (Alpine package ~15MB)

### 2d. `BackupResult` DTO

- [ ] Struct di `service/backup_service.go`:
  ```go
  type BackupResult struct {
      Filename  string    `json:"filename"`
      SizeBytes int64     `json:"size_bytes"`
      CreatedAt time.Time `json:"created_at"`
  }
  ```

## Step 3: Integration Points (untuk task berikutnya)

> **Tidak diimplementasikan di task ini** — hanya catatan untuk task selanjutnya.

- `main.go`: Panggil `CheckDependencies()` → fatal exit jika gagal
- `main.go`: Inject `BackupService` ke `AuthHandler`
- `main.go`: Register cron scheduler + cleanup goroutine
- `AuthHandler.Logout()`: Tambah `go backupSvc.CreateAsync(ctx)` setelah blacklist token
- `POST /v1/backups` endpoint + handler

## Success Criteria

- [ ] `BackupService.Create()` menghasilkan file `.dump` yang valid (lulus `pg_restore -l`)
- [ ] `BackupService.Verify()` mendeteksi file kosong → return error
- [ ] `BackupService.CheckDependencies()` return error jika `pg_dump` tidak ada di `$PATH`
- [ ] `BackupService.Cleanup()` hapus file > 7 hari, lewati file ≤ 7 hari
- [ ] Atomic write: temporary file tidak tertinggal jika `Create()` gagal
- [ ] Error dilog ke `backup_errors.log` dengan timestamp
- [ ] `go test ./service/ -run Backup -v` — semua unit test pass
- [ ] `docker build -t test . && docker run --rm test which pg_dump` — output `/usr/bin/pg_dump`
- [ ] `go build ./cmd/api` sukses
- [ ] Pre-commit hooks passing

## Anti-Patterns (FORBIDDEN)

- ❌ **NO hardcode path backup** — selalu dari config/env `BACKUP_DIR`
- ❌ **NO password di command line args** — wajib via env `PGPASSWORD`
- ❌ **NO blocking operasi file** — `Create()` menggunakan context dengan timeout
- ❌ **NO retry di service layer** — retry logic adalah concern caller (cron/handler)
- ❌ **NO dependency eksternal selain stdlib** — `os/exec`, `os`, `path/filepath`, `compress/gzip` sudah cukup (tidak pakai `gzip` karena `-Fc` sudah compressed; tapi stdlib tersedia jika dibutuhkan nanti)
- ❌ **NO model database untuk backup record** — tracking via filesystem
