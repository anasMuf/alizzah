# Task 1: Database Migration + Model + Seeder

> **Epic:** [Penyederhanaan Tarif Registrasi & Biaya Awal](../epics/penyederhanaan-tarif-registrasi-biaya-awal.md)
> **Status:** Ready
> **Priority:** P0 (blocking — semua task lain bergantung pada ini)

---

## Goal

Database siap dengan kolom `is_active`, model dan DTO terupdate, seeder menghasilkan item summary dan menonaktifkan item detail, dan query invoice generation difilter. **Setelah task ini selesai, siswa baru akan otomatis mendapat invoice format summary.**

## Dependencies

- Epic requirements R.1-R.8

## Files to Modify

| File | Operasi |
|------|---------|
| `app/api/model/fee_config_item.go` | + field `IsActive` |
| `app/api/dto/fee_config.go` | + `is_active` di request & response |
| `app/api/seeders/fee_config_seeder.go` | + item summary, deactivate item detail |
| `app/api/repository/fee_config_item_repository.go` | + filter `is_active=true` di `FindByStudentForCategory` |
| `app/api/repository/invoice_item_repository.go` | + method `ReplaceItemsByInvoiceID` |
| **Migration SQL file baru** | ALTER TABLE + UPDATE + INSERT invoice_items |

## Step 1: Study Existing Code

- `app/api/model/fee_config_item.go:1-19` — Struktur model yang akan ditambahkan field
- `app/api/dto/fee_config.go:22-54` — DTO create/response yang akan ditambah field
- `app/api/seeders/fee_config_seeder.go:63-148` — Fungsi SeedFeeConfigs untuk dipahami alur idempotent-nya
- `app/api/seeders/fee_config_seeder.go:151-335` — `buildFeeConfigItems()` untuk referensi item detail yang akan di-deactivate
- `app/docs/update_nominal_tarif.md` — Sumber nominal total per level dan gender
- `app/api/repository/fee_config_item_repository.go` — Cari method `FindByStudentForCategory`
- `app/api/repository/invoice_item_repository.go` — Struktur repository untuk method baru

## Step 2: Implementation Checklist

### 2a. Model (`model/fee_config_item.go`)
- [ ] Tambah field `IsActive bool` dengan gorm tag `gorm:"not null;default:true"`
- [ ] Letakkan setelah field `KoperasiProductID`, sebelum `BaseModelTimeAt`

### 2b. DTO (`dto/fee_config.go`)
- [ ] `CreateFeeConfigItemRequest`: tambah field `IsActive bool` dengan json tag `is_active`
- [ ] `FeeConfigItemResponse`: tambah field `IsActive bool` dengan json tag `is_active`
- [ ] `FeeConfigItemQueryParams`: tambah field `IsActive *bool` (pointer agar bisa nil = all)

### 2c. Seeder (`seeders/fee_config_seeder.go`)
- [ ] Di `SeedFeeConfigs()`, setelah insert items yang sudah ada, set `is_active = false` untuk semua item dengan category `"initial"` atau `"registration"` via `db.Model(&model.FeeConfigItem{}).Where(...).Update("is_active", false)`
- [ ] Tambah item summary registrasi di `buildFeeConfigItems()`: 6 item (3 level × 2 gender) dengan `IsActive: true`:

| Item Key | Name | Level | Gender | Amount |
|----------|------|-------|--------|--------|
| `registrasi_mutiara_L` | Biaya Registrasi Mutiara (Laki-laki) | mutiara | L | 835000 |
| `registrasi_mutiara_P` | Biaya Registrasi Mutiara (Perempuan) | mutiara | P | 875000 |
| `registrasi_intan_L` | Biaya Registrasi Intan (Laki-laki) | intan | L | 965000 |
| `registrasi_intan_P` | Biaya Registrasi Intan (Perempuan) | intan | P | 1005000 |
| `registrasi_berlian_L` | Biaya Registrasi Berlian (Laki-laki) | berlian | L | 785000 |
| `registrasi_berlian_P` | Biaya Registrasi Berlian (Perempuan) | berlian | P | 825000 |

- [ ] Tambah item summary biaya awal: `biaya_awal` / "Biaya Awal Pendidikan" / all / all / 2425000
- [ ] Category tetap `"initial"` untuk biaya awal, `"registration"` untuk registrasi
- [ ] `Unit`: `"fixed"`, `IsMandatory`: `false` (seperti item detail existing)

### 2d. Repository (`repository/fee_config_item_repository.go`)
- [ ] Di method `FindByStudentForCategory`, tambah filter `AND is_active = true` di WHERE clause
- [ ] Di method `FindAll` (jika ada), tambah dukungan filter `IsActive` dari `FeeConfigItemQueryParams`
- [ ] Jika `params.IsActive == nil`, return semua (default behavior untuk handler yang perlu lihat semua)

### 2e. Repository (`repository/invoice_item_repository.go`)
- [ ] Method `DeleteByInvoiceID(invoiceID uint) error` — hapus semua invoice_items untuk satu invoice
- [ ] Method `BulkInsert(items []model.InvoiceItem) error` — insert batch invoice_items baru

### 2f. Migration SQL
- [ ] Buat file `migrations/xxx_add_is_active_to_fee_items.sql` (atau format yang digunakan project)
- [ ] `ALTER TABLE fee_config_items ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;`
- [ ] Setelah seeder jalan, verification query: `SELECT category, is_active, COUNT(*) FROM fee_config_items GROUP BY category, is_active;`

## Step 3: Verification

- [ ] `go build ./...` sukses
- [ ] Seeder idempotent: jalankan 2x, tidak ada duplicate item summary
- [ ] Item detail `registration` dan `initial` existing → `is_active = false`
- [ ] Item summary baru → `is_active = true`, total 7 item (6 reg + 1 initial)
- [ ] `FindByStudentForCategory("registration", "mutiara", "L")` → return 1 item (835000), bukan 15+
- [ ] `FindByStudentForCategory("initial", "all", "all")` → return 1 item (2425000), bukan 10

## Success Criteria

- [ ] `ALTER TABLE` berhasil, kolom `is_active` ada dengan default `true`
- [ ] Model Go dan DTO terupdate, `go build` sukses
- [ ] Seeder idempotent menghasilkan item summary dan menonaktifkan item detail
- [ ] Invoice generation untuk siswa baru memakai item summary (1 item, bukan 15+)
- [ ] API `GET /items` default return hanya item active
- [ ] API `GET /items?is_active=all` return semua item
- [ ] Pre-commit hooks passing
