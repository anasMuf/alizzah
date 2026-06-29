# ADR-001: Struktur Modular Backend & Frontend Multi-App

- **Status:** Diterima — 2026-06-11
- **Pemicu:** Penambahan **Modul Koperasi** (lihat [`../koperasi/`](../koperasi/README.md))
- **Berlaku untuk:** `apps/api` (backend), `apps/*` + `packages/*` (frontend monorepo)

---

## 1. Konteks

Struktur saat ini **layer-first & datar**, dirancang saat hanya ada 2 modul (Administrasi & Keuangan):

| Backend (`apps/api`) | Jumlah | Masalah saat skala |
|---|---|---|
| `model/` `dto/` `repository/` `service/` `handler/` (flat) | 149 file dalam 5 folder | Tanpa sekat modul — sulit tahu file milik modul mana |
| `main.go` | 560 baris | Seluruh DI + route manual di satu file; +koperasi → ~700+ baris |

| Frontend (`apps/dashboard`) | Kondisi | Masalah |
|---|---|---|
| `features/` | hanya `administrasi`, `auth`, `home` | Tidak konsisten |
| `routes/_authenticated/keuangan/` | semua logika + komponen bisnis di sini | Tidak ada `features/keuangan`; route gemuk |

**Visi produk** ([project-vision](../../.claude/projects/-Users-anasmufti-Projects-Web-alizzah-app/memory/project_vision.md)) menargetkan beberapa **aplikasi** untuk audiens berbeda: web publik, PPDB, **dashboard manajemen** (internal — mencakup administrasi, keuangan, **koperasi**, dst), mobile guru, mobile wali murid. Struktur lama nyaman untuk 2 modul tetapi **tidak skalabel** untuk arah tersebut. Koperasi adalah modul greenfield pertama sejak keputusan ini — momen termurah untuk menetapkan pola target.

---

## 2. Keputusan

### 2.1 Backend — Modular Monolith (`module → feature → layer`)

Organisasi **per-modul dulu, baru per-fitur, baru per-lapisan**. Tetap satu binary (monolith), tetapi batas modul jelas.

```
apps/api/
├── main.go                       # TIPIS — orkestrator: config, db, shared deps, daftarkan modul, start
├── internal/
│   ├── platform/                 # infra lintas-modul
│   │   ├── config/   database/   middleware/   httpx/   validator/
│   ├── shared/                   # domain lintas-modul
│   │   ├── model/                # PrimaryKey, BaseModelTimeAt
│   │   ├── ledger/               # transaction writer (dipakai keuangan & seam modal koperasi)
│   │   ├── academicyear/         # provider tahun ajaran aktif
│   │   └── pagination/  auth/    # helper bersama
│   └── modules/
│       ├── akademik/             # eks-"administrasi" (migrasi menyusul)
│       ├── keuangan/             # (migrasi menyusul)
│       └── koperasi/             # greenfield — cetakan pola
│           ├── anggota/          # package: handler.go service.go repository.go model.go dto.go
│           ├── barang/
│           ├── penjualan/        # import barang (stok) + kas (ledger)
│           ├── pembelian/
│           ├── pinjaman/
│           ├── kas/              # ledger koperasi
│           ├── modal/            # seam ke keuangan
│           ├── laporan/
│           └── koperasi.go       # Module: New(deps) + RegisterRoutes(g) + Models()
├── seeders/   docs/
```

**Aturan:**
- **Satu fitur = satu package Go.** Berisi file per lapisan (`handler.go`, `service.go`, `repository.go`, `model.go`, `dto.go`). Memenuhi pola yang diminta: "per feature diisi handler, service, repositories".
- **Module root** (`koperasi.go`, `package koperasi`) merangkai antar-fitur, expose:
  - `New(db, shared) *Module` — wiring DI internal modul.
  - `RegisterRoutes(g *echo.Group)` — daftarkan semua route modul.
  - `Models() []any` — agregasi model untuk AutoMigrate.
- **Arah dependency satu arah:** `feature → shared → platform`. Antar-fitur boleh saling import **searah** (mis. `penjualan → barang`), dilarang melingkar; bila berisiko siklus, pakai interface yang dideklarasikan di sisi konsumen.
- **Lintas-modul** (mis. koperasi `modal` perlu menulis kas sekolah milik keuangan): lewat **interface yang di-inject saat wiring di main.go**, bukan import konkret dalam-dalam. Mekanisme generik (ledger writer) tinggal di `shared/`.
- **main.go** menyusut jadi:

```go
func main() {
    cfg := config.Load()
    db := database.Init(cfg)
    shared := shared.New(db)                 // ledger, academicyear, base repos
    db.AutoMigrate(allModels(akademik, keuangan, koperasi)...)

    e := echo.New(); platform.Setup(e)
    api := e.Group("/api/v1", middleware.RateLimiter(...))

    akademik.New(db, shared).RegisterRoutes(api)
    keuangan.New(db, shared).RegisterRoutes(api)
    koperasi.New(db, shared).RegisterRoutes(api)   // ← tambah modul = satu baris
    // ... start + graceful shutdown
}
```

### 2.2 Frontend — Multi-App + Library Bersama

> **Revisi 2026-06-12:** Pola multi-app **tetap** untuk audiens yang benar-benar berbeda (mobile guru/wali, web publik). Namun **koperasi BUKAN app terpisah** — ia modul di `apps/dashboard` (Alternatif B di §5 dipilih khusus untuk koperasi), karena koperasi bagian dari suite Manajemen dengan audiens & login yang sama. `packages/*` tetap dibagi.

Aplikasi terpisah per audiens, UI & infra dibagi lewat `packages/`.

```
apps/
└── dashboard/        # suite Manajemen: akademik, keuangan, KOPERASI, laporan
                      # (app terpisah HANYA untuk audiens beda: mobile guru/wali, web publik)
packages/
├── ui/               # @alizzah/ui   — atoms, molecules, layout primitif, tema Tailwind v4 (@theme)
├── api-client/       # @alizzah/api-client — Orval mutator + generated hooks & types (1 sumber)
├── auth/             # @alizzah/auth — AuthContext + token JWT (login konsisten lintas app)
└── config/           # @alizzah/config — preset tsconfig, biome, tailwind, vite base
```

**Aturan:**
- `pnpm-workspace.yaml` ditambah glob `packages/*` (kini hanya `apps/*`).
- **`@alizzah/ui` = satu-satunya sumber komponen & token.** Komponen di-*ship sebagai source* `.tsx`; setiap app meng-compile & Tailwind men-scan `packages/ui` (sesuai Tailwind v4 CSS-first). Tema dibagikan via satu file CSS `@theme` yang diimpor tiap app.
- **Di dalam setiap app:** pola **feature-first**. `routes/` = **cangkang tipis** (definisi route + komposisi halaman); UI & logika tinggal di `features/<domain>/` (`components/`, `hooks/`, `pages/`, `types.ts`). Komponen bisnis **tidak** lagi di `routes/.../components/`.
- **Shell app-spesifik** (Sidebar nav, Topbar) tetap di masing-masing app; hanya **primitif** layout yang dibagi.
- Stack dipertahankan: React 19, TanStack Router/Query, Tailwind v4, jotai, react-hook-form + zod, sonner.

---

## 3. Strategi Migrasi (bertahap, bukan big-bang)

Kode existing sedang fase stabilisasi (`docs/issue/audit-01`, `audit-02`). Maka: **tetapkan target, bangun koperasi sebagai pilot di target, migrasi modul lama belakangan.**

| Fase | Lingkup | Committed |
|---|---|---|
| **0 — Fondasi** | Backend: skeleton `internal/{platform,shared,modules}` + main.go Register. Frontend: ekstrak `packages/{ui,api-client,auth,config}` (dashboard mengonsumsinya). | ✅ selesai |
| **1 — Koperasi** | Bangun modul koperasi (sub-batch 8a–8f, lihat [`../koperasi/integration-plan.md`](../koperasi/integration-plan.md)) di struktur baru. | ✅ sekarang |
| **2 — Migrasi legacy** | `akademik` & `keuangan` → `internal/modules/`; `dashboard` → konsumsi `@alizzah/ui`. Per modul, PR mekanis & ber-test. | ⏳ menyusul, oportunistik |

> Fase 2 **tidak** wajib selesai sebelum koperasi. Selama transisi, struktur lama (flat) & baru (modular) boleh hidup berdampingan — koperasi & dua modul lama tetap kompilasi & jalan.

---

## 4. Konsekuensi

**Positif**
- Batas modul jelas → onboarding & ownership lebih mudah; konflik merge turun.
- `main.go` tetap tipis; menambah modul = satu baris + satu folder mandiri.
- `packages/ui` memaksa konsistensi desain & menyiapkan jalan untuk mobile/web publik.
- Koperasi jadi *reference implementation* yang menstandarkan migrasi modul lain.

**Negatif / biaya**
- Investasi fondasi **~3–4 hari** sebelum fitur koperasi pertama.
- Sementara waktu ada **dua pola** (flat lama + modular baru) sampai Fase 2 selesai.
- Multi-app (untuk app yang memang terpisah, mis. mobile) menambah shell & pipeline tersendiri. **Koperasi sendiri TIDAK menambah app** — ia modul di dashboard (revisi §2.2).
- Refactor import dashboard ke `@alizzah/ui` menyentuh ~64 file (mekanis, ditunda ke Fase 2).

---

## 5. Alternatif yang Dipertimbangkan

| Alternatif | Kenapa tidak dipilih (sekarang) |
|---|---|
| **A. Tetap flat + prefix `koperasi_`** | Termurah, tapi folder tetap menumpuk & `main.go` tetap membengkak; tidak menyiapkan multi-app. |
| **B. Koperasi sebagai modul di dalam `apps/dashboard`** (tanpa app terpisah) | **→ AKHIRNYA DIPILIH untuk koperasi (revisi 2026-06-12).** Koperasi bagian suite Manajemen (audiens & login sama), jadi lebih tepat sebagai modul dashboard yang menyatu dengan laporan keuangan. Backend tetap 2 binary. |
| **C. Restrukturisasi penuh (migrasi akademik+keuangan dulu)** | Konsisten 100% segera, tapi menyentuh 149 file existing saat stabilisasi — risiko & review besar tanpa nilai fitur langsung. |

Keputusan awal: modular + koperasi sebagai *pilot app terpisah*. **Revisi 2026-06-12:** koperasi → **modul `apps/dashboard`** (Alternatif B); pola multi-app tetap untuk audiens lain (mobile/web publik). Struktur modular backend & `packages/*` tetap dipertahankan.

---

## 6. Catatan khusus lintas-modul/app (Koperasi)
- **Penyaluran modal** (D1) dipicu `admin_keuangan` dari **dashboard**, menulis dua sisi (debit kas sekolah + credit kas koperasi) via API bersama. Lintas-app aman karena backend & `@alizzah/api-client` dibagi.
- **Akses laporan koperasi** untuk `kepala_sekolah`/`yayasan`: via **dashboard** (modul koperasi) dengan role view — menyatu dengan laporan keuangan.
- **Role `admin_koperasi`** (disetujui) cukup nilai string `role` baru — tanpa perubahan skema `users`.

---

## 7. Tindak Lanjut
- [x] `pnpm-workspace.yaml` → tambah `packages/*`.
- [x] Skeleton `internal/{platform,shared,modules}` + helper `shared.New` + pola `RegisterRoutes`/`Models`.
- [x] Ekstrak `@alizzah/{ui,api-client,auth,config}` (dashboard mengonsumsinya).
- [x] Bangun **backend** koperasi (8a–8e) di struktur modular.
- [x] **(Revisi 2026-06-12)** Koperasi = **modul `apps/dashboard`**, bukan app terpisah; `apps/koperasi` dihapus. Lihat [ADR-002](./adr-002-deployment-multi-binary.md) catatan revisi.
- [ ] **Frontend koperasi di `apps/dashboard`** (regen Swagger+Orval → `packages/api-client`; `features/koperasi/` + `routes/_authenticated/koperasi/` + section Sidebar).
- [ ] (Fase 2) Migrasikan `akademik`, `keuangan` → `internal/modules`, dan dashboard→`@alizzah/ui`.
