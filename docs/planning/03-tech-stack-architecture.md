# Tech Stack & Architecture
# Sistem Keuangan Sekolah PAUD Unggulan Alizzah

> **Versi:** 1.0  
> **Tanggal:** 29 Januari 2026  
> **Status:** Draft

---

## 📋 Daftar Isi

1. [Tech Stack Overview](#1-tech-stack-overview)
2. [Monorepo Structure](#2-monorepo-structure)
3. [Backend Architecture](#3-backend-architecture)
4. [Frontend Architecture](#4-frontend-architecture)
5. [Database Design](#5-database-design)
6. [Authentication & Authorization](#6-authentication--authorization)
7. [File Storage](#7-file-storage)
8. [Export / Import / Print](#8-export--import--print)
9. [Deployment Strategy](#9-deployment-strategy)
10. [Development Workflow](#10-development-workflow)

---

## 1. Tech Stack Overview

### 1.1 Summary

| Layer | Technology | Version |
|-------|------------|---------|
| **Runtime** | Node.js | v24.12.0 |
| **Package Manager** | pnpm | v10.19.0 |
| **Language** | TypeScript | 5.x |
| **Monorepo** | pnpm workspaces | - |
| **Backend Framework** | Hono | 4.x |
| **ORM** | Prisma | 6.x |
| **Database** | PostgreSQL | 16.x |
| **Validation** | Zod | 3.x |
| **Frontend Framework** | TanStack Start | 1.x |
| **Routing** | TanStack Router | 1.x |
| **Data Fetching** | TanStack Query | 5.x |
| **Table** | TanStack Table | 8.x |
| **State Management** | Jotai | 2.x |
| **Styling** | Tailwind CSS | 4.x |
| **UI Components** | Custom | - |
| **Auth** | Custom JWT → Better Auth | - |
| **File Storage** | Local → MinIO | - |

### 1.2 Development Tools

| Tool | Purpose |
|------|---------|
| **ESLint** | Linting |
| **Prettier** | Code formatting |
| **Vitest** | Unit testing |
| **Playwright** | E2E testing |
| **TypeDoc** | API documentation |
| **Husky** | Git hooks |
| **lint-staged** | Pre-commit linting |

---

## 2. Monorepo Structure

### 2.1 Directory Structure

```
app/                           # Root directory monorepo alizzah
├── .github/                   # GitHub Actions workflows
│   └── workflows/
│       ├── ci.yml             # CI pipeline
│       └── deploy.yml         # Deployment
│
├── apps/
│   ├── api/                   # 🔥 Backend Hono API
│   │   ├── src/
│   │   │   ├── modules/       # 📦 Feature-based modules
│   │   │   │   ├── core/      # Shared modules (Auth, User, Siswa)
│   │   │   │   └── keuangan/  # Keuangan domain modules
│   │   │   ├── shared/        # Shared utilities
│   │   │   │   ├── middleware/
│   │   │   │   ├── lib/
│   │   │   │   └── types/
│   │   │   ├── index.ts       # Entry point
│   │   │   └── app.ts         # Hono app setup
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── web-keuangan/          # 💰 Admin Keuangan (TanStack Start)
│   │   ├── src/
│   │   │   ├── routes/        # TanStack Router pages
│   │   │   │   ├── __root.tsx
│   │   │   │   ├── index.tsx  # Dashboard
│   │   │   │   ├── login.tsx
│   │   │   │   ├── master/
│   │   │   │   │   ├── siswa/
│   │   │   │   │   ├── jenjang/
│   │   │   │   │   ├── rombel/
│   │   │   │   │   ├── jenis-pembayaran/
│   │   │   │   │   ├── diskon/
│   │   │   │   │   └── pasta/
│   │   │   │   ├── tagihan/
│   │   │   │   ├── pembayaran/
│   │   │   │   ├── tabungan/
│   │   │   │   ├── kas/
│   │   │   │   ├── laporan/
│   │   │   │   └── pengaturan/
│   │   │   ├── components/    # React components
│   │   │   │   ├── ui/        # Base UI components
│   │   │   │   │   ├── Button.tsx
│   │   │   │   │   ├── Input.tsx
│   │   │   │   │   ├── Select.tsx
│   │   │   │   │   ├── Modal.tsx
│   │   │   │   │   ├── Table.tsx
│   │   │   │   │   ├── Card.tsx
│   │   │   │   │   └── ...
│   │   │   │   ├── layout/    # Layout components
│   │   │   │   │   ├── Sidebar.tsx
│   │   │   │   │   ├── Header.tsx
│   │   │   │   │   ├── Footer.tsx
│   │   │   │   │   └── MainLayout.tsx
│   │   │   │   ├── forms/     # Form components
│   │   │   │   └── tables/    # Table components
│   │   │   ├── hooks/         # Custom hooks
│   │   │   ├── stores/        # Jotai atoms
│   │   │   ├── lib/           # Utilities
│   │   │   └── styles/        # CSS files
│   │   ├── public/            # Static assets
│   │   ├── package.json
│   │   ├── tailwind.config.js
│   │   └── tsconfig.json
│   │
│   ├── web-landing/           # 🏠 Landing Page (future)
│   ├── web-ppdb/              # 📝 PPDB Online (future)
│   ├── web-kepegawaian/       # 👔 Kepegawaian (future)
│   └── web-koperasi/          # 🛒 Koperasi (future)
│
├── packages/
│   ├── db/                    # 🗄️ Prisma Database Package
│   │   ├── prisma/
│   │   │   ├── schema.prisma  # Database schema
│   │   │   ├── migrations/    # Migration files
│   │   │   └── seed.ts        # Seed data
│   │   ├── src/
│   │   │   └── index.ts       # Export prisma client
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── shared/                # 📦 Shared Utilities
│   │   ├── src/
│   │   │   ├── types/         # Shared TypeScript types
│   │   │   │   ├── auth.ts
│   │   │   │   ├── siswa.ts
│   │   │   │   ├── tagihan.ts
│   │   │   │   ├── pembayaran.ts
│   │   │   │   └── index.ts
│   │   │   ├── constants/     # Shared constants
│   │   │   │   ├── status.ts
│   │   │   │   ├── roles.ts
│   │   │   │   └── index.ts
│   │   │   ├── utils/         # Shared utilities
│   │   │   │   ├── format.ts  # Currency, date formatting
│   │   │   │   ├── calculate.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── validators/            # ✅ Zod Schemas
│   │   ├── src/
│   │   │   ├── auth.ts
│   │   │   ├── siswa.ts
│   │   │   ├── tagihan.ts
│   │   │   ├── pembayaran.ts
│   │   │   ├── tabungan.ts
│   │   │   ├── kas.ts
│   │   │   ├── master.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── api-client/            # 🔌 Typed API Client
│       ├── src/
│       │   ├── client.ts      # Hono RPC client setup
│       │   ├── hooks.ts       # TanStack Query hooks
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── scripts/                   # Build & utility scripts
│   ├── setup.sh
│   └── deploy.sh
│
├── .env.example               # Environment variables template
├── .gitignore
├── .npmrc                     # pnpm configuration
├── .nvmrc                     # Node version
├── package.json               # Root package.json
├── pnpm-workspace.yaml        # Workspace configuration
├── tsconfig.base.json         # Base TypeScript config
└── README.md
```

### 2.2 Package Dependencies

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### 2.3 Root package.json Scripts

```json
{
  "name": "alizzah",
  "private": true,
  "scripts": {
    "dev": "pnpm --filter @alizzah/api dev & pnpm --filter @alizzah/web-keuangan dev",
    "dev:api": "pnpm --filter @alizzah/api dev",
    "dev:web": "pnpm --filter @alizzah/web-keuangan dev",
    "build": "pnpm -r build",
    "build:api": "pnpm --filter @alizzah/api build",
    "build:web": "pnpm --filter @alizzah/web-keuangan build",
    "db:generate": "pnpm --filter @alizzah/api-client generate",
    "db:migrate": "pnpm --filter @alizzah/api-client migrate",
    "db:seed": "pnpm --filter @alizzah/api-client seed",
    "db:studio": "pnpm --filter @alizzah/api-client studio",
    "lint": "pnpm -r lint",
    "test": "pnpm -r test",
    "clean": "pnpm -r clean"
  }
}
```

---

## 3. Backend Architecture

### 3.1 Architecture Pattern: Modular Layered + SOLID

Backend menggunakan **Modular Layered Architecture** dengan penerapan **prinsip SOLID**:
- Kode diorganisir per modul/fitur bisnis
- Setiap modul memiliki routes, service, dan types sendiri
- Langsung menggunakan Prisma tanpa repository abstraction (untuk kesederhanaan)

### 3.2 SOLID Principles Applied

| Prinsip | Penerapan di Alizzah |
|---------|----------------------|
| **S**ingle Responsibility | Setiap service menangani 1 domain (SiswaService, TagihanService) |
| **O**pen/Closed | Strategy pattern untuk diskon, metode pembayaran |
| **L**iskov Substitution | Interface untuk komponen yang bisa di-swap (payment gateway) |
| **I**nterface Segregation | Interface kecil dan fokus |
| **D**ependency Inversion | Service menerima dependencies via constructor |

### 3.3 Backend Folder Structure

Struktur folder di-grouping untuk mendukung **multiple web apps** di masa depan:

```
apps/api/
├── src/
│   ├── modules/
│   │   │
│   │   ├── core/                       # � SHARED modules (all apps use this)
│   │   │   ├── auth/
│   │   │   │   ├── auth.routes.ts      # POST /auth/login, /auth/logout
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.types.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── user/
│   │   │   │   ├── user.routes.ts
│   │   │   │   ├── user.service.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── siswa/                  # Shared: keuangan, ppdb, dll
│   │   │   │   ├── siswa.routes.ts
│   │   │   │   ├── siswa.service.ts
│   │   │   │   ├── siswa.types.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   └── master/                 # Shared master data
│   │   │       ├── tahun-ajaran/
│   │   │       ├── jenjang/
│   │   │       ├── rombel/
│   │   │       ├── bank/
│   │   │       └── index.ts
│   │   │
│   │   ├── keuangan/                   # 💰 KEUANGAN app modules
│   │   │   ├── tagihan/
│   │   │   │   ├── tagihan.routes.ts
│   │   │   │   ├── tagihan.service.ts
│   │   │   │   ├── tagihan.types.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── pembayaran/
│   │   │   │   ├── pembayaran.routes.ts
│   │   │   │   ├── pembayaran.service.ts
│   │   │   │   ├── pembayaran.types.ts
│   │   │   │   ├── strategies/         # Strategy pattern
│   │   │   │   │   ├── payment.interface.ts
│   │   │   │   │   ├── cash.strategy.ts
│   │   │   │   │   └── transfer.strategy.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── tabungan/
│   │   │   │   ├── tabungan.routes.ts
│   │   │   │   ├── tabungan.service.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── kas/
│   │   │   │   ├── kas.routes.ts
│   │   │   │   ├── kas.service.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── laporan/
│   │   │   │   ├── laporan.routes.ts
│   │   │   │   ├── laporan.service.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── master/                 # Keuangan-specific master
│   │   │   │   ├── jenis-pembayaran/
│   │   │   │   ├── diskon/
│   │   │   │   │   ├── diskon.routes.ts
│   │   │   │   │   ├── diskon.service.ts
│   │   │   │   │   ├── strategies/
│   │   │   │   │   │   ├── discount.interface.ts
│   │   │   │   │   │   ├── percentage.strategy.ts
│   │   │   │   │   │   └── nominal.strategy.ts
│   │   │   │   │   └── index.ts
│   │   │   │   └── pasta/
│   │   │   │
│   │   │   ├── daycare/                # 🏠 Daycare module
│   │   │   │   ├── daycare.routes.ts
│   │   │   │   ├── daycare.service.ts
│   │   │   │   ├── daycare.types.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   └── index.ts
│   │   │
│   │   ├── ppdb/                       # 📝 PPDB app modules (future)
│   │   │   ├── pendaftaran/
│   │   │   ├── seleksi/
│   │   │   └── index.ts
│   │   │
│   │   ├── landing/                    # 🏠 Landing page modules (future)
│   │   │   ├── content/
│   │   │   ├── contact/
│   │   │   └── index.ts
│   │   │
│   │   └── koperasi/                   # 🛒 Koperasi modules (future)
│   │       └── index.ts
│   │
│   ├── shared/                         # Shared utilities (non-domain)
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── error.middleware.ts
│   │   │   └── logger.middleware.ts
│   │   ├── lib/
│   │   │   ├── prisma.ts               # Prisma client instance
│   │   │   ├── jwt.ts                  # JWT helpers
│   │   │   ├── excel.ts                # Excel export/import
│   │   │   └── pdf.ts                  # PDF generation
│   │   ├── types/
│   │   │   ├── response.types.ts       # Standard response types
│   │   │   └── common.types.ts
│   │   └── utils/
│   │       ├── format.ts               # formatCurrency, formatDate
│   │       ├── nis-generator.ts        # NIS auto-generate
│   │       └── pagination.ts           # Pagination helpers
│   │
│   ├── app.ts                          # Hono app setup & route mounting
│   └── index.ts                        # Entry point
│
├── package.json
└── tsconfig.json
```

### 3.4 Route Mounting Example

```typescript
// apps/api/src/app.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

// Core modules (shared across all apps)
import { authRoutes } from './modules/core/auth'
import { userRoutes } from './modules/core/user'
import { siswaRoutes } from './modules/core/siswa'
import { masterRoutes as coreMasterRoutes } from './modules/core/master'

// Keuangan modules
import { tagihanRoutes } from './modules/keuangan/tagihan'
import { pembayaranRoutes } from './modules/keuangan/pembayaran'
import { tabunganRoutes } from './modules/keuangan/tabungan'
import { kasRoutes } from './modules/keuangan/kas'
import { laporanRoutes } from './modules/keuangan/laporan'
import { masterRoutes as keuanganMasterRoutes } from './modules/keuangan/master'

// Future: PPDB modules
// import { pendaftaranRoutes } from './modules/ppdb/pendaftaran'

const app = new Hono()

// Global middleware
app.use('*', logger())
app.use('*', cors())

// API versioning
const v1 = new Hono()

// ====== CORE ROUTES (shared) ======
v1.route('/auth', authRoutes)
v1.route('/users', userRoutes)
v1.route('/siswa', siswaRoutes)
v1.route('/master', coreMasterRoutes)         // /master/jenjang, /master/rombel

// ====== KEUANGAN ROUTES ======
v1.route('/keuangan/tagihan', tagihanRoutes)
v1.route('/keuangan/pembayaran', pembayaranRoutes)
v1.route('/keuangan/tabungan', tabunganRoutes)
v1.route('/keuangan/kas', kasRoutes)
v1.route('/keuangan/laporan', laporanRoutes)
v1.route('/keuangan/master', keuanganMasterRoutes) // /keuangan/master/diskon, /pasta

// Daycare module
import { daycareRoutes } from './modules/keuangan/daycare'
v1.route('/keuangan/daycare', daycareRoutes)

// ====== PPDB ROUTES (future) ======
// v1.route('/ppdb/pendaftaran', pendaftaranRoutes)

// Mount v1
app.route('/api/v1', v1)

export default app
```

### 3.5 URL Structure

| Domain | Base URL | Examples |
|--------|----------|----------|
| **Core (Shared)** | `/api/v1/` | `/api/v1/auth/login`, `/api/v1/siswa` |
| **Keuangan** | `/api/v1/keuangan/` | `/api/v1/keuangan/tagihan`, `/api/v1/keuangan/pembayaran` |
| **PPDB** (future) | `/api/v1/ppdb/` | `/api/v1/ppdb/pendaftaran` |
| **Landing** (future) | `/api/v1/public/` | `/api/v1/public/content` |

### 3.6 Layer Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        Routes Layer (Hono)                       │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  siswa.routes.ts  │  tagihan.routes.ts  │  pembayaran.routes│ │
│  │  - Parse request                                            │ │
│  │  - Validate input (Zod)                                     │ │
│  │  - Call service                                             │ │
│  │  - Return response                                          │ │
│  └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                      Middleware Layer                            │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  auth.middleware  │  logger.middleware  │  error.middleware │ │
│  └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                      Service Layer (Business Logic)              │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  SiswaService    │  TagihanService   │  PembayaranService   │ │
│  │  - Business rules                                           │ │
│  │  - Validation logic                                         │ │
│  │  - Orchestrate data operations                              │ │
│  │  - Apply strategies (discount, payment)                     │ │
│  └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                      Data Access (Prisma Direct)                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  prisma.siswa.findMany()  │  prisma.tagihan.create()       │ │
│  │  - Direct Prisma calls in service                          │ │
│  │  - No repository abstraction (for simplicity)              │ │
│  └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                         Database (PostgreSQL)                    │
└─────────────────────────────────────────────────────────────────┘
```

### 3.7 API Route Structure Example

```typescript
// apps/api/src/routes/siswa.routes.ts
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { createSiswaSchema, updateSiswaSchema } from '@alizzah/validators'
import { SiswaService } from '../services/siswa.service'
import { authMiddleware } from '../middleware/auth.middleware'

const siswa = new Hono()

// Apply auth middleware to all routes
siswa.use('*', authMiddleware)

// GET /siswa - List all students with pagination
siswa.get('/', async (c) => {
  const { page, limit, search, jenjangId, rombelId } = c.req.query()
  const result = await SiswaService.findAll({ page, limit, search, jenjangId, rombelId })
  return c.json(result)
})

// GET /siswa/:id - Get single student
siswa.get('/:id', async (c) => {
  const id = c.req.param('id')
  const siswa = await SiswaService.findById(id)
  return c.json(siswa)
})

// POST /siswa - Create new student
siswa.post('/', zValidator('json', createSiswaSchema), async (c) => {
  const data = c.req.valid('json')
  const siswa = await SiswaService.create(data)
  return c.json(siswa, 201)
})

// PUT /siswa/:id - Update student
siswa.put('/:id', zValidator('json', updateSiswaSchema), async (c) => {
  const id = c.req.param('id')
  const data = c.req.valid('json')
  const siswa = await SiswaService.update(id, data)
  return c.json(siswa)
})

// DELETE /siswa/:id - Delete student
siswa.delete('/:id', async (c) => {
  const id = c.req.param('id')
  await SiswaService.delete(id)
  return c.json({ message: 'Deleted' })
})

// POST /siswa/import - Bulk import from Excel
siswa.post('/import', async (c) => {
  const file = await c.req.formData()
  const result = await SiswaService.importFromExcel(file)
  return c.json(result)
})

// GET /siswa/export - Export to Excel
siswa.get('/export', async (c) => {
  const { format } = c.req.query() // 'xlsx' or 'csv'
  const buffer = await SiswaService.export(format)
  return new Response(buffer, {
    headers: {
      'Content-Type': format === 'csv' 
        ? 'text/csv' 
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="siswa.${format}"`,
    },
  })
})

export default siswa
```

### 3.8 Service Layer Example

```typescript
// apps/api/src/services/siswa.service.ts
import { prisma } from '@alizzah/api-client'
import { CreateSiswaInput, UpdateSiswaInput } from '@alizzah/validators'
import { ExcelService } from '../lib/excel'

export class SiswaService {
  static async findAll(params: {
    page?: string
    limit?: string
    search?: string
    jenjangId?: string
    rombelId?: string
  }) {
    const page = parseInt(params.page || '1')
    const limit = parseInt(params.limit || '10')
    const skip = (page - 1) * limit

    const where = {
      ...(params.search && {
        OR: [
          { namaLengkap: { contains: params.search, mode: 'insensitive' } },
          { nis: { contains: params.search } },
        ],
      }),
      ...(params.rombelId && { rombelId: params.rombelId }),
      ...(params.jenjangId && { rombel: { jenjangId: params.jenjangId } }),
    }

    const [data, total] = await Promise.all([
      prisma.siswa.findMany({
        where,
        skip,
        take: limit,
        include: {
          rombel: {
            include: { jenjang: true },
          },
        },
        orderBy: { namaLengkap: 'asc' },
      }),
      prisma.siswa.count({ where }),
    ])

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  static async findById(id: string) {
    return prisma.siswa.findUniqueOrThrow({
      where: { id },
      include: {
        rombel: { include: { jenjang: true } },
        siswaPasta: { include: { pasta: true } },
        siswaDiskon: { include: { diskon: true } },
      },
    })
  }

  static async create(data: CreateSiswaInput) {
    return prisma.siswa.create({
      data: {
        ...data,
        // Generate NIS if not provided
        nis: data.nis || await this.generateNIS(),
      },
    })
  }

  static async update(id: string, data: UpdateSiswaInput) {
    return prisma.siswa.update({
      where: { id },
      data,
    })
  }

  static async delete(id: string) {
    return prisma.siswa.delete({ where: { id } })
  }

  static async export(format: 'xlsx' | 'csv') {
    const siswa = await prisma.siswa.findMany({
      include: {
        rombel: { include: { jenjang: true } },
      },
    })
    return ExcelService.generateSiswaExport(siswa, format)
  }

  static async importFromExcel(file: FormData) {
    // Parse Excel file and bulk insert
    const data = await ExcelService.parseSiswaImport(file)
    return prisma.siswa.createMany({ data })
  }

  private static async generateNIS(): Promise<string> {
    const year = new Date().getFullYear().toString().slice(-2)
    const count = await prisma.siswa.count()
    return `${year}${(count + 1).toString().padStart(4, '0')}`
  }
}
```

### 3.9 API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| **Auth** |
| POST | /auth/login | Login | ❌ |
| POST | /auth/logout | Logout | ✅ |
| GET | /auth/me | Get current user | ✅ |
| POST | /auth/refresh | Refresh token | ✅ |
| **Master - Tahun Ajaran** |
| GET | /master/tahun-ajaran | List | ✅ |
| POST | /master/tahun-ajaran | Create | ✅ Admin |
| PUT | /master/tahun-ajaran/:id | Update | ✅ Admin |
| DELETE | /master/tahun-ajaran/:id | Delete | ✅ Admin |
| **Master - Jenjang** |
| GET | /master/jenjang | List | ✅ |
| POST | /master/jenjang | Create | ✅ Admin |
| PUT | /master/jenjang/:id | Update | ✅ Admin |
| DELETE | /master/jenjang/:id | Delete | ✅ Admin |
| **Master - Rombel** |
| GET | /master/rombel | List | ✅ |
| POST | /master/rombel | Create | ✅ Admin |
| PUT | /master/rombel/:id | Update | ✅ Admin |
| DELETE | /master/rombel/:id | Delete | ✅ Admin |
| **Siswa** |
| GET | /siswa | List with pagination | ✅ |
| GET | /siswa/:id | Get by ID | ✅ |
| POST | /siswa | Create | ✅ Admin |
| PUT | /siswa/:id | Update | ✅ Admin |
| DELETE | /siswa/:id | Delete | ✅ Admin |
| POST | /siswa/import | Import Excel | ✅ Admin |
| GET | /siswa/export | Export Excel/CSV | ✅ |
| **Jenis Pembayaran** |
| GET | /jenis-pembayaran | List | ✅ |
| POST | /jenis-pembayaran | Create | ✅ Admin |
| PUT | /jenis-pembayaran/:id | Update | ✅ Admin |
| DELETE | /jenis-pembayaran/:id | Delete | ✅ Admin |
| **Diskon** |
| GET | /diskon | List | ✅ |
| POST | /diskon | Create | ✅ Admin |
| PUT | /diskon/:id | Update | ✅ Admin |
| DELETE | /diskon/:id | Delete | ✅ Admin |
| **PASTA** |
| GET | /pasta | List | ✅ |
| POST | /pasta | Create | ✅ Admin |
| PUT | /pasta/:id | Update | ✅ Admin |
| DELETE | /pasta/:id | Delete | ✅ Admin |
| **Tagihan** |
| GET | /tagihan | List with filters | ✅ |
| GET | /tagihan/:id | Get by ID | ✅ |
| POST | /tagihan/generate | Generate bulk | ✅ Admin |
| POST | /tagihan | Create individual | ✅ Admin |
| PUT | /tagihan/:id | Update | ✅ Admin |
| DELETE | /tagihan/:id | Cancel | ✅ Admin |
| GET | /tagihan/export | Export | ✅ |
| GET | /tagihan/:id/print | Print invoice | ✅ |
| **Pembayaran** |
| GET | /pembayaran | List | ✅ |
| GET | /pembayaran/:id | Get by ID | ✅ |
| POST | /pembayaran | Create payment | ✅ Admin |
| DELETE | /pembayaran/:id | Void | ✅ Admin + Approval |
| GET | /pembayaran/:id/kuitansi | Print receipt | ✅ |
| GET | /pembayaran/export | Export | ✅ |
| **Tabungan** |
| GET | /tabungan | List accounts | ✅ |
| GET | /tabungan/:siswaId | Get student balance | ✅ |
| POST | /tabungan/setor | Deposit | ✅ Admin |
| POST | /tabungan/tarik | Withdraw | ✅ Admin |
| GET | /tabungan/export | Export | ✅ |
| **Kas & Berangkas** |
| GET | /kas | List transactions | ✅ |
| GET | /kas/saldo | Get balance | ✅ |
| POST | /kas/masuk | Cash in | ✅ Admin |
| POST | /kas/keluar | Cash out | ✅ Admin |
| POST | /kas/transfer | Transfer kas↔berangkas | ✅ Admin |
| GET | /kas/export | Export | ✅ |
| **Laporan** |
| GET | /laporan/tunggakan | Arrears report | ✅ |
| GET | /laporan/pembayaran-harian | Daily payments | ✅ |
| GET | /laporan/pembayaran-bulanan | Monthly payments | ✅ |
| GET | /laporan/per-kelas | Per class report | ✅ |
| GET | /laporan/tabungan | Savings report | ✅ |
| GET | /laporan/kas | Cash report | ✅ |
| GET | /laporan/*/export | Export any report | ✅ |
| GET | /laporan/*/print | Print any report | ✅ |
| **Daycare** |
| GET | /keuangan/daycare/peserta | List peserta daycare | ✅ |
| GET | /keuangan/daycare/peserta/:id | Get peserta by ID | ✅ |
| POST | /keuangan/daycare/peserta | Register peserta daycare | ✅ Admin |
| PUT | /keuangan/daycare/peserta/:id | Update peserta | ✅ Admin |
| DELETE | /keuangan/daycare/peserta/:id | Deactivate peserta | ✅ Admin |
| POST | /keuangan/daycare/tagihan-harian | Create daily daycare invoice | ✅ Admin |
| GET | /keuangan/daycare/tagihan-harian | List daily daycare invoices | ✅ |
| GET | /keuangan/daycare/export | Export daycare data | ✅ |

---

## 4. Frontend Architecture

### 4.1 Island Architecture Overview

**Island Architecture** adalah pendekatan rendering dimana halaman sebagian besar adalah HTML statis, dengan "pulau" (islands) komponen interaktif yang di-hydrate secara independen.

```
┌─────────────────────────────────────────────────────────────────┐
│                     PAGE (Static HTML)                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Header (Static - No JS)                                   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────┐  ┌──────────────────────────┐   │
│  │ Sidebar (Static)          │  │ ┌──────────────────────┐ │   │
│  │                           │  │ │  🏝️ DataTable Island │ │   │
│  │ Menu items rendered       │  │ │  (Hydrated - Has JS) │ │   │
│  │ as static HTML            │  │ │                      │ │   │
│  │                           │  │ │  - Sorting           │ │   │
│  │                           │  │ │  - Filtering         │ │   │
│  │                           │  │ │  - Pagination        │ │   │
│  └───────────────────────────┘  │ └──────────────────────┘ │   │
│                                 │                          │   │
│                                 │ ┌──────────────────────┐ │   │
│                                 │ │  🏝️ Form Island     │ │   │
│                                 │ │  (Hydrated - Has JS) │ │   │
│                                 │ │                      │ │   │
│                                 │ │  - Validation        │ │   │
│                                 │ │  - Submit            │ │   │
│                                 │ └──────────────────────┘ │   │
│                                 └──────────────────────────┘   │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Footer (Static - No JS)                                   │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Keuntungan Island Architecture:**
- ✅ **Faster Initial Load:** Mayoritas halaman adalah HTML statis
- ✅ **Less JavaScript:** Hanya komponen interaktif yang memuat JS
- ✅ **Better SEO:** Konten sudah ada di HTML
- ✅ **Progressive Enhancement:** Halaman tetap berfungsi tanpa JS
- ✅ **Optimized Hydration:** Hydrate hanya yang diperlukan

### 4.2 TanStack Start + Island Pattern

TanStack Start mendukung "Enterprise Hybrid Hydration" melalui selective hydration dan server functions. Berikut pola standar yang diimplementasikan:

#### A. Zero-Flicker Enterprise Auth Pattern
Mekanisme autentikasi menggunakan `beforeLoad` dan `loader` di level root route untuk memastikan validasi server-side dilakukan *sebelum* UI client-side dirender.

```typescript
// src/routes/__root.tsx
export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: async ({ location }) => {
    const auth = await fetchAuth() // Server function: read token from cookie
    const isLoginPage = location.pathname === '/login'

    if (!auth.token && !isLoginPage) throw redirect({ to: '/login' })
    if (auth.token && isLoginPage) throw redirect({ to: '/' })
    
    return { auth }
  },
  loader: async () => {
    const auth = await fetchAuth()
    return { auth }
  }
})
```

#### B. Hybrid State Hydration (Jotai + Cookies)
State autentikasi (token & user profile) disimpan secara redundan di **Cookies** (untuk SSR) dan **LocalStorage** (untuk persistence). Komponen `AppContent` melakukan sinkronisasi data dari loader server ke Jotai atoms saat mount pertama kali.

```typescript
// src/stores/auth.ts implementation
export const loginSuccessAtom = atom(null, (_get, set, { token, user }) => {
    set(tokenAtom, token)
    set(userAtom, user)
    if (typeof window !== 'undefined') {
        Cookies.set('token', token, { expires: 7, path: '/' })
        Cookies.set('user', JSON.stringify(user), { expires: 7, path: '/' })
    }
})
```

```typescript
// src/routes/_auth/siswa/index.tsx
import { createFileRoute } from '@tanstack/react-router'
import { SiswaIsland } from '@/components/islands/SiswaIsland'

export const Route = createFileRoute('/_auth/siswa/')({
  // Data fetching di server
  loader: async ({ context }) => {
    const siswa = await context.trpc.siswa.list.query()
    return { siswa }
  },
  
  component: SiswaPage,
})

function SiswaPage() {
  const { siswa } = Route.useLoaderData()
  
  return (
    <div className="p-6">
      {/* Static Content - No hydration */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Data Siswa</h1>
        <p className="text-gray-500">Kelola data siswa PAUD Alizzah</p>
      </header>
      
      {/* 🏝️ Island - Interactive Component */}
      <SiswaIsland initialData={siswa} />
    </div>
  )
}
```

```typescript
// src/components/islands/SiswaIsland.tsx
'use client' // Mark as client component (island)

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DataTable } from '@/components/ui/DataTable'
import { SearchInput } from '@/components/ui/SearchInput'
import { Button } from '@/components/ui/Button'

interface SiswaIslandProps {
  initialData: Siswa[]
}

export function SiswaIsland({ initialData }: SiswaIslandProps) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  
  // Client-side data fetching for subsequent requests
  const { data, isLoading } = useQuery({
    queryKey: ['siswa', { search, page }],
    queryFn: () => fetchSiswa({ search, page }),
    initialData: search === '' && page === 1 ? initialData : undefined,
  })
  
  return (
    <div className="space-y-4">
      {/* Interactive: Search */}
      <div className="flex gap-4">
        <SearchInput 
          value={search} 
          onChange={setSearch}
          placeholder="Cari nama atau NIS..."
        />
        <Button onClick={() => navigate('/siswa/create')}>
          + Tambah Siswa
        </Button>
      </div>
      
      {/* Interactive: Table with sorting, filtering */}
      <DataTable 
        data={data}
        columns={columns}
        isLoading={isLoading}
        onPageChange={setPage}
      />
    </div>
  )
}
```

### 4.3 Architecture Pattern: Feature-Based + Islands

Arsitektur frontend menggunakan kombinasi:
- **Feature-Based Architecture:** Kode diorganisir per modul/fitur bisnis
- **Island Architecture:** Komponen interaktif di-hydrate secara selektif

| Type | Hydration | Examples |
|------|-----------|----------|
| **Static** | ❌ No JS | Header, Footer, Sidebar structure, Labels, Static text |
| **Island** | ✅ Hydrated | DataTable, Forms, Modals, Dropdowns, Charts |

### 4.4 Frontend Folder Structure

```
src/
├── routes/                      # TanStack Router (file-based)
│   ├── __root.tsx
│   ├── _auth.tsx
│   ├── _auth/
│   │   ├── index.tsx            # Dashboard
│   │   ├── master/
│   │   ├── tagihan/
│   │   ├── pembayaran/
│   │   └── ...
│   └── login.tsx
│
├── modules/                     # 🔥 Feature-Based Modules
│   ├── siswa/
│   │   ├── components/          # Module-specific components
│   │   │   ├── SiswaTable.tsx   # 🏝️ Island
│   │   │   ├── SiswaForm.tsx    # 🏝️ Island
│   │   │   ├── SiswaCard.tsx
│   │   │   └── SiswaFilter.tsx  # 🏝️ Island
│   │   ├── hooks/               # Module-specific hooks
│   │   │   ├── useSiswaList.ts
│   │   │   ├── useSiswaDetail.ts
│   │   │   ├── useCreateSiswa.ts
│   │   │   └── useUpdateSiswa.ts
│   │   ├── types/               # Module-specific types
│   │   │   └── index.ts
│   │   ├── utils/               # Module-specific utilities
│   │   │   └── siswa.utils.ts
│   │   └── index.ts             # Public exports
│   │
│   ├── tagihan/
│   │   ├── components/
│   │   │   ├── TagihanTable.tsx
│   │   │   ├── TagihanForm.tsx
│   │   │   ├── TagihanDetail.tsx
│   │   │   └── GenerateTagihanForm.tsx
│   │   ├── hooks/
│   │   │   ├── useTagihanList.ts
│   │   │   ├── useGenerateTagihan.ts
│   │   │   └── useTagihanDetail.ts
│   │   └── index.ts
│   │
│   ├── pembayaran/
│   │   ├── components/
│   │   │   ├── PembayaranTable.tsx
│   │   │   ├── PembayaranForm.tsx
│   │   │   ├── KuitansiPreview.tsx
│   │   │   └── SelectTagihan.tsx
│   │   ├── hooks/
│   │   │   ├── usePembayaranList.ts
│   │   │   ├── useCreatePembayaran.ts
│   │   │   └── usePrintKuitansi.ts
│   │   └── index.ts
│   │
│   ├── tabungan/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── index.ts
│   │
│   ├── kas/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── index.ts
│   │
│   ├── laporan/
│   │   ├── components/
│   │   │   ├── LaporanTunggakan.tsx
│   │   │   ├── LaporanPembayaran.tsx
│   │   │   ├── ReportFilter.tsx
│   │   │   └── ReportExport.tsx
│   │   ├── hooks/
│   │   │   ├── useLaporanTunggakan.ts
│   │   │   ├── useLaporanPembayaran.ts
│   │   │   └── useExportReport.ts
│   │   └── index.ts
│   │
│   ├── master/                  # Master data modules
│   │   ├── jenjang/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── index.ts
│   │   ├── rombel/
│   │   ├── jenis-pembayaran/
│   │   ├── diskon/
│   │   ├── pasta/
│   │   └── bank/
│   │
│   └── auth/
│       ├── components/
│       │   ├── LoginForm.tsx
│       │   └── UserMenu.tsx
│       ├── hooks/
│       │   ├── useAuth.ts
│       │   ├── useLogin.ts
│       │   └── useLogout.ts
│       └── index.ts
│
├── components/                  # Shared/Global Components
│   ├── ui/                      # Base UI primitives (reusable)
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── ConfirmDialog.tsx # Dynamic premium confirm modal
│   │   └── index.ts
│   │
│   └── layout/                  # Layout components
│       ├── MainLayout.tsx
│       ├── Sidebar.tsx
│       ├── Header.tsx
│       ├── Footer.tsx
│       ├── Breadcrumb.tsx
│       └── PageContainer.tsx
│
├── hooks/                       # Shared/Global Hooks
│   ├── useDebounce.ts
│   ├── usePagination.ts
│   ├── useLocalStorage.ts
│   └── useMediaQuery.ts
│
├── stores/                      # Jotai Atoms (Global State)
│   ├── auth.ts
│   ├── ui.ts
│   └── filter.ts
│
├── lib/                         # Utilities & Helpers
│   ├── api.ts                   # API client setup
│   ├── utils.ts                 # cn(), formatCurrency(), etc
│   ├── constants.ts
│   └── validators.ts            # Re-export from @alizzah/validators
│
├── styles/                      # Global Styles
│   ├── globals.css
│   └── print.css
│
└── types/                       # Shared Types
    └── index.ts
```

### Import Pattern

```typescript
// ✅ Import from module (clean)
import { SiswaTable, SiswaForm, useSiswaList } from '@/modules/siswa'

// ✅ Import shared UI
import { Button, Input, DataTable } from '@/components/ui'

// ✅ Import layout
import { MainLayout } from '@/components/layout'

// ❌ Avoid deep imports
import { SiswaTable } from '@/modules/siswa/components/SiswaTable'
```

### Module Structure Template

```typescript
// modules/siswa/index.ts
// Public API - only export what's needed

// Components
export { SiswaTable } from './components/SiswaTable'
export { SiswaForm } from './components/SiswaForm'
export { SiswaCard } from './components/SiswaCard'
export { SiswaFilter } from './components/SiswaFilter'

// Hooks
export { useSiswaList } from './hooks/useSiswaList'
export { useSiswaDetail } from './hooks/useSiswaDetail'
export { useCreateSiswa } from './hooks/useCreateSiswa'
export { useUpdateSiswa } from './hooks/useUpdateSiswa'

// Types (if needed externally)
export type { Siswa, CreateSiswaInput } from './types'
```

### 4.5 Route-to-Module Mapping

| Route | Module | Components Used |
|-------|--------|------------------|
| `/_auth/` | - | Dashboard widgets |
| `/_auth/master/siswa/*` | `modules/siswa` | SiswaTable, SiswaForm |
| `/_auth/tagihan/*` | `modules/tagihan` | TagihanTable, GenerateForm |
| `/_auth/pembayaran/*` | `modules/pembayaran` | PembayaranForm, Kuitansi |
| `/_auth/tabungan/*` | `modules/tabungan` | TabunganTable, SetorForm |
| `/_auth/kas/*` | `modules/kas` | KasTable, TransferForm |
| `/_auth/laporan/*` | `modules/laporan` | ReportFilter, ReportTable |
| `/login` | `modules/auth` | LoginForm |

### 4.6 UI Component Structure (Example)

```typescript
// src/components/ui/Button.tsx
import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-white hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline: 'border border-input bg-transparent hover:bg-accent',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading ? (
          <span className="mr-2 animate-spin">⏳</span>
        ) : null}
        {children}
      </button>
    )
  }
)
```

### 4.7 TanStack Query Hooks

```typescript
// packages/api-client/src/hooks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { client } from './client'

// Siswa hooks
export function useSiswaList(params?: {
  page?: number
  limit?: number
  search?: string
  jenjangId?: string
  rombelId?: string
}) {
  return useQuery({
    queryKey: ['siswa', 'list', params],
    queryFn: () => client.siswa.$get({ query: params }),
  })
}

export function useSiswaDetail(id: string) {
  return useQuery({
    queryKey: ['siswa', 'detail', id],
    queryFn: () => client.siswa[':id'].$get({ param: { id } }),
    enabled: !!id,
  })
}

export function useCreateSiswa() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: CreateSiswaInput) => 
      client.siswa.$post({ json: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['siswa', 'list'] })
    },
  })
}

export function useUpdateSiswa() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSiswaInput }) =>
      client.siswa[':id'].$put({ param: { id }, json: data }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['siswa', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['siswa', 'detail', id] })
    },
  })
}

// Tagihan hooks
export function useTagihanList(params?: TagihanFilterParams) {
  return useQuery({
    queryKey: ['tagihan', 'list', params],
    queryFn: () => client.tagihan.$get({ query: params }),
  })
}

export function useGenerateTagihan() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: GenerateTagihanInput) =>
      client.tagihan.generate.$post({ json: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tagihan'] })
    },
  })
}

// Export hooks
export function useExportSiswa() {
  return useMutation({
    mutationFn: async (format: 'xlsx' | 'csv') => {
      const response = await client.siswa.export.$get({ query: { format } })
      const blob = await response.blob()
      downloadBlob(blob, `siswa.${format}`)
    },
  })
}
```

### 4.8 Jotai Atoms (Client State)

```typescript
// src/stores/auth.ts
import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

export interface User {
  id: string
  username: string
  namaLengkap: string
  role: 'ADMIN' | 'KEPALA_SEKOLAH' | 'BENDAHARA_YAYASAN'
}

export const userAtom = atomWithStorage<User | null>('user', null)
export const tokenAtom = atomWithStorage<string | null>('token', null)

export const isAuthenticatedAtom = atom((get) => {
  const user = get(userAtom)
  const token = get(tokenAtom)
  return !!user && !!token
})

// src/stores/ui.ts
import { atom } from 'jotai'

export const sidebarOpenAtom = atom(true)
export const themeAtom = atomWithStorage<'light' | 'dark'>('theme', 'light')

// src/stores/filter.ts
export const tahunAjaranAktifAtom = atomWithStorage<string | null>('tahunAjaranAktif', null)
```

---

## 5. Database Design

> **Lihat dokumen terpisah:** `04-erd-database-schema.md`

---

## 6. Authentication & Authorization

### 6.1 JWT Authentication Flow

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│  Browser │         │ TanStack │         │  API /   │
│ Client   │         │ Start    │         │ Database │
└────┬─────┘         └────┬─────┘         └────┬─────┘
     │                    │                    │
     │   Initial Request  │                    │
     │───────────────────►│                    │
     │                    │  beforeLoad()      │
     │                    │  (Server Side)     │
     │                    │  - read Cookies    │
     │                    │  - validate token  │
     │                    │                    │
     │   Rendered HTML    │◄───────────────────┘
     │   (Authenticated)  │
     │◄───────────────────│
     │                    │
     │   Hydrate Jotai    │
     │   from Loader Data │
     │───────────────────►│
```

### 6.2 Token & Profile Management
Sistem menggunakan JWT token yang disimpan dalam HTTP-accessible cookies. Data profil dasar user juga di-cache dalam cookie (JSON stringified) untuk memungkinkan server merender informasi profil di header/sidebar secara instan tanpa fetch API tambahan ke backend saat initial load.

### 6.2 Token Structure

```typescript
// Access Token Payload
interface AccessTokenPayload {
  sub: string           // User ID
  username: string
  role: UserRole
  iat: number           // Issued at
  exp: number           // Expires (15 minutes)
}

// Refresh Token Payload
interface RefreshTokenPayload {
  sub: string           // User ID
  iat: number           // Issued at
  exp: number           // Expires (7 days)
}
```

### 6.3 Role-Based Access Control

```typescript
// Roles
enum UserRole {
  ADMIN = 'ADMIN',                      // Full access
  KEPALA_SEKOLAH = 'KEPALA_SEKOLAH',    // View + approval
  BENDAHARA_YAYASAN = 'BENDAHARA_YAYASAN', // View reports only
}

// Permission check middleware
const requireRole = (...roles: UserRole[]) => {
  return async (c: Context, next: Next) => {
    const user = c.get('user')
    if (!roles.includes(user.role)) {
      return c.json({ error: 'Forbidden' }, 403)
    }
    await next()
  }
}

// Usage
app.post('/siswa', authMiddleware, requireRole(UserRole.ADMIN), handler)
```

---

## 7. File Storage

### 7.1 Local Storage (Phase 1)

```typescript
// apps/api/src/lib/upload.ts
import { mkdir, writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads'

export async function saveFile(file: File, folder: string): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = file.name.split('.').pop()
  const filename = `${randomUUID()}.${ext}`
  const filepath = join(UPLOAD_DIR, folder, filename)
  
  await mkdir(join(UPLOAD_DIR, folder), { recursive: true })
  await writeFile(filepath, buffer)
  
  return `/${folder}/${filename}`
}

export async function deleteFile(path: string): Promise<void> {
  const filepath = join(UPLOAD_DIR, path)
  await unlink(filepath)
}
```

### 7.2 Directory Structure

```
uploads/
├── bukti-transfer/       # Payment proofs
├── foto-siswa/           # Student photos
├── dokumen/              # General documents
└── temp/                 # Temporary files
```

---

## 8. Export / Import / Print Implementation

> **Catatan:** Detail fitur per modul lihat di `02-requirement-spesification-keuangan-alizzah.md` Section 8.3

### 8.1 Libraries & Dependencies

| Feature | Library | Version | Location | Note |
|---------|---------|---------|----------|------|
| **Excel** | `exceljs` | ^4.4.0 | Backend (API) | Create & read .xlsx, .csv |
| **CSV** | `papaparse` | ^5.4.0 | Backend (API) | Parse & generate CSV |
| **PDF** | `@react-pdf/renderer` | ^3.4.0 | Backend (API) | Server-side PDF generation |
| **Print** | Browser API | - | Frontend | `window.print()` with custom CSS |

### 8.2 Package Location

```json
// packages/api/package.json
{
  "dependencies": {
    "exceljs": "^4.4.0",
    "@react-pdf/renderer": "^3.4.0",
    "papaparse": "^5.4.0"
  }
}
```

### 8.3 Export Service Implementation

```typescript
// apps/api/src/lib/excel.ts
import ExcelJS from 'exceljs'

export class ExcelService {
  static async generateSiswaExport(data: Siswa[], format: 'xlsx' | 'csv') {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Data Siswa')
    
    // Headers
    sheet.columns = [
      { header: 'NIS', key: 'nis', width: 15 },
      { header: 'Nama Lengkap', key: 'namaLengkap', width: 30 },
      { header: 'Jenis Kelamin', key: 'jenisKelamin', width: 15 },
      { header: 'Tanggal Lahir', key: 'tanggalLahir', width: 15 },
      { header: 'Jenjang', key: 'jenjang', width: 10 },
      { header: 'Kelas', key: 'kelas', width: 15 },
      { header: 'Nama Ortu', key: 'namaOrtu', width: 25 },
      { header: 'No. HP', key: 'noHp', width: 15 },
      { header: 'Status', key: 'status', width: 10 },
    ]
    
    // Style header
    sheet.getRow(1).font = { bold: true }
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    }
    
    // Add data
    data.forEach((siswa) => {
      sheet.addRow({
        nis: siswa.nis,
        namaLengkap: siswa.namaLengkap,
        jenisKelamin: siswa.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan',
        tanggalLahir: siswa.tanggalLahir,
        jenjang: siswa.rombel.jenjang.kode,
        kelas: siswa.rombel.nama,
        namaOrtu: siswa.namaOrangTua,
        noHp: siswa.noHpOrtu,
        status: siswa.status,
      })
    })
    
    if (format === 'csv') {
      return workbook.csv.writeBuffer()
    }
    return workbook.xlsx.writeBuffer()
  }
  
  static async parseSiswaImport(file: FormData) {
    const uploaded = file.get('file') as File
    const buffer = Buffer.from(await uploaded.arrayBuffer())
    
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    
    const sheet = workbook.worksheets[0]
    const data: CreateSiswaInput[] = []
    
    sheet.eachRow((row, index) => {
      if (index === 1) return // Skip header
      
      data.push({
        nis: row.getCell(1).value?.toString() || '',
        namaLengkap: row.getCell(2).value?.toString() || '',
        jenisKelamin: row.getCell(3).value?.toString() === 'Laki-laki' ? 'L' : 'P',
        // ... map other fields
      })
    })
    
    return data
  }
}
```

### 8.4 PDF Generation (Kuitansi)

```typescript
// apps/api/src/lib/pdf.ts
import { renderToBuffer } from '@react-pdf/renderer'
import { KuitansiTemplate } from './templates/kuitansi'

export async function generateKuitansiPDF(pembayaran: Pembayaran) {
  const buffer = await renderToBuffer(
    <KuitansiTemplate pembayaran={pembayaran} />
  )
  return buffer
}
```

### 8.5 Print from Frontend

```typescript
// Print kuitansi
const handlePrint = () => {
  const printWindow = window.open('', '_blank')
  printWindow?.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Kuitansi Pembayaran</title>
        <style>
          @media print {
            body { font-family: Arial, sans-serif; }
            .header { text-align: center; margin-bottom: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        ${document.getElementById('kuitansi-content')?.innerHTML}
      </body>
    </html>
  `)
  printWindow?.document.close()
  printWindow?.print()
}
```

---

## 9. Deployment Strategy

### 9.1 VPS Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                     VPS RumahWeb                               │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                       Nginx                              │   │
│  │  (Reverse Proxy + SSL + Static Files)                    │   │
│  │  - api.alizzah.sch.id → :3001 (Hono API)                │   │
│  │  - keuangan.alizzah.sch.id → :3000 (Web Keuangan)       │   │
│  │  - (future) ppdb.alizzah.sch.id → :3002                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│      ┌───────────────────────┼───────────────────────┐         │
│      │                       │                       │         │
│      ▼                       ▼                       ▼         │
│  ┌────────┐           ┌────────────┐          ┌──────────┐    │
│  │  API   │           │    Web     │          │ PostgreSQL│    │
│  │ :3001  │◄─────────►│  Keuangan  │          │   :5432   │    │
│  │ (Node) │           │   :3000    │          │           │    │
│  └────────┘           └────────────┘          └──────────┘    │
│       │                                              ▲         │
│       └──────────────────────────────────────────────┘         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                     Uploads Folder                       │   │
│  │              /var/www/alizzah/uploads/                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### 9.2 Process Manager

Menggunakan **PM2** untuk menjalankan Node.js apps:

```bash
# ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'alizzah-api',
      script: './apps/api/dist/index.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
    {
      name: 'alizzah-web-keuangan',
      script: './apps/web-keuangan/.output/server/index.mjs',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
}
```

---

## 10. Development Workflow

### 10.1 Git Branching Strategy

```
main                    # Production
├── develop             # Development
│   ├── feature/xxx     # New features
│   ├── fix/xxx         # Bug fixes
│   └── refactor/xxx    # Refactoring
```

### 10.2 Commit Convention

```
type(scope): description

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation
- style: Formatting
- refactor: Refactoring
- test: Tests
- chore: Maintenance

Examples:
- feat(siswa): add bulk import from excel
- fix(pembayaran): fix partial payment calculation
- docs(api): update endpoint documentation
```

### 10.3 Development Commands

```bash
# Install dependencies
pnpm install

# Start development (API + Web)
pnpm dev

# Start API only
pnpm dev:api

# Start Web only
pnpm dev:web

# Database operations
pnpm db:generate   # Generate Prisma client
pnpm db:migrate    # Run migrations
pnpm db:seed       # Seed data
pnpm db:studio     # Open Prisma Studio

# Build
pnpm build

# Test
pnpm test

# Lint
pnpm lint
```

---

## Changelog

| Versi | Tanggal | Perubahan | Oleh |
|-------|---------|-----------|------|
| 1.0 | 29 Jan 2026 | Dokumen awal | - |
| 1.1 | 13 Apr 2026 | - Tambah daycare module di folder structure<br>- Tambah daycare route mounting<br>- Tambah 8 daycare API endpoints<br>- URL structure: `/api/v1/keuangan/daycare/*` | - |
