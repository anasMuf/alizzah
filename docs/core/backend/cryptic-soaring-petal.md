# Plan: Seeder Master Data & Import Siswa

## Context

Saat ini sistem Alizzah Manajemen sudah punya backend API (Go) dan frontend dashboard (React) yang hampir seluruhnya terhubung ke API real. Hanya 2 halaman frontend yang masih pakai mock data (`keuangan/index.tsx` dan `keuangan/pembayaran/baru.tsx`). Database kosong kecuali superadmin dan expense categories.

**Tujuan:** Membuat seeder master data lengkap + import ~242 siswa dari SQL dump sistem lama, sehingga seluruh halaman bisa menampilkan data real dan siap untuk testing end-to-end.

**Sumber data:**
- `docs/core/backend/siswa_cycle.sql` — 242 siswa + mapping ke 22 rombel
- `docs/core/src/*.md` — 7 dokumen tarif dan konfigurasi
- `docs/core/prd-feature-detail.md` — referensi bisnis rule

---

## Fase 1: Seeder Master Data (6 file seeder baru/update)

Semua seeder mengikuti pola existing: idempotent (cek count > 0 → skip), dipanggil dari `main.go`.

### 1.1 Update `user_seeder.go`
- Tambah 4 user lagi selain superadmin:
  - `admin_administrasi@alizzah.sch.id` (role: `admin_administrasi`)
  - `admin_keuangan@alizzah.sch.id` (role: `admin_keuangan`)
  - `kepala_sekolah@alizzah.sch.id` (role: `kepala_sekolah`)
  - `yayasan@alizzah.sch.id` (role: `yayasan`)
- Semua password: `password123`
- Ubah pengecekan: cek per role, bukan hanya superadmin

### 1.2 Buat `academic_year_seeder.go`
- 3 tahun ajaran:
  - `2024/2025` — start: 2024-07-15, end: 2025-06-30, is_active: false
  - `2025/2026` — start: 2025-07-14, end: 2026-06-30, is_active: **true**
  - `2026/2027` — start: 2026-07-13, end: 2027-06-30, is_active: false

### 1.3 Buat `class_group_seeder.go`
- Hanya untuk tahun ajaran aktif (2025/2026)
- 22 rombel sesuai data SQL dump yang terpakai:
  - **Mutiara 1-6** (level: `mutiara`)
  - **Intan 1-8** (level: `intan`)
  - **Berlian 1-8** (level: `berlian`)
- Field `schedule` (JSON) per rombel berdasarkan `list_rombel.md`:

```json
// Mutiara 1,2,3 (Senin, Rabu, Jumat)
{
  "groups": [
    {"days": ["senin","rabu"], "start": "07:15", "end": "10:00", "end_calisan": "10:30"},
    {"days": ["jumat"], "start": "07:15", "end": "09:00", "end_calisan": "09:30"}
  ]
}

// Mutiara 4,5,6 (Selasa, Kamis, Sabtu)
{
  "groups": [
    {"days": ["selasa","kamis"], "start": "07:15", "end": "10:00", "end_calisan": "10:30"},
    {"days": ["sabtu"], "start": "07:15", "end": "09:00", "end_calisan": "09:30"}
  ]
}

// Intan 1-8 (Senin-Sabtu)
{
  "groups": [
    {"days": ["senin","selasa","rabu","kamis"], "start": "07:15", "end": "10:00", "end_calisan": "10:30"},
    {"days": ["jumat","sabtu"], "start": "07:15", "end": "09:00"}
  ]
}

// Berlian 1-8 (Senin-Sabtu)
{
  "groups": [
    {"days": ["senin","selasa","rabu","kamis"], "start": "07:15", "end": "10:30", "end_calisan": "11:00"},
    {"days": ["jumat","sabtu"], "start": "07:15", "end": "09:00"}
  ]
}
```

### 1.4 Buat `extracurricular_seeder.go`
11 records total:

| Nama | Type | Sumber |
|------|------|--------|
| Robotika | `pasta` | list_pasta.md |
| Sempoa Kids | `pasta` | list_pasta.md |
| Tilawah | `pasta` | list_pasta.md |
| Laptop Kids | `pasta` | list_pasta.md |
| Taekwondo | `pasta` | list_pasta.md |
| Tari | `pasta` | list_pasta.md |
| Melukis | `pasta` | list_pasta.md |
| Menyanyi | `pasta` | list_pasta.md |
| Calisan KB | `calisan` | prd-feature-detail.md |
| Calisan TK | `calisan` | prd-feature-detail.md |
| Aslin | `ekskul` | prd-feature-detail.md |

### 1.5 Buat `fee_config_seeder.go`
Membuat `fee_configs` + `fee_config_items` untuk tahun ajaran 2025/2026.

**fee_configs:**
- `academic_year_id`: ID tahun ajaran aktif
- `savings_admin_rate`: 2.50

**fee_config_items** (semua nominal dari dokumen src):

#### SPP (category: `monthly_spp`)
| item_key | name | level | amount | unit |
|----------|------|-------|--------|------|
| `spp_kb` | SPP KB | mutiara | 150000 | fixed |
| `spp_tk` | SPP TK | intan | 150000 | fixed |
| `spp_tk` | SPP TK | berlian | 150000 | fixed |

#### Infaq Harian (category: `monthly_infaq`)
| item_key | name | level | amount | unit |
|----------|------|-------|--------|------|
| `infaq_harian` | Infaq Harian | all | 7000 | per_day |

#### Biaya Awal (category: `initial`)
Dari `pos_pemasukan_biaya_awal.md`:

| item_key | name | amount |
|----------|------|--------|
| `seragam_4stel` | 4 Stel Seragam | 750000 |
| `rompi_prasiaga` | 1 pc Rompi & Atribut Prasiaga | 110000 |
| `tas_sekolah` | 1 Tas Sekolah | 85000 |
| `kaos_kaki` | 2 Pasang Kaos Kaki | 25000 |
| `lunch_box` | 1 Set Lunch Box | 100000 |
| `baju_ganti` | 1 Stel Baju Ganti | 70000 |
| `infaq_sarpras` | Infaq Sarpras | 500000 |
| `infaq_ape` | Infaq APE | 600000 |
| `buku_ddtk` | Buku DDTK | 20000 |
| `biaya_psikotes` | Biaya Psikotes IQ | 150000 |

Semua: level=`all`, unit=`fixed`

#### Biaya Registrasi (category: `registration`)
Dari `rincian_biaya_registrasi.md` — per jenjang, dengan variasi gender untuk jilbab:

| item_key | name | intan | berlian | mutiara | gender |
|----------|------|-------|---------|---------|--------|
| `biaya_mpls` | Biaya MPLS | 100000 | 100000 | 100000 | all |
| `buku_bayar` | Buku Bayar | 10000 | 10000 | 10000 | all |
| `infaq_awal_tabungan` | Infaq Awal Tabungan | 10000 | 10000 | 10000 | all |
| `buku_pk_karakter` | Buku PK Karakter | 15000 | 15000 | 15000 | all |
| `kaos_field_trip` | Kaos Field Trip | 65000 | 65000 | 65000 | all |
| `map_hasil_karya` | Map Hasil Karya | 25000 | 25000 | 25000 | all |
| `map_raport_foto` | Map Raport dan Foto Raport | 60000 | 0* | 50000 | all |
| `alat_belajar` | Alat Belajar | 200000 | 200000 | 150000 | all |
| `buku_asik_membaca` | 1 Seri Buku Asik Membaca | 40000 | 0* | 0* | all |
| `buku_kreativitas` | Buku Kreatifitas | 100000 | 100000 | 100000 | all |
| `iuran_kegiatan` | Iuran Kegiatan Kecamatan/Kabupaten | 80000 | 80000 | 80000 | all |
| `buku_jurnal` | 2 Pcs Buku Jurnal | 30000 | 30000 | 30000 | all |
| `administrasi_lpp` | Administrasi LPP (4 Trimester) | 60000 | 60000 | 60000 | all |
| `kalender` | Kalender | 30000 | 30000 | 30000 | all |
| `buku_kotak` | Buku Kotak | 0* | 25000 | 0* | all |
| `jilbab_field_trip` | Jilbab Field Trip | 35000 | 35000 | 35000 | **P** |

*) item_key dengan amount 0 = tidak di-seed untuk level tersebut (skip record)

#### Pasta (category: `pasta`)
| item_key | name | amount |
|----------|------|--------|
| `pasta_robotika` | Pasta Robotika | 100000 |
| `pasta_sempoa` | Pasta Sempoa Kids | 50000 |
| `pasta_tilawah` | Pasta Tilawah | 50000 |
| `pasta_laptop` | Pasta Laptop Kids | 100000 |
| `pasta_taekwondo` | Pasta Taekwondo | 50000 |
| `pasta_tari` | Pasta Tari | 50000 |
| `pasta_melukis` | Pasta Melukis | 50000 |
| `pasta_menyanyi` | Pasta Menyanyi | 50000 |

Semua: level=`all`, unit=`fixed`

#### Calisan (category: `calisan`)
| item_key | name | level | amount |
|----------|------|-------|--------|
| `calisan_kb` | Calisan KB | mutiara | 50000 |
| `calisan_tk` | Calisan TK | intan | 50000 |
| `calisan_tk` | Calisan TK | berlian | 50000 |

#### Ekskul (category: `ekskul`)
| item_key | name | level | amount |
|----------|------|-------|--------|
| `ekskul_aslin` | Aslin | berlian | 25000 |

#### Tabungan Wajib (category: `savings_mandatory`)
| item_key | name | level | amount | unit |
|----------|------|-------|--------|------|
| `tabungan_wajib` | Tabungan Wajib Berlian | berlian | 10000 | per_monday |

#### Daycare (category: `daycare`)
| item_key | name | amount | unit |
|----------|------|--------|------|
| `daycare_pendaftaran` | Pendaftaran Daycare | 150000 | fixed |
| `daycare_akomodasi` | Akomodasi Daycare | 250000 | fixed |
| `daycare_spd_kb` | SPD Bulanan KB | 200000 | fixed |
| `daycare_spd_tk` | SPD Bulanan TK | 400000 | fixed |
| `daycare_paket_kb` | Paket Bulanan KB | 500000 | fixed |
| `daycare_paket_tk` | Paket Bulanan TK | 900000 | fixed |
| `daycare_harian` | SPP Harian Lepas | 15000 | fixed |
| `daycare_paket_harian` | Paket Harian | 35000 | fixed |
| `daycare_konsumsi` | Biaya Konsumsi | 20000 | per_day |

#### Wisuda (category: `graduation`)
| item_key | name | level | amount | unit |
|----------|------|-------|--------|------|
| `biaya_wisuda` | Biaya Wisuda | berlian | 0 | fixed |

> Nominal wisuda = 0 (placeholder). User akan input dari UI `/pengaturan/tarif`.

### 1.6 `expense_category_seeder.go`
Sudah ada dan sudah benar — **tidak perlu diubah**.

---

## Fase 2: Import Siswa dari SQL Dump (1 file seeder)

### 2.1 Buat `student_import_seeder.go`

**Sumber:** `docs/core/backend/siswa_cycle.sql`

**Analisis SQL dump:**
- Tabel `siswa`: 242 records (ID 1-241 + 249)
- Data tersedia: `nama_lengkap`, `jenis_kelamin` (Laki-laki/Perempuan)
- Data kosong (NULL): tempat_lahir, tanggal_lahir, alamat, agama, dll
- Tabel `kelas`: 30 kelas (Mutiara 1-10, Intan 1-10, Berlian 1-10)
- Tabel `siswa_kelas`: mapping 242 siswa ke kelas, semua tahun_ajaran_id=2, status=aktif

**Mapping kelas_id lama → class_group baru:**

| Old kelas_id | Old nama_kelas | New class_group name | New level |
|---|---|---|---|
| 1 | MUTIARA 1 | Mutiara 1 | mutiara |
| 2 | MUTIARA 2 | Mutiara 2 | mutiara |
| 3 | MUTIARA 3 | Mutiara 3 | mutiara |
| 4 | MUTIARA 4 | Mutiara 4 | mutiara |
| 5 | MUTIARA 5 | Mutiara 5 | mutiara |
| 6 | MUTIARA 6 | Mutiara 6 | mutiara |
| 11 | INTAN 1 | Intan 1 | intan |
| 12 | INTAN 2 | Intan 2 | intan |
| 13 | INTAN 3 | Intan 3 | intan |
| 14 | INTAN 4 | Intan 4 | intan |
| 15 | INTAN 5 | Intan 5 | intan |
| 16 | INTAN 6 | Intan 6 | intan |
| 17 | INTAN 7 | Intan 7 | intan |
| 18 | INTAN 8 | Intan 8 | intan |
| 21 | BERLIAN 1 | Berlian 1 | berlian |
| 22 | BERLIAN 2 | Berlian 2 | berlian |
| 23 | BERLIAN 3 | Berlian 3 | berlian |
| 24 | BERLIAN 4 | Berlian 4 | berlian |
| 25 | BERLIAN 5 | Berlian 5 | berlian |
| 26 | BERLIAN 6 | Berlian 6 | berlian |
| 27 | BERLIAN 7 | Berlian 7 | berlian |
| 28 | BERLIAN 8 | Berlian 8 | berlian |

**Distribusi siswa per rombel (dari siswa_kelas):**
- Mutiara 1-6: 8, 9, 9, 9, 10, 10 = **55 siswa**
- Intan 1-8: 11, 11, 11, 10, 11, 11, 11, 10 = **86 siswa** (Intan 1 = 10+1 mutasi)
- Berlian 1-8: 13, 13, 13, 12, 13, 12, 13, 12 = **101 siswa**
- **Total: 242 siswa**

**Langkah import (dalam satu seeder):**

1. **Insert `students`** — 242 records
   - Mapping: `nama_lengkap` → `full_name`, `jenis_kelamin` Laki-laki→`L` / Perempuan→`P`
   - Default: `status=active`, `birth_place=""`, `birth_date=2020-01-01` (placeholder karena NULL di source)
   - `is_daycare_only=false`

2. **Insert `student_enrollments`** — 242 records
   - `class_group_id`: lookup by name dari class_groups yang sudah di-seed
   - `academic_year_id`: tahun ajaran aktif (2025/2026)
   - `start_date`: 2025-07-14 (awal tahun ajaran)
   - `status`: `active`
   - `enrollment_type`: `new`
   - `created_by`: superadmin user ID

3. **Insert `student_savings`** — tabungan per siswa
   - Semua siswa: 1 record type=`general`, balance=0
   - Siswa Berlian: +1 record type=`mandatory`, balance=0
   - Total: 242 + 101 = **343 records**

**Implementasi:** Data siswa di-hardcode sebagai Go struct array (bukan parse SQL runtime). Lebih reliable dan tidak butuh SQL parser. Data diekstrak dari SQL dump ke Go source code.

---

## Fase 3: Generate Data Transaksional (2 file seeder)

### 3.1 Buat `effective_day_seeder.go`
- Generate hari efektif untuk bulan Juli 2025 — Mei 2026 (11 bulan) per rombel
- Hitung dari kalender real:
  - `total_days`: jumlah hari efektif sekolah bulan tersebut
  - `total_mondays`: jumlah hari Senin bulan tersebut
- Mutiara 1-3 (Sen/Rab/Jum): total_days = jumlah Sen+Rab+Jum di bulan itu
- Mutiara 4-6 (Sel/Kam/Sab): total_days = jumlah Sel+Kam+Sab
- Intan & Berlian (Sen-Sab): total_days = jumlah hari kerja Sen-Sab
- Total: 22 rombel × 11 bulan = **242 records**

### 3.2 Buat `sample_transaction_seeder.go`
Generate data transaksional sample agar halaman keuangan menampilkan data real:

1. **Invoices + Invoice Items** — tagihan bulanan Juli & Agustus 2025
   - Per siswa: SPP + Infaq Harian (× hari efektif)
   - Berlian tambah: Tabungan Wajib (× jumlah Senin)
   - Total: 242 siswa × 2 bulan = **484 invoices**

2. **Payments + Payment Items** — sample ~50 pembayaran
   - Spread across beberapa siswa dari berbagai rombel
   - Source: `cash`
   - Otomatis create `cash_transactions` (credit)

3. **Expenses** — sample ~10 pengeluaran
   - Spread across kategori yang sudah ada
   - Otomatis create `cash_transactions` (debit)

---

## Fase 4: Ganti Mock Data di Frontend (2 file edit)

### 4.1 `apps/dashboard/src/routes/_authenticated/keuangan/index.tsx`
- Hapus `const mockData = {...}`
- Ganti dengan panggilan API hooks:
  - `useGetV1CashBalance` → saldoKas
  - `useGetV1VaultBalance` → saldoBerangkas
  - `useGetV1ReportsDaily` → pemasukan/pengeluaran hari ini
  - `useGetV1Invoices` (filter: status=unpaid, near due) → tagihanJatuhTempo
- Handle loading states

### 4.2 `apps/dashboard/src/routes/_authenticated/keuangan/pembayaran/baru.tsx`
- Hapus `mockItems` dan mock student selection
- Gunakan `useGetV1InvoicesId` untuk fetch invoice items real
- Wire up ke API pembayaran yang sudah ada

---

## Urutan Eksekusi Seeder di `main.go`

```go
// Master Data (harus urut karena dependency)
seeders.SeedUsers(db)              // 1. Users (semua role)
seeders.SeedAcademicYears(db)      // 2. Tahun Ajaran
seeders.SeedClassGroups(db)        // 3. Rombel (depends on #2)
seeders.SeedExtracurriculars(db)   // 4. Ekskul/Pasta
seeders.SeedFeeConfigs(db)         // 5. Tarif (depends on #2)
seeders.SeedExpenseCategories(db)  // 6. Kategori Pengeluaran (existing)

// Import Data
seeders.SeedStudentsFromLegacy(db) // 7. Siswa + Enrollment + Savings (depends on #1,2,3)

// Transactional Data
seeders.SeedEffectiveDays(db)      // 8. Hari Efektif (depends on #3)
seeders.SeedSampleTransactions(db) // 9. Sample Tagihan/Bayar (depends on #5,7,8)
```

---

## File yang Akan Dibuat/Dimodifikasi

### Baru (8 file):
- `apps/api/seeders/academic_year_seeder.go`
- `apps/api/seeders/class_group_seeder.go`
- `apps/api/seeders/extracurricular_seeder.go`
- `apps/api/seeders/fee_config_seeder.go`
- `apps/api/seeders/student_import_seeder.go`
- `apps/api/seeders/effective_day_seeder.go`
- `apps/api/seeders/sample_transaction_seeder.go`
- `apps/api/seeders/seeder.go` (orchestrator — optional, bisa juga langsung di main.go)

### Modifikasi (3 file):
- `apps/api/seeders/user_seeder.go` — tambah 4 role
- `apps/api/main.go` — panggil semua seeder baru
- `apps/dashboard/src/routes/_authenticated/keuangan/index.tsx` — ganti mockData
- `apps/dashboard/src/routes/_authenticated/keuangan/pembayaran/baru.tsx` — ganti mockItems

---

## Verifikasi

1. **Backend:** `go run main.go` → semua seeder jalan tanpa error, log konfirmasi per seeder
2. **Database check:** Query count per tabel memastikan jumlah record benar
3. **Frontend:**
   - Halaman `/administrasi/siswa` → tampil 242 siswa
   - Halaman `/administrasi/rombel` → tampil 22 rombel dengan siswa masing-masing
   - Halaman `/pengaturan/tarif` → tampil konfigurasi tarif lengkap
   - Halaman `/keuangan` (dashboard) → saldo kas, berangkas, transaksi hari ini dari data real
   - Halaman `/keuangan/tagihan` → tagihan bulanan per siswa
   - Halaman `/keuangan/pembayaran/baru` → flow pembayaran real
4. **Idempotent:** Jalankan `go run main.go` 2x → tidak ada duplikasi data
