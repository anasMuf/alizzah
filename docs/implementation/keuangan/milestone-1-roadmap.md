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
- [ ] **1.2 Auth & Session Management**
  - [ ] **Backend:** Setup Hono Middleware for JWT/Session validation.
  - [ ] **Frontend:** Setup TanStack Start auth context, login route, and persistent layout.
- [ ] **1.3 Master Data APIs (Hono RPC)**
  - [ ] **Backend:** Export `AppType` with routes for `academic-years` and `levels`.
  - [ ] **Frontend:** Build management UI using TanStack Table & Shadcn Dialogs.
- [ ] **1.4 Payment Categories & Tariffs**
  - [ ] **Backend:** `POST /payment-types`, `GET /payment-types`.
  - [ ] **Logic:** Implement complex pricing logic (tariffs per level/gender) in `packages/validators`.
- [x] **1.5 Development Seeders**
  - [x] **Backend:** Setup Prisma seeders in `packages/db/prisma/seed.ts`.
  - [x] **Data:** Generate dummy data for Years, Levels, and initial Admin users.
  - [x] **Data Reference:** Master data seeding must follow [Extracted Reference Data](../../planning/extracted-reference-data.md).
  - [x] **Command:** Setup `db:seed` script in root `package.json`.

---

## 👥 Phase 2: Student & Rombel (Classroom)
**Goal:** Management of students as the primary financial subjects.

- [ ] **2.1 Rombel Management**
  - [ ] **Backend:** Model `Rombel` linked to `AcademicYear` and `Level`.
  - [ ] **Frontend:** Grid view of classrooms with student count indicators.
- [ ] **2.2 Student Lifecycle**
  - [ ] **Backend:** Model `Student` with multi-field profiles and `PASTA` (addons) selections.
  - [ ] **Frontend:** Multi-tab form for student data (Basic, Parents, Financial Profile).
- [ ] **2.3 Batch Operations (Promotions)**
  - [ ] **Backend:** Implement Transactional SQL for mass-transferring students between Rombels.
  - [ ] **Frontend:** Drag-and-drop or checklist-based promotion wizard.

---

## 📑 Phase 3: Discount Logic & Billing Engine
**Goal:** Automating the invoice generation process.

- [ ] **3.1 Discount/Dispensasi Engine**
  - [ ] **Backend:** Logic for "Stacked Discounts" (Applying multiple discounts sequentially).
  - [ ] **Frontend:** UI to assign discounts to specific students with validity dates.
- [ ] **3.2 Billing Generator (Core Logic)**
  - [ ] **Backend:** High-performance script to generate thousands of `Invoice` and `InvoiceItem` records.
  - [ ] **Logic:** Must handle dynamic calculation for `TAB-WJB` (based on Mondays in month) and `INF-HR` (based on effective days).
- [ ] **3.3 Invoice Viewer**
  - [ ] **Frontend:** Complex filters for invoices (by Rombel, by status `UNPAID`, `OVERDUE`).
  - [ ] **API:** Optimized query for invoice listing with total balance calculation.

---

## 💰 Phase 4: Payment Allocation & Receipts
**Goal:** Handling multi-payment scenarios and partial settlements.

- [ ] **4.1 Payment Allocation (FIFO Logic)**
  - [ ] **Backend:** Implement the "Payment Allocation Pattern". One payment can settle multiple invoices.
  - [ ] **Logic:** Logic to automatically apply payments to the oldest debt first.
- [ ] **4.2 Transactional Payment API**
  - [ ] **Backend:** `POST /payments` with ACID transactions to update `Invoice` status and `CashBalance`.
- [ ] **4.3 Receipt Generator**
  - [ ] **Backend/Frontend:** Print-ready HTML/PDF receipts with QR code for verification.
  - [ ] **Feature:** Re-print history and voiding transactions with audit log.

---

## 🏦 Phase 5: Savings (Tabungan) Module
**Goal:** Managing student savings with automated deductions.

- [ ] **5.1 Savings Ledger**
  - [ ] **Backend:** Model `SavingsAccount` and `SavingsTransaction`.
  - [ ] **API:** Logic for automatic 2.5% fee on withdrawals from `TAB-UM`.
- [ ] **5.2 Overpayment Hook**
  - [ ] **Backend:** Trigger to move balance from `Payment` overage to `SavingsAccount`.
- [ ] **5.3 Savings UI**
  - [ ] **Frontend:** Ledger view for students showing deposits from billing overpayments.

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
