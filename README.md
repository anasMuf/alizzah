# 🏫 Alizzah Manajemen

> **Platform ERP berbasis web untuk manajemen operasional sekolah KB/TK secara terpadu.** Mengintegrasikan modul administrasi akademik, keuangan, dan SDM dalam satu dashboard yang komprehensif.

---

## 📋 Overview

**Alizzah Manajemen** adalah sistem informasi manajemen sekolah yang dirancang khusus untuk menggantikan proses pencatatan manual. Platform ini menyediakan solusi terpusat untuk:

- **Modul Administrasi**: Manajemen tahun ajaran, data siswa, rombel, dan siklus akademik
- **Modul Keuangan**: Manajemen tagihan, pembayaran, tabungan, pengeluaran, kas, dan pelaporan keuangan
- **Kontrol Akses**: Role-based access control (RBAC) dengan 5 tingkatan pengguna

Fase pengembangan pertama fokus pada **dua modul inti** (Administrasi & Keuangan) yang saling terintegrasi namun terpisah sesuai peran pengguna.

### Struktur Monorepo

```
alizzah/app/
├── apps/
│   ├── api/           ← Go REST API (Echo + GORM + PostgreSQL)
│   └── dashboard/     ← React SPA (TanStack Router + Vite + Tailwind v4)
├── docs/              ← Dokumentasi produk & teknis
├── nx.json            ← Nx build orchestrator config
├── pnpm-workspace.yaml
├── package.json
└── .env               ← Shared environment variables
```

---

## 🎯 Features (Core)

### 1. Manajemen Akses & Role (RBAC)

| Role | Akses |
|------|-------|
| **Superadmin** | Penuh — semua modul, konfigurasi tarif, manajemen user |
| **Admin Administrasi** | Kelola modul administrasi |
| **Admin Keuangan** | Kelola modul keuangan |
| **Kepala Sekolah** | View semua laporan (keuangan + administrasi) |
| **Yayasan** | View laporan keuangan saja |

### 2. Modul Administrasi

- **Manajemen Tahun Ajaran**: Buat, kelola, set kalender akademik dan hari efektif per rombel
- **Manajemen Data Siswa**: CRUD siswa + wali murid, data wali link ke tagihan, tab keuangan di detail siswa
- **Manajemen Rombel**: CRUD rombel per tahun ajaran (Mutiara/KB, Intan/TK-A, Berlian/TK-B), konfigurasi jadwal, assign siswa
- **Siklus Akademik**: Kenaikan kelas, kelulusan, pindah rombel, mutasi masuk, pindah sekolah/keluar → **trigger generate tagihan otomatis**

### 3. Modul Keuangan

- **Konfigurasi Tarif**: Hanya superadmin, per tahun ajaran (SPP, infaq, biaya awal, registrasi, pasta, daycare, wisuda, dll)
- **Manajemen Tagihan**: Generate otomatis + manual per siswa, kelola item, cicilan, insidental
- **Manajemen Pembayaran**: Bayar per item/semua, validasi, bukti pembayaran
- **Manajemen Tabungan**: Tabungan umum (penarikan dengan biaya admin), tabungan wajib Berlian (Rp 10rb/Senin)
- **Manajemen Pengeluaran**: Input manual, kategorisasi pos, upload bukti
- **Kas & Berangkas**: Tracking kas harian, berangkas (penyimpanan tabungan fisik), tutup buku harian dengan rekonsiliasi
- **Laporan Keuangan**: Harian, bulanan, tahunan, rekap per siswa, rekap per kelas (print & export)

---

## 💻 Tech Stack

| Layer | Teknologi |
|---|---|
| **Backend** | Go 1.25, Echo v4, GORM, PostgreSQL, JWT Auth, Swagger (swag) |
| **Frontend** | React 19, TanStack Router (file-based), TanStack Query, Tailwind CSS v4, Lucide React |
| **Tooling** | Vite 8, Biome (linter/formatter), Orval (API codegen dari Swagger), Nx, pnpm workspaces |
| **Arsitektur** | Monorepo — `apps/api` (Go) + `apps/dashboard` (React) |
| **Auth** | JWT Bearer Token, RBAC (5 role) |
| **Database** | PostgreSQL — multi tahun ajaran, soft delete via GORM |

---

## 📋 Prerequisites

Pastikan tools berikut sudah terinstall:

- **Node.js** ≥ 20
- **pnpm** ≥ 9
- **Go** ≥ 1.25
- **PostgreSQL** ≥ 15
- **Git**

---

## 🚀 Getting Started

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/anasMuf/alizzah.git
cd app
pnpm install
```

### 2. Setup Environment

Copy `.env.example` atau buat file `.env` di root project:

```env
# Backend (API) Configuration
PORT=8080
JWT_SECRET=supersecretkey
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=alizzah_db
DB_PORT=5432
SSL_MODE=disable

# Frontend (Dashboard) Configuration
VITE_API_URL=http://localhost:8080/api
```

### 3. Setup Database

```bash
createdb alizzah_db
```

> Tabel akan otomatis di-migrate oleh GORM saat API pertama kali dijalankan (Auto-Migrate).

### 4. Run Development

Jalankan **semua apps** sekaligus:

```bash
pnpm dev
```

Atau jalankan masing-masing secara terpisah:

```bash
# API saja (port 8080)
pnpm --filter api dev

# Dashboard saja (port 3000)
pnpm --filter dashboard dev
```

### 5. Build Production

```bash
pnpm build
```

---

## 📁 Project Architecture

### Backend — Clean Architecture

```
apps/api/
├── main.go              ← Entry point, route registration, DI wiring
├── config/
│   └── database.go      ← ENV loader, PostgreSQL/GORM connection
├── model/
│   ├── model.go         ← Base model
│   └── [domain-models]  ← User, Student, Class, Bill, Payment, etc.
├── dto/
│   ├── [request-dtos]   ← Request payloads
│   ├── success_response.go
│   └── error_response.go
├── repository/
│   └── [repositories]   ← Data access layer (GORM queries)
├── service/
│   └── [services]       ← Business logic layer
├── handler/
│   ├── [handlers]       ← HTTP handlers (controllers)
│   └── error_handler.go
├── middleware/
│   ├── auth.go          ← JWT authentication
│   └── logrus_logger.go ← Request logging
├── utility/
│   └── validator.go     ← Custom request validator
├── docs/                ← Auto-generated Swagger docs
├── seeders/             ← Database seeders
└── .air.toml            ← Air hot-reload config
```

**Alur request:**

```
Request → Middleware (CORS, Logging, JWT) → Handler → Service → Repository → Database
```

### Frontend — Feature-Based Architecture

```
apps/dashboard/src/
├── main.tsx                   ← App entry point
├── router.tsx                 ← TanStack Router setup
├── styles.css                 ← Global styles (Tailwind)
├── routeTree.gen.ts           ← Auto-generated route tree
├── routes/
│   ├── __root.tsx             ← Root layout
│   ├── login.tsx              ← Login page
│   ├── register.tsx           ← Register page
│   ├── _authenticated.tsx     ← Auth layout guard
│   └── _authenticated/
│       ├── index.tsx          ← Dashboard (protected)
│       ├── administrasi/      ← Administration module
│       └── keuangan/          ← Finance module
├── components/
│   ├── atoms/                 ← Atomic components
│   │   ├── Alert.tsx
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── Label.tsx
│   └── molecules/             ← Composite components
├── features/
│   ├── auth/                  ← Auth feature
│   ├── administrasi/          ← Administrasi module feature
│   └── keuangan/              ← Keuangan module feature
└── api/
    ├── endpoints/             ← Auto-generated API hooks (Orval)
    ├── model/                 ← Auto-generated API types
    └── mutator/
        └── custom-instance.ts ← Axios custom instance
```

---

## 📦 Available Scripts

### Root (Monorepo)

| Command        | Deskripsi                          |
|----------------|-------------------------------------|
| `pnpm dev`     | Jalankan semua apps dalam mode dev  |
| `pnpm build`   | Build semua apps untuk production   |

### Backend (`apps/api`)

| Command | Deskripsi |
|---------|-----------|
| `pnpm --filter api dev` | Jalankan API dengan hot-reload (Air) |
| `pnpm --filter api build` | Build binary Go |

### Frontend (`apps/dashboard`)

| Command | Deskripsi |
|---------|-----------|
| `pnpm --filter dashboard dev` | Jalankan frontend dev server (port 3000) |
| `pnpm --filter dashboard build` | Build frontend untuk production |
| `pnpm --filter dashboard lint` | Jalankan Biome linter |
| `pnpm --filter dashboard format` | Format kode dengan Biome |
| `pnpm --filter dashboard generate:api` | Generate API hooks dari Swagger |

---

## 🔌 API Code Generation (Orval)

Frontend menggunakan **Orval** untuk auto-generate React Query hooks dari Swagger spec:

```bash
# 1. Pastikan API sedang running
pnpm --filter api dev

# 2. Generate API hooks
pnpm --filter dashboard generate:api
```

Output akan di-generate ke:
- `apps/dashboard/src/api/endpoints/` — React Query hooks per tag
- `apps/dashboard/src/api/model/` — TypeScript types

---

## 📚 Documentation

Dokumentasi pengembangan produk tersedia di direktori `docs/`:

```
docs/
├── core/
│   ├── prd.md                 ← Product Requirements Document
│   ├── prd-feature-detail.md  ← Feature detail
│   └── erd.md                 ← Entity Relationship Diagram
└── README.md                  ← Panduan dokumentasi
```

---

## 🔒 Environment Variables

| Variable | App | Deskripsi | Default |
|----------|-----|-----------|---------|
| `PORT` | API | Port API server | `8080` |
| `JWT_SECRET` | API | Secret key untuk signing JWT | — |
| `DB_HOST` | API | PostgreSQL host | `localhost` |
| `DB_USER` | API | PostgreSQL user | `postgres` |
| `DB_PASSWORD` | API | PostgreSQL password | — |
| `DB_NAME` | API | PostgreSQL database name | `alizzah_db` |
| `DB_PORT` | API | PostgreSQL port | `5432` |
| `SSL_MODE` | API | PostgreSQL SSL mode | `disable` |
| `VITE_API_URL` | Dashboard | Base URL API untuk frontend | `http://localhost:8080/api` |

> File `.env` diletakkan di **root project** dan dibaca oleh kedua apps.

---

## 📄 License

ISC

---

**Developed with ❤️ for KB/TK School Management Excellence**
