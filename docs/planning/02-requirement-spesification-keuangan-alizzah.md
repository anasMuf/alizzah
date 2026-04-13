# Dokumen Spesifikasi Kebutuhan (Requirement Specification)
# Sistem Keuangan Sekolah PAUD Unggulan Alizzah

> **Versi:** 1.5  
> **Tanggal:** 13 April 2026  
> **Status:** Draft - Menunggu Validasi  
> **Yayasan:** Walipapat  
> **Lokasi:** Kabupaten Mojokerto

---

## 📋 Daftar Isi

1. [Ringkasan Proyek](#1-ringkasan-proyek)
2. [Struktur Organisasi Sekolah](#2-struktur-organisasi-sekolah)
3. [Master Data](#3-master-data)
4. [Modul Pembayaran](#4-modul-pembayaran)
5. [Modul Diskon/Dispensasi](#5-modul-diskondispensasi)
6. [Modul Tabungan](#6-modul-tabungan)
7. [Modul Kas & Berangkas](#7-modul-kas--berangkas)
8. [Modul Laporan](#8-modul-laporan)
9. [Manajemen Pengguna](#9-manajemen-pengguna)
10. [Integrasi & Fitur Masa Depan](#10-integrasi--fitur-masa-depan)
11. [Wireframe & Alur Kerja](#11-wireframe--alur-kerja)

---

## 1. Ringkasan Proyek

### 1.1 Tujuan
Membangun sistem informasi keuangan sekolah yang terintegrasi untuk Sekolah PAUD Unggulan Alizzah yang mencakup:
- Pengelolaan tagihan dan pembayaran siswa
- Pencatatan kas dan berangkas
- Manajemen tabungan siswa
- Sistem diskon/dispensasi yang fleksibel
- Pelaporan keuangan komprehensif

### 1.2 Ruang Lingkup Fase 1 (Saat Ini)
| Dalam Scope | Di Luar Scope (Fase Berikutnya) |
|-------------|--------------------------------|
| ✅ Manajemen tagihan & pembayaran | ❌ PPDB Online |
| ✅ Sistem diskon/dispensasi | ❌ Siakad (absensi, rapor) |
| ✅ Tabungan siswa | ❌ Kepegawaian & penggajian |
| ✅ Kas & berangkas | ❌ Koperasi sekolah |
| ✅ Laporan keuangan | ❌ Inventarisasi |
| ✅ Multi-user (3 role) | ❌ Landing page/website |
|  | ❌ Portal orang tua |

### 1.3 Metode Pembayaran yang Didukung
| Metode | Status | Keterangan |
|--------|--------|------------|
| Tunai | ✅ Aktif | Pembayaran langsung di sekolah |
| Transfer Bank | ✅ Aktif | BCA, BRI, BNI, Mandiri, Bank Jatim |
| Pembayaran Online | 🔜 Masa Depan | VA, QRIS (fase berikutnya) |

---

## 2. Struktur Organisasi Sekolah

### 2.1 Jenjang Pendidikan

| Kode | Nama Kelompok | Jenjang | Hari Belajar | Jam Masuk | Jam Pulang | Jam Calisan |
|------|---------------|---------|--------------|-----------|------------|-------------|
| KB | Mutiara | Kelompok Bermain | Senin-Kamis | 07:15 | 10:00 | 10:30 |
| KB | Mutiara | Kelompok Bermain | Jumat-Sabtu | 07:15 | 09:00 | 09:30 |
| TK-A | Intan | Taman Kanak-kanak A | Senin-Kamis | 07:15 | 10:00 | 10:30 |
| TK-A | Intan | Taman Kanak-kanak A | Jumat-Sabtu | 07:15 | 09:00 | - |
| TK-B | Berlian | Taman Kanak-kanak B | Senin-Kamis | 07:15 | 10:30 | 11:00 |
| TK-B | Berlian | Taman Kanak-kanak B | Jumat-Sabtu | 07:15 | 09:00 | - |

### 2.2 Struktur Rombel (Rombongan Belajar)

Setiap jenjang memiliki **1-10 rombel** (kelas), contoh:
- Mutiara 1, Mutiara 2, ... Mutiara 10 (KB)
- Intan 1, Intan 2, ... Intan 10 (TK-A)
- Berlian 1, Berlian 2, ... Berlian 10 (TK-B)

### 2.3 Layanan Tambahan

#### A. PASTA (Program Asah Talenta) - Khusus TK
Ekstrakurikuler **opsional** untuk jenjang TK (Intan & Berlian):

| No | Jenis PASTA | Hari | Jam | Biaya/Bulan |
|----|-------------|------|-----|-------------|
| 1 | Robotika | Jumat | 09:00-10:00 | Rp 100.000 |
| 2 | Sempoa Kids | Jumat | 09:00-10:00 | Rp 100.000 |
| 3 | Tilawah | Jumat | 09:00-10:00 | Rp 50.000 |
| 4 | Laptop Kid's | Jumat | 09:00-10:00 | Rp 100.000 |
| 5 | Taekwondo | Sabtu | 09:00-10:00 | Rp 50.000 |
| 6 | Tari (Menari) | Sabtu | 09:00-10:00 | Rp 50.000 |
| 7 | Melukis | Sabtu | 09:00-10:00 | Rp 50.000 |
| 8 | Menyanyi | Sabtu | 09:00-10:00 | Rp 50.000 |

**Catatan:**
- Siswa TK **boleh memilih lebih dari satu** PASTA
- Sistem akan menampilkan **peringatan** jika siswa TK belum memilih PASTA sama sekali
- Biaya PASTA masuk sebagai item **terpisah** dari SPP (bukan digabung di bill SPP)

#### B. Daycare (Penitipan Anak) - Opsional

Layanan penitipan anak setelah jam belajar selesai.

**Karakteristik:**
- Tersedia untuk **semua jenjang** (KB, TK-A, TK-B)
- Juga **menerima anak dari luar Alizzah** (bukan siswa aktif) — bisa mendaftar SPD Harian atau Rutin
- Jam operasional: **10:00 - 15:00 WIB**
- Hari operasional: **Senin - Sabtu**
- Belum ada batas kapasitas per hari
- SPP reguler **tetap dibayar terpisah**, SPD tidak menggantikan SPP
- Tidak ada paket gabungan SPP + SPD

**Mode Pembayaran Daycare:**

| Mode | Deskripsi | Penagihan |
|------|-----------|----------|
| **SPD Rutin (Bulanan)** | Peserta daycare tetap setiap hari | Diikutkan di invoice bulanan bersama SPP |
| **SPD Harian Lepas** | Peserta daycare insidentil/hari tertentu | Tagihan tersendiri (admin input transaksi harian per tanggal) |

**Rincian Biaya:**

##### 1. Biaya Awal Daycare (Sekali Bayar)

| No | Uraian | Jumlah |
|----|--------|--------|
| 1 | Pendaftaran | Rp 150.000 |
| 2 | Akomodasi | Rp 250.000 |
| | **Total** | **Rp 400.000** |

##### 2. SPD Rutin (Bulanan)

| No | Kategori | SPD/Bulan | Paket (SPD + Konsumsi) |
|----|----------|-----------|------------------------|
| 1 | Biaya Rutin KB | Rp 200.000 | Rp 500.000 |
| | Biaya Rutin TK (A & B) | Rp 400.000 | Rp 900.000 |

> **Catatan:** Biaya konsumsi (Rp 20.000/hari) bersifat **opsional**. Orang tua boleh memilih SPD saja tanpa konsumsi.

##### 3. SPD Harian Lepas

| No | Kategori | Nominal |
|----|----------|--------|
| 1 | SPD Harian | Rp 15.000/hari |
| 2 | Biaya Konsumsi (opsional) | Rp 20.000/hari |
| | **Paket (SPD + Konsumsi)** | **Rp 35.000/hari** |

> **Catatan:** Admin melakukan input transaksi harian per tanggal untuk setiap anak yang menggunakan SPD Harian Lepas. Konsumsi opsional baik untuk peserta rutin maupun harian lepas.

**Catatan Penting:**
- Siswa yang ikut daycare **tetap bayar SPP reguler** + SPD terpisah
- Untuk **anak luar Alizzah**, sistem mendukung pendaftaran sebagai **Peserta Daycare** tersendiri (bukan sebagai siswa)
- **Absensi daycare** direncanakan sebagai apps/platform terpisah (scope bukan Fase 1)
- Saat ini jumlah hari konsumsi masih **input manual oleh admin keuangan**; jika platform absensi sudah tersedia, jumlah hari akan otomatis dari data kehadiran

**✅ Peserta Daycare (Konsep):**

Sistem menggunakan tabel `peserta_daycare` terpisah dari `siswa` dengan **relasi opsional** ke tabel siswa:

| Tipe Peserta | siswa_id | Data Nama/Ortu | Tarif SPD |
|-------------|----------|----------------|----------|
| **Siswa Internal** (Alizzah) | ✅ FK ke `siswa` | Diambil dari tabel `siswa` | Berdasarkan jenjang siswa |
| **Anak Luar** (Non-Alizzah) | ❌ NULL | Diisi langsung di `peserta_daycare` | Berdasarkan **usia + pilihan orang tua** (jenjang setara) |

> **Keuntungan pendekatan ini:**
> - Tabel `siswa` tetap bersih hanya berisi siswa Alizzah yang terdaftar
> - Anak luar Alizzah tidak mencemari data siswa dan laporan akademik
> - Billing daycare referensi ke `peserta_daycare`, bukan langsung ke `siswa`
> - Fleksibel: jika anak luar kemudian mendaftar sebagai siswa, tinggal update `siswa_id`

---

## 3. Master Data

### 3.1 Master Tahun Ajaran
```
Contoh: 2025/2026, 2026/2027
```

**Atribut:**
- ID
- Nama Tahun Ajaran
- Tanggal Mulai
- Tanggal Selesai
- Status (Aktif/Non-aktif)

### 3.2 Master Jenjang
| ID | Kode | Nama | Kelompok |
|----|------|------|----------|
| 1 | KB | Kelompok Bermain | Mutiara |
| 2 | TK-A | Taman Kanak-kanak A | Intan |
| 3 | TK-B | Taman Kanak-kanak B | Berlian |

### 3.3 Master Rombel (Kelas)
**Atribut:**
- ID
- Jenjang ID (FK)
- Nama Rombel (contoh: "Mutiara 1")
- Tahun Ajaran ID (FK)
- Wali Kelas (opsional)
- Kapasitas Maksimal

### 3.4 Master Siswa
**Atribut:**
- ID
- NIS (Nomor Induk Siswa)
- Nama Lengkap
- Jenis Kelamin
- Tempat & Tanggal Lahir
- Alamat
- Nama Orang Tua/Wali
- No. HP Orang Tua
- Email Orang Tua (opsional)
- Rombel ID (FK)
- Status (Aktif/Lulus/Keluar)
- Tanggal Masuk
- Foto (opsional)
- PASTA yang Dipilih (many-to-many)

> **Catatan:** Field `ikut_daycare` dihapus dari tabel siswa. Status daycare kini ditentukan oleh keberadaan record di tabel `peserta_daycare` yang mereferensi siswa ini.

### 3.4.1 Kenaikan Kelas & Mutasi (NEW)
Fitur untuk memindahkan siswa antar kelas secara massal atau individual.

**Fungsi:**
1. **Kenaikan Kelas (Massal):** Memindahkan semua siswa dari Kelas A (Tahun X) ke Kelas B (Tahun X+1).
2. **Mutasi/Pindah Kelas (Individual):** Memindahkan siswa antar kelas dalam tahun ajaran yang sama.
3. **Lulus/Keluar:** Mengubah status siswa menjadi Lulus atau Keluar.

> **Penting:** Riwayat kelas siswa harus terjaga di setiap tagihan agar laporan historis tetap valid.

### 3.5 Master Jenis Pembayaran
**Atribut:**
- ID
- Kode
- Nama Pembayaran
- Kategori (lihat section 4.1)
- Tipe Pembayaran (Bulanan/Tahunan/Sekali/Harian/Insidentil)
- Nominal Default (fallback jika tidak ada tarif spesifik)
- Berlaku untuk Jenjang (bisa multiple)
- Sifat (Wajib/Opsional)
- Tanggal Jatuh Tempo Default (untuk SPP: tanggal 1 jam 00:00)
- Keterangan/Catatan

### 3.5.1 Tarif per Jenjang dan Gender (NEW)

> **Fitur baru** untuk mendukung biaya Registrasi yang berbeda per jenjang dan jenis kelamin.

**Atribut:**
- ID
- Jenis Pembayaran (FK)
- Tahun Ajaran (FK) - untuk versioning tarif per tahun
- Jenjang (opsional, null = semua)
- Jenis Kelamin (opsional, null = semua)
- Nominal

**Contoh Kasus:**
- Biaya Alat Belajar: KB = Rp 150.000, TK-A/B = Rp 200.000
- Jilbab Fieldtrip: Hanya untuk Perempuan = Rp 35.000

**Algoritma Penentuan Tarif:**
```
1. Cari tarif dengan (jenjang EXACT + gender EXACT)
2. Jika tidak ada, cari dengan (jenjang EXACT + gender NULL)
3. Jika tidak ada, gunakan nominal_default dari jenis_pembayaran
```

> **Catatan:** Sistem **tidak menggunakan denda keterlambatan**.

### 3.6 Master PASTA (Ekstrakurikuler)
**Atribut:**
- ID
- Nama PASTA
- Hari
- Jam Mulai
- Jam Selesai
- Biaya per Bulan
- Berlaku untuk Jenjang (TK-A, TK-B)
- Status (Aktif/Non-aktif)

### 3.6.1 Master Peserta Daycare (NEW)

Tabel khusus untuk peserta daycare, terpisah dari tabel siswa.

**Atribut:**
- ID
- Siswa ID (FK, **nullable**) → jika siswa Alizzah, link ke tabel siswa
- Nama Lengkap → diisi jika anak luar (null jika siswa internal, diambil dari siswa)
- Tanggal Lahir → untuk penentuan tarif anak luar
- Jenis Kelamin
- Nama Orang Tua/Wali → diisi jika anak luar
- No. HP Orang Tua → diisi jika anak luar
- Jenjang Setara (KB/TK-A/TK-B) → untuk penentuan tarif SPD, otomatis dari siswa jika internal; **berdasarkan usia + pilihan orang tua** jika anak luar
- Mode Daycare (RUTIN/HARIAN)
- Status (Aktif/Non-aktif)
- Tanggal Mulai Daycare
- Tanggal Berakhir (nullable)
- Catatan
- Created At
- Updated At

**Logika Pengambilan Data:**
```
Jika siswa_id IS NOT NULL:
  → Ambil nama, tanggal_lahir, jenis_kelamin, nama_ortu, no_hp dari tabel siswa
  → Jenjang setara otomatis dari siswa.rombel.jenjang
Jika siswa_id IS NULL (anak luar):
  → Gunakan data yang diisi langsung di peserta_daycare
  → Jenjang setara berdasarkan usia + pilihan orang tua
```

**Penentuan Jenjang Setara (Anak Luar):**
| Usia | Jenjang Setara | Tarif SPD Rutin |
|------|---------------|----------------|
| 3-4 tahun | KB | Rp 200.000/bulan |
| 4-5 tahun | TK-A | Rp 400.000/bulan |
| 5-6 tahun | TK-B | Rp 400.000/bulan |

> **Catatan:** Jenjang setara bisa di-override oleh admin berdasarkan pilihan orang tua.

### 3.7 Master Bank
**Atribut:**
- ID
- Nama Bank
- Nomor Rekening
- Atas Nama
- Status (Aktif/Non-aktif)

### 3.8 Master Pos Pengeluaran (NEW)
Kategori untuk pengelompokan biaya operasional sekolah.

**Contoh:**
- Operasional Kantor (ATK, Listrik, Air)
- Gaji Guru & Karyawan
- Pemeliharaan Gedung
- Kegiatan Siswa
- Inventaris

**Atribut:**
- ID
- Kode Pos
- Nama Pos Pengeluaran
- Default Sumber Dana (Opsional) -> Link ke Jenis Pembayaran (misal: Gaji Guru -> SPP)
- Keterangan
- Status (Aktif/Non-aktif)

---

## 4. Modul Pembayaran

### 4.1 Kategori dan Jenis Pembayaran

#### A. Kategori: INFAQ PEMBIAYAAN (Rutin/Berulang)

| No | Kode | Jenis Pembayaran | Nominal | Periode | Jenjang | Sifat | Catatan |
|----|------|------------------|---------|---------|---------|-------|---------|
| 1 | SPP | SPP KB-TK | Rp 150.000 | Bulanan | Semua | Wajib | - |
| 2 | INF-HR | Infaq Harian | Rp 7.000 | Per hari efektif | Semua | Wajib | **Dihitung: 7.000 x Jumlah Hari Efektif** |
| 3 | REG-TH | Biaya Registrasi Tahunan | Terlampir | Tahunan | Semua | Wajib | Dibayar awal tahun/termin |
| 4 | EKS-ASL | Ekskul Aslin | Rp 25.000 | Bulanan | TK-B | Wajib | - |
| 5 | TAB-WJB | Tabungan Wajib Berlian | Rp 10.000 | Per Senin | TK-B | Wajib | **Dihitung: 10.000 x Jumlah Senin** |
| 6 | CAL-KB | Ekskul Calisan KB | Rp 50.000 | Bulanan | KB | Wajib | 3x/minggu |
| 7 | CAL-TK | Ekskul Calisan TK | Rp 50.000 | Bulanan | TK-A, TK-B | Wajib | 4x/minggu |
| 8 | PASTA-* | PASTA (berbagai) | Rp 50.000 - 100.000 | Bulanan | TK-A, TK-B | Opsional | Per PASTA yang dipilih |
| 9 | TAB-UM | Tabungan Umum | Fleksibel | Kapan saja | Semua | Opsional | Admin 2.5% saat penarikan |

#### B. Kategori: BIAYA REGISTRASI (Siswa Baru)

**Per Jenjang:**

| No | Uraian | Intan (TK-A) | Berlian (TK-B) | Mutiara (KB) |
|----|--------|--------------|----------------|--------------|
| 1 | Biaya MPLS | Rp 100.000 | Rp 100.000 | Rp 100.000 |
| 2 | Buku Bayar | Rp 10.000 | Rp 10.000 | Rp 10.000 |
| 3 | Infaq Awal Tabungan | Rp 10.000 | Rp 10.000 | Rp 10.000 |
| 4 | Buku PK Karakter | Rp 15.000 | Rp 15.000 | Rp 15.000 |
| 5 | Kaos Field Trip | Rp 65.000 | Rp 65.000 | Rp 65.000 |
| 6 | Map Hasil Karya | Rp 25.000 | Rp 25.000 | Rp 25.000 |
| 7 | Map Raport & Foto Raport | Rp 60.000 | - | Rp 50.000 |
| 8 | Alat Belajar | Rp 200.000 | Rp 200.000 | Rp 150.000 |
| 9 | 1 Seri Buku Asik Membaca | Rp 40.000 | - | - |
| 10 | Buku Kreatifitas | Rp 100.000 | - | - |
| 11 | 2 Pcs Buku Jurnal | Rp 30.000 | Rp 30.000 | - |
| 12 | Iuran Kegiatan Kecamatan-Kabupaten | Rp 80.000 | - | - |
| 13 | Administrasi LPP (4 Trimester) | Rp 60.000 | Rp 60.000 | - |
| 14 | Kalender | Rp 30.000 | Rp 30.000 | Rp 30.000 |
| 15 | Buku Kotak | - | Rp 25.000 | - |
| 16 | Jilbab Fieldtrip (Perempuan) | Rp 35.000 | Rp 35.000 | Rp 35.000 |
| | **Jumlah Siswa Laki-laki** | **Rp 825.000** | **Rp 750.000** | **Rp 725.000** |
| | **Jumlah Siswa Perempuan** | **Rp 860.000** | **Rp 785.000** | **Rp 760.000** |

#### C. Kategori: BIAYA AWAL PENDIDIKAN (Perlengkapan)

| No | Uraian | Jumlah | Keterangan |
|----|--------|--------|------------|
| 1 | 4 Stel Seragam | Rp 750.000 | - |
| 2 | 1 Pc Rompi + Atribut Prasiaga | Rp 110.000 | - |
| 3 | 1 Tas Sekolah | Rp 85.000 | - |
| 4 | 2 Pasang Kaos Kaki | Rp 25.000 | - |
| 5 | 1 Set Lunch Box | Rp 100.000 | - |
| 6 | 1 Stel Baju Ganti | Rp 70.000 | - |
| 7 | Infaq Sarpras | Rp 500.000 | - |
| 8 | Infaq APE | Rp 600.000 | - |
| 9 | Buku DDTK | Rp 20.000 | - |
| 10 | Biaya Psikotes IQ | Rp 150.000 | - |
| | **Total** | **Rp 2.410.000** | **Berlaku:** Siswa Baru & Mutasi (Kelompok Intan 8 & 1, Mutiara 1-6) |

#### D. Kategori: DAYCARE (Penitipan Anak)

| No | Kode | Jenis Pembayaran | Nominal | Periode | Jenjang | Sifat | Catatan |
|----|------|------------------|---------|---------|---------|-------|---------|
| 1 | DC-DAFTAR | Pendaftaran Daycare | Rp 150.000 | Sekali | Semua | Wajib (jika ikut) | Biaya awal peserta daycare baru |
| 2 | DC-AKOM | Akomodasi Daycare | Rp 250.000 | Sekali | Semua | Wajib (jika ikut) | Biaya awal peserta daycare baru |
| 3 | SPD-KB | SPD Rutin KB | Rp 200.000 | Bulanan | KB | Wajib (jika ikut rutin) | Peserta daycare rutin KB |
| 4 | SPD-TK | SPD Rutin TK | Rp 400.000 | Bulanan | TK-A, TK-B | Wajib (jika ikut rutin) | Peserta daycare rutin TK |
| 5 | SPD-HR | SPD Harian Lepas | Rp 15.000 | Per hari | Semua | Opsional | Input per transaksi harian oleh admin |
| 6 | DC-KONS | Konsumsi Daycare | Rp 20.000 | Per hari | Semua | Opsional | Opsional untuk rutin & harian lepas |

### 4.2 Alur Pembuatan Tagihan (Billing)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ALUR PEMBUATAN TAGIHAN                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────┐    ┌──────────────┐    ┌───────────────┐    ┌──────────────┐  │
│  │  Setup   │───▶│ Pilih Siswa/ │───▶│ Generate Item │───▶│   Hitung     │  │
│  │  Periode │    │   Rombel     │    │   Tagihan     │    │   Diskon     │  │
│  └──────────┘    └──────────────┘    └───────────────┘    └──────────────┘  │
│                                                                    │         │
│                                                                    ▼         │
│  ┌──────────┐    ┌──────────────┐    ┌───────────────┐    ┌──────────────┐  │
│  │  Selesai │◀───│ Kirim        │◀───│ Review &      │◀───│   Total      │  │
│  │          │    │ Notifikasi   │    │   Simpan      │    │   Tagihan    │  │
│  └──────────┘    └──────────────┘    └───────────────┘    └──────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Fitur Generate Tagihan

1. **Generate Tagihan Massal**
   - Per bulan untuk seluruh siswa aktif
   - Per rombel untuk bulan tertentu
   - Per jenjang untuk bulan tertentu

2. **Generate Tagihan Individual**
   - Untuk siswa baru (mid-semester)
   - Untuk tagihan khusus/insidentil

3. **Item Tagihan Otomatis (berdasarkan profil siswa)**
   - SPP → Semua siswa aktif (fixed)
   - Infaq Harian → **Dihitung: 7.000 x Jumlah Hari Efektif** (Input jumlah hari saat generate)
   - Ekskul Calisan → Sesuai jenjang (KB/TK)
   - PASTA → Sesuai pilihan siswa (jika ada)
   - Tabungan Wajib Berlian → Hanya TK-B (**Dihitung: 10.000 x Jumlah Senin**)
   - SPD Rutin → Siswa yang `ikut_daycare = true` dan mode Rutin (**KB: 200.000, TK: 400.000**)
   - Konsumsi Daycare → **Opsional**, jika dipilih: **20.000 x Jumlah Hari** (input jumlah hari saat generate)

4. **Generate Tagihan Harian Daycare (Khusus SPD Harian Lepas)**
   - Input manual per siswa per tanggal
   - Tagihan terpisah dari invoice bulanan
   - Item: SPD Harian (Rp 15.000) + Konsumsi (Rp 20.000, opsional)

### 4.4 Status Tagihan

| Status | Deskripsi | Warna |
|--------|-----------|-------|
| `DRAFT` | Tagihan dibuat tapi belum difinalisasi | ⚪ Abu-abu |
| `UNPAID` | Belum dibayar, belum jatuh tempo | 🔵 Biru |
| `DUE` | Sudah jatuh tempo, belum dibayar | 🟡 Kuning |
| `OVERDUE` | Lewat jatuh tempo (tunggakan) | 🔴 Merah |
| `PARTIAL` | Sebagian dibayar | 🟠 Orange |
| `PAID` | Lunas | 🟢 Hijau |
| `CANCELLED` | Dibatalkan | ⚫ Hitam |

### 4.5 Fitur Pembayaran

1. **Input Pembayaran Manual**
   - Pilih siswa
   - Tampilkan daftar tagihan (filter: unpaid, partial, overdue)
   - Pilih tagihan yang akan dibayar (bisa multiple)
   - Input jumlah bayar
   - Pilih metode pembayaran (Tunai/Transfer)
   - Jika transfer, pilih bank tujuan
   - Catatan pembayaran (opsional)
   - Upload bukti transfer (opsional, untuk transfer)
   - Generate & cetak kuitansi

2. **Pembayaran Parsial (Cicilan)**
   - Sistem **mendukung pembayaran sebagian** (partial payment)
   - Tracking sisa pembayaran secara real-time
   - Riwayat semua cicilan tercatat dengan detail
   - Alokasi pembayaran ke tagihan spesifik
   
   > **Lihat detail di Section 4.7 - Pembayaran Parsial (Best Practice)**

3. **Pembatalan Pembayaran**
   - Void/batal dengan alasan
   - Approval oleh user yang berwenang
   - Audit trail tercatat

### 4.6 Kuitansi Pembayaran

**Isi Kuitansi:**
- Nomor Kuitansi (auto-generate)
- Tanggal Pembayaran
- Data Siswa (NIS, Nama, Kelas)
- Rincian Item yang Dibayar
- Total Pembayaran
- Metode Pembayaran
- Nama Petugas/Kasir
- Tanda tangan digital / TTD manual

### 4.7 Pembayaran Parsial (Best Practice)

#### Apakah Pembayaran Parsial Umum di Industri?

**Ya, sangat umum.** Berdasarkan riset standar industri software administrasi sekolah di Indonesia dan internasional:

- ✅ Hampir semua software keuangan sekolah modern **mendukung pembayaran parsial/cicilan**
- ✅ Fitur ini merupakan **kebutuhan standar** karena realita ekonomi orang tua yang beragam
- ✅ Software seperti APPSO.id, HashMicro, Fedena, dan lainnya menyediakan fitur ini
- ✅ Best practice adalah menggunakan **Payment Allocation** untuk tracking pembayaran parsial

#### Konsep Pembayaran Parsial

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│                        KONSEP PEMBAYARAN PARSIAL                                    │
├────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  TAGIHAN (Invoice)              PEMBAYARAN (Payment)         ALOKASI (Allocation)  │
│  ──────────────────             ────────────────────         ────────────────────  │
│                                                                                     │
│  ┌─────────────────┐            ┌─────────────────┐                                │
│  │ Tagihan Jan'26  │            │ Pembayaran #1   │         ┌──────────────────┐   │
│  │ Total: 500.000  │◄───────────│ Nominal: 200.000│────────►│ Alokasi 200.000  │   │
│  │                 │            │ Tgl: 5 Jan      │         │ ke Tagihan Jan   │   │
│  │ Sisa: 300.000   │            └─────────────────┘         └──────────────────┘   │
│  │ Status: PARTIAL │                                                               │
│  │                 │            ┌─────────────────┐                                │
│  │                 │◄───────────│ Pembayaran #2   │────────►┌──────────────────┐   │
│  │ Sisa: 100.000   │            │ Nominal: 200.000│         │ Alokasi 200.000  │   │
│  │                 │            │ Tgl: 20 Jan     │         │ ke Tagihan Jan   │   │
│  │                 │            └─────────────────┘         └──────────────────┘   │
│  │                 │                                                               │
│  │                 │            ┌─────────────────┐                                │
│  │ Sisa: 0         │◄───────────│ Pembayaran #3   │────────►┌──────────────────┐   │
│  │ Status: PAID    │            │ Nominal: 100.000│         │ Alokasi 100.000  │   │
│  └─────────────────┘            │ Tgl: 5 Feb      │         │ ke Tagihan Jan   │   │
│                                 └─────────────────┘         └──────────────────┘   │
│                                                                                     │
└────────────────────────────────────────────────────────────────────────────────────┘
```

#### Desain Database untuk Pembayaran Parsial

**Pendekatan: Payment Allocation Pattern**

Alih-alih menyimpan hubungan 1:1 antara pembayaran dan tagihan, kita menggunakan tabel alokasi untuk menghubungkan pembayaran ke tagihan (bisa many-to-many).

**Tabel: tagihan (invoices)**
```
- id
- siswa_id (FK)
- periode (bulan/tahun)
- tanggal_tagihan
- tanggal_jatuh_tempo
- total_tagihan          // Total semua item
- total_diskon           // Total diskon yang diterapkan
- total_bayar            // Jumlah yang sudah dibayar (calculated/cached)
- sisa_tagihan           // total_tagihan - total_diskon - total_bayar
- status                 // DRAFT, UNPAID, PARTIAL, PAID, CANCELLED
- created_at
- updated_at
```

**Tabel: tagihan_item (invoice_items)**
```
- id
- tagihan_id (FK)
- jenis_pembayaran_id (FK)
- nama_item
- nominal_awal           // Nominal sebelum diskon
- nominal_diskon         // Total diskon untuk item ini
- nominal_akhir          // Nominal setelah diskon
- catatan
```

**Tabel: pembayaran (payments)**
```
- id
- kode_pembayaran        // Auto-generate: PAY-20260129-001
- siswa_id (FK)
- tanggal_pembayaran
- total_dibayar          // Total uang yang diterima
- metode_pembayaran      // TUNAI, TRANSFER
- bank_id (FK, nullable) // Jika transfer
- bukti_transfer         // File upload jika transfer
- catatan
- kasir_id (FK)          // User yang menerima pembayaran
- created_at
```

**Tabel: pembayaran_alokasi (payment_allocations)** ⭐ Kunci untuk Partial Payment
```
- id
- pembayaran_id (FK)
- tagihan_id (FK)
- nominal_alokasi        // Berapa dari pembayaran ini dialokasikan ke tagihan ini
- created_at
```

#### Contoh Skenario

**Skenario 1: Bayar Tagihan Januari Sebagian**

Siswa A memiliki tagihan Januari 2026 = Rp 500.000

| Tanggal | Pembayaran | Alokasi | Sisa Tagihan | Status |
|---------|------------|---------|--------------|--------|
| 5 Jan | Rp 200.000 | 200.000 → Jan | Rp 300.000 | PARTIAL |
| 20 Jan | Rp 200.000 | 200.000 → Jan | Rp 100.000 | PARTIAL |
| 5 Feb | Rp 100.000 | 100.000 → Jan | Rp 0 | PAID |

**Skenario 2: Bayar Lebih dari Satu Tagihan Sekaligus**

Siswa B memiliki tunggakan:
- Januari: Rp 300.000 (sisa dari partial)
- Februari: Rp 500.000 (belum bayar)

Orang tua bayar Rp 600.000:

| Pembayaran | Alokasi |
|------------|---------|
| Rp 600.000 | Rp 300.000 → Jan (LUNAS) |
|            | Rp 300.000 → Feb (PARTIAL, sisa 200.000) |

**Skenario 3: Bayar Melebihi Tagihan (Overpayment)**

> ✅ **KEPUTUSAN:** Kelebihan pembayaran **langsung masuk ke Tabungan Umum** siswa.

Jika siswa bayar melebihi total tagihan yang ada, sistem akan:
1. Alokasikan pembayaran ke semua tagihan yang dipilih
2. Sisa pembayaran otomatis disetorkan ke **Tabungan Umum** siswa
3. Buat record `transaksi_tabungan` dengan keterangan "Kelebihan pembayaran"

#### Algoritma Input Pembayaran

```pseudocode
function inputPembayaran(siswaId, nominalBayar, metode, tagihanIds[]):
    // 1. Buat record pembayaran
    pembayaran = createPembayaran(siswaId, nominalBayar, metode)
    
    // 2. Ambil tagihan yang dipilih, urutkan berdasarkan tanggal (FIFO)
    tagihanList = getTagihanByIds(tagihanIds).orderBy('periode ASC')
    
    // 3. Alokasikan pembayaran ke tagihan
    sisaBayar = nominalBayar
    
    for each tagihan in tagihanList:
        if sisaBayar <= 0:
            break
        
        sisaTagihan = tagihan.sisa_tagihan
        
        if sisaBayar >= sisaTagihan:
            // Lunas untuk tagihan ini
            alokasi = sisaTagihan
            tagihan.status = 'PAID'
        else:
            // Partial payment
            alokasi = sisaBayar
            tagihan.status = 'PARTIAL'
        
        // Simpan alokasi
        createAlokasi(pembayaran.id, tagihan.id, alokasi)
        
        // Update sisa tagihan
        tagihan.total_bayar += alokasi
        tagihan.sisa_tagihan -= alokasi
        tagihan.save()
        
        sisaBayar -= alokasi
    
    // 4. Handle sisa pembayaran (jika ada overpayment)
    if sisaBayar > 0:
        // ✅ KEPUTUSAN: Masuk ke Tabungan Umum siswa
        tabungan = getOrCreateTabungan(siswaId, 'UMUM')
        createTransaksiTabungan(tabungan.id, 'SETOR', sisaBayar, 
            keterangan: 'Kelebihan pembayaran')
    
    // 5. Generate kuitansi
    return generateKuitansi(pembayaran)
```

#### Laporan Terkait Pembayaran Parsial

1. **Riwayat Pembayaran per Siswa**
   - Semua pembayaran dengan detail alokasi ke tagihan mana saja

2. **Tagihan dengan Status Partial**
   - Daftar tagihan yang belum lunas dengan progres pembayaran

3. **Aging Report (Umur Piutang)**
   - Berapa lama sisa tagihan belum dibayar

---

## 5. Modul Diskon/Dispensasi

### 5.1 Konsep Diskon

Sistem diskon di Alizzah bersifat **fleksibel** dengan karakteristik:
- ✅ Satu siswa bisa memiliki **banyak diskon** sekaligus
- ✅ Diskon bisa berupa **persentase** atau **nominal tetap**
- ✅ Diskon berlaku untuk **jenis pembayaran tertentu**
- ✅ Diskon **otomatis dihitung** saat tagihan dibuat
- ✅ Jika ada perubahan diskon, bisa langsung disesuaikan

### 5.2 Master Diskon/Dispensasi

**Atribut:**
- ID
- Kode Diskon
- Nama Diskon
- Jenis Pembayaran ID (FK) - diskon berlaku untuk jenis pembayaran apa
- Tipe Potongan (Persentase/Nominal)
- Nilai Potongan
- Keterangan/Catatan
- Status (Aktif/Non-aktif)

**Contoh Data:**

| Kode | Nama | Jenis Pembayaran | Tipe | Nilai | Keterangan |
|------|------|------------------|------|-------|------------|
| BSW-YTM | Beasiswa Yatim | SPP | Persentase | 100% | Full gratis SPP |
| BSW-PTK | Beasiswa Prestasi TK | SPP | Persentase | 50% | Diskon 50% SPP |
| POT-SDK | Potongan Saudara Kandung | SPP | Nominal | Rp 25.000 | Potongan SPP anak ke-2 dst |
| POT-GRU | Potongan Anak Guru | Uang Pangkal | Persentase | 25% | Diskon uang pangkal |
| DSP-CLS | Dispensasi Calisan | Ekskul Calisan | Persentase | 100% | Bebas biaya calisan |

### 5.3 Penerapan Diskon ke Siswa

**Tabel: siswa_diskon**
- ID
- Siswa ID (FK)
- Diskon ID (FK)
- Tanggal Mulai Berlaku
- Tanggal Berakhir (nullable = berlaku selamanya)
- Catatan
- Created By
- Created At

### 5.4 Perhitungan Diskon saat Generate Tagihan

```
Untuk setiap item tagihan:
  1. Ambil nominal default jenis pembayaran
  2. Cek apakah siswa punya diskon untuk jenis pembayaran ini
  3. Jika ada diskon:
     - Jika tipe = Persentase: potongan = nominal × (persentase/100)
     - Jika tipe = Nominal: potongan = nilai nominal diskon
  4. Jika ada multiple diskon untuk satu jenis pembayaran:
     - ✅ **STACK (Dihitung berurutan)** - Policy yang digunakan
     - Contoh: SPP Rp 150.000 dengan diskon 50% + Rp 25.000
       → Setelah diskon 50%: Rp 75.000
       → Setelah potong Rp 25.000: Rp 50.000 (final)
  5. Nominal akhir = nominal default - total potongan
  6. Jika hasil < 0, set ke 0 (gratis)
  7. Simpan detail potongan di tabel tagihan_item
```

---

## 6. Modul Tabungan

### 6.1 Jenis Tabungan

| Jenis | Nama | Sifat | Bisa Ditarik? | Potongan Admin |
|-------|------|-------|---------------|----------------|
| TAB-WJB | Tabungan Wajib Berlian | Wajib | ❌ Tidak | - |
| TAB-UM | Tabungan Umum | Sukarela | ✅ Ya | 2.5% |

### 6.2 Tabungan Wajib Berlian

**Karakteristik:**
- Khusus siswa TK-B (Berlian)
- Rp 10.000 per hari Senin
- **Tidak bisa ditarik** oleh siswa/orang tua
- Langsung dialokasikan untuk biaya kelulusan
- Perlu tracking saldo (tapi tidak ditampilkan ke orang tua, hanya internal)
- Update saldo berkala oleh admin

**Fitur:**
- [x] Pencatatan setoran otomatis (melalui tagihan mingguan)
- [x] Saldo per siswa (internal)
- [x] Laporan tabungan kelulusan (internal)

### 6.3 Tabungan Umum

**Karakteristik:**
- Semua jenjang
- Jumlah dan waktu setor fleksibel
- Bisa ditarik kapan saja
- Potongan administrasi 2.5% saat penarikan

**Fitur:**
- [x] Setoran tabungan (input nominal bebas)
- [x] Penarikan tabungan (dengan potongan 2.5%)
- [x] Saldo per siswa
- [x] Riwayat transaksi (setor/tarik)
- [x] Laporan tabungan siswa

### 6.4 Struktur Data Tabungan

**Tabel: tabungan**
- ID
- Siswa ID (FK)
- Jenis Tabungan (TAB-WJB/TAB-UM)
- Saldo

**Tabel: transaksi_tabungan**
- ID
- Tabungan ID (FK)
- Tipe (SETOR/TARIK)
- Nominal
- Potongan Admin (untuk penarikan)
- Nominal Bersih
- Tanggal
- Keterangan
- Created By

---

## 7. Modul Kas & Berangkas

### 7.1 Pengertian

| Istilah | Deskripsi |
|---------|-----------|
| **Kas** | Uang yang beredar untuk operasional harian (bisa di tangan kasir) |
| **Berangkas** | Tempat penyimpanan uang fisik (brankas/safe) |

### 7.2 Jenis Transaksi Kas

| Kode | Jenis | Deskripsi |
|------|-------|-----------|
| KAS-IN | Kas Masuk | Pemasukan ke kas (dari pembayaran tunai, dll) |
| KAS-OUT | Kas Keluar | Pengeluaran dari kas (operasional, setor ke bank, dll) |
| KAS-TRF | Transfer | Pindah dari kas ke berangkas atau sebaliknya |

### 7.3 Fitur Kas & Alokasi Dana

1. **Pencatatan Kas Masuk (Income)**
   - Otomatis dari Pembayaran Siswa -> Masuk ke **Sumber Dana** sesuai Jenis Pembayaran (misal: masuk ke Pos SPP, Pos Gedung).
   - Input Manual -> Wajib pilih **Sumber Dana** (Pos Pemasukan).

2. **Pencatatan Kas Keluar (Expense)**
   - Wajib pilih **Pos Pengeluaran** (untuk apa uang dikeluarkan, misal: Beli ATK).
   - Wajib pilih **Sumber Dana** (uang diambil dari pos mana, misal: Ambil dari Dana SPP).
   - **Validasi:** Saldo Sumber Dana harus mencukupi.

3. **Laporan Realisasi Anggaran**
   - Menampilkan Pemasukan vs Pengeluaran per Sumber Dana.
   - Contoh: Dana SPP (Masuk 10jt, Keluar 8jt, Sisa 2jt).

3. **Transfer Kas ↔ Berangkas**
   - Pindah dari kas ke berangkas
   - Tarik dari berangkas ke kas

4. **Saldo Kas**
   - Saldo kas terkini
   - Riwayat transaksi
   - Tutup kas harian

### 7.4 Fitur Berangkas

1. **Saldo Berangkas**
   - Total uang di berangkas
   - Breakdown per denominasi (opsional)

2. **Transaksi Berangkas**
   - Masuk dari kas
   - Keluar ke kas
   - Setor ke bank

3. **Audit Trail**
   - Siapa yang akses
   - Kapan dan transaksi apa

### 7.5 Struktur Data

**Tabel: kas**
- ID
- Tipe (KAS/BERANGKAS)
- Nama
- Saldo

**Tabel: transaksi_kas**
- ID
- Kas ID (FK)
- Tipe Transaksi (MASUK/KELUAR/TRANSFER)
- Referensi ID (FK ke pembayaran jika dari pembayaran)
- Kategori
- Nominal
- Keterangan
- Bukti (upload file)
- Tanggal
- Created By

---

## 8. Modul Laporan

### 8.1 Daftar Laporan yang Dibutuhkan

| No | Nama Laporan | Deskripsi | Frekuensi |
|----|--------------|-----------|-----------|
| 1 | Laporan Tunggakan per Siswa | Daftar siswa dengan tagihan belum lunas | On-demand |
| 2 | Laporan Pembayaran Harian | Rekap pembayaran per hari | Harian |
| 3 | Laporan Pembayaran Bulanan | Rekap pembayaran per bulan | Bulanan |
| 4 | Laporan Tahunan untuk Yayasan | Laporan keuangan lengkap | Tahunan |
| 5 | Laporan per Kelas/Rombel | Rekap pembayaran per kelas | On-demand |
| 6 | Laporan Tabungan Siswa | Saldo dan riwayat tabungan | On-demand |
| 7 | Laporan Kas | Mutasi kas masuk/keluar | Harian/Bulanan |
| 8 | Laporan Berangkas | Mutasi berangkas | On-demand |

### 8.2 Detail Laporan

#### 8.2.1 Laporan Tunggakan per Siswa

**Filter:**
- Tahun Ajaran
- Jenjang (opsional)
- Rombel (opsional)
- Periode (bulan/rentang tanggal)

**Kolom:**
- NIS
- Nama Siswa
- Kelas
- Jenis Tagihan
- Periode Tagihan
- Nominal Tagihan
- Sudah Dibayar
- Sisa Tunggakan
- Status
- Tanggal Jatuh Tempo

**Ringkasan:**
- Total siswa menunggak
- Total nominal tunggakan

#### 8.2.2 Laporan Pembayaran Harian

**Filter:**
- Tanggal

**Kolom:**
- No
- Jam
- No. Kuitansi
- NIS
- Nama Siswa
- Kelas
- Jenis Pembayaran
- Nominal
- Metode
- Petugas

**Ringkasan:**
- Total pembayaran tunai
- Total pembayaran transfer (per bank)
- Grand total

#### 8.2.3 Laporan Pembayaran Bulanan/Tahunan

**Filter:**
- Bulan/Tahun
- Jenjang (opsional)

**Kolom & Agregasi:**
- Per jenis pembayaran
- Per metode pembayaran
- Per jenjang
- Trend harian (grafik opsional)

#### 8.2.4 Laporan per Kelas/Rombel

**Filter:**
- Rombel
- Bulan/Periode

**Kolom:**
- NIS
- Nama Siswa
- SPP (Lunas/Tunggak)
- Infaq Harian
- Ekskul
- PASTA
- Total Tagihan
- Total Dibayar
- Sisa

#### 8.2.5 Laporan Tabungan Siswa

**Filter:**
- Jenis Tabungan
- Jenjang (opsional)
- Rombel (opsional)

**Kolom:**
- NIS
- Nama Siswa
- Kelas
- Saldo Awal
- Total Setor
- Total Tarik
- Saldo Akhir

#### 8.2.6 Laporan Kas

**Filter:**
- Rentang Tanggal

**Kolom:**
- Tanggal
- Keterangan
- Kategori
- Debit (Masuk)
- Kredit (Keluar)
- Saldo

**Ringkasan:**
- Saldo Awal
- Total Masuk
- Total Keluar
- Saldo Akhir

#### 8.2.7 Laporan Berangkas

Sama seperti laporan kas, khusus untuk berangkas.

### 8.3 Fitur Export / Import / Print

Sistem harus mendukung export, import, dan print untuk berbagai data dan laporan.

#### 8.3.1 Matrix Fitur per Data/Menu

| Data/Menu | Export Excel | Export CSV | Export PDF | Import | Print |
|-----------|:------------:|:----------:|:----------:|:------:|:-----:|
| **MASTER DATA** |
| Master Siswa | ✅ | ✅ | ❌ | ✅ (bulk) | ✅ Daftar |
| Master Jenjang | ✅ | ❌ | ❌ | ❌ | ❌ |
| Master Rombel | ✅ | ❌ | ❌ | ❌ | ❌ |
| Master Jenis Pembayaran | ✅ | ❌ | ❌ | ⚠️ Opsional | ❌ |
| Master Diskon | ✅ | ❌ | ❌ | ❌ | ❌ |
| Master PASTA | ✅ | ❌ | ❌ | ❌ | ❌ |
| Master Bank | ✅ | ❌ | ❌ | ❌ | ❌ |
| **TRANSAKSI** |
| Tagihan | ✅ | ✅ | ✅ Invoice | ⚠️ Opsional | ✅ Invoice/Surat Tagihan |
| Pembayaran | ✅ | ❌ | ❌ | ❌ | ✅ Kuitansi |
| Tabungan Siswa | ✅ | ❌ | ❌ | ❌ | ✅ Buku/Bukti |
| Transaksi Kas | ✅ | ❌ | ❌ | ❌ | ✅ Bukti |
| **LAPORAN** |
| Lap. Tunggakan | ✅ | ✅ | ✅ | ❌ | ✅ |
| Lap. Pembayaran Harian | ✅ | ❌ | ✅ | ❌ | ✅ |
| Lap. Pembayaran Bulanan | ✅ | ❌ | ✅ | ❌ | ✅ |
| Lap. Pembayaran Tahunan | ✅ | ❌ | ✅ | ❌ | ✅ |
| Lap. per Kelas | ✅ | ❌ | ✅ | ❌ | ✅ |
| Lap. Tabungan | ✅ | ❌ | ✅ | ❌ | ✅ |
| Lap. Kas | ✅ | ❌ | ✅ | ❌ | ✅ |
| Lap. Berangkas | ✅ | ❌ | ✅ | ❌ | ✅ |
| **DOKUMEN KHUSUS** |
| Kartu SPP Siswa | ❌ | ❌ | ✅ | ❌ | ✅ |
| Rekap Pembayaran Siswa | ❌ | ❌ | ✅ | ❌ | ✅ |

**Keterangan:**
- ✅ = Tersedia
- ❌ = Tidak tersedia
- ⚠️ = Opsional (nice to have)

#### 8.3.2 Detail Import

**Import Master Siswa (Bulk)**

Format file: Excel (.xlsx) atau CSV

Template kolom:
| Kolom | Wajib | Keterangan |
|-------|:-----:|------------|
| NIS | ⚠️ | Kosongkan untuk auto-generate |
| Nama Lengkap | ✅ | |
| Jenis Kelamin | ✅ | L/P atau Laki-laki/Perempuan |
| Tempat Lahir | ❌ | |
| Tanggal Lahir | ❌ | Format: YYYY-MM-DD atau DD/MM/YYYY |
| Alamat | ❌ | |
| Nama Orang Tua | ✅ | |
| No. HP Ortu | ✅ | |
| Email Ortu | ❌ | |
| Kode Jenjang | ✅ | KB / TK-A / TK-B |
| Nama Rombel | ✅ | e.g., "Mutiara 1" |
| Tanggal Masuk | ✅ | Format: YYYY-MM-DD |
| Ikut Daycare | ❌ | Ya/Tidak atau 1/0 |

**Proses Import:**
1. Upload file Excel/CSV
2. Validasi format dan data
3. Preview data yang akan diimport
4. Tampilkan error jika ada (baris mana, kolom mana)
5. Konfirmasi import
6. Proses insert ke database
7. Tampilkan hasil (berapa sukses, berapa gagal)

#### 8.3.3 Detail Export

**Format Excel (.xlsx)**
- Menggunakan library: exceljs
- Header dengan styling (bold, background color)
- Auto-width kolom
- Format angka dengan separator ribuan
- Format tanggal sesuai locale Indonesia

**Format CSV**
- Delimiter: koma (,) atau titik koma (;)
- Encoding: UTF-8
- Header row: Ya

**Format PDF**
- Menggunakan library: @react-pdf/renderer
- Kop surat sekolah (logo, nama, alamat)
- Tanggal cetak
- Footer dengan nomor halaman

#### 8.3.4 Detail Print

**Kuitansi Pembayaran**
```
┌─────────────────────────────────────────────────────────┐
│                 PAUD UNGGULAN ALIZZAH                   │
│                   Yayasan Walipapat                     │
│              Jl. ... Kabupaten Mojokerto                │
├─────────────────────────────────────────────────────────┤
│                    KUITANSI PEMBAYARAN                  │
│                                                         │
│  No. Kuitansi : PAY-20260129-0001                      │
│  Tanggal      : 29 Januari 2026                        │
│                                                         │
│  Diterima dari : Ahmad Fauzi (Orang Tua)               │
│  Untuk Siswa   : Aisyah Zahra (NIS: 260001)            │
│  Kelas         : Mutiara 1 (KB)                        │
│                                                         │
│  Untuk Pembayaran:                                      │
│  ┌────────────────────────────────────────────────────┐ │
│  │ No │ Item                  │ Nominal               │ │
│  ├────┼───────────────────────┼───────────────────────┤ │
│  │ 1  │ SPP Januari 2026      │ Rp    150.000        │ │
│  │ 2  │ Infaq Harian Jan      │ Rp    130.000        │ │
│  │ 3  │ Ekskul Calisan Jan    │ Rp     25.000        │ │
│  ├────┴───────────────────────┼───────────────────────┤ │
│  │ TOTAL                      │ Rp    305.000        │ │
│  └────────────────────────────┴───────────────────────┘ │
│                                                         │
│  Terbilang: Tiga Ratus Lima Ribu Rupiah                │
│                                                         │
│  Metode Pembayaran: Tunai                              │
│                                                         │
│                              Mojokerto, 29 Januari 2026 │
│                                                         │
│                              Petugas,                   │
│                                                         │
│                              (________________)         │
│                              Admin Keuangan             │
└─────────────────────────────────────────────────────────┘
```

**Invoice/Surat Tagihan**
```
┌─────────────────────────────────────────────────────────┐
│                 PAUD UNGGULAN ALIZZAH                   │
│                   Yayasan Walipapat                     │
├─────────────────────────────────────────────────────────┤
│                    SURAT TAGIHAN                        │
│                                                         │
│  No. Tagihan  : INV-202601-0001                        │
│  Periode      : Januari 2026                           │
│  Jatuh Tempo  : 01 Januari 2026                        │
│                                                         │
│  Kepada Yth,                                            │
│  Bapak/Ibu Orang Tua/Wali dari:                        │
│  Nama  : Aisyah Zahra                                  │
│  NIS   : 260001                                        │
│  Kelas : Mutiara 1 (KB)                                │
│                                                         │
│  Rincian Tagihan:                                       │
│  ┌────┬───────────────────────┬───────────────────────┐ │
│  │ No │ Item                  │ Nominal               │ │
│  ├────┼───────────────────────┼───────────────────────┤ │
│  │ 1  │ SPP                   │ Rp    150.000        │ │
│  │ 2  │ Infaq Harian          │ Rp    130.000        │ │
│  │ 3  │ Ekskul Calisan        │ Rp     25.000        │ │
│  ├────┴───────────────────────┼───────────────────────┤ │
│  │ TOTAL TAGIHAN              │ Rp    305.000        │ │
│  └────────────────────────────┴───────────────────────┘ │
│                                                         │
│  Mohon melakukan pembayaran sebelum jatuh tempo.       │
│                                                         │
│  Transfer ke:                                           │
│  Bank BCA - 1234567890 a.n. Yayasan Walipapat          │
│  Bank BRI - 0987654321 a.n. Yayasan Walipapat          │
│                                                         │
│                              Admin Keuangan             │
└─────────────────────────────────────────────────────────┘
```

**Kartu SPP Siswa**
```
┌─────────────────────────────────────────────────────────┐
│                    KARTU PEMBAYARAN SPP                 │
│                 PAUD UNGGULAN ALIZZAH                   │
│                  Tahun Ajaran 2025/2026                 │
├─────────────────────────────────────────────────────────┤
│  Nama  : Aisyah Zahra                                  │
│  NIS   : 260001                                        │
│  Kelas : Mutiara 1 (KB)                                │
├─────────────────────────────────────────────────────────┤
│  Bulan     │ Tagihan  │ Dibayar  │ Tgl Bayar │ Paraf   │
│────────────┼──────────┼──────────┼───────────┼─────────│
│  Juli      │ 305.000  │ 305.000  │ 05/07/25  │   ✓     │
│  Agustus   │ 305.000  │ 305.000  │ 03/08/25  │   ✓     │
│  September │ 305.000  │ 305.000  │ 02/09/25  │   ✓     │
│  Oktober   │ 305.000  │ 305.000  │ 05/10/25  │   ✓     │
│  November  │ 305.000  │ 200.000  │ 10/11/25  │   ~     │
│  Desember  │ 305.000  │    -     │     -     │         │
│  Januari   │ 305.000  │    -     │     -     │         │
│  Februari  │ 305.000  │    -     │     -     │         │
│  Maret     │ 305.000  │    -     │     -     │         │
│  April     │ 305.000  │    -     │     -     │         │
│  Mei       │ 305.000  │    -     │     -     │         │
│  Juni      │ 305.000  │    -     │     -     │         │
├─────────────────────────────────────────────────────────┤
│  Keterangan: ✓ = Lunas, ~ = Sebagian                   │
└─────────────────────────────────────────────────────────┘
```

---

## 9. Manajemen Pengguna

### 9.1 Role dan Hak Akses

| Role | Deskripsi | Level Akses |
|------|-----------|-------------|
| **Admin Keuangan** | Operator harian sistem keuangan | Penuh (CRUD semua) |
| **Kepala Sekolah** | Monitoring dan approval | View semua + Approval |
| **Bendahara Yayasan** | Monitoring keuangan yayasan | View laporan + Yayasan-level |

### 9.2 Matriks Hak Akses

| Fitur | Admin Keuangan | Kepala Sekolah | Bendahara Yayasan |
|-------|---------------|----------------|-------------------|
| **Master Data** |
| Tahun Ajaran | CRUD | View | View |
| Jenjang & Rombel | CRUD | View | View |
| Siswa | CRUD | View | View |
| Jenis Pembayaran | CRUD | View | View |
| Diskon/Dispensasi | CRUD | View | View |
| PASTA | CRUD | View | View |
| **Tagihan & Pembayaran** |
| Generate Tagihan | ✅ | ❌ | ❌ |
| Input Pembayaran | ✅ | ❌ | ❌ |
| Void Pembayaran | ✅ | Approval | ❌ |
| Cetak Kuitansi | ✅ | ✅ | ❌ |
| **Tabungan** |
| Setor/Tarik Tabungan | ✅ | ❌ | ❌ |
| View Saldo | ✅ | ✅ | ✅ |
| **Kas & Berangkas** |
| Transaksi Kas | ✅ | ❌ | ❌ |
| Transaksi Berangkas | ✅ | ❌ | ❌ |
| View Saldo | ✅ | ✅ | ✅ |
| **Laporan** |
| Semua Laporan | ✅ | ✅ | ✅ |
| Export | ✅ | ✅ | ✅ |
| **Pengaturan** |
| User Management | ✅ | ❌ | ❌ |
| Backup Database | ✅ | ❌ | ❌ |

### 9.3 Struktur Data User

**Tabel: users**
- ID
- Username
- Email
- Password (hashed)
- Nama Lengkap
- Role
- Status (Aktif/Non-aktif)
- Last Login
- Created At
- Updated At

---

## 10. Integrasi & Fitur Masa Depan

### 10.1 Fase Berikutnya (Roadmap)

| Fase | Fitur | Prioritas | Estimasi |
|------|-------|-----------|----------|
| 2 | Portal Orang Tua (view tagihan) | 🟡 Medium | Q2 2026 |
| 2 | Notifikasi WhatsApp | 🟡 Medium | Q2 2026 |
| 2 | Pembayaran Online (VA/QRIS) | 🟡 Medium | Q3 2026 |
| 3 | PPDB Online | 🟢 Low | Q4 2026 |
| 3 | Siakad (Absensi, Rapor) | 🟢 Low | 2027 |
| 4 | Kepegawaian & Penggajian | 🟢 Low | 2027 |
| 4 | Koperasi Sekolah | 🟢 Low | 2027 |
| 5 | Inventarisasi | 🟢 Low | 2027 |
| 5 | Website & Landing Page | 🟢 Low | 2027 |

### 10.2 Integrasi yang Direncanakan

| Integrasi | Kegunaan |
|-----------|----------|
| WhatsApp Business API | Notifikasi tagihan dan pembayaran |
| Midtrans/Xendit | Payment gateway untuk VA dan QRIS |
| Moota | Monitoring mutasi rekening bank |
| Google Drive | Backup otomatis |

---

## 11. Wireframe & Alur Kerja

### 11.1 Sitemap Aplikasi

```
📁 Dashboard
├── 📊 Ringkasan Keuangan
├── 📈 Grafik Pembayaran
├── 🔔 Notifikasi/Alert
└── 🚀 Quick Actions

📁 Master Data
├── 📅 Tahun Ajaran
├── 🏫 Jenjang
├── 📚 Rombel/Kelas
├── 👤 Siswa
├── 💰 Jenis Pembayaran
├── 🎁 Diskon/Dispensasi
├── 🎸 PASTA (Ekstrakurikuler)
└── 🏦 Bank

📁 Tagihan
├── ➕ Generate Tagihan
├── 📋 Daftar Tagihan
├── 🔍 Cari Tagihan
└── ❌ Batal Tagihan

📁 Pembayaran
├── 💵 Input Pembayaran
├── 📜 Riwayat Pembayaran
├── 🧾 Cetak Kuitansi
└── ↩️ Void Pembayaran

📁 Tabungan
├── 💳 Tabungan Wajib Berlian
├── 🐷 Tabungan Umum
├── 📥 Setor Tabungan
├── 📤 Tarik Tabungan
└── 📊 Laporan Tabungan

📁 Kas & Berangkas
├── 💰 Kas
│   ├── Kas Masuk
│   ├── Kas Keluar
│   └── Saldo & Mutasi
├── 🔐 Berangkas
│   ├── Masuk/Keluar
│   └── Saldo & Mutasi
└── 🔄 Transfer

📁 Laporan
├── 📕 Tunggakan
├── 📗 Pembayaran Harian
├── 📘 Pembayaran Bulanan
├── 📙 Laporan Tahunan
├── 📓 Laporan per Kelas
├── 📒 Laporan Tabungan
├── 📔 Laporan Kas
└── 📕 Laporan Berangkas

📁 Pengaturan
├── 👥 User Management
├── ⚙️ Konfigurasi Sistem
├── 💾 Backup & Restore
└── 📝 Audit Log
```

### 11.2 Alur Kerja Utama

#### A. Alur Pembayaran SPP Bulanan

```
┌─────────────┐     ┌───────────────┐     ┌────────────────┐
│ Awal Bulan  │────▶│ Admin Generate│────▶│ Review Tagihan │
│             │     │ Tagihan Massal│     │ per Siswa      │
└─────────────┘     └───────────────┘     └────────────────┘
                                                   │
                           ┌───────────────────────┘
                           ▼
┌─────────────┐     ┌───────────────┐     ┌────────────────┐
│ [Opsional]  │◀────│ Tagihan       │────▶│ Ortu Datang    │
│ Kirim WA    │     │ Tersimpan     │     │ Bayar ke Admin │
└─────────────┘     └───────────────┘     └────────────────┘
                                                   │
                           ┌───────────────────────┘
                           ▼
┌─────────────┐     ┌───────────────┐     ┌────────────────┐
│ Selesai     │◀────│ Cetak         │◀────│ Admin Input    │
│             │     │ Kuitansi      │     │ Pembayaran     │
└─────────────┘     └───────────────┘     └────────────────┘
```

#### B. Alur Pendaftaran Siswa Baru

```
┌─────────────┐     ┌───────────────┐     ┌────────────────┐
│ Siswa Baru  │────▶│ Admin Input   │────▶│ Pilih Jenjang  │
│ Daftar      │     │ Data Siswa    │     │ & Rombel       │
└─────────────┘     └───────────────┘     └────────────────┘
                                                   │
                           ┌───────────────────────┘
                           ▼
┌─────────────┐     ┌───────────────┐     ┌────────────────┐
│ Generate    │◀────│ Terapkan      │◀────│ [Jika Ada]     │
│ Tagihan     │     │ Jenis Biaya   │     │ Set Diskon     │
│ Awal        │     │ Sesuai Jenjang│     │                │
└─────────────┘     └───────────────┘     └────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│ Tagihan Otomatis:                                        │
│ - Biaya Registrasi (sesuai jenjang & gender)            │
│ - Biaya Awal Pendidikan (perlengkapan)                  │
│ - SPP Bulan Pertama                                      │
│ - Ekskul Calisan (jika KB/TK)                           │
│ - Daycare (jika ikut)                                    │
└─────────────────────────────────────────────────────────┘
```

---

## Lampiran

### A. Glosarium

| Istilah | Arti |
|---------|------|
| SPP | Sumbangan Pembinaan Pendidikan (iuran bulanan) |
| KB | Kelompok Bermain (usia 3-4 tahun) |
| TK-A | Taman Kanak-kanak A (usia 4-5 tahun) |
| TK-B | Taman Kanak-kanak B (usia 5-6 tahun) |
| Rombel | Rombongan Belajar (kelas) |
| PASTA | Program Asah Talenta (ekstrakurikuler) |
| Calisan | Calistung (Baca, Tulis, Hitung) |
| Daycare | Penitipan anak |
| SPD | Sumbangan Pengembangan Daycare |
| Infaq | Sumbangan/iuran |
| Sarpras | Sarana dan Prasarana |
| APE | Alat Permainan Edukatif |
| DDTK | Deteksi Dini Tumbuh Kembang |
| MPLS | Masa Pengenalan Lingkungan Sekolah |
| LPP | Lembar Penilaian Perkembangan |

### B. Catatan Perubahan Dokumen

| Versi | Tanggal | Perubahan | Oleh |
|-------|---------|-----------|------|
| 1.0 | 29 Jan 2026 | Dokumen awal | - |
| 1.1 | 29 Jan 2026 | - Tambah section pembayaran parsial (best practice)<br>- Policy multiple diskon: STACK<br>- Tidak ada denda keterlambatan<br>- Tanggal jatuh tempo SPP: tanggal 1 jam 00:00<br>- Generate tagihan per bulan | - |
| 1.2 | 29 Jan 2026 | - Handling overpayment: masuk Tabungan Umum<br>- Tambah fitur Export/Import/Print | - |
| 1.3 | 29 Jan 2026 | - Tarif per Jenjang + Gender (untuk Registrasi)<br>- Update skenario overpayment dengan keputusan final | - |
| 1.4 | 13 Apr 2026 | - Tambah Modul Daycare lengkap (SPD Rutin, Harian, Konsumsi)<br>- Biaya awal daycare (Pendaftaran + Akomodasi)<br>- Support anak luar Alizzah<br>- Jam operasional 10:00-15:00 Senin-Sabtu<br>- SPD terpisah dari SPP reguler<br>- Absensi daycare sebagai platform terpisah | - |
| 1.5 | 13 Apr 2026 | - Tabel `peserta_daycare` terpisah (FK opsional ke siswa)<br>- Anak luar: tarif berdasarkan usia + pilihan ortu<br>- Absensi daycare = scope terpisah (bukan Fase 1)<br>- Jumlah hari konsumsi input manual admin (integrasi absensi nanti)<br>- Hapus field `ikut_daycare` dari siswa, pindah ke peserta_daycare | - |

### C. Item yang Perlu Diupdate Kemudian

- [x] ~~Detail mode pembayaran Daycare (bulanan vs harian)~~ → **SPD Rutin (bulanan) + SPD Harian Lepas (per hari)**
- [x] ~~Relasi SPD dengan SPP reguler (apakah saling menggantikan atau terpisah)~~ → **Terpisah, SPP tetap dibayar**
- [x] ~~Mekanisme pendaftaran anak luar Alizzah~~ → **Tabel `peserta_daycare` terpisah dengan FK opsional ke siswa**
- [x] ~~Penentuan tarif SPD anak luar~~ → **Berdasarkan usia + pilihan orang tua (jenjang setara)**
- [x] ~~Scope absensi daycare~~ → **Fase terpisah, saat ini jumlah hari input manual admin keuangan**
- [x] ~~Policy multiple diskon (stack atau highest)~~ → **STACK**
- [ ] Template notifikasi WhatsApp
- [x] ~~Handling overpayment~~ → **Masuk Tabungan Umum**
- [x] ~~Tarif per Jenjang + Gender~~ → **Tabel jenis_pembayaran_tarif**

---

*Dokumen ini adalah spesifikasi kebutuhan yang akan dijadikan dasar pengembangan sistem. Mohon direview dan divalidasi sebelum development dimulai.*


