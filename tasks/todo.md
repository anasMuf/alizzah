# Audit Trail / Activity Log — Task Breakdown

---

## Task 1: Buat model `AuditEntry` + DTO

**Description:** Buat GORM model untuk tabel `audit_entries` dan DTO untuk request/response. Model harus punya index di `created_at`, `user_id`, `module`, `status_code`. DTO mencakup query params (filter) dan response structure.

**Acceptance criteria:**
- [ ] `model/audit_entry.go` — struct `AuditEntry` dengan field: `id`, `user_id`, `user_name`, `method`, `path`, `module`, `action`, `request_body` (TEXT), `status_code`, `error_message`, `ip_address`, `latency_ms`, `created_at`
- [ ] `dto/audit_log.go` — `AuditLogQueryParams` (search, user_id, module, method, status_min, status_max, date_from, date_to, page, limit) dan `AuditLogResponse` (flat struct untuk list + detail)
- [ ] Register `&model.AuditEntry{}` di AutoMigrate `cmd/api/main.go`
- [ ] Compile clean

**Verification:**
- [ ] `cd apps/api && go build ./...` — no errors
- [ ] `go run cmd/api/main.go` → tabel `audit_entries` terbuat di database via AutoMigrate

**Dependencies:** None

**Files likely touched:**
- `app/apps/api/model/audit_entry.go` (new)
- `app/apps/api/dto/audit_log.go` (new)
- `app/apps/api/cmd/api/main.go` (edit: AutoMigrate)

**Estimated scope:** Small (2 new files + 1 edit)

---

## Task 2: Buat `AuditEntryRepository`

**Description:** Repository untuk insert single entry (sync) dan query list dengan filter/search/pagination. Ikuti pattern dari `repository/user_repository.go`.

**Acceptance criteria:**
- [ ] `Create(entry *model.AuditEntry) error` — insert ke DB
- [ ] `FindAll(params dto.AuditLogQueryParams) ([]model.AuditEntry, int64, error)` — query dengan semua filter, search (ILIKE di `path`, `error_message`, `user_name`), diurutkan `created_at DESC`, pagination
- [ ] `FindByID(id uint) (*model.AuditEntry, error)` — untuk detail endpoint

**Verification:**
- [ ] Compile clean
- [ ] Query dengan filter kombinasi (module=keuangan + status_min=400) mengembalikan hasil yang benar

**Dependencies:** Task 1

**Files likely touched:**
- `app/apps/api/repository/audit_entry_repository.go` (new)

**Estimated scope:** Small (1 file)

---

## Task 3: Buat `AuditService`

**Description:** Service layer untuk audit: async write (goroutine) + query dengan filter + module mapping dari URL path ke nama modul.

**Acceptance criteria:**
- [ ] `LogAsync(entry model.AuditEntry)` — jalankan `repo.Create()` di goroutine, log error ke console jika gagal (non-blocking)
- [ ] `moduleFromPath(path string) string` — map prefix ke modul: `/students`→administrasi, `/invoices`→keuangan, `/payments`→keuangan, `/class-groups`→administrasi, `/cash`→keuangan, `/vault`→keuangan, `/expenses`→keuangan, `/savings`→keuangan, `/reports`→laporan, `/users`→pengaturan, `/backups`→pengaturan, `/auth`→auth, `/enrollments`→administrasi, `/guardians`→administrasi, `/effective-days`→administrasi, `/extracurriculars`→administrasi, `/academic-years`→administrasi, `/fee-configs`→keuangan, `/daycare-enrollments`→administrasi, `/dispensations`→keuangan, `/facilities`→administrasi, dll.
- [ ] `actionFromMethod(method string) string` — POST→CREATE, PUT/PATCH→UPDATE, DELETE→DELETE
- [ ] `GetAll(params dto.AuditLogQueryParams)` dan `GetByID(id uint)` — delegasi ke repo

**Verification:**
- [ ] Async write tidak blocking (verifikasi dengan timing)
- [ ] Module mapping benar untuk semua route existing

**Dependencies:** Task 2

**Files likely touched:**
- `app/apps/api/service/audit_service.go` (new)

**Estimated scope:** Small (1 file)

---

## Task 4: Buat `AuditMiddleware`

**Description:** Middleware Echo yang membaca request body sebelum handler, lalu menulis audit entry setelah handler selesai. Perhatikan: body harus dibaca dan di-restore agar handler tetap bisa membaca body.

**Acceptance criteria:**
- [ ] Pre-hook: baca raw body dengan `io.ReadAll(c.Request().Body)`, restore dengan `c.Request().Body = io.NopCloser(bytes.NewBuffer(bodyBytes))`, catat `startTime`
- [ ] Post-hook: extract `user_id` & `user_name` dari JWT context, tentukan `module`, `action`, `status_code`, `error_message` (dari `echo.HTTPError`), `latency_ms`
- [ ] Skip jika method = GET (kecuali whitelist: `/backups/:filename/download` — tapi ini juga GET jadi skip semua GET untuk v1)
- [ ] Body >100KB → ganti dengan `[body too large: N bytes]`
- [ ] Panggil `auditService.LogAsync(entry)` di post-hook
- [ ] Jika `next(c)` return error, tetap catat audit entry dengan error message

**Verification:**
- [ ] POST request dengan body JSON → body tersimpan di audit entry, handler tetap bisa bind body
- [ ] Request yang menghasilkan error 400 → audit entry tercatat dengan `error_message` dan `status_code` 400
- [ ] Body >100KB → truncated message tersimpan

**Dependencies:** Task 3

**Files likely touched:**
- `app/apps/api/middleware/audit.go` (new)

**Estimated scope:** Small (1 file)

---

## Task 5: Integrasi middleware + route + cleanup di `main.go`

**Description:** Pasang `AuditMiddleware` di route group, register handler untuk API audit-logs, dan jalankan goroutine cleanup.

**Acceptance criteria:**
- [ ] `auditMiddleware := middleware.NewAuditMiddleware(auditService)` dipasang di semua route group `api` (global, setelah JWTAuth atau setelah RoleGuard tergantung route)
- [ ] Untuk route tanpa JWTAuth (login, health) → tidak dipasangi audit middleware (tidak ada user context)
- [ ] Strategi pemasangan: buat wrapper group `apiWithAudit := api.Group("", auditMiddleware.Capture)` — semua route protected dipindahkan ke sini. Atau alternatif: pasang di setiap group yang sudah ada. Pilih yang paling minim perubahan di `main.go`.
- [ ] Cleanup goroutine: tiap 1 jam, `DELETE FROM audit_entries WHERE created_at < NOW() - INTERVAL '7 days'`
- [ ] Route `GET /v1/audit-logs` dan `GET /v1/audit-logs/:id` (superadmin-only, pakai `RequireRoles("superadmin")`)

**Verification:**
- [ ] POST /v1/students → audit entry tersimpan di DB
- [ ] PUT /v1/users/:id → audit entry tersimpan dengan module=pengaturan
- [ ] GET /v1/students → tidak ada audit entry (skip GET)
- [ ] Cleanup: tambah data dummy dengan `created_at` 8 hari lalu, tunggu/jalankan cleanup → terhapus

**Dependencies:** Task 4

**Files likely touched:**
- `app/apps/api/cmd/api/main.go` (edit: middleware + route + cleanup)

**Estimated scope:** Small-Mid (1 file, beberapa section)

---

## Checkpoint: Core Backend
- [ ] Semua POST/PUT/PATCH/DELETE terekam dengan benar
- [ ] Request body dan error tersimpan
- [ ] Cleanup 7 hari berfungsi
- [ ] API GET `/v1/audit-logs` berfungsi (superadmin-only)
- [ ] Build clean

---

## Task 6: Frontend — API client untuk audit-logs

**Description:** Buat API client hooks untuk endpoint audit-logs. Karena project ini menggunakan generated client (Orval), ada dua opsi:
1. Tambah endpoint ke OpenAPI spec lalu regenerate
2. Tulis manual mengikuti pattern yang sudah ada (seperti `users/users.ts`)

**Pilih approach yang paling tidak invasif.** Cek dulu apakah ada `orval.config.ts` atau OpenAPI spec.

**Acceptance criteria:**
- [ ] `useGetV1AuditLogs(params)` — hook untuk list dengan query params filter
- [ ] `useGetV1AuditLogsId(id)` — hook untuk detail satu entry
- [ ] Types: `AuditLogResponse`, `AuditLogQueryParams` di `api/model/`
- [ ] Compile clean

**Verification:**
- [ ] Hook bisa dipanggil dari komponen, mengembalikan data yang benar

**Dependencies:** Task 5 (backend API harus sudah berfungsi)

**Files likely touched:**
- `app/apps/dashboard/src/api/endpoints/audit-logs/audit-logs.ts` (new)
- `app/apps/dashboard/src/api/model/` (new types — atau inline)

**Estimated scope:** Small (1-2 files)

---

## Task 7: Frontend — Halaman `/pengaturan/log` + Sidebar

**Description:** Buat halaman log aktivitas di `/pengaturan/log` dengan filter, tabel, detail slideover, dan pagination. Tambahkan entry di sidebar superadmin.

**Acceptance criteria:**
- [ ] Route guard: `role !== "superadmin"` → redirect ke `/` (sama seperti `pengguna.tsx`)
- [ ] Filter bar: date range (date from → date to), user select, module select, method select, status range (semua/success 2xx/error 4xx+5xx), search text — dengan debounce search
- [ ] Tabel kolom: timestamp, user, method (badge), path, module (badge), status (badge merah/hijau), latency
- [ ] Klik row → SlideOver detail: timestamp, user, method + path, module, action, status code, latency, IP address, **request body (pre/code block)**, error message (jika ada, highlight merah)
- [ ] Pagination (reuse komponen `Pagination`)
- [ ] Empty state jika tidak ada log
- [ ] Loading skeleton
- [ ] Sidebar: tambah `<NavLink to="/pengaturan/log" icon={ScrollText}>Log Aktivitas</NavLink>` di section `Pengaturan` (superadmin-only)

**Verification:**
- [ ] Akses `/pengaturan/log` sebagai superadmin → halaman muncul
- [ ] Akses `/pengaturan/log` sebagai admin → redirect ke `/`
- [ ] Filter berfungsi: pilih module keuangan → hanya log keuangan yang muncul
- [ ] Search "constraint" → hanya log dengan kata "constraint" di path/error yang muncul
- [ ] Klik entry → detail slideover buka dengan request body terformat
- [ ] Pagination: page 2 berfungsi
- [ ] Build frontend clean

**Dependencies:** Task 6

**Files likely touched:**
- `app/apps/dashboard/src/routes/_authenticated/pengaturan/log.tsx` (new)
- `app/apps/dashboard/src/components/layout/Sidebar.tsx` (edit: tambah NavLink)

**Estimated scope:** Medium (2 files)

---

## Checkpoint: Complete
- [ ] Superadmin bisa akses `/pengaturan/log` dari sidebar
- [ ] Semua filter berfungsi
- [ ] Detail slideover menampilkan request body
- [ ] Error entries ditandai dengan jelas
- [ ] Data log sesuai dengan aktivitas real di aplikasi
- [ ] Build kedua sisi (backend + frontend) clean
