# Implementation Plan: Kategori Penerimaan Dinamis (Income Categories Master)

## Overview

Mengganti kategori penerimaan yang saat ini hardcoded (`bos`, `donasi`, `hibah`, `lainnya`) di seluruh stack menjadi tabel master `income_categories` yang bisa dikelola lewat UI admin. Struktur flat — hanya `code` (slug unik) dan `name` — tanpa hierarki parent-child. Migrasi penuh: seed 4 kategori existing, migrasi data `income_transactions` dari kolom `category` string ke FK, hapus kolom lama, dan hapus semua referensi hardcode di backend & frontend.

## Architecture Decisions

- **Flat structure, no parent-child.** Kategori penerimaan seperti "Dana BOS", "Donasi", "Hibah" sifatnya independen — tidak butuh grouping seperti pengeluaran ("Operasional > ATK").
- **Kolom `code` sebagai unique slug.** Mempertahankan backward compatibility dengan filter laporan yang saat ini menerima string category (`?income_categories=bos,donasi`). Kode inilah yang menjadi identifier stabil di API.
- **Migrasi penuh (drop kolom lama).** Tidak dual-path. Setelah `income_category_id` terisi, kolom `category` string dihapus — satu sumber kebenaran.
- **Pola mirror dari `expense_categories`.** Struktur handler → service → repository mengikuti pola yang sudah ada, hanya disederhanakan karena flat.
- **Label diambil dari DB, bukan hardcode.** `income_transaction_service.go` dan `report_service.go` akan JOIN ke `income_categories` untuk mendapatkan `name` — tidak ada lagi map hardcode.

## Dependency Graph

```
income_categories table (migration + model)
    │
    ├── income_category DTO (request/response)
    │       │
    │       ├── income_category repository
    │       │       │
    │       │       ├── income_category service
    │       │       │       │
    │       │       │       └── income_category handler (CRUD endpoints)
    │       │       │               │
    │       │       │               └── [Regen swagger] → Frontend API client
    │       │       │                       │
    │       │       │                       └── Frontend kategori.tsx page
    │       │       │
    │       │       └── [Digunakan oleh income_transaction repo via JOIN]
    │       │
    │       └── Modify income_transaction DTO (category → income_category_id)
    │               │
    │               ├── Modify income_transaction service + handler
    │               │       │
    │               │       └── Frontend form pages (baru.tsx, $id.tsx, index.tsx)
    │               │
    │               └── Modify report repository + service (hardcode labels → JOIN)
    │
    └── Seeders + data migration (backfill existing rows)
```

## Task List

### Phase 1: Backend Foundation (Database + Model + DTO)

- [ ] **Task 1:** Buat model `IncomeCategory`, migration, dan seed awal + backfill data
- [ ] **Task 2:** Buat DTO, repository, service, handler untuk `income_categories` CRUD

### Checkpoint: Foundation
- [ ] `GET/POST/PUT/DELETE /v1/income-categories` berfungsi
- [ ] 4 kategori awal (`bos`, `donasi`, `hibah`, `lainnya`) ada di tabel
- [ ] Migration berhasil: kolom `income_category_id` terisi, kolom `category` lama sudah di-drop
- [ ] Go build sukses, tidak ada compile error

### Phase 2: Integrasi Income Transaction ke Kategori Baru

- [ ] **Task 3:** Ubah `income_transaction` DTO, service, handler — pakai `income_category_id` bukan string
- [ ] **Task 4:** Ubah repository report — JOIN ke `income_categories`, hapus hardcode label

### Checkpoint: Core Features
- [ ] Form penerimaan baru (`POST /v1/income-transactions`) menerima `income_category_id`
- [ ] List penerimaan mengembalikan nama kategori dari relasi
- [ ] Laporan Posisi Kas dan Pemasukan menampilkan label dari DB
- [ ] Go build sukses, aplikasi bisa dijalankan

### Phase 3: Regenerasi API Client + Frontend

- [ ] **Task 5:** Regenerate swagger.json + orval frontend client
- [ ] **Task 6:** Buat halaman kelola kategori (`penerimaan/kategori.tsx`)
- [ ] **Task 7:** Ubah halaman form & list penerimaan — pakai data dari API

### Checkpoint: Complete
- [ ] Admin bisa CRUD kategori penerimaan lewat UI
- [ ] Form penerimaan baru pakai dropdown dari tabel `income_categories`
- [ ] List penerimaan menampilkan badge dengan nama kategori dari DB
- [ ] Filter kategori di halaman list berfungsi
- [ ] Semua laporan tetap berfungsi dengan data kategori dinamis
- [ ] Tidak ada lagi hardcode `"bos"`, `"donasi"`, `"hibah"`, `"lainnya"` di source code
- [ ] Frontend build sukses, tidak ada TypeScript error

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data existing `income_transactions` punya nilai `category` di luar 4 enum (corrupt data) | Low | Backfill script pakai `UPDATE ... WHERE category NOT IN (...)` → fallback ke `lainnya` |
| Swagger regenerate menghasilkan type yang tidak compatible dengan frontend existing | Med | Setelah regen, jalankan `pnpm run check` (biome) untuk deteksi error TypeScript |
| Report query yang JOIN ke `income_categories` jadi lambat | Low | Tabel kecil (<100 row), JOIN via indexed FK — tidak ada isu performa |
| `incomeCategoryLabels` di `report_service.go` tidak ditemukan definisinya | Low | Akan ketahuan saat compile setelah perubahan — replace dengan JOIN ke tabel |

## Open Questions

- Apakah perlu middleware guard khusus untuk `income-categories` endpoints? (Default: pakai `RequireModule(ModuleKeuangan)` seperti `expense-categories`)
- Apakah kolom `code` perlu divalidasi format (lowercase, no space, alphanumeric)? (Default: validasi regex `^[a-z][a-z0-9_]*$`)

---

## File Inventory — Semua yang Akan Disentuh

### Backend — File Baru
| File | Deskripsi |
|------|-----------|
| `model/income_category.go` | Model GORM `IncomeCategory` |
| `dto/income_category.go` | Request/response DTO |
| `repository/income_category_repository.go` | CRUD repository |
| `service/income_category_service.go` | Business logic |
| `handler/income_category_handler.go` | HTTP handler |

### Backend — File Diubah
| File | Perubahan |
|------|-----------|
| `model/income_transaction.go` | Tambah `IncomeCategoryID`, hapus `Category` |
| `dto/income_transaction.go` | Ubah `Category string` → `IncomeCategoryID uint` |
| `repository/income_transaction_repository.go` | Filter pakai `income_category_id`, JOIN kategori |
| `repository/report_repository.go` | JOIN ke `income_categories`, hapus hardcode label |
| `service/income_transaction_service.go` | Gunakan `IncomeCategoryID`, ambil label dari DB |
| `service/report_service.go` | Hapus referensi `incomeCategoryLabels` hardcode |
| `handler/income_transaction_handler.go` | Sesuaikan dengan DTO baru |
| `cmd/api/main.go` | Auto-migrate model baru, registrasi route group |
| `seeders/income_transaction_seeder.go` | Seed kategori dulu, lalu pakai FK |

### Frontend — File Baru
| File | Deskripsi |
|------|-----------|
| `routes/_authenticated/keuangan/penerimaan/kategori.tsx` | Halaman kelola kategori |

### Frontend — File Diubah
| File | Perubahan |
|------|-----------|
| `routes/_authenticated/keuangan/penerimaan/baru.tsx` | Dropdown dari API, kirim `income_category_id` |
| `routes/_authenticated/keuangan/penerimaan/$id.tsx` | Dropdown dari API, tampilkan nama dari relasi |
| `routes/_authenticated/keuangan/penerimaan/index.tsx` | Filter + badge pakai data dari API |
| `api/model/` (regenerated) | Type baru dari orval setelah swagger regen |

### Frontend — File Dihapus (setelah regen)
| File | Alasan |
|------|--------|
| `api/model/dtoCreateIncomeTransactionRequestCategory.ts` | Type hardcode tidak diperlukan lagi |
