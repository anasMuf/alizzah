# Task 3: Logout Backup Trigger + Debounce

> **Epic:** [Backup Database Otomatis & Manual](../epics/backup-database-otomatis-manual.md)
> **Status:** Ready
> **Priority:** P1 (depend pada Task 1 — bisa paralel dengan Task 2)

---

## Goal

Setiap user klik "Logout" (explicit logout via `POST /v1/auth/logout`), backup database di-trigger secara async (fire-and-forget via goroutine). Debounce 5 menit mencegah backup redundant dari multiple logout berdekatan. **Setelah task ini selesai, setiap operator yang logout otomatis memicu snapshot database.**

## Dependencies

- ✅ **Task 1** — `BackupService` sudah ada (butuh `Create()`, `LastBackupTime()`)
- ⬜ Task 2 — tidak blocking (bisa paralel, sama-sama depend ke Task 1)
- Epic requirements R.4

## Files to Modify

| File | Operasi |
|------|---------|
| `app/api/handler/auth_handler.go` | **MODIFY** — tambah `backupSvc` field, panggil `CreateAsync()` di `Logout()` |
| `app/api/cmd/api/main.go` | **MODIFY** — passing `backupSvc` ke `NewAuthHandler` |
| `app/api/service/backup_service.go` | **MODIFY** — tambah method `CreateAsync()` (debounce wrapper) |

## Step 1: Study Existing Code

- `app/api/handler/auth_handler.go:15-22` — Struct `AuthHandler` & constructor. Saat ini: `authService` + `blacklistRepo`. Akan ditambah `backupSvc`.
- `app/api/handler/auth_handler.go:65-88` — `Logout()` handler. Setelah blacklist token (line 81), tambah trigger backup.
- `app/api/cmd/api/main.go:376-378` — Tempat `NewAuthHandler` dipanggil. Tambah parameter ketiga: `backupSvc`.

## Step 2: Implementation Checklist

### 2a. Tambah method `CreateAsync()` di BackupService

- [ ] Tambah field `lastBackupMu sync.Mutex` dan `lastBackupTime time.Time` ke struct `BackupService` (in-memory debounce — lebih cepat dari filesystem check)
- [ ] Method `CreateAsync(ctx context.Context)`:
  ```go
  func (s *BackupService) CreateAsync(ctx context.Context) {
      s.lastBackupMu.Lock()
      if time.Since(s.lastBackupTime) < 5*time.Minute {
          s.lastBackupMu.Unlock()
          log.Println("Backup skipped: last backup < 5 menit yang lalu (debounce)")
          return
      }
      s.lastBackupMu.Unlock()
      
      go func() {
          result, err := s.Create(ctx)
          if err != nil {
              s.logError("Backup async (logout trigger) gagal", err)
              return
          }
          log.Printf("Backup async (logout trigger) berhasil: %s (%d bytes)", result.Filename, result.SizeBytes)
          
          s.lastBackupMu.Lock()
          s.lastBackupTime = time.Now()
          s.lastBackupMu.Unlock()
      }()
  }
  ```
- [ ] Debounce: `5 * time.Minute` — bisa dijadikan konstanta `debounceInterval`
- [ ] Goroutine: backup tidak blocking caller (response logout tetap instant)
- [ ] Timestamp update: setelah backup **berhasil** (bukan sebelum), agar retry tetap jalan jika gagal

### 2b. Modifikasi AuthHandler

- [ ] Tambah field `backupSvc *service.BackupService` di struct
- [ ] Update constructor:
  ```go
  // Before:
  func NewAuthHandler(authService service.AuthService, blacklistRepo repository.TokenBlacklistRepository) *AuthHandler
  
  // After:
  func NewAuthHandler(authService service.AuthService, blacklistRepo repository.TokenBlacklistRepository, backupSvc *BackupService) *AuthHandler
  ```
- [ ] Di method `Logout()`, setelah blacklist token (line 81), tambah:
  ```go
  // Trigger backup async (fire-and-forget, debounce 5 menit)
  if h.backupSvc != nil {
      h.backupSvc.CreateAsync(c.Request().Context())
  }
  ```
- [ ] Nil check: `backupSvc` bisa `nil` (backward compatible — jika tidak di-inject, logout tetap jalan normal)

### 2c. Update wiring di main.go

- [ ] Edit panggilan `NewAuthHandler`:
  ```go
  // Before:
  authHandler := handler.NewAuthHandler(authService, blacklistRepo)
  
  // After:
  authHandler := handler.NewAuthHandler(authService, blacklistRepo, backupSvc)
  ```
- [ ] `backupSvc` sudah di-init di Task 2 — pastikan urutan init benar (backupSvc sebelum authHandler)

### 2d. Unit Test (optional — jika sempat)

- [ ] `TestCreateAsync_Debounce` — panggil `CreateAsync` 3x dalam 1 detik, pastikan hanya 1 backup jalan
- [ ] `TestCreateAsync_NilService` — `backupSvc = nil`, pastikan logout tidak panic

## Success Criteria

- [ ] Logout berhasil → di belakang layar backup async ter-trigger
- [ ] Response logout TETAP instant (tidak menunggu backup selesai)
- [ ] Dua logout dalam 2 menit → hanya 1 file backup terbuat (debounce)
- [ ] Logout ke-3 setelah 6 menit → backup ke-2 terbuat (debounce expired)
- [ ] Jika `backupSvc = nil` → logout tetap jalan normal tanpa backup (backward compatible)
- [ ] `go build ./cmd/api` sukses
- [ ] Format response `/v1/auth/logout` tidak berubah
- [ ] Pre-commit hooks passing

## Anti-Patterns (FORBIDDEN)

- ❌ **NO synchronous backup on logout** — wajib goroutine, response logout tidak boleh menunggu
- ❌ **NO hard dependency ke BackupService** — `nil` check, backward compatible
- ❌ **NO debounce berdasarkan filesystem** — pakai in-memory `time.Time` (lebih cepat, sudah cukup untuk debounce logout)
- ❌ **NO perubahan response logout** — response tetap `{"message": "Logout berhasil"}` tanpa field tambahan
