# Hasil Audit Dokumen Planning

> **Tanggal Audit:** 29 Januari 2026  
> **Status:** Resolved ✅
> **Auditor:** AI Assistant

---

## 📋 Daftar Isi

1. [Inconsistencies (Perlu Dikoreksi)](#1-inconsistencies-perlu-dikoreksi)
2. [Ambiguities (Perlu Klarifikasi)](#2-ambiguities-perlu-klarifikasi)
3. [Items yang Sudah Konsisten](#3-items-yang-sudah-konsisten)

---

## 1. Inconsistencies (Perlu Dikoreksi)

### Issue #1: Wali Kelas tidak ada di ERD

| Item | Detail |
|------|--------|
| **Dokumen** | `02-requirement-spesification-keuangan-alizzah.md` (line 152) vs `04-erd-database-schema.md` |
| **Deskripsi** | Requirement menyebutkan "Wali Kelas (opsional)" di Master Rombel, tapi tidak ada di tabel `rombel` di ERD |
| **Opsi Solusi** | A) Tambah kolom `wali_kelas_id` di ERD tabel `rombel` <br> B) Hapus dari Requirement karena tidak diperlukan |

**Response:**
> _(silakan isi response di sini)_
> - [ ] Opsi A: Tambah ke ERD
> - [ ] Opsi B: Hapus dari Requirement
> - [x] Lainnya: apakah ini berhubungan data kelas yg mana bisa untuk mengolah kenaikan dll termasuk siapa walikelasnya? jika iya apakah perlu ditambahkan di ERD? mengingat kita masih fokus di keuangan apakah termasuk di siakad?

---

### Issue #2: Nama tabel `tabungan_siswa` vs `tabungan`

| Item | Detail |
|------|--------|
| **Dokumen** | `02-requirement-spesification-keuangan-alizzah.md` (line 700) vs `04-erd-database-schema.md` |
| **Deskripsi** | Requirement menyebut `tabungan_siswa`, ERD menggunakan `tabungan` |
| **Opsi Solusi** | A) Sesuaikan Requirement → `tabungan` (ikut ERD) <br> B) Sesuaikan ERD → `tabungan_siswa` (ikut Requirement) |

**Response:**
> _(silakan isi response di sini)_
> - [x] Opsi A: Ikut ERD (`tabungan`)
> - [ ] Opsi B: Ikut Requirement (`tabungan_siswa`)

---

### Issue #3: Nama tabel `kas_berangkas` vs `kas`

| Item | Detail |
|------|--------|
| **Dokumen** | `02-requirement-spesification-keuangan-alizzah.md` (line 776) vs `04-erd-database-schema.md` |
| **Deskripsi** | Requirement menyebut `kas_berangkas`, ERD menggunakan `kas` |
| **Opsi Solusi** | A) Sesuaikan Requirement → `kas` (ikut ERD) <br> B) Sesuaikan ERD → `kas_berangkas` (ikut Requirement) |

**Response:**
> _(silakan isi response di sini)_
> - [x] Opsi A: Ikut ERD (`kas`)
> - [ ] Opsi B: Ikut Requirement (`kas_berangkas`)

---

### Issue #4: ERD Diagram belum include `jenis_pembayaran_tarif`

| Item | Detail |
|------|--------|
| **Dokumen** | `04-erd-database-schema.md` |
| **Deskripsi** | Tabel baru `jenis_pembayaran_tarif` sudah ada di Section 4.5.1, tapi ASCII diagram di Section 3 belum diupdate |
| **Opsi Solusi** | Update ASCII diagram untuk menambahkan tabel baru |

**Response:**
> _(silakan isi response di sini)_
> - [x] Ya, update diagram
> - [ ] Tidak perlu, diagram cukup menunjukkan tabel utama saja

---

### Issue #5: Struktur folder tidak sinkron di Tech Stack

| Item | Detail |
|------|--------|
| **Dokumen** | `03-tech-stack-architecture.md` |
| **Deskripsi** | Section 2.1 (line 67-110) menunjukkan struktur flat (`routes/`, `services/`), sedangkan Section 3.3 menunjukkan struktur modular (`modules/core/`, `modules/keuangan/`) |
| **Opsi Solusi** | A) Hapus struktur flat di Section 2.1, gunakan struktur modular saja <br> B) Update Section 2.1 agar konsisten dengan Section 3.3 <br> C) Biarkan saja karena Section 2.1 adalah overview sederhana |

**Response:**
> _(silakan isi response di sini)_
> - [ ] Opsi A: Hapus struktur flat
> - [x] Opsi B: Update agar konsisten
> - [ ] Opsi C: Biarkan saja

---

## 2. Ambiguities (Perlu Klarifikasi)

### Issue #6: Perhitungan Infaq Harian

| Item | Detail |
|------|--------|
| **Dokumen** | `02-requirement-spesification-keuangan-alizzah.md` |
| **Lokasi** | Section 4.1.A (line 241) vs contoh kuitansi (line 1041) |
| **Deskripsi** | Infaq Harian disebutkan **Rp 7.000 per hari**, tapi contoh kuitansi menunjukkan "Infaq Harian Jan = Rp 130.000". Apakah ini berarti 18-19 hari efektif per bulan? |

**Pertanyaan:**
1. Berapa rata-rata hari efektif per bulan?
2. Apakah jumlah hari efektif perlu dihitung otomatis berdasarkan kalender akademik?
3. Atau nominal Infaq Harian bulanan sudah fixed dan tidak tergantung jumlah hari?

**Response:**
> ternyata dari user yg mengalami biasanya admin keuangan akan menghitungkan jumlah harinya dalam bulan, misalnya jika bulan Januari ada 20 hari maka admin keuangan akan menghitungkan 20 kali Rp 7.000 = Rp 140.000. sama untuk yg bayarnya harian biasanya admin keuangan akan menghitungkannya berdasarkan jumlah hari efektif dalam bulan. dan tagihannya menjadi bulanan tetapi hitungannya harian. perlu mengubah beberapa hal di seluruh dokumen?

---

### Issue #7: Tabungan Wajib Berlian "Per Senin"

| Item | Detail |
|------|--------|
| **Dokumen** | `02-requirement-spesification-keuangan-alizzah.md` |
| **Lokasi** | Section 4.1.A (line 244) |
| **Deskripsi** | Tabungan Wajib Berlian disebutkan **Rp 10.000 per Senin** |

**Pertanyaan:**
1. Apakah ini ditagih mingguan terpisah, atau digabung ke tagihan bulanan?
2. Jika digabung bulanan, berapa estimasi jumlah Senin per bulan (4-5)?
3. Bagaimana jika ada libur di hari Senin?

**Response:**
> seperti infaq harian, perlu menghitung jumlah Senin dalam bulan dan menghitungkannya berdasarkan jumlah Senin dalam bulan.

---

### Issue #8: Daycare "SPP Harian Lepas Paket"

| Item | Detail |
|------|--------|
| **Dokumen** | `02-requirement-spesification-keuangan-alizzah.md` |
| **Lokasi** | Section 2.3.B (line 118) |
| **Deskripsi** | Disebutkan **"SPP Harian Lepas Rp 15.000/hari atau Rp 35.000 (paket)"** |

**Pertanyaan:**
1. Apa yang dimaksud "paket"? Per minggu? Per 3 hari?
2. Kapan siswa menggunakan harian vs paket?

**Response:**
> sepertinya daycare perlu panding dulu, saya perlu tanyakan ke admin keuangan, jadi apakah perlu penyesuaian di seluruh dokumen?

---

### Issue #9: Biaya Perlengkapan "Berlaku untuk kelompok tertentu"

| Item | Detail |
|------|--------|
| **Dokumen** | `02-requirement-spesification-keuangan-alizzah.md` |
| **Lokasi** | Section 4.1.C (line 289) |
| **Deskripsi** | Disebutkan **"Berlaku: Kelompok Intan 8 & 1, Mutiara 1-6"** |

**Pertanyaan:**
1. Apa maksudnya? Apakah hanya rombel tertentu yang kena biaya perlengkapan ini?
2. Mengapa tidak semua rombel?
3. Bagaimana dengan rombel lainnya (Berlian, Intan 2-7)?

**Response:**
> oiya terdapat kasus khusus, untuk siswa mutasi akan dimasukkan di intan 8 dan 1, lalu mutiara 1-6 kan isinya siswa baru semua, jadi masih pelu biaya pendidikan (perlengkapan). apakah sudah jelas? apakah perlu penyesuaian di seluruh dokumen?

---

### Issue #10: Mode Pembayaran Daycare (Pending)

| Item | Detail |
|------|--------|
| **Dokumen** | `02-requirement-spesification-keuangan-alizzah.md` |
| **Lokasi** | Section 2.3.B (line 121) |
| **Deskripsi** | Disebutkan status **"Detail mode pembayaran dan relasi dengan SPP reguler akan diupdate kemudian"** |

**Pertanyaan:**
1. Apakah siswa Daycare tetap bayar SPP reguler + SPD?
2. Atau SPD sudah termasuk SPP?
3. Bagaimana flow pembayaran untuk siswa Daycare?

**Response:**
> untuk daycare pending dulu, saya perlu tanyakan ke admin keuangan, jadi apakah perlu penyesuaian di seluruh dokumen?

---

## 3. Items yang Sudah Konsisten

Berikut adalah item-item yang sudah **konsisten** antar dokumen dan tidak perlu perubahan:

| Item | Status |
|------|--------|
| Status tagihan (DRAFT, UNPAID, DUE, OVERDUE, PARTIAL, PAID, CANCELLED) | ✅ Konsisten |
| Metode pembayaran (TUNAI, TRANSFER) | ✅ Konsisten |
| Jenis tabungan (WAJIB_BERLIAN, UMUM) | ✅ Konsisten |
| Tipe diskon (PERSENTASE, NOMINAL) | ✅ Konsisten |
| Jenjang (KB, TK-A, TK-B) dengan kelompok (Mutiara, Intan, Berlian) | ✅ Konsisten |
| Policy diskon "STACK" | ✅ Terdokumentasi |
| Overpayment → Tabungan Umum | ✅ Sudah clear |
| Tarif per Jenjang + Gender | ✅ Konsisten di ERD dan Requirement |

---

## Catatan

Setelah semua issue di-respond, silakan mention saya kembali untuk melakukan perbaikan dokumen sesuai keputusan.

---

*Dokumen ini di-generate pada: 29 Januari 2026*
