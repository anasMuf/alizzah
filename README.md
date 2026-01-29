# PAUD Unggulan Alizzah - Sistem Keuangan

Sistem informasi manajemen keuangan terpadu untuk PAUD Unggulan Alizzah, dibangun dengan arsitektur Monorepo menggunakan Turborepo, Hono (Backend), dan TanStack Start (Frontend).

## Arsitektur Project

- `apps/api`: Backend API menggunakan Hono.
- `apps/web-keuangan`: Frontend menggunakan TanStack Start (React).
- `packages/db`: Prisma schema dan database client.
- `packages/shared`: Kode/tipe yang dibagikan antar project.
- `packages/validators`: Skema validasi menggunakan Zod.
- `packages/api-client`: Client API yang di-generate untuk frontend.

## Persiapan Setup

### 1. Prasyarat
- Node.js (v20+)
- pnpm (v9+)
- Docker (untuk PostgreSQL)

### 2. Instalasi Dependensi
```bash
pnpm install
```

### 3. Setup Database
Jalankan PostgreSQL menggunakan Docker Compose:
```bash
docker compose up -d
```

### 4. Konfigurasi Environment
Salin file `.env.example` menjadi `.env` di **root directory**:
```bash
cp .env.example .env
```
Sesuaikan nilai di dalam `.env` jika diperlukan.

### 5. Push Schema & Seed Database
```bash
# Push schema ke database
pnpm db:push

# Jalankan seeder (membuat user admin)
pnpm db:seed
```

## Pengembangan (Development)

Untuk menjalankan semua aplikasi secara paralel:
```bash
pnpm dev
```

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Prisma Studio**: 
  ```bash
  cd packages/db
  npx prisma studio
  # Akses di http://localhost:5555
  ```

## Akun Default (Seeder)
- **Username**: `admin`
- **Password**: `password123`

## Teknologi Utama
- **Framework**: Hono, TanStack Start
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Styling**: Tailwind CSS
- **State Management**: Jotai
- **Monorepo Tool**: Turborepo
