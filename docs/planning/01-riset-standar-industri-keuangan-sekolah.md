# Riset Standar Industri: Sistem Keuangan Sekolah di Indonesia
## PAUD - TK (Pendidikan Anak Usia Dini)

> **Catatan Terminologi:** Istilah yang lebih umum untuk sistem seperti ini adalah **Sistem Informasi Manajemen Sekolah (SIMS)** atau **School Management System (SMS)**. Istilah "ERP Sekolah" juga digunakan untuk menggambarkan sistem terintegrasi yang mencakup berbagai aspek operasional sekolah, termasuk keuangan.

---

## 📋 Daftar Isi
1. [Pendahuluan](#pendahuluan)
2. [Modul Keuangan Standar Industri](#modul-keuangan-standar-industri)
3. [Fitur Detail per Modul](#fitur-detail-per-modul)
4. [Kepatuhan Regulasi](#kepatuhan-regulasi)
5. [Referensi Software Industri](#referensi-software-industri)
6. [Template Diskusi Kebutuhan Alizzah](#template-diskusi-kebutuhan-alizzah)

---

## Pendahuluan

Dokumen ini merupakan hasil riset standar industri untuk sistem keuangan sekolah di Indonesia, khususnya untuk jenjang PAUD dan TK. Tujuannya adalah untuk mengidentifikasi fitur-fitur standar yang diterapkan di industri sebelum disesuaikan dengan kebutuhan spesifik Sekolah PAUD Unggulan Alizzah, Kabupaten Mojokerto.

### Konteks Proyek
- **Lembaga:** Sekolah PAUD Unggulan Alizzah
- **Yayasan:** Yayasan Walipapat
- **Jenjang yang dicover saat ini:** Playgroup/KB - TK
- **Fokus utama saat ini:** Modul Keuangan/Pembayaran
- **Rencana jangka panjang:** Mencakup landing page, PPDB, keuangan, siakad, koperasi sekolah, kepegawaian, inventarisasi, dll.

---

## Modul Keuangan Standar Industri

Berdasarkan riset terhadap berbagai vendor dan literatur di Indonesia, berikut adalah modul-modul keuangan standar yang umumnya tersedia:

### 1. 💰 Manajemen Pembayaran Siswa (Student Payment Management)

| Sub-Fitur | Deskripsi | Prioritas Industri |
|-----------|-----------|-------------------|
| Pembayaran SPP | Pencatatan dan pengelolaan SPP bulanan | ⭐⭐⭐ Wajib |
| Uang Pangkal/Pengembangan | Pembayaran satu kali saat pendaftaran | ⭐⭐⭐ Wajib |
| Uang Kegiatan | Biaya untuk kegiatan ekstrakurikuler, study tour, dll | ⭐⭐⭐ Wajib |
| Iuran Tambahan | Biaya seragam, buku, majalah, dll | ⭐⭐ Umum |
| Tabungan Siswa | Sistem tabungan siswa dengan perhitungan saldo otomatis | ⭐⭐ Umum |
| Cicilan/Angsuran | Pembayaran dengan skema cicilan | ⭐⭐ Umum |
| Diskon/Potongan | Beasiswa, potongan saudara kandung, dll | ⭐⭐ Umum |

### 2. 💳 Integrasi Pembayaran Digital (Payment Gateway)

| Metode Pembayaran | Deskripsi | Adopsi Industri |
|-------------------|-----------|-----------------|
| Transfer Bank Manual | Konfirmasi manual via slip transfer | ⭐⭐⭐ Umum |
| Virtual Account (VA) | Nomor rekening virtual per siswa | ⭐⭐⭐ Populer |
| QRIS | Pembayaran via scan QR code | ⭐⭐ Berkembang |
| E-Wallet | GoPay, OVO, DANA, ShopeePay | ⭐⭐ Berkembang |
| Kartu Kredit/Debit | Pembayaran via kartu | ⭐ Jarang |

**Provider Payment Gateway Populer:**
- Midtrans
- Xendit
- DOKU
- Moota (untuk monitoring mutasi rekening)

### 3. 📊 Pencatatan Transaksi & Akuntansi

| Sub-Fitur | Deskripsi |
|-----------|-----------|
| Jurnal Umum | Pencatatan semua transaksi keuangan |
| Buku Besar | Ringkasan per akun |
| Neraca | Laporan posisi keuangan |
| Laporan Laba Rugi | Pemasukan vs pengeluaran |
| Laporan Arus Kas | Cash flow statement |
| Chart of Account (CoA) | Daftar kode akun standar |

### 4. 📋 Manajemen Penerimaan (Income Management)

| Sub-Fitur | Deskripsi |
|-----------|-----------|
| Kategori Pemasukan | Pengelompokan jenis penerimaan |
| Kuitansi Otomatis | Generate kuitansi pembayaran |
| Rekonsiliasi Bank | Pencocokan transaksi dengan mutasi bank |
| Piutang Siswa | Tracking tunggakan pembayaran |

### 5. 💸 Manajemen Pengeluaran (Expense Management)

| Sub-Fitur | Deskripsi |
|-----------|-----------|
| Kategori Pengeluaran | Pengelompokan jenis pengeluaran |
| Approval Workflow | Persetujuan berjenjang untuk pengeluaran |
| Petty Cash | Kas kecil untuk operasional harian |
| Bukti Pengeluaran | Upload bukti/nota pengeluaran |

### 6. 📅 Manajemen Anggaran (Budget Management)

| Sub-Fitur | Deskripsi |
|-----------|-----------|
| RKAS/RAPBS | Rencana Kegiatan dan Anggaran Sekolah |
| Budget per Departemen | Alokasi anggaran per unit |
| Realisasi Anggaran | Monitoring penggunaan anggaran |
| Variance Analysis | Selisih anggaran vs realisasi |

### 7. 📄 Laporan & Pelaporan

| Jenis Laporan | Deskripsi | Frekuensi |
|---------------|-----------|-----------|
| Laporan Harian | Transaksi per hari | Harian |
| Laporan Bulanan | Rekap per bulan | Bulanan |
| Laporan Semester | Rekap per semester | Semesteran |
| Laporan Tahunan | Laporan keuangan lengkap | Tahunan |
| Laporan Tunggakan | Daftar siswa yang belum bayar | On-demand |
| Laporan Pembayaran per Kelas | Rekap per kelas | On-demand |
| Export Excel/PDF | Download laporan | On-demand |

### 8. 🔔 Notifikasi & Komunikasi

| Fitur | Deskripsi |
|-------|-----------|
| WhatsApp Gateway | Notifikasi tagihan dan pembayaran via WA |
| Email Notification | Notifikasi via email |
| SMS Gateway | Notifikasi via SMS |
| Reminder Otomatis | Pengingat jatuh tempo |
| Broadcast | Pengumuman massal |

### 9. 🎓 Khusus Dana BOS (jika applicable)

| Sub-Fitur | Deskripsi |
|-----------|-----------|
| Pengelolaan Dana BOS | Tracking penggunaan dana BOS |
| Kode ARKAS | Mapping dengan kode referensi ARKAS |
| Laporan BOS | Laporan pertanggungjawaban dana BOS |

---

## Fitur Detail per Modul

### A. Modul Tagihan (Billing)

```
┌─────────────────────────────────────────────────────────────┐
│                    ALUR TAGIHAN                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Setup Tahun Ajaran] → [Setup Jenis Biaya] → [Generate     │
│        Tagihan] → [Kirim Notifikasi] → [Terima Pembayaran]  │
│              → [Update Status] → [Cetak Kuitansi]            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Fitur Detail:**

1. **Master Jenis Biaya**
   - Nama biaya (SPP, Uang Pangkal, Kegiatan, dll)
   - Tipe biaya (bulanan, tahunan, insidentil)
   - Nominal default
   - Tanggal jatuh tempo default
   - Denda keterlambatan (jika ada)

2. **Template Tagihan**
   - Template per jenjang (KB, TK-A, TK-B)
   - Template khusus (siswa baru, siswa pindahan)
   - Kustomisasi per siswa (diskon, tambahan)

3. **Generate Tagihan Massal**
   - Per tahun ajaran
   - Per semester
   - Per bulan
   - Custom periode

4. **Status Tagihan**
   - Belum Jatuh Tempo
   - Jatuh Tempo
   - Terlambat
   - Sebagian Dibayar
   - Lunas

### B. Modul Pembayaran (Payment)

**Fitur Detail:**

1. **Input Pembayaran Manual**
   - Pilih siswa
   - Pilih tagihan
   - Input jumlah bayar
   - Metode pembayaran
   - Catatan
   - Upload bukti

2. **Pembayaran Online**
   - Portal orang tua
   - Pilih tagihan
   - Pilih metode pembayaran
   - Redirect ke payment gateway
   - Callback otomatis
   - Update status otomatis

3. **Pembayaran Parsial**
   - Cicilan
   - Tracking sisa pembayaran
   - Riwayat cicilan

4. **Pembatalan/Refund**
   - Void pembayaran
   - Proses refund
   - Audit trail

### C. Modul Kas & Bank

**Fitur Detail:**

1. **Master Kas dan Bank**
   - Nama akun
   - Tipe (kas/bank)
   - Saldo awal
   - Nomor rekening

2. **Transaksi Kas/Bank**
   - Pemasukan
   - Pengeluaran
   - Transfer antar akun
   - Kategori transaksi

3. **Rekonsiliasi**
   - Import mutasi bank
   - Pencocokan otomatis/manual
   - Selisih kas

---

## Kepatuhan Regulasi

### Standar Akuntansi yang Berlaku

Untuk sekolah sebagai organisasi nirlaba, standar akuntansi yang berlaku adalah:

1. **ISAK 35** - Penyajian Laporan Keuangan Entitas Berorientasi Nonlaba
   - Menggantikan PSAK 45
   - Berlaku efektif 1 Januari 2020

2. **Komponen Laporan Keuangan ISAK 35:**
   - Laporan Posisi Keuangan (Neraca)
   - Laporan Aktivitas (menggambarkan perubahan aset neto)
   - Laporan Arus Kas
   - Catatan atas Laporan Keuangan

3. **Klasifikasi Aset Neto:**
   - Tanpa Pembatasan
   - Dengan Pembatasan dari Pemberi Sumber Daya

### Regulasi Lainnya
- Ketentuan pajak (PPh, PPN jika applicable)
- Pelaporan ke Yayasan
- Audit independen (jika diwajibkan)

---

## Referensi Software Industri

### Software Lokal Indonesia

| Nama | Kelebihan | Target Pasar |
|------|-----------|--------------|
| **AdminSekolah.net** | Fitur lengkap, support lokal | Semua jenjang |
| **KumpulPay** | Fokus pembayaran, integrasi WA | PAUD - SMA |
| **AppSo.id** | Khusus PAUD, UI modern | PAUD - TK |
| **Klaskoo** | Fokus PAUD, perkembangan anak | PAUD |
| **Sokrates** | Terintegrasi akademik | Semua jenjang |
| **InfraDigital** | Payment digital fokus | Semua jenjang |
| **Cerdig** | Laporan keuangan lengkap | Semua jenjang |

### Software ERP Enterprise

| Nama | Kelebihan | Cocok untuk |
|------|-----------|-------------|
| **Odoo** | Open-source, modular | Sekolah menengah-besar |
| **HashMicro** | Kustomisasi tinggi | Sekolah/grup sekolah besar |
| **Total ERP** | Terintegrasi lengkap | Multi-unit |

---

## Template Diskusi Kebutuhan Alizzah

### Pertanyaan untuk Dieksplorasi

#### A. Struktur Organisasi & Pengguna

1. **Berapa unit/jenjang yang ada di Alizzah saat ini?**
   - [ ] KB/Playgroup saja
   - [ ] KB + TK-A
   - [x] KB + TK-A + TK-B
   - [ ] Lainnya: ___

2. **Siapa saja yang akan menggunakan sistem ini?**(saat ini masih manual dari admin keuangan)
   - [x] Admin Keuangan
   - [x] Kepala Sekolah
   - [x] Bendahara Yayasan
   - [ ] Orang Tua/Wali 
   - [ ] Lainnya: ___

3. **Apakah ada kebutuhan multi-cabang?**
   - [x] Satu lokasi saja
   - [ ] Rencana ekspansi
   - [ ] Sudah ada cabang lain

#### B. Jenis Pembayaran

1. **Apa saja jenis pembayaran yang ada?** (akan saya jelaskan lebih detail di dokumen terpisah)
   - [x] SPP Bulanan
   - [x] Uang Pangkal/Pendaftaran
   - [ ] Uang Gedung/Pengembangan
   - [ ] Uang Kegiatan
   - [x] Uang Seragam
   - [x] Uang Buku/Media
   - [ ] Catering/Makan
   - [x] Antar Jemput (bayar harian)
   - [x] Les Tambahan (lihat response)[](01-response.md#b-point-1-apa-saja-jenis-pembayaran-yang-ada)
   - [x] Tabungan Siswa (bayar harian, lihat response)[](01-response.md#b-point-1-apa-saja-jenis-pembayaran-yang-ada)
   - [x] Lainnya: infaq harian (lihat response)[](01-response.md#b-point-1-apa-saja-jenis-pembayaran-yang-ada)

2. **Apakah ada sistem diskon/potongan?** (akan saya jelaskan lebih detail di dokumen terpisah)
   - [ ] Beasiswa
   - [x] Potongan saudara kandung
   - [ ] Potongan pembayaran tepat waktu
   - [x] Lainnya: dispensasi anak guru, tetangga sekolah dll

3. **Bagaimana skema cicilan (jika ada)?**
   - [ ] Tidak ada cicilan
   - [ ] Cicilan 2-3x
   - [x] Cicilan fleksibel
   - [ ] Lainnya: ___

#### C. Metode Pembayaran

1. **Metode pembayaran yang sudah berjalan?**
   - [x] Tunai di sekolah
   - [x] Transfer bank
   - [ ] Virtual Account
   - [ ] QRIS
   - [ ] E-Wallet
   - [ ] Lainnya: ___

2. **Bank yang digunakan sekolah?**
   - [x] BCA
   - [x] Mandiri
   - [x] BNI
   - [x] BRI
   - [ ] Bank Syariah Indonesia
   - [x] Bank lokal: Jatim
   - [ ] Lainnya: ___

#### D. Pengelolaan Keuangan Saat Ini

1. **Bagaimana pencatatan keuangan saat ini dilakukan?**
   - [ ] Manual (buku kas)
   - [ ] Excel/Spreadsheet
   - [x] Software sederhana (sudah ada aplikasi desktop namun ada beberapa hasil laporan yang kurang sesuai)
   - [ ] Belum ada sistem

2. **Laporan apa saja yang dibutuhkan?**
   - [x] Laporan harian
   - [x] Laporan bulanan
   - [x] Laporan semester/tahunan
   - [x] Laporan untuk yayasan
   - [x] Laporan tunggakan
   - [ ] Lainnya: ___

3. **Apakah ada kebutuhan anggaran (budgeting)?** (menyusul)
   - [ ] Ya, RKAS formal
   - [ ] Ya, sederhana
   - [ ] Belum diperlukan

#### E. Notifikasi & Komunikasi

1. **Bagaimana komunikasi dengan orang tua saat ini?**
   - [x] WhatsApp grup
   - [x] WhatsApp pribadi
   - [ ] SMS
   - [x] Surat/edaran
   - [ ] Aplikasi chat lain
   - [ ] Lainnya: ___

2. **Fitur notifikasi yang diinginkan?**
   - [x] Notifikasi tagihan bulanan
   - [x] Pengingat jatuh tempo
   - [x] Konfirmasi pembayaran
   - [x] Kuitansi digital
   - [x] Pengumuman umum

#### F. Integrasi & Fitur Lanjutan

1. **Fitur tambahan yang diperlukan ke depan?**
   - [x] Portal orang tua (lihat tagihan, bayar online)
   - [x] Integrasi absensi siswa
   - [x] Laporan perkembangan anak
   - [x] Koperasi sekolah
   - [x] Penggajian guru/karyawan
   - [x] Inventarisasi aset
   - [x] PPDB Online
   - [x] Website sekolah
   - [ ] Lainnya: ___

#### G. Kebutuhan Teknis

1. **Preferensi akses sistem?**
   - [x] Web-based (browser)
   - [x] Mobile app
   - [ ] Desktop app
   - [ ] Semua platform

2. **Akses internet di sekolah?**
   - [x] Stabil 24 jam
   - [ ] Kadang tidak stabil
   - [ ] Terbatas
   - [x] Perlu mode offline

---

## Rekomendasi Tahapan Pengembangan

Berdasarkan standar industri, berikut rekomendasi tahapan pengembangan:

### Fase 1: Foundation (Prioritas Tinggi - Keuangan Dasar)
1. ✅ Master Data (Tahun Ajaran, Kelas, Siswa)
2. ✅ Master Jenis Biaya
3. ✅ Tagihan & Pembayaran (Manual)
4. ✅ Laporan Dasar (Tunggakan, Pembayaran)
5. ✅ Kuitansi Pembayaran

### Fase 2: Enhancement (Prioritas Menengah)
1. ⏳ Portal Orang Tua
2. ⏳ Notifikasi WhatsApp
3. ⏳ Pembayaran Digital (VA/QRIS)
4. ⏳ Laporan Keuangan Lengkap

### Fase 3: Integration (Prioritas Rendah/Jangka Panjang)
1. 📋 PPDB Online
2. 📋 Siakad (Absensi, Rapor)
3. 📋 Kepegawaian & Penggajian
4. 📋 Koperasi Sekolah
5. 📋 Inventarisasi
6. 📋 Landing Page/Website

---

## Catatan Penutup

Dokumen ini adalah **starting point** untuk diskusi. Langkah selanjutnya:

1. **Review dokumen ini** - lihat mana yang relevan untuk Alizzah
2. **Isi template pertanyaan** - untuk memahami kebutuhan spesifik
3. **Prioritaskan fitur** - berdasarkan urgensi dan sumber daya
4. **Desain sistem** - arsitektur dan database schema
5. **Pengembangan iteratif** - mulai dari fitur prioritas tinggi

---

*Dokumen ini dibuat pada: 26 Januari 2026*
*Versi: 1.0*
