# Task 4: Manual Backup API Endpoint

> **Epic:** [Backup Database Otomatis & Manual](../epics/backup-database-otomatis-manual.md)
> **Status:** Ready
> **Priority:** P1 (depend pada Task 1 — bisa paralel dengan Task 2, 3)

---

## Goal

Admin bisa trigger backup manual kapan saja via `POST /v1/backups`. Endpoint diproteksi JWT auth + module guard (`ModuleKeuangan`). Response mengembalikan metadata backup (filename, size, timestamp). **Setelah task ini selesai, dashboard bisa mengintegrasikan tombol backup.**

## Dependencies

- ✅ **Task 1** — `BackupService` sudah ada (butuh `Create()`)
- ⬜ Task 2 — hanya untuk route registration di `main.go` (bisa paralel, gabung saat merge)
- Epic requirements R.5

## Files to Modify / Create

| File | Operasi |
|------|---------|
| `app/api/handler/backup_handler.go` | **NEW** — BackupHandler dengan method `Create()` |
| `app/api/cmd/api/main.go` | **MODIFY** — register route `POST /v1/backups` |
| `app/api/docs/` | **MODIFY** — Swagger spec auto-generated (jika pakai swaggo annotation) |

## Step 1: Study Existing Code

- `app/api/handler/auth_handler.go:35-53` — Pattern handler: bind request, panggil service, return JSON response. Backup handler ikuti pattern yang sama (tanpa request body).
- `app/api/cmd/api/main.go:596-600` — Route registration pattern: group, JWT middleware, module guard. Backup route ikuti ini.
- `app/api/middleware/module.go:18-23` — Module constants. Akan pakai `ModuleKeuangan`.
- `app/api/dto/` — DTO pattern. Backup response bisa pakai `dto.SuccessResponse` yang sudah ada (generic wrapper).
- `app/api/service/backup_service.go` — `BackupResult` struct (sudah dibuat di Task 1).

## Step 2: Implementation Checklist

### 2a. BackupHandler (`handler/backup_handler.go`)

- [ ] Struct:
  ```go
  type BackupHandler struct {
      backupSvc *service.BackupService
  }
  
  func NewBackupHandler(backupSvc *service.BackupService) *BackupHandler {
      return &BackupHandler{backupSvc: backupSvc}
  }
  ```

- [ ] Method `Create` (manual trigger):
  ```go
  // Create godoc
  // @Summary      Buat backup database manual
  // @Description  Trigger full database dump manual. Hanya untuk user dengan akses modul keuangan.
  // @Tags         backup
  // @Accept       json
  // @Produce      json
  // @Security     ApiKeyAuth
  // @Success      200  {object}  dto.SuccessResponse{data=service.BackupResult}
  // @Failure      401  {object}  dto.ErrorResponse
  // @Failure      403  {object}  dto.ErrorResponse
  // @Failure      500  {object}  dto.ErrorResponse
  // @Router       /v1/backups [post]
  func (h *BackupHandler) Create(c echo.Context) error {
      result, err := h.backupSvc.Create(c.Request().Context())
      if err != nil {
          return echo.NewHTTPError(http.StatusInternalServerError, 
              fmt.Sprintf("Backup gagal: %v", err))
      }
      
      return c.JSON(http.StatusOK, dto.SuccessResponse{
          Message: "Backup berhasil",
          Data:    result,
      })
  }
  ```
- [ ] Response format (via `dto.SuccessResponse` yang sudah ada):
  ```json
  {
    "message": "Backup berhasil",
    "data": {
      "filename": "alizzah_backup_2026-07-14_15-30_WIB.dump",
      "size_bytes": 2457600,
      "created_at": "2026-07-14T15:30:00+07:00"
    }
  }
  ```

### 2b. Register route di `main.go`

- [ ] Buat `backupHandler` instance:
  ```go
  backupHandler := handler.NewBackupHandler(backupSvc)
  ```
- [ ] Register route (letakkan di section modul keuangan, dekat `daily-closings`):
  ```go
  // Backup Database
  backups := api.Group("/backups", middleware.JWTAuth(tokenBlacklistRepo))
  backups.POST("", backupHandler.Create, guard.RequireModule(middleware.ModuleKeuangan))
  ```
- [ ] Route harus setelah `backupSvc` di-init, setelah `guard` dibuat

### 2c. Swagger annotation (jika proyek pakai swaggo)

- [ ] Tambah annotation di atas method `Create` (lihat contoh di `auth_handler.go:24-34`)
- [ ] Jalankan `swag init` jika diperlukan untuk regenerate docs

## Success Criteria

- [ ] `POST /v1/backups` tanpa token → 401 Unauthorized
- [ ] `POST /v1/backups` dengan token admin tanpa akses keuangan → 403 Forbidden
- [ ] `POST /v1/backups` dengan token superadmin → 200 + JSON response dengan filename, size, timestamp
- [ ] File backup terbuat di `~/backups/alizzah-app/` setelah request sukses
- [ ] Response time < 30 detik untuk database size normal
- [ ] `go build ./cmd/api` sukses
- [ ] Pre-commit hooks passing

## Anti-Patterns (FORBIDDEN)

- ❌ **NO endpoint tanpa auth** — wajib JWT + module guard
- ❌ **NO response format baru** — pakai `dto.SuccessResponse` dan `dto.ErrorResponse` yang sudah ada
- ❌ **NO async untuk manual backup** — user sengaja trigger manual, pantas menunggu hasilnya (sync)
- ❌ **NO custom error message format** — ikuti pattern error handler existing (`echo.NewHTTPError`)
