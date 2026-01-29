# Implementation Roadmap - Milestone 0 (Infrastructure & Setup)
# Sistem Keuangan Sekolah PAUD Unggulan Alizzah

> **Status:** Draft
> **Target Utama:** Monorepo Workspace, Base Infrastructure, and Project Scaffolding
> **Prinsip:** Standard Code Generators, Best Practices, and Architecture Alignment

## 📌 Overview
Dokumen ini merinci langkah-langkah teknis untuk menyiapkan fondasi monorepo menggunakan `pnpm workspaces`. Fokus utama adalah scaffolding menggunakan generator standar (bukan pembuatan file manual satu-per-satu) untuk memastikan keselarasan dengan ekosistem Hono dan TanStack.

---

## 🛠️ Phase 1: Monorepo Foundation
**Goal:** Menyiapkan root workspace dan shared configurations.

- [x] **1.1 Workspace Initialization**
  - [x] `pnpm init` di root project.
  - [x] Pembuatan `pnpm-workspace.yaml` dengan member `apps/*` dan `packages/*`.
  - [x] Inisialisasi Git dan `.gitignore` standar Node.js.
  
- [x] **1.2 Shared Tooling Configuration**
  - [x] Pembuatan `tsconfig.base.json` untuk standar compiler TypeScript monorepo.
  - [x] Setup Base ESLint & Prettier configs di root untuk konsistensi antar package.
  - [x] Setup `turbo` (Turborepo) untuk orkestrasi build dan dev task.

---

## 🚀 Phase 2: Apps Scaffolding (using Generators)
**Goal:** Inisialisasi aplikasi backend dan frontend menggunakan starter resmi.

- [x] **2.1 Backend API (apps/api)**
  - [x] Jalankan `pnpm create hono@latest apps/api` dan pilih template `node-server`.
  - [x] Penyesuaian `package.json` name menjadi `@alizzah/api`.
  - [x] Integrasi dengan root `tsconfig.base.json`.

- [x] **2.2 Frontend Web (apps/web-keuangan)**
  - [x] Jalankan `pnpm create tanstack@latest apps/web-keuangan` dan pilih template `Start`.
  - [x] Penyesuaian `package.json` name menjadi `@alizzah/web-keuangan`.
  - [x] Setup Tailwind CSS 4.x sesuai spesifikasi arsitektur.

---

## 📦 Phase 3: Shared Packages Setup
**Goal:** Scaffolding internal packages untuk database, validasi, dan shared logic.

- [x] **3.1 Database Package (packages/db)**
  - [x] `pnpm init` di `packages/db`.
  - [x] Install Prisma dan inisialisasi via `npx prisma init`.
  - [x] Konfigurasi output Prisma Client ke node_modules internal agar bisa di-import oleh package lain.

- [x] **3.2 Validators Package (packages/validators)**
  - [x] `pnpm init` di `packages/validators`.
  - [x] Setup Zod sebagai library validasi utama.
  - [x] Scaffolding folder structure sesuai `03-tech-stack-architecture.md`.

- [x] **3.3 Shared Utilities (packages/shared)**
  - [x] `pnpm init` di `packages/shared`.
  - [x] Setup shared types, constants, dan formatters.

- [x] **3.4 API Client (packages/api-client)**
  - [x] Scaffolding Hono RPC Client.
  - [x] Eksport type dari `apps/api` ke package ini untuk end-to-end type safety.

---

## 🔗 Phase 4: Integration & Validation
**Goal:** Memastikan semua bagian terhubung dengan type-safety yang sempurna.

- [x] **4.1 Workspace Linking**
  - [x] Linking `packages/*` ke `apps/*` menggunakan `pnpm add @alizzah/xxx --workspace`.
  
- [x] **4.2 Build & Dev Verification**
  - [x] Jalankan `turbo build` untuk memastikan kompilasi sukses di seluruh workspace.
  - [x] Jalankan `turbo dev` untuk verifikasi hot-reloading di API dan Web secara paralel.

- [x] **4.3 Type-Safety Check**
  - [x] Verifikasi autocompletion di `apps/web-keuangan` saat memanggil API via `api-client`.

---

## 📝 Catatan Implementasi
- **Jangan Membuat File Manual:** Gunakan CLI generators (`pnpm init`, `prisma init`, `hono-create`, dll).
- **Architecture Compliance:** Struktur folder harus mengikuti `docs/planning/03-tech-stack-architecture.md` secara presisi.
- **Strict TypeScript:** Gunakan mode strict di seluruh project.
