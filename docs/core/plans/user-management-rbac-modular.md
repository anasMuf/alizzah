# Implementation Plan — User Management: RBAC by-Modul

> Mengubah kontrol akses dari **role-bundle hardcoded** menjadi **2 role (superadmin/admin) + grant modul per-user**. Tanggal acuan: **2026-06-22**.
>
> Acuan arsitektur: [adr-001-modular-structure.md](../../architecture/adr-001-modular-structure.md), [adr-002-deployment-multi-binary.md](../../architecture/adr-002-deployment-multi-binary.md).

## 1. Keputusan (terkunci)

| # | Keputusan |
|---|---|
| D1 | Role tinggal **2**: `superadmin`, `admin`. |
| D2 | **superadmin** = bypass semua modul + satu-satunya yang boleh membuat/mengubah akun `superadmin`. |
| D3 | **admin** = hanya bisa membuka modul yang **di-grant ke user-nya** (per-user, bukan per-role). |
| D4 | Modul grantable: **`administrasi`**, **`keuangan`**, **`koperasi`**, **`laporan`**. Akses **per-modul saja** (tanpa pembedaan view/manage). |
| D5 | **Kepala sekolah & yayasan** → role `admin` + modul **`laporan`** saja (read-only by construction; modul ini hanya berisi endpoint GET). |
| D6 | **Tarif (fee-config)** masuk **modul `keuangan`** (bukan eksklusif superadmin lagi). |
| D7 | Sumber kebenaran akses = **lookup DB** tiap request (bukan klaim JWT) → perubahan grant langsung berlaku tanpa re-login. |
| D8 | **Kelola pengguna** (buat/ubah/hapus user **+ assign akses modul**) = **superadmin only**. |

**Sifat model:** ini RBAC untuk *level* (superadmin/admin) **+ direct user-permission grant** untuk *modul*. Tetap lazim disebut "RBAC" secara longgar; sumber-kebenaran akses modul ada di **user**.

### Pagar akses (D8)
Seluruh `/users` (termasuk assign modul) dikunci `RequireSuperadmin()`. Karena hanya superadmin yang menyentuh endpoint ini, tidak ada risiko privilege-escalation lintas-admin — pagar per-field tidak diperlukan. Yang tersisa:
- **G1** — Tidak bisa menghapus akun sendiri (sudah ada).

## 2. Taksonomi modul → pemetaan route

Modul ditetapkan sebagai konstanta di package `middleware` (atau `model`):

```go
const (
    ModuleAdministrasi = "administrasi"
    ModuleKeuangan     = "keuangan"
    ModuleKoperasi     = "koperasi"
    ModuleLaporan      = "laporan"
)
```

Pemetaan dari `RequireRoles(...)` lama → `RequireModule(...)`. Endpoint **baca lintas-modul** memakai OR (≥1 modul cocok).

| Grup route (`cmd/api/main.go`) | Modul (lama → baru) |
|---|---|
| `/academic-years` GET (baca) | **administrasi ∪ keuangan ∪ koperasi** (dulu `ayRead` 6 role) |
| `/academic-years` POST/PUT/PATCH | **administrasi** |
| `/students` GET list | **administrasi ∪ keuangan ∪ koperasi** (koperasi penjualan pakai `/students`) |
| `/students` GET detail, `/:id/enrollments` (GET) | **administrasi ∪ keuangan** |
| `/students` POST/PUT/DELETE, sub akademik (ekskul, fasilitas, guardians, academic-events, enrollments) | **administrasi** |
| `/students/:id/dispensations`, `/invoices`, `/payments`, `/savings` | **keuangan** |
| `/enrollments`, `/guardians`, `/extracurriculars`, `/daycare-enrollments`, `/academic-events`, `/facilities` | **administrasi** |
| `/class-groups` GET, `/:id/students` GET | **administrasi ∪ keuangan** |
| `/class-groups` write, `/:id/effective-days` | **administrasi** |
| `/fee-configs` (tarif) | **keuangan** ⟵ *dulu superadmin (D6)* |
| `/invoices`, `/payments`, `/expense-categories`, `/expenses`, `/dispensations`, `/income-transactions` | **keuangan** |
| `/cash` GET balance/transactions, `/vault` GET, `/daily-closings/:id` GET | **keuangan ∪ laporan** |
| `/cash/transfers` POST, `/daily-closings` list/create/confirm | **keuangan** |
| `/reports/*` (semua GET) | **keuangan ∪ laporan** |
| `/users` (kelola pengguna + assign modul) | **superadmin only** (`RequireSuperadmin()`) ⟵ *D8* |

| Grup route (`internal/modules/koperasi/koperasi.go`) | Modul |
|---|---|
| anggota, barang, master, pemasok, pembelian, penjualan, pinjaman, lainlain | **koperasi** |
| kas, laporan koperasi | **koperasi ∪ keuangan ∪ laporan** (dulu `view` = 5 role) |

## 3. Backend — perubahan

### 3.1 Model & tabel (`apps/api/model/`)
- `user.go`: ubah komentar role → `superadmin | admin`.
- **Baru** `user_module.go`:
  ```go
  type UserModule struct {
      UserID uint   `gorm:"primaryKey"`
      Module string `gorm:"primaryKey;size:30"`
  }
  func (UserModule) TableName() string { return "user_modules" }
  ```
  Composite PK `(user_id, module)` = unik otomatis. Index pada `user_id` sudah tercakup PK.
- AutoMigrate `&model.UserModule{}` di `cmd/api` (sisi sekolah yang memiliki tabel users).

### 3.2 Repository (`apps/api/repository/user_module_repository.go` — baru)
```go
type UserModuleRepository interface {
    ListByUser(userID uint) ([]string, error)
    ReplaceForUser(userID uint, modules []string) error // tx: DELETE lalu INSERT
    HasAnyModule(userID uint, modules []string) (bool, error) // SELECT EXISTS (dipakai middleware)
}
```
`HasAnyModule` = satu query indexed → murah untuk dipanggil tiap request.

### 3.3 Middleware (`apps/api/middleware/module.go` — baru)
```go
type ModuleGuard struct { repo repository.UserModuleRepository }
func NewModuleGuard(repo repository.UserModuleRepository) *ModuleGuard

// superadmin bypass; admin lolos bila punya ≥1 modul.
func (g *ModuleGuard) RequireModule(modules ...string) echo.MiddlewareFunc
// role == superadmin (untuk operasi sensitif bila diperlukan)
func (g *ModuleGuard) RequireSuperadmin() echo.MiddlewareFunc
```
- `RequireModule`: ambil `claims := GetCurrentUser(c)`; jika `claims.Role == "superadmin"` → `next`. Selain itu `g.repo.HasAnyModule(claims.UserID, modules)`; bila false → 403 `"Akses tidak diizinkan"`.
- **Tanpa cache di awal** (korektness + freshness D7; satu query indexed cukup ringan). Cache TTL pendek bisa ditambah belakangan jika profil beban menuntut — catat bahwa cache lintas-binary hanya self-heal lewat TTL.
- `RequireRoles` lama **dipertahankan** (mungkin masih dipakai test) tapi tak lagi dipasang di route produksi; boleh dihapus di akhir bila tak ada pemakai.

### 3.4 Wiring route
- `cmd/api/main.go`: `guard := middleware.NewModuleGuard(repository.NewUserModuleRepository(db))`. Ganti seluruh `middleware.RequireRoles(...)` (±70 baris) sesuai tabel §2.
- `internal/modules/koperasi/koperasi.go`: tambah `guard` ke `Module` (dibangun dari `deps.DB`); ganti `manage`/`view`:
  ```go
  manage := m.guard.RequireModule(middleware.ModuleKoperasi)
  view   := m.guard.RequireModule(middleware.ModuleKoperasi, middleware.ModuleKeuangan, middleware.ModuleLaporan)
  ```
  (Konstanta modul di `middleware` agar dipakai kedua binary — keduanya sudah meng-import `api/middleware` & `api/repository`.)

### 3.5 DTO (`apps/api/dto/user.go`)
- `CreateUserRequest` / `UpdateUserRequest`:
  - `Role` → `validate:"required,oneof=superadmin admin"`.
  - Tambah `Modules []string` → `validate:"omitempty,dive,oneof=administrasi keuangan koperasi laporan"`.
- `UserResponse`: tambah `Modules []string`.

### 3.6 Service + handler (`user_service.go`, `auth_service.go`, `user_handler.go`)
- `Create`/`Update` user: simpan user **+** `userModuleRepo.ReplaceForUser(id, req.Modules)` dalam satu transaksi. Untuk `role=superadmin`, modul diabaikan (bypass).
- **Tidak perlu pagar per-field**: grup `/users` sudah dikunci `RequireSuperadmin()` (D8), jadi semua operasi user (termasuk assign modul) dijamin hanya dijalankan superadmin. Cukup pertahankan G1 (tidak hapus akun sendiri).
- `GetByID`/`GetAll`/`GetMe`: populate `Modules` (join `user_modules`). `auth_service.GetMe` → `UserResponse` ber-`modules` (dipakai FE untuk gating).
- `mapUserToResponse`: terima modul (atau service set setelah map).

### 3.7 Migrasi data + seeder (idempotent, saat start `cmd/api`)
Urutan startup: `AutoMigrate(..., &UserModule{})` → `MigrateRolesToModules(db)` → `SeedUsers(db)`.

`MigrateRolesToModules` (pola seperti `barang.MigrateVariants`):
```go
legacy := map[string][]string{
    "admin_administrasi": {"administrasi"},
    "admin_keuangan":     {"keuangan"},
    "admin_koperasi":     {"koperasi"},
    "kepala_sekolah":     {"laporan"},
    "yayasan":            {"laporan"},
}
// untuk tiap user dgn role ∈ legacy: INSERT user_modules (ON CONFLICT DO NOTHING) lalu UPDATE role='admin'.
// 'superadmin' tetap superadmin tanpa baris modul.
// Idempotent: lewati user yang role-nya sudah ∈ (superadmin, admin).
```
`SeedUsers` ([user_seeder.go](../../../apps/api/seeders/user_seeder.go)) **disederhanakan: seed hanya 1 akun superadmin** (idempotent). Akun admin lain dibuat lewat halaman kelola pengguna (superadmin-only, D8).

| Email | Role | Modul |
|---|---|---|
| superadmin@alizzah.sch.id | superadmin | — (bypass) |

> Catatan: di DB dev yang sudah pernah di-seed, 6 user role-lama tetap ada dan otomatis terkonversi oleh `MigrateRolesToModules` (→ `admin` + modul) sehingga masih bisa dipakai sebagai akun uji. Di DB fresh, hanya superadmin yang tercipta.

### 3.8 Swagger
Regen (`swag init` lalu komit `docs/`) agar enum role & field `modules` terbarui untuk konsumsi Orval. Bila regen ditunda, hand-edit model Orval (lihat §4.4).

## 4. Frontend — perubahan

### 4.1 Auth & helper (`features/auth/AuthContext.tsx`)
- `User` + `modules: string[]`.
- Saat derive user dari `/auth/me`, simpan juga `localStorage.setItem("alizzah_modules", JSON.stringify(u.modules))` (sejajar `alizzah_role` yang sudah ada) — supaya **route guard `beforeLoad`** (jalan sebelum React render) bisa baca.
- Helper:
  ```ts
  export function hasModule(m: string): boolean {
    const role = getStoredRole();
    if (role === "superadmin") return true;
    return getStoredModules().includes(m);
  }
  ```
  Sediakan versi hook (`useAccess`) dan versi statis (baca localStorage) untuk `beforeLoad`.
- `logout`: hapus `alizzah_modules` juga.

### 4.2 Sidebar (`components/layout/Sidebar.tsx`)
Ganti flag `isAdminX` → `hasModule`:
- Administrasi → `hasModule("administrasi")`
- Keuangan (grup) → `hasModule("keuangan") || hasModule("laporan")`; item tulis (Tagihan, Pembayaran, Tabungan, Penerimaan, Pengeluaran, Kas) → `hasModule("keuangan")`; link **Laporan** → `hasModule("keuangan") || hasModule("laporan")`
- Koperasi → `hasModule("koperasi")`
- **Pengguna & Tarif dipisah jadi dua entri terpisah** (bukan satu grup "Pengaturan" gabungan):
  - **Pengaturan** (Pengguna) → grup hanya tampil bila `isSuperadmin` (D8).
  - **Tarif** → item di bawah grup **Keuangan**, gated `hasModule("keuangan")` (D6).

### 4.3 Route guards (`routes/_authenticated/**`)
Ganti `beforeLoad` yang cek `localStorage.getItem("alizzah_role") !== "superadmin"`:
- [`pengaturan/pengguna.tsx`](../../../apps/dashboard/src/routes/_authenticated/pengaturan/pengguna.tsx) → **tetap superadmin only** (D8) — biarkan guard `role === "superadmin"`.
- [`pengaturan/tarif/index.tsx`](../../../apps/dashboard/src/routes/_authenticated/pengaturan/tarif/index.tsx), [`pengaturan/tarif/$id.tsx`](../../../apps/dashboard/src/routes/_authenticated/pengaturan/tarif/$id.tsx) → `hasModule("keuangan")` (D6).
- Sweep ulang `grep -rl "alizzah_role\|user?.role" routes/` untuk memastikan tak ada guard tertinggal (hindari lockout).

### 4.4 Halaman kelola pengguna (`pengaturan/pengguna.tsx`)
- `ROLES` → `["superadmin","admin"]` (halaman ini superadmin-only, jadi kedua opsi boleh tampil apa adanya).
- `ROLE_LABELS`/`ROLE_BADGE_VARIANT` disederhanakan ke 2 role.
- Form: dropdown role + **grup checkbox modul** (administrasi/keuangan/koperasi/laporan) yang tampil saat `role==="admin"`. Submit kirim `modules`.
- Tabel: tambah kolom **Modul** (badge list) selain Role.
- Filter: ganti "Semua Role" → filter role/modul sesuai kebutuhan.

### 4.5 Orval model (`api/model/`, `api/endpoints/users/`)
Tambah `modules?: string[]` pada `DtoCreateUserRequest`, `DtoUpdateUserRequest`, `DtoUserResponse`; enum `DtoCreateUserRequestRole` → `superadmin | admin`. Idealnya **regen** dari swagger; bila hand-edit, sentuh file model terkait + pastikan `tsc` lulus.

## 5. Pemecahan PR

- **PR-1 (backend):** model `UserModule` + repo + `ModuleGuard` + rewrite route (`main.go` + `koperasi.go`, `/users` → `RequireSuperadmin()`) + DTO + service/handler + `MigrateRolesToModules` + seeder + swagger. Verifikasi: `go build ./... && go vet`, smoke `curl` per peran (superadmin, admin-keuangan, admin-koperasi, admin-laporan) memastikan 200/403 sesuai tabel §2.
- **PR-2 (frontend):** `AuthContext.modules` + `hasModule`/localStorage + Sidebar + route guards + halaman pengguna + model Orval. Verifikasi: `tsc --noEmit && biome check` (di `apps/dashboard`), lalu cek gating sidebar/route via browser preview.

Konvensi: branch dari `develop`, PR squash-merge (`gh pr merge --squash --delete-branch`).

## 6. Verifikasi spesifik (skenario uji)

1. **superadmin** → akses semua endpoint & lihat semua menu; **satu-satunya** yang bisa buka `/users` (buat user + assign modul).
2. **admin + keuangan** → kelola tagihan/pembayaran/kas **+ tarif**; **ditolak** di `/users` (403, D8) maupun administrasi/koperasi.
3. **admin + koperasi** → buka `/koperasi/*` + `GET /students`; ditolak di keuangan/administrasi.
4. **admin + laporan** (eks kepsek/yayasan) → hanya `reports/*`, `cash/vault` balance, `daily-closings/:id` (read); ditolak di semua endpoint tulis.
5. **Grant baru langsung berlaku** (D7): tambah modul ke seorang admin → request berikutnya lolos **tanpa** re-login.
6. Migrasi idempotent: jalankan ulang start-up → tidak menggandakan baris `user_modules`, tidak mengubah role yang sudah `admin`/`superadmin`.

## 7. Risiko & catatan

- **Lockout FE:** wajib sweep semua `beforeLoad` berbasis role; satu yang tertinggal bisa mengunci menu. Production build otoritatif (gotcha dev: restart Vite bila menambah route bersarang).
- **Token lama:** JWT lama hanya membawa `role`; karena akses via lookup-DB (D7), token tetap valid dan langsung tunduk aturan modul. Gating FE aktif setelah fetch `/auth/me` berikutnya.
- **Lintas-binary:** `ModuleGuard` + repo + konstanta modul harus di package shared (`api/middleware`, `api/repository`) agar `cmd/api` **dan** `cmd/koperasi` memakainya konsisten.
- **`RequireRoles` lama:** sisakan sementara bila ada test yang memakainya; bersihkan setelah semua route bermigrasi.
- **Kelola-user superadmin-only (D8):** menutup permukaan privilege-escalation lintas-admin sejak awal — tak ada admin yang bisa mengubah grant modul (termasuk milik sendiri). Hanya **tarif** yang turun ke modul keuangan (D6); admin-keuangan bisa ubah tarif tapi tidak menyentuh akun/akses.
