# Implementation Plan: Laporan Keuangan Rebuild

## Overview

Rebuild halaman laporan keuangan dari 9 sub-halaman terpisah menjadi 4 sub-halaman yang ringkas dan konsisten: **Pemasukan**, **Pengeluaran**, **Saldo**, **Posisi Kas**. Semua sub-halaman berbagi filter bar yang sama (TA, date range Dari-Sampai + shortcut, payment method, tombol Generate), section info filter, dan tabel yang looping per tanggal/periode. Halaman lama dipindahkan ke folder `old/` untuk tracking.

## Architecture Decisions

- **Shared FilterBar component**: Satu komponen reusable yang dipakai semua 4 sub-halaman, berisi TA selector, date range (Dari-Sampai native input), shortcut buttons (Hari Ini, Bulan Ini, TA Saat Ini), payment method (Tunai/Tabungan), dan tombol Generate. Filter state dikelola per halaman via local `useState`, tidak dishare cross-page.
- **Multi-select via checkbox list**: Fee items, kategori pengeluaran, dan TA ditampilkan sebagai checkbox list dengan toggle "Semua/Pilih Semua". Value disimpan sebagai array ID.
- **Tombol Generate (bukan auto-fetch)**: API call hanya triggered saat user klik Generate, mencegah request berlebihan dengan 4-5 filter aktif.
- **Native `<input type="date">`**: Tidak menambah library date picker, konsisten dengan pattern existing (harian.tsx).
- **Reuse API endpoints existing dengan extended params**: Backend Go di-extend untuk menerima `date_from`, `date_to`, `fee_item_ids[]`, `expense_category_ids[]`, `academic_year_ids[]`, dan `payment_method` sebagai query params tambahan.
- **Data multi-select dari API yang sudah ada**: `GET /v1/fee-configs` → items, `GET /v1/expense-categories` → tree (flattened), `GET /v1/academic-years` → list.

## Task List

### Phase 1: Foundation — Reusable Components

- [ ] **Task 1:** Buat komponen `FilterBar.tsx`
- [ ] **Task 2:** Buat komponen `MultiSelectCheckbox.tsx`
- [ ] **Task 3:** Buat komponen `ReportInfoCard.tsx` dan `ReportTable.tsx`

### Checkpoint: Foundation
- [ ] Semua 4 komponen reusable siap, build tidak error

### Phase 2: Backend API Adjustments

- [ ] **Task 4:** Extend API endpoint Saldo dengan `date_from`, `date_to`, `fee_item_ids[]`, `academic_year_ids[]`
- [ ] **Task 5:** Extend API endpoint Posisi Kas dengan `date_from`, `date_to`, `fee_item_ids[]`, `expense_category_ids[]`
- [ ] **Task 6:** Buat API endpoint Pemasukan (atau extend existing income-transactions list) dengan filter date range, payment method, fee_item_ids
- [ ] **Task 7:** Buat API endpoint Pengeluaran (atau extend existing expenses list) dengan filter date range, fee_item_ids, expense_category_ids
- [ ] **Task 8:** Generate/update frontend API client hooks (orval atau manual)

### Checkpoint: Backend
- [ ] API endpoints bisa dipanggil via curl/Postman dan return data sesuai filter

### Phase 3: Sub-halaman — Vertical Slices

- [ ] **Task 9:** Sub-halaman Pemasukan (`/keuangan/laporan/pemasukan`)
- [ ] **Task 10:** Sub-halaman Pengeluaran (`/keuangan/laporan/pengeluaran`)
- [ ] **Task 11:** Sub-halaman Saldo (`/keuangan/laporan/saldo`)
- [ ] **Task 12:** Sub-halaman Posisi Kas (`/keuangan/laporan/posisi-kas`)

### Checkpoint: Core Features
- [ ] Keempat sub-halaman berfungsi end-to-end: filter → generate → tabel → cetak

### Phase 4: Migration & Cleanup

- [ ] **Task 13:** Pindahkan 9 halaman lama ke folder `old/`
- [ ] **Task 14:** Update hub page (`laporan/index.tsx`) ke 4 card baru
- [ ] **Task 15:** Final integration test & polish

### Checkpoint: Complete
- [ ] Semua acceptance criteria terpenuhi
- [ ] Build dan dev server berjalan tanpa error
- [ ] Navigasi antar sub-halaman lancar

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Backend Go API perlu diubah signifikan untuk support multi-select + date range | High | Prioritaskan Task 4-7 early; jika terlalu berat, fallback ke filter client-side dari data yang sudah di-fetch |
| Response shape API existing tidak cocok dengan UI baru (Pemasukan/Pengeluaran) | Medium | Evaluasi di Task 6-7; buat endpoint baru hanya jika existing tidak bisa di-extend |
| Multi-select fee config items bergantung pada fee config aktif | Low | Hardcode fallback ke semua fee config jika tidak ada yang aktif |
| Perubahan route (dari 9 jadi 4) bisa break existing links/bookmark | Low | Tambahkan redirect dari route lama ke route baru di Task 14 |

## Open Questions

- Apakah backend `/v1/income-transactions` dan `/v1/expenses` sudah bisa di-filter by date range + fee_item_id? (perlu dicek di Task 6-7)
- Apakah perlu pagination untuk tabel dengan data banyak? (default: tampilkan semua, no pagination)
