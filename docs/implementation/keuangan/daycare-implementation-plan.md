# Implementation Plan - Modul Daycare
# Sistem Keuangan Sekolah PAUD Unggulan Alizzah

> **Status:** Draft  
> **Tanggal:** 13 April 2026  
> **Prasyarat:** Milestone 1 (Phase 1-7) harus sudah selesai

---

## 📚 Reference Documents

| Dokumen | File | Baris Relevan | Keterangan |
|---------|------|---------------|------------|
| Requirement Spec | [02-requirement-spesification](../../planning/02-requirement-spesification-keuangan-alizzah.md) | [L99-L168](../../planning/02-requirement-spesification-keuangan-alizzah.md#L99-L168) | Section 2.3 B - Daycare lengkap (karakteristik, biaya, mode pembayaran) |
| Requirement Spec | [02-requirement-spesification](../../planning/02-requirement-spesification-keuangan-alizzah.md) | [L200-L210](../../planning/02-requirement-spesification-keuangan-alizzah.md#L200-L210) | Section 3.4 - Master Siswa (ikut_daycare dihapus) |
| Requirement Spec | [02-requirement-spesification](../../planning/02-requirement-spesification-keuangan-alizzah.md) | [L267-L307](../../planning/02-requirement-spesification-keuangan-alizzah.md#L267-L307) | Section 3.6.1 - Master Peserta Daycare (NEW) |
| Requirement Spec | [02-requirement-spesification](../../planning/02-requirement-spesification-keuangan-alizzah.md) | [L353-L368](../../planning/02-requirement-spesification-keuangan-alizzah.md#L353-L368) | Section 4.1 D - Kategori DAYCARE (6 kode pembayaran) |
| Requirement Spec | [02-requirement-spesification](../../planning/02-requirement-spesification-keuangan-alizzah.md) | [L396-L404](../../planning/02-requirement-spesification-keuangan-alizzah.md#L396-L404) | Section 4.3 - Generate tagihan daycare (rutin & harian) |
| ERD / Database | [04-erd-database-schema](../../planning/04-erd-database-schema.md) | [L58-L70](../../planning/04-erd-database-schema.md#L58-L70) | Entity list (PesertaDaycare) |
| ERD / Database | [04-erd-database-schema](../../planning/04-erd-database-schema.md) | [L597-L631](../../planning/04-erd-database-schema.md#L597-L631) | Table definition 4.21 peserta_daycare |
| ERD / Database | [04-erd-database-schema](../../planning/04-erd-database-schema.md) | [L743-L751](../../planning/04-erd-database-schema.md#L743-L751) | Enum ModeDaycare, StatusPesertaDaycare |
| ERD / Database | [04-erd-database-schema](../../planning/04-erd-database-schema.md) | [L1100-L1130](../../planning/04-erd-database-schema.md#L1100-L1130) | Prisma model PesertaDaycare |
| Tech Stack | [03-tech-stack-architecture](../../planning/03-tech-stack-architecture.md) | [L334-L342](../../planning/03-tech-stack-architecture.md#L334-L342) | Folder structure: daycare module |
| Tech Stack | [03-tech-stack-architecture](../../planning/03-tech-stack-architecture.md) | [L420-L425](../../planning/03-tech-stack-architecture.md#L420-L425) | Route mounting daycare |
| Tech Stack | [03-tech-stack-architecture](../../planning/03-tech-stack-architecture.md) | [L750-L762](../../planning/03-tech-stack-architecture.md#L750-L762) | API endpoints daycare (8 endpoints) |
| Seeder Data | [extracted-reference-data](../../planning/extracted-reference-data.md) | Seluruh file | Master data reference |
| Existing Milestone | [milestone-1-roadmap](./milestone-1-roadmap.md) | Seluruh file | Current implementation status |

---

## 📌 Overview

Modul Daycare menambahkan fitur pengelolaan layanan penitipan anak ke dalam sistem keuangan Alizzah. Modul ini mendukung:

1. **Peserta internal** (siswa Alizzah) dan **anak luar** (non-siswa)
2. **SPD Rutin** (bulanan, digabung di invoice bersama SPP)
3. **SPD Harian Lepas** (per-transaksi, tagihan tersendiri)
4. **Konsumsi opsional** (Rp 20.000/hari)
5. **Biaya awal** (Pendaftaran + Akomodasi = Rp 400.000)

**Scope yang BUKAN bagian dari implementasi ini:**
- Absensi daycare (scope terpisah, platform lain)
- Portal orang tua daycare

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          MODUL DAYCARE                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────────────┐     ┌──────────────────┐                     │
│   │  PesertaDaycare  │     │ JenisPembayaran  │                     │
│   │  (Master Data)   │     │ (DC-*, SPD-*)    │                     │
│   │                  │     │                  │                     │
│   │  siswa_id? ──────┼───▶ │ Siswa (opsional) │                     │
│   │  jenjang_setara ─┼───▶ │ Jenjang          │                     │
│   └────────┬─────────┘     └────────┬─────────┘                     │
│            │                        │                                │
│            ▼                        ▼                                │
│   ┌──────────────────────────────────────────────┐                  │
│   │              Generate Tagihan                  │                  │
│   │                                                │                  │
│   │  ┌─────────────────┐   ┌────────────────────┐ │                  │
│   │  │ SPD Rutin       │   │ SPD Harian Lepas   │ │                  │
│   │  │ (masuk invoice  │   │ (tagihan terpisah, │ │                  │
│   │  │  bulanan SPP)   │   │  input manual/hari)│ │                  │
│   │  └─────────────────┘   └────────────────────┘ │                  │
│   │                                                │                  │
│   │  + Konsumsi (opsional, 20rb/hari)             │                  │
│   └──────────────────────────────────────────────┘                  │
│                        │                                             │
│                        ▼                                             │
│   ┌──────────────────────────────────────────────┐                  │
│   │  Tagihan → Pembayaran → Kas (existing flow) │                  │
│   └──────────────────────────────────────────────┘                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📋 Implementation Phases

### Phase D1: Database & Schema Migration
**Goal:** Setup database tables for daycare module.

- [ ] **D1.1 Schema Migration**
  - [ ] Remove field `ikutDaycare` from model `Siswa`
  - [ ] Add enum `ModeDaycare` (RUTIN, HARIAN)
  - [ ] Add enum `StatusPesertaDaycare` (AKTIF, NONAKTIF)
  - [ ] Add model `PesertaDaycare` with all columns
  - [ ] Add relation `pesertaDaycares` on model `Siswa`
  - [ ] Add relation `JenjangSetaraDaycare` on model `Jenjang`
  - [ ] Run `prisma migrate dev --name add-daycare-module`
  - **Ref:** [04-erd L1100-L1130](../../planning/04-erd-database-schema.md#L1100-L1130) — Prisma model PesertaDaycare

- [ ] **D1.2 Jenis Pembayaran Seed Data**
  - [ ] Add seeder for 6 jenis pembayaran daycare baru:
    | Kode | Nama | Kategori | Tipe | Nominal |
    |------|------|----------|------|---------|
    | DC-DAFTAR | Pendaftaran Daycare | DAYCARE | SEKALI | 150.000 |
    | DC-AKOM | Akomodasi Daycare | DAYCARE | SEKALI | 250.000 |
    | SPD-KB | SPD Rutin KB | DAYCARE | BULANAN | 200.000 |
    | SPD-TK | SPD Rutin TK | DAYCARE | BULANAN | 400.000 |
    | SPD-HR | SPD Harian Lepas | DAYCARE | HARIAN | 15.000 |
    | DC-KONS | Konsumsi Daycare | DAYCARE | HARIAN | 20.000 |
  - **Ref:** [02-req-spec L353-L368](../../planning/02-requirement-spesification-keuangan-alizzah.md#L353-L368) — Kategori DAYCARE

---

### Phase D2: Backend API — Peserta Daycare CRUD
**Goal:** API for managing daycare participants.

**File structure:**
```
apps/api/src/modules/keuangan/daycare/
├── daycare.routes.ts
├── daycare.service.ts
├── daycare.types.ts
└── index.ts
```
**Ref:** [03-tech-stack L334-L342](../../planning/03-tech-stack-architecture.md#L334-L342) — Folder structure

- [ ] **D2.1 Zod Validators** (`packages/validators/src/daycare.ts`)
  - [ ] `createPesertaDaycareSchema` — conditional validation:
    - Jika `siswaId` null → `namaLengkap`, `tanggalLahir`, `jenisKelamin`, `namaOrtu`, `noHpOrtu` wajib
    - Jika `siswaId` ada → field tersebut optional (diambil dari siswa)
  - [ ] `updatePesertaDaycareSchema`
  - [ ] `listPesertaDaycareQuerySchema` (filter: mode, status, jenjang)

- [ ] **D2.2 Service Layer** (`daycare.service.ts`)
  - [ ] `findAll(params)` — list peserta daycare dengan pagination & filter
    - Join ke `siswa` jika `siswaId` ada (untuk ambil nama, rombel, dll)
    - Gunakan data lokal jika `siswaId` null (anak luar)
  - [ ] `findById(id)` — detail peserta
  - [ ] `create(data)` — daftar peserta baru
    - Jika `siswaId` ada → auto-set `jenjangSetaraId` dari `siswa.rombel.jenjang`
    - Jika `siswaId` null → wajib input `jenjangSetaraId` manual
    - Validasi: 1 siswa max 1 peserta daycare aktif
  - [ ] `update(id, data)` — update data peserta
  - [ ] `deactivate(id)` — set status NONAKTIF + set `tanggalBerakhir`
  - **Ref:** [02-req-spec L267-L307](../../planning/02-requirement-spesification-keuangan-alizzah.md#L267-L307) — Master Peserta Daycare logic

- [ ] **D2.3 Route Layer** (`daycare.routes.ts`)
  - [ ] `GET /keuangan/daycare/peserta` — List
  - [ ] `GET /keuangan/daycare/peserta/:id` — Detail
  - [ ] `POST /keuangan/daycare/peserta` — Create
  - [ ] `PUT /keuangan/daycare/peserta/:id` — Update
  - [ ] `DELETE /keuangan/daycare/peserta/:id` — Deactivate
  - **Ref:** [03-tech-stack L750-L762](../../planning/03-tech-stack-architecture.md#L750-L762) — API endpoints

- [ ] **D2.4 Route Mounting**
  - [ ] Import and mount `daycareRoutes` in `apps/api/src/app.ts`
  - [ ] Path: `v1.route('/keuangan/daycare', daycareRoutes)`
  - **Ref:** [03-tech-stack L420-L425](../../planning/03-tech-stack-architecture.md#L420-L425) — Route mounting

---

### Phase D3: Tagihan Daycare — Integrasi Billing
**Goal:** Integrate daycare billing into the existing invoice system.

- [ ] **D3.1 SPD Rutin — Integrasi Generate Tagihan Bulanan**
  - [ ] Modifikasi `TagihanService.generateBulanan()` yang sudah ada
  - [ ] Saat generate tagihan bulanan, cek apakah siswa punya `PesertaDaycare` aktif dengan mode `RUTIN`
  - [ ] Jika ya, tambahkan `TagihanItem`:
    - SPD Rutin (KB: 200.000 / TK: 400.000) berdasarkan `jenjangSetaraId`
    - Konsumsi Daycare (opsional, 20.000 × jumlah hari — input saat generate)
  - [ ] Item daycare masuk di **invoice bulanan yang sama** dengan SPP
  - **Ref:** [02-req-spec L396-L400](../../planning/02-requirement-spesification-keuangan-alizzah.md#L396-L400) — Generate tagihan daycare rutin

- [ ] **D3.2 SPD Harian — Generate Tagihan Terpisah**
  - [ ] Endpoint baru: `POST /keuangan/daycare/tagihan-harian`
  - [ ] Input: `pesertaDaycareId`, `tanggal`, `ikutKonsumsi` (boolean)
  - [ ] Buat tagihan terpisah (bukan bagian invoice bulanan):
    - Item: SPD Harian (Rp 15.000)
    - Item (opsional): Konsumsi (Rp 20.000)
  - [ ] Admin input per siswa per tanggal (transaksi harian)
  - [ ] Endpoint list: `GET /keuangan/daycare/tagihan-harian` (filter: tanggal range, peserta)
  - **Ref:** [02-req-spec L401-L404](../../planning/02-requirement-spesification-keuangan-alizzah.md#L401-L404) — Generate tagihan harian daycare

- [ ] **D3.3 Biaya Awal Daycare**
  - [ ] Saat peserta daycare baru didaftarkan, otomatis generate tagihan Biaya Awal:
    - DC-DAFTAR (Rp 150.000) — Sekali bayar
    - DC-AKOM (Rp 250.000) — Sekali bayar
  - [ ] Tagihan terpisah, tidak digabung di invoice bulanan
  - **Ref:** [02-req-spec L120-L127](../../planning/02-requirement-spesification-keuangan-alizzah.md#L120-L127) — Biaya Awal Daycare

---

### Phase D4: Frontend — Manajemen Peserta Daycare
**Goal:** UI for managing daycare participants.

**File structure:**
```
apps/web-keuangan/src/routes/daycare/
├── index.tsx                    # Daftar peserta daycare
├── $pesertaId.tsx               # Detail peserta
├── registrasi.tsx               # Form registrasi peserta baru
└── harian.tsx                   # Input tagihan harian
```

- [ ] **D4.1 API Client Hooks**
  - [ ] `usePesertaDaycareList()` — TanStack Query hook untuk list peserta
  - [ ] `usePesertaDaycareDetail(id)` — Detail peserta
  - [ ] `useCreatePesertaDaycare()` — Mutation registrasi
  - [ ] `useUpdatePesertaDaycare()` — Mutation update
  - [ ] `useDeactivatePesertaDaycare()` — Mutation deactivate
  - [ ] `useCreateTagihanHarian()` — Mutation tagihan harian

- [ ] **D4.2 Halaman Daftar Peserta Daycare** (`/daycare`)
  - [ ] TanStack Table dengan kolom: Nama, Jenjang Setara, Mode, Status, Tipe (Internal/Luar)
  - [ ] Filter: Mode (Rutin/Harian), Status (Aktif/Nonaktif), Jenjang
  - [ ] Badge indicator untuk tipe peserta (Internal vs Anak Luar)
  - [ ] Action buttons: Detail, Edit, Nonaktifkan

- [ ] **D4.3 Form Registrasi Peserta** (`/daycare/registrasi`)
  - [ ] Toggle: "Siswa Alizzah" vs "Anak Luar"
  - [ ] **Jika Siswa Alizzah:**
    - Dropdown pilih siswa (autocomplete with search)
    - Data nama, kelas, jenjang otomatis terisi
    - `jenjangSetaraId` otomatis dari siswa
  - [ ] **Jika Anak Luar:**
    - Form manual: Nama, Tanggal Lahir, Jenis Kelamin, Nama Ortu, No HP
    - Pilih jenjang setara (KB/TK-A/TK-B) — dengan rekomendasi dari usia
    - Admin bisa override jenjang setara
  - [ ] Pilih mode daycare: Rutin / Harian Lepas
  - [ ] Tanggal mulai daycare

- [ ] **D4.4 Halaman Input Tagihan Harian** (`/daycare/harian`)
  - [ ] Tampilan per tanggal (date picker)
  - [ ] Daftar peserta daycare dengan mode HARIAN
  - [ ] Checklist per peserta: Hadir hari ini? Ikut konsumsi?
  - [ ] Tombol "Generate Tagihan" → batch create tagihan harian
  - [ ] Tabel history tagihan harian (filter per tanggal, per peserta)

---

### Phase D5: Integrasi & Sidebar Navigation
**Goal:** Wire everything together.

- [ ] **D5.1 Sidebar Navigation**
  - [ ] Tambah menu "Daycare" di sidebar (icon: 🏠)
  - [ ] Sub-menu: Peserta Daycare, Input Harian
  - [ ] Ref: [02-req-spec L1282-L1345](../../planning/02-requirement-spesification-keuangan-alizzah.md#L1282-L1345) — Sitemap

- [ ] **D5.2 Dashboard Integration**
  - [ ] Widget ringkasan daycare di dashboard:
    - Jumlah peserta aktif (Rutin vs Harian)
    - Pendapatan daycare bulan ini
  - [ ] Alert jika ada peserta daycare yang SPD-nya belum dibayar

- [ ] **D5.3 Laporan Daycare**
  - [ ] Tambah item laporan di modul laporan:
    - Laporan peserta daycare (aktif/nonaktif)
    - Laporan pendapatan daycare per bulan
    - Laporan tagihan harian daycare
  - [ ] Export Excel/PDF untuk laporan daycare

- [ ] **D5.4 Export Data Peserta**
  - [ ] `GET /keuangan/daycare/export` — Export data peserta daycare (xlsx)
  - [ ] Kolom: Nama, Tipe (Internal/Luar), Jenjang Setara, Mode, Status, Tanggal Mulai

---

## 🔧 Technical Notes

### Conditional Validation (Zod)

```typescript
// packages/validators/src/daycare.ts
import { z } from 'zod'

export const createPesertaDaycareSchema = z.discriminatedUnion('tipePeserta', [
  // Siswa internal Alizzah
  z.object({
    tipePeserta: z.literal('INTERNAL'),
    siswaId: z.string().uuid(),
    modeDaycare: z.enum(['RUTIN', 'HARIAN']),
    tanggalMulai: z.string().date(),
    catatan: z.string().optional(),
  }),
  // Anak luar
  z.object({
    tipePeserta: z.literal('EKSTERNAL'),
    namaLengkap: z.string().min(2),
    tanggalLahir: z.string().date(),
    jenisKelamin: z.enum(['L', 'P']),
    namaOrtu: z.string().min(2),
    noHpOrtu: z.string().min(10),
    jenjangSetaraId: z.string().uuid(),
    modeDaycare: z.enum(['RUTIN', 'HARIAN']),
    tanggalMulai: z.string().date(),
    catatan: z.string().optional(),
  }),
])
```

### Tagihan Harian Schema

```typescript
export const createTagihanHarianSchema = z.object({
  pesertaDaycareId: z.string().uuid(),
  tanggal: z.string().date(),
  ikutKonsumsi: z.boolean().default(false),
})

// Batch input
export const batchTagihanHarianSchema = z.object({
  tanggal: z.string().date(),
  items: z.array(z.object({
    pesertaDaycareId: z.string().uuid(),
    ikutKonsumsi: z.boolean().default(false),
  })),
})
```

### Generate Tagihan Bulanan — Modifikasi

```typescript
// Pseudocode modifikasi di TagihanService.generateBulanan()

// ... existing generate SPP, Infaq, Calisan, PASTA, Tab Wajib ...

// NEW: Generate SPD Rutin untuk peserta daycare
const pesertaDaycareRutin = await prisma.pesertaDaycare.findMany({
  where: {
    siswaId: siswa.id,
    modeDaycare: 'RUTIN',
    status: 'AKTIF',
  },
  include: { jenjangSetara: true },
})

for (const peserta of pesertaDaycareRutin) {
  // SPD Rutin berdasarkan jenjang setara
  const spdKode = peserta.jenjangSetara.kode === 'KB' ? 'SPD-KB' : 'SPD-TK'
  const spdJenis = await getJenisPembayaranByKode(spdKode)
  
  tagihanItems.push({
    jenisPembayaranId: spdJenis.id,
    namaItem: `SPD Rutin ${peserta.jenjangSetara.nama}`,
    nominalAwal: spdJenis.nominalDefault,
    nominalDiskon: 0,
    nominalAkhir: spdJenis.nominalDefault,
  })

  // Konsumsi daycare (opsional) — hanya jika jumlah hari diinput
  if (jumlahHariKonsumsi > 0) {
    const konsJenis = await getJenisPembayaranByKode('DC-KONS')
    const totalKonsumsi = konsJenis.nominalDefault * jumlahHariKonsumsi

    tagihanItems.push({
      jenisPembayaranId: konsJenis.id,
      namaItem: `Konsumsi Daycare (${jumlahHariKonsumsi} hari)`,
      nominalAwal: totalKonsumsi,
      nominalDiskon: 0,
      nominalAkhir: totalKonsumsi,
    })
  }
}
```

---

## ⏱️ Estimasi Timeline

| Phase | Deskripsi | Estimasi | Dependencies |
|-------|-----------|----------|-------------|
| D1 | Database & Schema Migration | 1 hari | - |
| D2 | Backend API - CRUD Peserta | 2 hari | D1 |
| D3 | Tagihan Daycare - Billing Integrasi | 2-3 hari | D1, D2 |
| D4 | Frontend - UI Manajemen | 3-4 hari | D2, D3 |
| D5 | Integrasi & Sidebar | 1-2 hari | D4 |
| | **Total Estimasi** | **9-12 hari** | |

---

## ✅ Definition of Done

- [ ] Peserta daycare bisa didaftarkan (internal + anak luar)
- [ ] SPD Rutin otomatis masuk invoice bulanan bersama SPP
- [ ] SPD Harian bisa diinput manual per hari per peserta
- [ ] Konsumsi opsional bisa dipilih (rutin & harian)
- [ ] Biaya awal (Pendaftaran + Akomodasi) otomatis generate saat registrasi
- [ ] Data peserta bisa di-export ke Excel
- [ ] Sidebar navigation daycare berfungsi
- [ ] Widget daycare di dashboard
- [ ] Laporan daycare tersedia

---

## 📝 Catatan & Pertimbangan

1. **Anak Luar Alizzah** — Tagihan daycare untuk anak luar menggunakan `pesertaDaycareId` sebagai referensi, bukan `siswaId`. Pastikan semua query tagihan daycare support kedua tipe peserta.

2. **Integrasi Absensi (Future)** — Saat ini jumlah hari konsumsi diinput manual oleh admin keuangan. Ketika platform absensi daycare tersedia di masa depan, field ini akan otomatis terisi dari data kehadiran.

3. **Diskon Daycare** — Apakah sistem diskon yang ada (stacking) juga berlaku untuk jenis pembayaran daycare? Perlu diklarifikasi jika ada kasus dispensasi SPD.

4. **Anak Luar sebagai Siswa** — Jika anak luar kemudian mendaftar menjadi siswa Alizzah, admin cukup update `siswaId` di record `peserta_daycare` yang sudah ada. Riwayat tagihan tetap valid.
