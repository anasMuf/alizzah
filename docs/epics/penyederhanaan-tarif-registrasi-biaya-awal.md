# Epic: Penyederhanaan Tarif Registrasi & Biaya Awal

> **Status:** Ready for Execution
> **Created:** 2026-07-14
> **Type:** Feature Enhancement

---

## Requirements (IMMUTABLE)

- R.1: Kategori `registration` tidak lagi menampilkan 15+ item detail per jenjang — diganti menjadi 6 item summary: 3 level (mutiara, intan, berlian) × 2 gender (L, P), masing-masing dengan nominal total yang sudah disepakati.
- R.2: Kategori `initial` (biaya awal) tidak lagi menampilkan 10 item detail — diganti menjadi 1 item summary: "Biaya Awal Pendidikan" dengan nominal total 2.425.000.
- R.3: Item detail lama (`registration` dan `initial`) **TIDAK** dihapus dari database — hanya di-set `is_active = false`.
- R.4: `invoice_generate_service.go` hanya mengambil item `is_active = true`, sehingga invoice baru (siswa baru) otomatis memiliki format summary.
- R.5: Semua invoice existing (`type = 'initial'` dan `type = 'registration'`) dengan status apapun (unpaid/installment/lunas) harus diregenerate via migration script: `invoice_items` diganti dari banyak item detail menjadi item summary, dengan `total_amount` yang sama.
- R.6: `invoice_id` tidak boleh berubah — payment dan installment schedule tetap valid.
- R.7: API `GET /v1/fee-configs/{id}/items` default hanya return `is_active = true`. Param `?is_active=false` atau `?is_active=all` tersedia untuk akses item detail (landing page di masa depan).
- R.8: UI halaman `/pengaturan/tarif/$id` hanya menampilkan item `is_active = true`. Item detail disembunyikan total dari UI admin.

## Success Criteria (MUST ALL BE TRUE)

- [ ] `ALTER TABLE fee_config_items ADD COLUMN is_active` berhasil tanpa error
- [ ] Seeder menghasilkan 7 item summary baru (`is_active = true`)
- [ ] Seeder mengubah semua item detail `registration` + `initial` existing ke `is_active = false`
- [ ] `FindByStudentForCategory` hanya return item `is_active = true`
- [ ] Migration script mengganti invoice_items untuk semua invoice `initial` dan `registration` existing
- [ ] `invoice.total_amount` tetap sama sebelum dan sesudah migration
- [ ] Semua payment tetap terhubung ke invoice yang benar (ID tidak berubah)
- [ ] Semua installment schedule tetap valid
- [ ] Halaman `/pengaturan/tarif/$id` menampilkan 6 item registrasi + 1 item biaya awal
- [ ] API `GET /items` default hanya return 7 item summary
- [ ] API `GET /items?is_active=all` return semua item (7 summary + detail)
- [ ] `go build` sukses
- [ ] `npm run build` (dashboard) sukses
- [ ] Pre-commit hooks passing

## Anti-Patterns (FORBIDDEN)

- ❌ **NO hard-delete item detail** (data integrity: item detail dibutuhkan untuk landing page di masa depan — `is_active=false` bukan `DELETE`)
- ❌ **NO perubahan `invoice.id`** (financial integrity: payment dan installment_schedule mengacu ke invoice_id — migration harus mengganti invoice_items tanpa mengubah ID invoice)
- ❌ **NO perubahan `invoice.total_amount`** (financial integrity: jumlah rupiah invoice tidak boleh berbeda setelah migration — total summary harus sama persis dengan total item detail sebelumnya)
- ❌ **NO regenerate invoice untuk siswa yang sudah punya invoice** (idempotency: `ExistsInitialByStudent` / `ExistsRegistrationByStudent` harus tetap jalan — hanya migration script yang menyentuh invoice existing, bukan service)
- ❌ **NO perubahan logika perhitungan total di frontend** (simplicity: frontend sudah benar menghitung total dari items — cukup filter query)
- ❌ **NO perubahan `Category` item existing** (backward compatibility: laporan, filter, dan label pakai category string — tidak boleh ganti category value)

## Approach

Menambahkan field `is_active` (default `true`) pada model `FeeConfigItem`. Item detail `registration` dan `initial` di-set `is_active = false` melalui seeder dan migration script. Item summary baru ditambahkan dengan `is_active = true`. Invoice generation service difilter hanya mengambil item active. Migration script mengganti `invoice_items` di semua invoice existing tanpa mengubah `invoice_id` atau `total_amount`, sehingga payment dan installment schedule tetap valid.

## Architecture

```
┌─ Database ────────────────────────────────────────────────┐
│  fee_config_items                                         │
│  + is_active BOOLEAN DEFAULT true                         │
│                                                            │
│  invoice_items (frozen — diganti oleh migration script)    │
│  invoices (ID tetap, total_amount tetap)                   │
│  payments (tidak berubah)                                  │
└────────────────────────────────────────────────────────────┘

┌─ Backend (Go) ───────────────────────────────────────────┐
│  model/fee_config_item.go      + IsActive bool            │
│  dto/fee_config.go              + is_active field         │
│  repository/fee_config_item    FindByStudentForCategory   │
│                                 filter is_active=true     │
│  repository/invoice_item        ReplaceItemsByInvoiceID   │
│  seeders/fee_config_seeder     item summary + deactivate  │
└───────────────────────────────────────────────────────────┘

┌─ Frontend (React) ───────────────────────────────────────┐
│  api/endpoints/fee-configs     default query is_active=true│
│  routes/pengaturan/tarif/$id   tampilkan item summary     │
└───────────────────────────────────────────────────────────┘

┌─ Migration Script (SQL, sekali jalan saat deploy) ───────┐
│  1. ALTER TABLE fee_config_items ADD is_active            │
│  2. Seeder → INSERT summary, UPDATE detail → inactive     │
│  3. Replace invoice_items untuk semua invoice initial     │
│  4. Replace invoice_items untuk semua invoice registration│
└───────────────────────────────────────────────────────────┘
```

## Design Rationale

### Problem

Saat ini admin harus mengelola 15+ item terperinci untuk kategori registrasi dan 10 item untuk biaya awal. Ketika ada perubahan nominal total, admin harus menghitung dan mengupdate banyak item satu per satu — rawan kesalahan perhitungan. Invoice yang diterima orang tua juga menampilkan terlalu banyak rincian yang tidak selalu relevan.

### Research Findings

**Codebase:**
- `app/api/model/fee_config_item.go:1-19` — Model sudah punya struktur lengkap (Category, ItemKey, Level, Gender, Amount), tinggal tambah 1 field `IsActive`
- `app/api/service/invoice_generate_service.go:107-170` — `GenerateInitial()` dan `GenerateRegistration()` menggunakan `FindByStudentForCategory` untuk mendapatkan item → satu titik perubahan
- `app/api/seeders/sample_transaction_seeder.go:136-193` — InvoiceItem bersifat copy-on-write (Name, Amount di-copy, bukan reference) → aman untuk mengganti invoice_items existing
- `app/api/repository/invoice_repository.go:199-208` — `ExistsInitialByStudent` / `ExistsRegistrationByStudent` → mencegah generate ulang untuk siswa yang sudah punya invoice
- `app/api/service/invoice_service.go:279-289` — Installment schedule mengacu ke `invoice_id` dan hanya untuk `type = 'registration'` → tidak terpengaruh selama ID dan type tidak berubah
- `app/dashboard/src/routes/_authenticated/pengaturan/tarif/$id.tsx:227-245` — Frontend sudah menghitung total dengan benar; hanya perlu difilter

**External:**
- `app/docs/update_nominal_tarif.md` — Dokumen sumber untuk nominal total per level dan gender

### Approaches Considered

#### 1. Add `is_active` field + migration script ✓

**What it is:** Tambahkan field boolean `is_active` ke model, filter di query invoice generation, dan ganti invoice_items existing via migration script tanpa mengubah invoice_id atau total_amount.

**Investigation:**
- Reviewed `invoice_generate_service.go` — hanya satu query point (`FindByStudentForCategory`) yang perlu difilter
- Verified `invoice_items` tidak punya FK ke `fee_config_items` — aman untuk diganti
- Checked `payments` dan `installment_schedules` — mengacu ke `invoice_id`, bukan `invoice_item_id`

**Pros:**
- Minimal invasif: 1 field baru, 1 filter query, 1 migration script
- Invoice ID dan total_amount tidak berubah → payment dan schedule aman
- Item detail tetap tersimpan untuk landing page
- Backward compatible: API bisa return semua item jika perlu

**Cons:**
- Migration script harus di-test dengan data production-like
- Perlu berhati-hati dengan unique constraint `uq_fee_config_items` (item_key + level + gender + fee_config_id) — item summary punya item_key berbeda, jadi tidak bentrok

**Chosen because:** Solusi paling sederhana yang memenuhi semua requirement tanpa merusak integritas data keuangan.

#### 2. Gunakan Category terpisah ❌

**What it is:** Item detail dipindahkan ke category baru (`registration_detail`, `initial_detail`), item summary tetap di category asli.

**Why we looked at this:** Tidak perlu tambah field baru di model.

**Investigation:**
- Validasi enum `CreateFeeConfigItemRequest.Category` — perlu menambah category baru di validator
- Semua laporan dan filter menggunakan category string — perlu update di banyak tempat

**Pros:**
- Tidak perlu migration schema (ALTER TABLE)

**Cons:**
- Category string digunakan di banyak tempat: laporan, filter, UI label, expense_category seeder
- Perubahan lebih tersebar dibanding 1 field boolean
- Landing page perlu tahu category mana yang "detail" — tidak self-documenting seperti `is_active`

**⚠️ REJECTED BECAUSE:** Perubahan menyebar ke banyak file, lebih kompleks, dan kurang self-documenting dibanding field `is_active`.

**🚫 DO NOT REVISIT UNLESS:** Ada kebutuhan untuk membedakan item detail vs summary berdasarkan category di banyak endpoint.

#### 3. Hard-delete + recreate ❌

**What it is:** Hapus permanen item detail, buat item summary baru.

**Why we looked at this:** Pendekatan paling sederhana dari sisi kode.

**Investigation:**
- User explicit menyebutkan butuh item detail untuk landing page di masa depan

**Pros:**
- Tidak perlu field baru
- Tidak perlu migration invoice (item summary otomatis dipakai untuk invoice baru)

**Cons:**
- Item detail hilang permanen — tidak bisa digunakan untuk landing page
- Invoice existing tetap punya invoice_items dengan nama detail, tapi tidak bisa direferensi balik ke fee_config

**⚠️ REJECTED BECAUSE:** User explicit meminta item detail tetap disimpan. Melanggar requirement R.3.

**🚫 DO NOT REVISIT UNLESS:** Landing page tidak jadi dibuat dan detail item tidak lagi diperlukan.

### Scope Boundaries

**In scope:**
- Tambah field `is_active` ke `FeeConfigItem`
- Update seeder: item summary baru + deactivate item detail
- Filter `FindByStudentForCategory` untuk `is_active = true`
- Migration script untuk mengganti `invoice_items`
- API: default filter `is_active=true`, optional `?is_active=false|all`
- Frontend: sembunyikan item detail, tampilkan summary
- DTO update: `is_active` di create/update/response

**Out of scope (deferred/never):**
- Landing page yang menggunakan item detail — deferred, cukup data tersimpan
- Perubahan pada item kategori lain (monthly_spp, pasta, daycare, dll) — tidak disentuh
- Batch job otomatis untuk generate ulang invoice — tidak perlu, migration cukup sekali

### Open Questions

- Perlu di-test dengan data production clone sebelum deploy ke production
- Verifikasi total amount invoice sebelum vs sesudah migration (sampling manual)
- Backup database sebelum migration

## Design Discovery (Reference Context)

### Key Decisions Made

| Question | User Answer | Implication |
|----------|-------------|-------------|
| Motivasi penyederhanaan? | Admin ease + invoice sederhana, detail tetap disimpan | Field `is_active`, bukan hard-delete |
| Strategi penyimpanan detail? | Field `is_active` | ALTER TABLE, filter di query |
| Penamaan item summary? | `registrasi_{level}_{gender}`, `biaya_awal` | Unique constraint aman karena item_key berbeda |
| Migrasi data existing? | Seeder + migration script set `is_active=false` | Idempotent via seeder |
| UI admin untuk item detail? | Sembunyikan total | Frontend filter `is_active=true` |
| Invoice existing diubah? | Ya, semua status | Migration script ganti invoice_items, ID dan amount tetap |
| API default filter? | Only `is_active=true` | Backward compatible dengan param opsional |

### Research Deep-Dives

#### Invoice Item Structure
**Question explored:** Apakah invoice_items punya foreign key ke fee_config_items?
**Sources consulted:**
- `app/api/seeders/sample_transaction_seeder.go:136-193` — InvoiceItem dibuat dengan copy data (Name, Amount, Category), tidak ada FeeConfigItemID
- `app/api/model/` — Model InvoiceItem tidak punya field FeeConfigItemID

**Findings:**
- InvoiceItem bersifat copy-on-write — data dibekukan saat invoice dibuat
- Tidak ada foreign key constraint — invoice_items bisa diganti tanpa cascade issues

**Conclusion:** Aman untuk replace invoice_items via migration script

#### Payment & Installment Schedule Dependencies
**Question explored:** Apakah payment dan installment schedule bergantung pada invoice_items?
**Sources consulted:**
- `app/api/service/invoice_service.go:279-289` — Installment schedule mengacu ke `invoice_id`, type check hanya `type = 'registration'`
- Revenue tracking — payment terhubung ke invoice via `invoice_id`

**Findings:**
- Payment → `invoice_id` (foreign key), bukan `invoice_item_id`
- Installment schedule → `invoice_id` (foreign key), bukan `invoice_item_id`

**Conclusion:** Selama `invoice_id` dan `invoice.total_amount` tidak berubah, payment dan schedule tetap valid

### Dead-End Paths

#### Category-based approach
**Why explored:** Tidak perlu tambah field baru di database.
**Investigation:** Ditemukan category string digunakan di 10+ tempat (laporan, filter, UI label, expense seeder).
**Why abandoned:** Perubahan lebih tersebar, kurang self-documenting, tidak sebersih field boolean.

#### Hard-delete detail items
**Why explored:** Paling sederhana — tidak perlu field baru, tidak perlu migration invoice.
**Investigation:** User explicit menyebutkan item detail akan dipakai di landing page.
**Why abandoned:** Melanggar eksplisit requirement user.

### Open Concerns Raised

- "Apakah aman ubah invoice existing?" → Diverifikasi: invoice_items tidak punya FK ke fee_config_items, payment dan schedule mengacu ke invoice_id
- "Data tagihan & pembayaran production?" → Strategi: invoice_id tetap, total_amount tetap, hanya invoice_items yang diganti
- "Kapan tagihan baru terbentuk?" → Otomatis saat siswa baru didaftarkan, via flow invoice generation yang sudah ada
