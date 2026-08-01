# Implementation Plan: Audit Trail / Activity Log (Superadmin)

## Overview

Menambahkan menu log aktivitas di dashboard untuk superadmin. Setiap request non-GET (POST/PUT/PATCH/DELETE) direkam otomatis via middleware — termasuk metadata request, request body lengkap, status response, dan error message. Superadmin bisa filter/search log dari UI tanpa perlu SSH ke VPS. Data log di-retain 7 hari.

## Architecture Decisions

- **Middleware-based capture** — satu `AuditMiddleware` dipasang di atas middleware chain yang sudah ada (setelah JWTAuth, sebelum handler). Tidak ada perubahan di handler/service existing.
- **Async write** — penulisan ke database via goroutine agar tidak blocking response time ke user.
- **Denormalized `user_name`** — nama user disimpan di row audit supaya query list tidak perlu JOIN ke tabel users.
- **Module dari URL path** — heuristic: extract segmen pertama setelah `/api/v1/` (misal `/students` → administrasi, `/invoices` → keuangan). Mapping disimpan di map constant.
- **Retensi 7 hari** — go routine cleanup tiap jam, pakai simple `DELETE WHERE created_at < NOW() - INTERVAL '7 days'`.
- **Skip GET** — hanya method mutasi (POST, PUT, PATCH, DELETE) yang direkam. GET tidak direkam karena noise dan tidak relevan untuk debugging.

## Task List

### Phase 1: Foundation (Backend Model + Repository + Service)

- [ ] **Task 1:** Buat model `AuditEntry` + DTO `AuditLogQueryParams` & `AuditLogResponse`

### Checkpoint: Foundation
- [ ] Model terdaftar di `main.go` AutoMigrate
- [ ] Compile clean: `cd apps/api && go build ./...`

### Phase 2: Core Middleware + Integration

- [ ] **Task 2:** Buat `AuditEntryRepository` (insert + findAll dengan filter/search/pagination)
- [ ] **Task 3:** Buat `AuditService` (async write + query dengan filter + module mapping)
- [ ] **Task 4:** Buat `AuditMiddleware` (pre-hook capture body, post-hook write entry)
- [ ] **Task 5:** Register middleware + route di `cmd/api/main.go` + cleanup goroutine

### Checkpoint: Core
- [ ] Setiap POST/PUT/DELETE request tercatat di tabel `audit_entries`
- [ ] Request body tersimpan sebagai JSON string
- [ ] Error 400/500 tercatat dengan error message yang sesuai
- [ ] Cleanup jalan — data >7 hari terhapus

### Phase 3: Backend API (Superadmin Read)

- [ ] **Task 6:** Tambah endpoint `GET /v1/audit-logs` + `GET /v1/audit-logs/:id` di handler + route (superadmin-only)

### Checkpoint: Backend API
- [ ] `GET /v1/audit-logs?module=keuangan&status_min=400&search=constraint` mengembalikan hasil terfilter
- [ ] `GET /v1/audit-logs/:id` mengembalikan detail satu entry (termasuk request body)
- [ ] Pagination berfungsi
- [ ] Role guard: hanya superadmin yang bisa akses

### Phase 4: Frontend

- [ ] **Task 7:** Tambah API client untuk `audit-logs` endpoint (manual, mengikuti pattern existing)
- [ ] **Task 8:** Buat halaman `/pengaturan/log` + entry di sidebar superadmin

### Checkpoint: Complete
- [ ] Superadmin bisa akses `/pengaturan/log` dari sidebar
- [ ] Filter (date range, user, module, method, status, search) berfungsi
- [ ] Klik entry → detail slideover dengan request body terformat
- [ ] Error entry ditandai dengan badge merah, success hijau
- [ ] Pagination berfungsi
- [ ] Build frontend clean: `cd apps/dashboard && pnpm build`

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Request body besar (upload file, import CSV) bloating DB | Med | Skip body jika >100KB, catat `[body too large: N bytes]` |
| Middleware gagal write ke DB (DB down) | Low | Log error ke console, jangan block request. Audit entry loss diterima untuk edge case ini. |
| Async write race condition | Low | Gunakan DB connection dari pool yang sama (thread-safe). Closure capture value, bukan reference. |
| Module mapping dari URL salah untuk nested route | Low | Map berdasarkan prefix. Nested route seperti `/students/:id/enrollments` tetap ke `administrasi`. |

## Open Questions

- [ ] Apakah perlu export/download log? → Out of scope untuk v1, bisa jadi enhancement
- [ ] Apakah perlu log GET untuk endpoint tertentu (misal: download backup)? → Skip dulu, evaluasi setelah 1-2 minggu usage
