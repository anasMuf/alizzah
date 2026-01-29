# Entity Relationship Diagram (ERD)
# Sistem Keuangan Sekolah PAUD Unggulan Alizzah

> **Versi:** 1.0  
> **Tanggal:** 29 Januari 2026  
> **Status:** Draft

---

## 📋 Daftar Isi

1. [Overview](#1-overview)
2. [Entity List](#2-entity-list)
3. [ERD Diagram](#3-erd-diagram)
4. [Table Definitions](#4-table-definitions)
5. [Prisma Schema](#5-prisma-schema)

---

## 1. Overview

### 1.1 Database Info

| Property | Value |
|----------|-------|
| Database | PostgreSQL 16.x |
| ORM | Prisma 6.x |
| Character Set | UTF-8 |
| Timezone | Asia/Jakarta (UTC+7) |

### 1.2 Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Table | snake_case | `siswa`, `jenis_pembayaran` |
| Column | snake_case | `nama_lengkap`, `created_at` |
| Primary Key | `id` (UUID) | `id` |
| Foreign Key | `entity_id` | `siswa_id`, `rombel_id` |
| Timestamp | `created_at`, `updated_at` | - |
| Boolean | `is_*` or adjective | `is_active`, `ikut_daycare` |

### 1.3 Common Columns

Semua tabel memiliki kolom standar berikut (kecuali junction tables):

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `created_at` | TIMESTAMP | Record creation time |
| `updated_at` | TIMESTAMP | Last update time |

---

## 2. Entity List

### 2.1 Master Data Entities

| Entity | Table Name | Description |
|--------|------------|-------------|
| TahunAjaran | `tahun_ajaran` | Academic year |
| Jenjang | `jenjang` | Education level (KB, TK-A, TK-B) |
| Rombel | `rombel` | Class/group |
| Siswa | `siswa` | Student |
| JenisPembayaran | `jenis_pembayaran` | Payment type |
| JenisPembayaranTarif | `jenis_pembayaran_tarif` | Payment pricing per jenjang/gender |
| Diskon | `diskon` | Discount/dispensation |
| Pasta | `pasta` | Extracurricular (PASTA) |
| Bank | `bank` | Bank accounts |
| User | `user` | System users |

### 2.2 Transaction Entities

| Entity | Table Name | Description |
|--------|------------|-------------|
| Tagihan | `tagihan` | Invoice/bill |
| TagihanItem | `tagihan_item` | Invoice line items |
| Pembayaran | `pembayaran` | Payment record |
| PembayaranAlokasi | `pembayaran_alokasi` | Payment allocation to invoices |
| Tabungan | `tabungan` | Student savings account |
| TransaksiTabungan | `transaksi_tabungan` | Savings transactions |
| Kas | `kas` | Cash/safe account |
| TransaksiKas | `transaksi_kas` | Cash transactions |

### 2.3 Junction/Pivot Tables

| Entity | Table Name | Description |
|--------|------------|-------------|
| SiswaPasta | `siswa_pasta` | Student-PASTA relationship |
| SiswaDiskon | `siswa_diskon` | Student-Discount relationship |

---

## 3. ERD Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    ERD DIAGRAM                                       │
│                        Sistem Keuangan PAUD Alizzah                                 │
└─────────────────────────────────────────────────────────────────────────────────────┘

                                    MASTER DATA
┌──────────────────┐                                        ┌──────────────────┐
│   tahun_ajaran   │                                        │       user       │
├──────────────────┤                                        ├──────────────────┤
│ id (PK)          │                                        │ id (PK)          │
│ nama             │                                        │ username         │
│ tanggal_mulai    │                                        │ email            │
│ tanggal_selesai  │                                        │ password         │
│ is_aktif         │                                        │ nama_lengkap     │
│ created_at       │                                        │ role             │
│ updated_at       │                                        │ is_aktif         │
└────────┬─────────┘                                        │ last_login       │
         │                                                  └──────────────────┘
         │ 1:N
         ▼
┌──────────────────┐         1:N         ┌──────────────────┐
│     jenjang      │◄────────────────────│      rombel      │
├──────────────────┤                     ├──────────────────┤
│ id (PK)          │                     │ id (PK)          │
│ kode             │                     │ jenjang_id (FK)  │
│ nama             │                     │ tahun_ajaran_id  │
│ kelompok         │                     │ nama             │
│ urutan           │                     │ kapasitas        │
│ created_at       │                     │ created_at       │
│ updated_at       │                     │ updated_at       │
└──────────────────┘                     └────────┬─────────┘
                                                  │
                                                  │ 1:N
                                                  ▼
                                         ┌──────────────────┐
                                         │      siswa       │
                                         ├──────────────────┤
                                         │ id (PK)          │
                                         │ nis              │
                                         │ nama_lengkap     │
                                         │ jenis_kelamin    │
                                         │ tempat_lahir     │
                                         │ tanggal_lahir    │
                                         │ alamat           │
                                         │ nama_ortu        │
                                         │ no_hp_ortu       │
                                         │ email_ortu       │
                                         │ rombel_id (FK)   │
                                         │ status           │
                                         │ tanggal_masuk    │
                                         │ foto             │
                                         │ ikut_daycare     │
                                         │ created_at       │
                                         │ updated_at       │
                                         └────────┬─────────┘
                                                  │
                    ┌─────────────────────────────┼─────────────────────────────┐
                    │                             │                             │
                    ▼                             ▼                             ▼
           ┌──────────────────┐          ┌──────────────────┐          ┌──────────────────┐
           │   siswa_pasta    │          │   siswa_diskon   │          │     tagihan      │
           ├──────────────────┤          ├──────────────────┤          ├──────────────────┤
           │ id (PK)          │          │ id (PK)          │          │ id (PK)          │
           │ siswa_id (FK)    │          │ siswa_id (FK)    │          │ siswa_id (FK)    │
           │ pasta_id (FK)    │          │ diskon_id (FK)   │          │ kode             │
           │ created_at       │          │ tanggal_mulai    │          │ periode          │
           └────────┬─────────┘          │ tanggal_berakhir │          │ tanggal_tagihan  │
                    │                    │ catatan          │          │ jatuh_tempo      │
                    ▼                    │ created_by (FK)  │          │ total_tagihan    │
           ┌──────────────────┐          │ created_at       │          │ total_diskon     │
           │      pasta       │          └────────┬─────────┘          │ total_bayar      │
           ├──────────────────┤                   │                    │ sisa_tagihan     │
           │ id (PK)          │                   ▼                    │ status           │
           │ nama             │          ┌──────────────────┐          │ created_at       │
           │ hari             │          │      diskon      │          │ updated_at       │
           │ jam_mulai        │          ├──────────────────┤          └────────┬─────────┘
           │ jam_selesai      │          │ id (PK)          │                   │
           │ biaya            │          │ kode             │                   │ 1:N
           │ jenjang_ids[]    │          │ nama             │                   ▼
           │ is_aktif         │          │ jenis_bayar_id   │          ┌──────────────────┐
           │ created_at       │          │ tipe_potongan    │          │   tagihan_item   │
           │ updated_at       │          │ nilai_potongan   │          ├──────────────────┤
           └──────────────────┘          │ keterangan       │          │ id (PK)          │
                                         │ is_aktif         │          │ tagihan_id (FK)  │
                                         │ created_at       │          │ jenis_bayar_id   │
                                         │ updated_at       │          │ nama_item        │
                                         └────────┬────┬────┘          │ nominal_awal     │
                                                  │    │               │ nominal_diskon   │
                                                  ▼    │               │ nominal_akhir    │
                                         ┌─────────────┴────┐          │ catatan          │
                                         │ jenis_pembayaran │          │ created_at       │
                                         ├──────────────────┤          └──────────────────┘
                                         │ id (PK)          │
                                         │ kode             │
                                         │ nama             │          TRANSAKSI PEMBAYARAN
                                         │ kategori         │
                                         │ tipe             │          ┌──────────────────┐
                                         │ nominal_default  │          │    pembayaran    │
                                         │ jenjang_ids[]    │          ├──────────────────┤
                                         │ sifat            │          │ id (PK)          │
                                         │ is_aktif         │          │ kode             │
                                         └────────┬─────────┘          │ siswa_id (FK)    │
                                                  │                    │ tanggal          │
                                                  │ 1:N                │ total_bayar      │
                                                  ▼                    │ metode           │
                                         ┌────────────────────────┐    │ bank_id (FK)     │
                                         │ jenis_pembayaran_tarif │    │ bukti_transfer   │
                                         ├────────────────────────┤    │ catatan          │
                                         │ id (PK)                │    │ kasir_id (FK)    │
                                         │ jenis_pembayaran_id(FK)│    │ created_at       │
                                         │ tahun_ajaran_id(FK)    │    │ updated_at       │
                                         │ jenjang_id(FK)         │    └────────┬─────────┘
                                         │ jenis_kelamin          │             │
                                         │ nominal                │             │
                                         └────────────────────────┘             ▼
                                                                       │ bank_id (FK)     │
                                                                       │ bukti_transfer   │
┌──────────────────┐                                                   │ catatan          │
│       bank       │                                                   │ kasir_id (FK)    │
├──────────────────┤                                                   │ created_at       │
│ id (PK)          │◄──────────────────────────────────────────────────│ updated_at       │
│ nama             │                                                   └────────┬─────────┘
│ nomor_rekening   │                                                            │
│ atas_nama        │                                                            │ 1:N
│ is_aktif         │                                                            ▼
│ created_at       │                                                   ┌──────────────────┐
│ updated_at       │                                                   │pembayaran_alokasi│
└──────────────────┘                                                   ├──────────────────┤
                                                                       │ id (PK)          │
                                                                       │ pembayaran_id(FK)│
                                                                       │ tagihan_id (FK)  │
                                                                       │ nominal_alokasi  │
                 TABUNGAN                                              │ created_at       │
                                                                       └──────────────────┘
┌──────────────────┐         1:N         ┌──────────────────┐
│     tabungan     │◄────────────────────│transaksi_tabungan│
├──────────────────┤                     ├──────────────────┤
│ id (PK)          │                     │ id (PK)          │
│ siswa_id (FK)    │                     │ tabungan_id (FK) │
│ jenis            │                     │ tipe             │
│ saldo            │                     │ nominal          │
│ created_at       │                     │ potongan_admin   │
│ updated_at       │                     │ nominal_bersih   │
└──────────────────┘                     │ keterangan       │
                                         │ created_by (FK)  │
                                         │ created_at       │
                                         └──────────────────┘


                    KAS & BERANGKAS

┌──────────────────┐         1:N         ┌──────────────────┐
│       kas        │◄────────────────────│   transaksi_kas  │
├──────────────────┤                     ├──────────────────┤
│ id (PK)          │                     │ id (PK)          │
│ tipe             │                     │ kas_id (FK)      │
│ nama             │                     │ tipe_transaksi   │
│ saldo            │                     │ referensi_id     │
│ created_at       │                     │ kategori         │
│ updated_at       │                     │ nominal          │
└──────────────────┘                     │ keterangan       │
                                         │ bukti            │
                                         │ created_by (FK)  │
                                         │ created_at       │
                                         └──────────────────┘
```

---

## 4. Table Definitions

### 4.1 tahun_ajaran

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Primary key |
| nama | VARCHAR(20) | NOT NULL, UNIQUE | e.g., "2025/2026" |
| tanggal_mulai | DATE | NOT NULL | Start date |
| tanggal_selesai | DATE | NOT NULL | End date |
| is_aktif | BOOLEAN | DEFAULT false | Active year |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | | |

### 4.2 jenjang

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Primary key |
| kode | VARCHAR(10) | NOT NULL, UNIQUE | e.g., "KB", "TK-A" |
| nama | VARCHAR(50) | NOT NULL | Full name |
| kelompok | VARCHAR(20) | NOT NULL | e.g., "Mutiara" |
| urutan | INT | NOT NULL | Display order |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | | |

### 4.3 rombel

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Primary key |
| jenjang_id | UUID | FK → jenjang | |
| tahun_ajaran_id | UUID | FK → tahun_ajaran | |
| nama | VARCHAR(30) | NOT NULL | e.g., "Mutiara 1" |
| wali_kelas | VARCHAR(100) | | Teacher name (reporting) |
| kapasitas | INT | DEFAULT 25 | Max capacity |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | | |

**Indexes:** `(jenjang_id, tahun_ajaran_id, nama)` UNIQUE

### 4.4 siswa

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Primary key |
| nis | VARCHAR(20) | NOT NULL, UNIQUE | Student ID |
| nama_lengkap | VARCHAR(100) | NOT NULL | Full name |
| jenis_kelamin | ENUM('L','P') | NOT NULL | Gender |
| tempat_lahir | VARCHAR(50) | | Birth place |
| tanggal_lahir | DATE | | Birth date |
| alamat | TEXT | | Address |
| nama_ortu | VARCHAR(100) | NOT NULL | Parent name |
| no_hp_ortu | VARCHAR(20) | NOT NULL | Parent phone |
| email_ortu | VARCHAR(100) | | Parent email |
| rombel_id | UUID | FK → rombel | |
| status | ENUM | NOT NULL, DEFAULT 'AKTIF' | AKTIF/LULUS/KELUAR |
| tanggal_masuk | DATE | NOT NULL | Enrollment date |
| foto | VARCHAR(255) | | Photo path |
| ikut_daycare | BOOLEAN | DEFAULT false | Daycare participant |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | | |

### 4.5 jenis_pembayaran

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Primary key |
| kode | VARCHAR(20) | NOT NULL, UNIQUE | e.g., "SPP" |
| nama | VARCHAR(100) | NOT NULL | Display name |
| kategori | ENUM | NOT NULL | INFAQ_RUTIN/REGISTRASI/PERLENGKAPAN/DAYCARE |
| tipe | ENUM | NOT NULL | BULANAN/TAHUNAN/SEKALI/HARIAN/INSIDENTIL |
| nominal_default | DECIMAL(12,2) | NOT NULL | Default amount (fallback) |
| jenjang_ids | UUID[] | | Applicable jenjang |
| sifat | ENUM | NOT NULL | WAJIB/OPSIONAL |
| jatuh_tempo_hari | INT | DEFAULT 1 | Due date (day of month) |
| keterangan | TEXT | | Notes |
| is_aktif | BOOLEAN | DEFAULT true | |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | | |

### 4.5.1 jenis_pembayaran_tarif (NEW)

> **Tabel baru** untuk menyimpan tarif berbeda per **jenjang** dan **gender**.
> Digunakan terutama untuk biaya Registrasi yang nominalnya berbeda per jenjang dan jenis kelamin.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Primary key |
| jenis_pembayaran_id | UUID | FK → jenis_pembayaran | Parent payment type |
| tahun_ajaran_id | UUID | FK → tahun_ajaran | For yearly versioning |
| jenjang_id | UUID | FK → jenjang, NULLABLE | null = all jenjang |
| jenis_kelamin | ENUM('L','P') | NULLABLE | null = all gender |
| nominal | DECIMAL(12,2) | NOT NULL | Amount for this combination |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | | |

**Indexes:** `(jenis_pembayaran_id, tahun_ajaran_id, jenjang_id, jenis_kelamin)` UNIQUE

**Contoh Data:**

| jenis_pembayaran | tahun_ajaran | jenjang | gender | nominal |
|------------------|--------------|---------|--------|---------|
| REG-JILBAB | 2025/2026 | KB | P | 35.000 |
| REG-JILBAB | 2025/2026 | TK-A | P | 35.000 |
| REG-JILBAB | 2025/2026 | TK-B | P | 35.000 |
| REG-ALAT | 2025/2026 | KB | null | 150.000 |
| REG-ALAT | 2025/2026 | TK-A | null | 200.000 |
| REG-ALAT | 2025/2026 | TK-B | null | 200.000 |

**Algoritma Pencarian Tarif:**
```
1. Cari tarif dengan jenjang + gender EXACT match
2. Jika tidak ada, cari dengan jenjang + gender NULL
3. Jika tidak ada, cari dengan jenjang NULL + gender match
4. Jika tidak ada, gunakan nominal_default dari jenis_pembayaran
```

### 4.6 diskon

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Primary key |
| kode | VARCHAR(20) | NOT NULL, UNIQUE | e.g., "BSW-YTM" |
| nama | VARCHAR(100) | NOT NULL | Display name |
| jenis_pembayaran_id | UUID | FK → jenis_pembayaran | Applies to |
| tipe_potongan | ENUM | NOT NULL | PERSENTASE/NOMINAL |
| nilai_potongan | DECIMAL(12,2) | NOT NULL | Value |
| keterangan | TEXT | | Notes |
| is_aktif | BOOLEAN | DEFAULT true | |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | | |

### 4.7 pasta

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Primary key |
| nama | VARCHAR(50) | NOT NULL | e.g., "Robotika" |
| hari | ENUM | NOT NULL | SENIN-SABTU |
| jam_mulai | TIME | NOT NULL | Start time |
| jam_selesai | TIME | NOT NULL | End time |
| biaya | DECIMAL(12,2) | NOT NULL | Monthly fee |
| jenjang_ids | UUID[] | | Applicable jenjang |
| is_aktif | BOOLEAN | DEFAULT true | |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | | |

### 4.8 bank

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Primary key |
| nama | VARCHAR(50) | NOT NULL | Bank name |
| nomor_rekening | VARCHAR(30) | NOT NULL | Account number |
| atas_nama | VARCHAR(100) | NOT NULL | Account holder |
| is_aktif | BOOLEAN | DEFAULT true | |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | | |

### 4.9 user

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Primary key |
| username | VARCHAR(50) | NOT NULL, UNIQUE | Username |
| email | VARCHAR(100) | UNIQUE | Email |
| password | VARCHAR(255) | NOT NULL | Hashed password |
| nama_lengkap | VARCHAR(100) | NOT NULL | Full name |
| role | ENUM | NOT NULL | ADMIN/KEPALA_SEKOLAH/BENDAHARA_YAYASAN |
| is_aktif | BOOLEAN | DEFAULT true | |
| last_login | TIMESTAMP | | Last login time |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | | |

### 4.10 siswa_pasta

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Primary key |
| siswa_id | UUID | FK → siswa | |
| pasta_id | UUID | FK → pasta | |
| created_at | TIMESTAMP | DEFAULT NOW() | |

**Indexes:** `(siswa_id, pasta_id)` UNIQUE

### 4.11 siswa_diskon

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Primary key |
| siswa_id | UUID | FK → siswa | |
| diskon_id | UUID | FK → diskon | |
| tanggal_mulai | DATE | NOT NULL | Start date |
| tanggal_berakhir | DATE | | End date (null = forever) |
| catatan | TEXT | | Notes |
| created_by | UUID | FK → user | Who created |
| created_at | TIMESTAMP | DEFAULT NOW() | |

### 4.12 tagihan

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Primary key |
| kode | VARCHAR(30) | NOT NULL, UNIQUE | e.g., "INV-202601-0001" |
| siswa_id | UUID | FK → siswa | |
| periode | VARCHAR(7) | NOT NULL | e.g., "2026-01" |
| rombel_snapshot | VARCHAR(50) | NOT NULL | Class name at invoice creation |
| jenjang_snapshot | VARCHAR(30) | NOT NULL | Level name at invoice creation |
| tanggal_tagihan | DATE | NOT NULL | Invoice date |
| jatuh_tempo | DATE | NOT NULL | Due date |
| total_tagihan | DECIMAL(12,2) | NOT NULL | Total before discount |
| total_diskon | DECIMAL(12,2) | DEFAULT 0 | Total discount |
| total_bayar | DECIMAL(12,2) | DEFAULT 0 | Total paid |
| sisa_tagihan | DECIMAL(12,2) | NOT NULL | Remaining |
| status | ENUM | NOT NULL | DRAFT/UNPAID/DUE/OVERDUE/PARTIAL/PAID/CANCELLED |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | | |

**Indexes:** `(siswa_id, periode)` UNIQUE

### 4.13 tagihan_item

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Primary key |
| tagihan_id | UUID | FK → tagihan | |
| jenis_pembayaran_id | UUID | FK → jenis_pembayaran | |
| nama_item | VARCHAR(100) | NOT NULL | Item name |
| nominal_awal | DECIMAL(12,2) | NOT NULL | Before discount |
| nominal_diskon | DECIMAL(12,2) | DEFAULT 0 | Discount amount |
| nominal_akhir | DECIMAL(12,2) | NOT NULL | After discount |
| catatan | TEXT | | Notes |
| created_at | TIMESTAMP | DEFAULT NOW() | |

### 4.14 pembayaran

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Primary key |
| kode | VARCHAR(30) | NOT NULL, UNIQUE | e.g., "PAY-20260129-0001" |
| siswa_id | UUID | FK → siswa | |
| tanggal | TIMESTAMP | NOT NULL | Payment time |
| total_bayar | DECIMAL(12,2) | NOT NULL | Total paid |
| metode | ENUM | NOT NULL | TUNAI/TRANSFER |
| bank_id | UUID | FK → bank, NULLABLE | If transfer |
| bukti_transfer | VARCHAR(255) | | File path |
| catatan | TEXT | | Notes |
| kasir_id | UUID | FK → user | Cashier |
| status | ENUM | DEFAULT 'AKTIF' | AKTIF/VOID |
| void_reason | TEXT | | If voided |
| void_by | UUID | FK → user | Who voided |
| void_at | TIMESTAMP | | When voided |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | | |

### 4.15 pembayaran_alokasi

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Primary key |
| pembayaran_id | UUID | FK → pembayaran | |
| tagihan_id | UUID | FK → tagihan | |
| nominal_alokasi | DECIMAL(12,2) | NOT NULL | Amount allocated |
| created_at | TIMESTAMP | DEFAULT NOW() | |

### 4.16 tabungan

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Primary key |
| siswa_id | UUID | FK → siswa | |
| jenis | ENUM | NOT NULL | WAJIB_BERLIAN/UMUM |
| saldo | DECIMAL(12,2) | DEFAULT 0 | Current balance |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | | |

**Indexes:** `(siswa_id, jenis)` UNIQUE

### 4.17 transaksi_tabungan

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Primary key |
| tabungan_id | UUID | FK → tabungan | |
| tipe | ENUM | NOT NULL | SETOR/TARIK |
| nominal | DECIMAL(12,2) | NOT NULL | Amount |
| potongan_admin | DECIMAL(12,2) | DEFAULT 0 | Admin fee (2.5% for withdrawal) |
| nominal_bersih | DECIMAL(12,2) | NOT NULL | Net amount |
| keterangan | TEXT | | Notes |
| created_by | UUID | FK → user | |
| created_at | TIMESTAMP | DEFAULT NOW() | |

### 4.18 kas

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Primary key |
| tipe | ENUM | NOT NULL | KAS/BERANGKAS |
| nama | VARCHAR(50) | NOT NULL | e.g., "Kas Utama" |
| saldo | DECIMAL(15,2) | DEFAULT 0 | Current balance |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | | |

### 4.19 transaksi_kas

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Primary key |
| kas_id | UUID | FK → kas | |
| tipe_transaksi | ENUM | NOT NULL | MASUK/KELUAR/TRANSFER |
| sumber_dana_id | UUID | FK → jenis_pembayaran | Origin of fund (e.g. SPP) |
| pos_pengeluaran_id | UUID | FK → pos_pengeluaran | Expense category (e.g. ATK) |
| referensi_id | UUID | | FK to payment if from payment |
| referensi_tipe | VARCHAR(50) | | e.g., "PEMBAYARAN" |
| nominal | DECIMAL(12,2) | NOT NULL | Amount |
| keterangan | TEXT | | Notes |
| bukti | VARCHAR(255) | | File path |
| transfer_ke_kas_id | UUID | FK → kas | If transfer |
| created_by | UUID | FK → user | |
| created_at | TIMESTAMP | DEFAULT NOW() | |

### 4.20 pos_pengeluaran

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Primary key |
| kode | VARCHAR(20) | NOT NULL, UNIQUE | e.g., "POS-ATK" |
| nama | VARCHAR(100) | NOT NULL | e.g., "Alat Tulis Kantor" |
| prioritas_sumber_dana_id | UUID | FK -> jenis_pembayaran | Default fund source |
| keterangan | TEXT | | |
| is_aktif | BOOLEAN | DEFAULT true | |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | | |

---

## 5. Prisma Schema

```prisma
// packages/db/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ==================== ENUMS ====================

enum JenisKelamin {
  L
  P
}

enum StatusSiswa {
  AKTIF
  LULUS
  KELUAR
}

enum KategoriPembayaran {
  INFAQ_RUTIN
  REGISTRASI
  PERLENGKAPAN
  DAYCARE
}

enum TipePembayaran {
  BULANAN
  TAHUNAN
  SEKALI
  HARIAN
  INSIDENTIL
}

enum SifatPembayaran {
  WAJIB
  OPSIONAL
}

enum TipePotongan {
  PERSENTASE
  NOMINAL
}

enum Hari {
  SENIN
  SELASA
  RABU
  KAMIS
  JUMAT
  SABTU
}

enum UserRole {
  ADMIN
  KEPALA_SEKOLAH
  BENDAHARA_YAYASAN
}

enum StatusTagihan {
  DRAFT
  UNPAID
  DUE
  OVERDUE
  PARTIAL
  PAID
  CANCELLED
}

enum MetodePembayaran {
  TUNAI
  TRANSFER
}

enum StatusPembayaran {
  AKTIF
  VOID
}

enum JenisTabungan {
  WAJIB_BERLIAN
  UMUM
}

enum TipeTransaksiTabungan {
  SETOR
  TARIK
}

enum TipeKas {
  KAS
  BERANGKAS
}

enum TipeTransaksiKas {
  MASUK
  KELUAR
  TRANSFER
}

// ==================== MODELS ====================

model TahunAjaran {
  id              String    @id @default(uuid())
  nama            String    @unique @db.VarChar(20)
  tanggalMulai    DateTime  @map("tanggal_mulai") @db.Date
  tanggalSelesai  DateTime  @map("tanggal_selesai") @db.Date
  isAktif         Boolean   @default(false) @map("is_aktif")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  rombels Rombel[]
  tarifs  JenisPembayaranTarif[]

  @@map("tahun_ajaran")
}

model Jenjang {
  id        String   @id @default(uuid())
  kode      String   @unique @db.VarChar(10)
  nama      String   @db.VarChar(50)
  kelompok  String   @db.VarChar(20)
  urutan    Int
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  rombels Rombel[]
  tarifs  JenisPembayaranTarif[]

  @@map("jenjang")
}

model Rombel {
  id            String      @id @default(uuid())
  jenjangId     String      @map("jenjang_id")
  tahunAjaranId String      @map("tahun_ajaran_id")
  nama          String      @db.VarChar(30)
  waliKelas     String?     @map("wali_kelas") @db.VarChar(100)
  kapasitas     Int         @default(25)
  createdAt     DateTime    @default(now()) @map("created_at")
  updatedAt     DateTime    @updatedAt @map("updated_at")

  jenjang     Jenjang     @relation(fields: [jenjangId], references: [id])
  tahunAjaran TahunAjaran @relation(fields: [tahunAjaranId], references: [id])
  siswas      Siswa[]

  @@unique([jenjangId, tahunAjaranId, nama])
  @@map("rombel")
}

model Siswa {
  id            String       @id @default(uuid())
  nis           String       @unique @db.VarChar(20)
  namaLengkap   String       @map("nama_lengkap") @db.VarChar(100)
  jenisKelamin  JenisKelamin @map("jenis_kelamin")
  tempatLahir   String?      @map("tempat_lahir") @db.VarChar(50)
  tanggalLahir  DateTime?    @map("tanggal_lahir") @db.Date
  alamat        String?      @db.Text
  namaOrtu      String       @map("nama_ortu") @db.VarChar(100)
  noHpOrtu      String       @map("no_hp_ortu") @db.VarChar(20)
  emailOrtu     String?      @map("email_ortu") @db.VarChar(100)
  rombelId      String       @map("rombel_id")
  status        StatusSiswa  @default(AKTIF)
  tanggalMasuk  DateTime     @map("tanggal_masuk") @db.Date
  foto          String?      @db.VarChar(255)
  ikutDaycare   Boolean      @default(false) @map("ikut_daycare")
  createdAt     DateTime     @default(now()) @map("created_at")
  updatedAt     DateTime     @updatedAt @map("updated_at")

  rombel              Rombel               @relation(fields: [rombelId], references: [id])
  siswaPastas         SiswaPasta[]
  siswaDiskons        SiswaDiskon[]
  tagihans            Tagihan[]
  pembayarans         Pembayaran[]
  tabungans           Tabungan[]

  @@map("siswa")
}

model JenisPembayaran {
  id              String              @id @default(uuid())
  kode            String              @unique @db.VarChar(20)
  nama            String              @db.VarChar(100)
  kategori        KategoriPembayaran
  tipe            TipePembayaran
  nominalDefault  Decimal             @map("nominal_default") @db.Decimal(12, 2)
  jenjangIds      String[]            @map("jenjang_ids")
  sifat           SifatPembayaran
  jatuhTempoHari  Int                 @default(1) @map("jatuh_tempo_hari")
  keterangan      String?             @db.Text
  isAktif         Boolean             @default(true) @map("is_aktif")
  createdAt       DateTime            @default(now()) @map("created_at")
  updatedAt       DateTime            @updatedAt @map("updated_at")

  tarifs        JenisPembayaranTarif[]
  diskons       Diskon[]
  tagihanItems  TagihanItem[]

  @@map("jenis_pembayaran")
}

model JenisPembayaranTarif {
  id                  String        @id @default(uuid())
  jenisPembayaranId   String        @map("jenis_pembayaran_id")
  tahunAjaranId       String        @map("tahun_ajaran_id")
  jenjangId           String?       @map("jenjang_id")
  jenisKelamin        JenisKelamin? @map("jenis_kelamin")
  nominal             Decimal       @db.Decimal(12, 2)
  createdAt           DateTime      @default(now()) @map("created_at")
  updatedAt           DateTime      @updatedAt @map("updated_at")

  jenisPembayaran JenisPembayaran @relation(fields: [jenisPembayaranId], references: [id])
  tahunAjaran     TahunAjaran     @relation(fields: [tahunAjaranId], references: [id])
  jenjang         Jenjang?        @relation(fields: [jenjangId], references: [id])

  @@unique([jenisPembayaranId, tahunAjaranId, jenjangId, jenisKelamin])
  @@map("jenis_pembayaran_tarif")
}

model Diskon {
  id                String        @id @default(uuid())
  kode              String        @unique @db.VarChar(20)
  nama              String        @db.VarChar(100)
  jenisPembayaranId String        @map("jenis_pembayaran_id")
  tipePotongan      TipePotongan  @map("tipe_potongan")
  nilaiPotongan     Decimal       @map("nilai_potongan") @db.Decimal(12, 2)
  keterangan        String?       @db.Text
  isAktif           Boolean       @default(true) @map("is_aktif")
  createdAt         DateTime      @default(now()) @map("created_at")
  updatedAt         DateTime      @updatedAt @map("updated_at")

  jenisPembayaran JenisPembayaran @relation(fields: [jenisPembayaranId], references: [id])
  siswaDiskons    SiswaDiskon[]

  @@map("diskon")
}

model Pasta {
  id          String   @id @default(uuid())
  nama        String   @db.VarChar(50)
  hari        Hari
  jamMulai    DateTime @map("jam_mulai") @db.Time
  jamSelesai  DateTime @map("jam_selesai") @db.Time
  biaya       Decimal  @db.Decimal(12, 2)
  jenjangIds  String[] @map("jenjang_ids")
  isAktif     Boolean  @default(true) @map("is_aktif")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  siswaPastas SiswaPasta[]

  @@map("pasta")
}

model Bank {
  id            String   @id @default(uuid())
  nama          String   @db.VarChar(50)
  nomorRekening String   @map("nomor_rekening") @db.VarChar(30)
  atasNama      String   @map("atas_nama") @db.VarChar(100)
  isAktif       Boolean  @default(true) @map("is_aktif")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  pembayarans Pembayaran[]

  @@map("bank")
}

model User {
  id          String    @id @default(uuid())
  username    String    @unique @db.VarChar(50)
  email       String?   @unique @db.VarChar(100)
  password    String    @db.VarChar(255)
  namaLengkap String    @map("nama_lengkap") @db.VarChar(100)
  role        UserRole
  isAktif     Boolean   @default(true) @map("is_aktif")
  lastLogin   DateTime? @map("last_login")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  siswaDiskonsCreated     SiswaDiskon[]       @relation("DiskonCreatedBy")
  pembayaransAsKasir      Pembayaran[]        @relation("PembayaranKasir")
  pembayaransVoidedBy     Pembayaran[]        @relation("PembayaranVoidBy")
  transaksiTabungans      TransaksiTabungan[]
  transaksiKas            TransaksiKas[]

  @@map("user")
}

// ==================== JUNCTION TABLES ====================

model SiswaPasta {
  id        String   @id @default(uuid())
  siswaId   String   @map("siswa_id")
  pastaId   String   @map("pasta_id")
  createdAt DateTime @default(now()) @map("created_at")

  siswa Siswa @relation(fields: [siswaId], references: [id], onDelete: Cascade)
  pasta Pasta @relation(fields: [pastaId], references: [id], onDelete: Cascade)

  @@unique([siswaId, pastaId])
  @@map("siswa_pasta")
}

model SiswaDiskon {
  id              String    @id @default(uuid())
  siswaId         String    @map("siswa_id")
  diskonId        String    @map("diskon_id")
  tanggalMulai    DateTime  @map("tanggal_mulai") @db.Date
  tanggalBerakhir DateTime? @map("tanggal_berakhir") @db.Date
  catatan         String?   @db.Text
  createdBy       String    @map("created_by")
  createdAt       DateTime  @default(now()) @map("created_at")

  siswa     Siswa  @relation(fields: [siswaId], references: [id], onDelete: Cascade)
  diskon    Diskon @relation(fields: [diskonId], references: [id], onDelete: Cascade)
  createdByUser User @relation("DiskonCreatedBy", fields: [createdBy], references: [id])

  @@map("siswa_diskon")
}

// ==================== TAGIHAN & PEMBAYARAN ====================

model Tagihan {
  id             String        @id @default(uuid())
  kode           String        @unique @db.VarChar(30)
  siswaId        String        @map("siswa_id")
  periode          String        @db.VarChar(7) // "2026-01"
  rombelSnapshot   String        @map("rombel_snapshot") @db.VarChar(50)
  jenjangSnapshot  String        @map("jenjang_snapshot") @db.VarChar(30)
  tanggalTagihan   DateTime      @map("tanggal_tagihan") @db.Date
  jatuhTempo     DateTime      @map("jatuh_tempo") @db.Date
  totalTagihan   Decimal       @map("total_tagihan") @db.Decimal(12, 2)
  totalDiskon    Decimal       @default(0) @map("total_diskon") @db.Decimal(12, 2)
  totalBayar     Decimal       @default(0) @map("total_bayar") @db.Decimal(12, 2)
  sisaTagihan    Decimal       @map("sisa_tagihan") @db.Decimal(12, 2)
  status         StatusTagihan @default(UNPAID)
  createdAt      DateTime      @default(now()) @map("created_at")
  updatedAt      DateTime      @updatedAt @map("updated_at")

  siswa              Siswa               @relation(fields: [siswaId], references: [id])
  tagihanItems       TagihanItem[]
  pembayaranAlokasis PembayaranAlokasi[]

  @@unique([siswaId, periode])
  @@map("tagihan")
}

model TagihanItem {
  id                String   @id @default(uuid())
  tagihanId         String   @map("tagihan_id")
  jenisPembayaranId String   @map("jenis_pembayaran_id")
  namaItem          String   @map("nama_item") @db.VarChar(100)
  nominalAwal       Decimal  @map("nominal_awal") @db.Decimal(12, 2)
  nominalDiskon     Decimal  @default(0) @map("nominal_diskon") @db.Decimal(12, 2)
  nominalAkhir      Decimal  @map("nominal_akhir") @db.Decimal(12, 2)
  catatan           String?  @db.Text
  createdAt         DateTime @default(now()) @map("created_at")

  tagihan         Tagihan         @relation(fields: [tagihanId], references: [id], onDelete: Cascade)
  jenisPembayaran JenisPembayaran @relation(fields: [jenisPembayaranId], references: [id])

  @@map("tagihan_item")
}

model Pembayaran {
  id            String            @id @default(uuid())
  kode          String            @unique @db.VarChar(30)
  siswaId       String            @map("siswa_id")
  tanggal       DateTime          @default(now())
  totalBayar    Decimal           @map("total_bayar") @db.Decimal(12, 2)
  metode        MetodePembayaran
  bankId        String?           @map("bank_id")
  buktiTransfer String?           @map("bukti_transfer") @db.VarChar(255)
  catatan       String?           @db.Text
  kasirId       String            @map("kasir_id")
  status        StatusPembayaran  @default(AKTIF)
  voidReason    String?           @map("void_reason") @db.Text
  voidBy        String?           @map("void_by")
  voidAt        DateTime?         @map("void_at")
  createdAt     DateTime          @default(now()) @map("created_at")
  updatedAt     DateTime          @updatedAt @map("updated_at")

  siswa     Siswa  @relation(fields: [siswaId], references: [id])
  bank      Bank?  @relation(fields: [bankId], references: [id])
  kasir     User   @relation("PembayaranKasir", fields: [kasirId], references: [id])
  voidByUser User? @relation("PembayaranVoidBy", fields: [voidBy], references: [id])

  pembayaranAlokasis PembayaranAlokasi[]

  @@map("pembayaran")
}

model PembayaranAlokasi {
  id             String   @id @default(uuid())
  pembayaranId   String   @map("pembayaran_id")
  tagihanId      String   @map("tagihan_id")
  nominalAlokasi Decimal  @map("nominal_alokasi") @db.Decimal(12, 2)
  createdAt      DateTime @default(now()) @map("created_at")

  pembayaran Pembayaran @relation(fields: [pembayaranId], references: [id], onDelete: Cascade)
  tagihan    Tagihan    @relation(fields: [tagihanId], references: [id])

  @@map("pembayaran_alokasi")
}

// ==================== TABUNGAN ====================

model Tabungan {
  id        String         @id @default(uuid())
  siswaId   String         @map("siswa_id")
  jenis     JenisTabungan
  saldo     Decimal        @default(0) @db.Decimal(12, 2)
  createdAt DateTime       @default(now()) @map("created_at")
  updatedAt DateTime       @updatedAt @map("updated_at")

  siswa       Siswa               @relation(fields: [siswaId], references: [id])
  transaksis  TransaksiTabungan[]

  @@unique([siswaId, jenis])
  @@map("tabungan")
}

model TransaksiTabungan {
  id             String                 @id @default(uuid())
  tabunganId     String                 @map("tabungan_id")
  tipe           TipeTransaksiTabungan
  nominal        Decimal                @db.Decimal(12, 2)
  potonganAdmin  Decimal                @default(0) @map("potongan_admin") @db.Decimal(12, 2)
  nominalBersih  Decimal                @map("nominal_bersih") @db.Decimal(12, 2)
  keterangan     String?                @db.Text
  createdBy      String                 @map("created_by")
  createdAt      DateTime               @default(now()) @map("created_at")

  tabungan      Tabungan @relation(fields: [tabunganId], references: [id])
  createdByUser User     @relation(fields: [createdBy], references: [id])

  @@map("transaksi_tabungan")
}

// ==================== KAS & BERANGKAS ====================

model Kas {
  id        String     @id @default(uuid())
  tipe      TipeKas
  nama      String     @db.VarChar(50)
  saldo     Decimal    @default(0) @db.Decimal(15, 2)
  createdAt DateTime   @default(now()) @map("created_at")
  updatedAt DateTime   @updatedAt @map("updated_at")

  transaksis          TransaksiKas[] @relation("KasTransaksi")
  transfersReceived   TransaksiKas[] @relation("KasTransferTo")

  @@map("kas")
}

model PosPengeluaran {
  id                    String   @id @default(uuid())
  kode                  String   @unique @db.VarChar(20)
  nama                  String   @db.VarChar(100)
  prioritasSumberDanaId String?  @map("prioritas_sumber_dana_id")
  keterangan            String?  @db.Text
  isAktif               Boolean  @default(true) @map("is_aktif")
  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")

  prioritasSumberDana JenisPembayaran? @relation(fields: [prioritasSumberDanaId], references: [id])
  transaksis          TransaksiKas[]

  @@map("pos_pengeluaran")
}

model TransaksiKas {
  id              String           @id @default(uuid())
  kasId              String           @map("kas_id")
  tipeTransaksi      TipeTransaksiKas @map("tipe_transaksi")
  sumberDanaId       String?          @map("sumber_dana_id") // FK ke JenisPembayaran
  posPengeluaranId   String?          @map("pos_pengeluaran_id") // FK ke PosPengeluaran
  referensiId        String?          @map("referensi_id")
  referensiTipe   String?          @map("referensi_tipe") @db.VarChar(50)
  kategori        String?          @db.VarChar(50)
  nominal         Decimal          @db.Decimal(12, 2)
  keterangan      String?          @db.Text
  bukti           String?          @db.VarChar(255)
  transferKeKasId String?          @map("transfer_ke_kas_id")
  createdBy       String           @map("created_by")
  createdAt       DateTime         @default(now()) @map("created_at")

  kas             Kas              @relation("KasTransaksi", fields: [kasId], references: [id])
  transferKeKas   Kas?             @relation("KasTransferTo", fields: [transferKeKasId], references: [id])
  createdByUser   User             @relation(fields: [createdBy], references: [id])
  sumberDana      JenisPembayaran? @relation(fields: [sumberDanaId], references: [id])
  posPengeluaran  PosPengeluaran?  @relation(fields: [posPengeluaranId], references: [id])

  @@map("transaksi_kas")
}
```

---

## Changelog

| Versi | Tanggal | Perubahan | Oleh |
|-------|---------|-----------|------|
| 1.0 | 29 Jan 2026 | Dokumen awal | - |
