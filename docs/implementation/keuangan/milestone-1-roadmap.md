# Implementation Roadmap - Milestone 1 (Core Financial Modules)
# Sistem Keuangan Sekolah PAUD Unggulan Alizzah

> **Status:** Draft
> **Target Utama:** Functional Modules for Billing, Payment, Savings, and Cash Management.
> **Prinsip:** Type-Safe RPC, Component-Based UI, and Domain-Driven Development.

## 📌 Overview
Roadmap ini merinci implementasi fitur utama sistem keuangan Alizzah setelah fondasi monorepo selesai. Implementasi dibagi menjadi fase-fase logis untuk memastikan stabilitas sistem dan kemudahan pengujian.

## 📚 Reference Documents
Sebelum memulai implementasi, pastikan memahami referensi berikut:
- **Business Logic:** [Requirement Specification](../../planning/02-requirement-spesification-keuangan-alizzah.md)
- **Architecture:** [Tech Stack Architecture](../../planning/03-tech-stack-architecture.md)
- **Database:** [ERD & Database Schema](../../planning/04-erd-database-schema.md)
- **Seeder Data:** [Extracted Reference Data](../../planning/extracted-reference-data.md)
- **Standards:** [Coding Standards](../../guidelines/coding-standards.md)

---

## 🔐 Phase 1: Authentication & Global Configuration
**Goal:** Setup security layer and foundational reference data.

- [x] **1.1 Database Schema (Prisma)**
  - [x] Define models: `User`, `Role`, `AcademicYear`, `Level` (Jenjang), `PaymentType`.
  - [x] Run `pnpm db:push` or `prisma migrate dev`.
- [x] **1.2 Auth & Session Management**
  - [x] **Backend:** Setup Hono Middleware for JWT/Session validation.
  - [x] **Frontend:** Setup TanStack Start auth context, login route, and persistent layout.
- [x] **1.3 Master Data APIs (Hono RPC)**
  - [x] **Backend:** Export `AppType` with routes for `academic-years` and `levels`.
  - [x] **Frontend:** Build management UI using TanStack Table & Shadcn Dialogs.
- [x] **1.4 Payment Categories & Tariffs**
  - [x] **Backend:** `POST /payment-types`, `GET /payment-types`.
  - [x] **Logic:** Implement complex pricing logic (tariffs per level/gender) in `packages/validators`.
- [x] **1.5 Development Seeders**
  - [x] **Backend:** Setup Prisma seeders in `packages/db/prisma/seed.ts`.
  - [x] **Data:** Generate dummy data for Years, Levels, and initial Admin users.
  - [x] **Data Reference:** Master data seeding must follow [Extracted Reference Data](../../planning/extracted-reference-data.md).
  - [x] **Command:** Setup `db:seed` script in root `package.json`.

---

## 👥 Phase 2: Student & Rombel (Classroom)
**Goal:** Management of students as the primary financial subjects.

- [x] **2.1 Rombel Management**
  - [x] **Backend:** Model `Rombel` linked to `AcademicYear` and `Level`.
  - [x] **Frontend:** Grid view of classrooms with student count indicators.
- [x] **2.2 Student Lifecycle**
  - [x] **Backend:** Model `Student` with multi-field profiles and `PASTA` (addons) selections.
  - [x] **Frontend:** Multi-tab form for student data (Basic, Parents, Financial Profile).
- [x] **2.3 Batch Operations (Promotions)**
  - [x] **Backend:** Implement Transactional SQL for mass-transferring students between Rombels.
  - [x] **Frontend:** Drag-and-drop or checklist-based promotion wizard.

---

## 📑 Phase 3: Discount Logic & Billing Engine
**Goal:** Automating the invoice generation process.

- [x] **3.1 Discount/Dispensasi Engine**
  - [x] **Backend:** Logic for "Stacked Discounts" (Applying multiple discounts sequentially).
  - [x] **Frontend:** UI to assign discounts to specific students with validity dates.
- [x] **3.2 Billing Generator (Core Logic)**
  - [x] **Backend:** High-performance script to generate thousands of `Invoice` and `InvoiceItem` records.
  - [x] **Logic:** Must handle dynamic calculation for `TAB-WJB` (based on Mondays in month) and `INF-HR` (based on effective days).
- [x] **3.3 Invoice Viewer**
  - [x] **Frontend:** Complex filters for invoices (by Rombel, by status `UNPAID`, `OVERDUE`).
  - [x] **API:** Optimized query for invoice listing with total balance calculation.

---

## 💰 Phase 4: Payment Allocation & Receipts [COMPLETED]
**Goal:** Handling multi-payment scenarios and partial settlements.

- [x] **4.1 Payment Allocation (FIFO Logic)**
  - [x] **Backend:** Implement the "Payment Allocation Pattern". One payment can settle multiple invoices.
  - [x] **Logic:** Logic to automatically apply payments to the oldest debt first.
- [x] **4.2 Transactional Payment API**
  - [x] **Backend:** `POST /payments` with ACID transactions to update `Invoice` status and `CashBalance`.
- [x] **4.3 Receipt Generator**
  - [x] **Backend/Frontend:** Print-ready HTML/PDF receipts with professional layout.
  - [x] **Feature:** Integrated POS system for real-time payment processing and history tracking.
- [x] **4.4 Dynamic Incidental Billing**
  - [x] **Backend:** Automated logic to append "Optional/Incidental" items (e.g. Tabungan Umum) to invoices during payment.
  - [x] **Frontend:** Sub-form for adding incidental items with custom amounts directly in the POS view.

---

## 🏦 Phase 5: Savings (Tabungan) Module [COMPLETED]
**Goal:** Managing student savings with automated deductions.

- [x] **5.1 Savings Ledger**
  - [x] **Backend:** Model `SavingsAccount` and `SavingsTransaction` (already in Prisma schema).
  - [x] **API:** `TabunganService` with setor/tarik operations.
  - [x] **API Routes:** `/keuangan/tabungan` endpoints for CRUD and transactions.
  - [x] **Logic:** Automatic 2.5% admin fee on withdrawals from `TAB-UM`.
- [x] **5.2 Overpayment Hook**
  - [x] **Backend:** Modified `PembayaranService` to move overpayment surplus to `TabunganUmum`.
  - [x] **Integration:** `TabunganService.setorFromOverpayment()` called from payment transaction.
- [x] **5.3 Savings UI**
  - [x] **Frontend:** Summary cards showing total saldo for Umum and Wajib Berlian.
  - [x] **Frontend:** Ledger view with search/filter by jenis tabungan.
  - [x] **Frontend:** Detail view with transaction history.
  - [x] **Frontend:** Modal for Setor/Tarik with admin fee calculation preview.

---

## 📦 Phase 6: Cash, Vault & Journaling
**Goal:** Financial oversight of physical and digital funds.

- [ ] **6.1 Multi-Fund Journaling**
  - [ ] **Backend:** Record movements between `Pos Pengeluaran` (Expense Posts) and `Sumber Dana` (Funding Sources).
  - [ ] **Validation:** Enforce saldo checks before any cash-out operation.
- [ ] **6.2 Cash-to-Vault Transfer**
  - [ ] **Backend:** Double-entry bookkeeping for internal transfers between Kas and Berangkas.
- [ ] **6.3 Daily Reconciliation**
  - [ ] **Frontend:** Closing form where Kasir must input physical cash count to match system balance.

---

## 📊 Phase 7: Advanced Exports & Analytics
**Goal:** Management reports and data portability.

- [ ] **7.1 Export Engine**
  - [ ] **Backend:** Setup `exceljs` and `jspdf` for high-fidelity reports.
  - [ ] **Standard Reports:** Tunggakan per Kelas, Rekap Harian Kasir, Buku Besar per Pos.
- [ ] **7.2 Analytics Dashboard**
  - [ ] **Frontend:** Implementation of `recharts` for visualization of Revenue vs Expenses.

---

## �️ Tech Stack Specifics
- **Validation:** Every API endpoint must use a corresponding `zod` schema from `packages/validators`.
- **Client:** Use `@alizzah/api-client` (Hono RPC) for all data fetching.
- **State Management:** Use TanStack Query (via Start) for caching and optimistic updates.
- **Components:** Shadcn/UI + Tailwind CSS for all interfaces.
