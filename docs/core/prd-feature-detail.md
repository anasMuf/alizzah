# Detail Core Feature: Alizzah Manajemen

> Dokumen ini adalah lampiran dari `prd.md` yang menjelaskan setiap core feature secara lebih terperinci berdasarkan hasil diskusi. Dokumen ini menjadi referensi utama saat menyusun ERD, API Contract, dan implementasi.

---

## 1. Manajemen Akses & Role

### Role & Batas Akses

| Role | Modul Administrasi | Modul Keuangan | Konfigurasi Tarif | Laporan Administrasi | Laporan Keuangan |
|---|---|---|---|---|---|
| Superadmin | Kelola penuh | Kelola penuh | ✅ | ✅ | ✅ |
| Admin Administrasi | Kelola penuh | ❌ | ❌ | ✅ | ❌ |
| Admin Keuangan | View siswa & rombel saja | Kelola penuh | ❌ | ❌ | ✅ |
| Kepala Sekolah | View laporan | View laporan | ❌ | ✅ | ✅ |
| Yayasan | ❌ | View laporan | ❌ | ❌ | ✅ |

### Catatan Akses Modul Keuangan untuk Admin Keuangan
Admin keuangan dapat **melihat** data siswa dan rombel dari modul administrasi (nama, jenjang, rombel aktif) namun **tidak dapat mengubah** data tersebut. Semua perubahan data siswa dan rombel hanya bisa dilakukan oleh admin administrasi atau superadmin.

---

## 2. Modul Administrasi

### 2.1 Manajemen Tahun Ajaran

- Setiap tahun ajaran memiliki: nama (misal "2025/2026"), tanggal mulai, tanggal selesai, dan status (aktif/nonaktif)
- Hanya satu tahun ajaran yang bisa berstatus aktif pada satu waktu
- Seluruh operasional sistem (tagihan, rombel, laporan) terikat pada tahun ajaran
- Data dan riwayat tahun ajaran sebelumnya tetap dapat diakses dan tidak berubah

### 2.2 Manajemen Data Siswa

**Input Siswa:**
- Admin administrasi atau superadmin dapat menambah siswa secara **manual (form)** atau **import (format yang disepakati saat implementasi, migrasi dari SQL sistem lama)**
- Satu siswa memiliki satu profil yang persisten lintas tahun ajaran

**Data yang disimpan per siswa:**

| Kelompok Data | Detail |
|---|---|
| Profil Dasar | Nama lengkap, tempat & tanggal lahir, jenis kelamin, agama, foto (opsional) |
| Data Wali Murid | Nama wali, hubungan (ayah/ibu/wali), nomor telepon, alamat. Satu siswa dapat punya lebih dari satu wali murid. Satu wali murid dapat terhubung ke lebih dari satu siswa |
| Data Administrasi | Dokumen pendukung (opsional, upload file) |
| Data Akademik | Rombel aktif, jenjang, tahun ajaran, riwayat kelas per tahun ajaran, status (aktif / lulus / pindah / keluar) |
| Data Keuangan (view) | Ringkasan tagihan aktif, total tunggakan, saldo tabungan umum, saldo tabungan wajib (jika Berlian), shortcut ke halaman tagihan siswa |

### 2.3 Manajemen Rombel

- Rombel dibuat per tahun ajaran
- Jenjang yang tersedia: **Mutiara (KB)**, **Intan (TK-A)**, **Berlian (TK-B)**
- Konfigurasi per rombel: nama rombel, jenjang, jadwal hari & jam masuk & jam pulang (termasuk jam pulang khusus jika ada Calisan)
- Siswa di-assign ke rombel setelah data siswa dibuat
- **Input hari efektif per bulan per rombel** dilakukan oleh admin administrasi dan digunakan sebagai dasar perhitungan tagihan infaq harian di modul keuangan

**Jadwal Rombel (referensi dari data sekolah):**

| Rombel | Hari | Jam Masuk | Jam Pulang | Jika Calisan |
|---|---|---|---|---|
| Mutiara (KB) | Senin–Kamis | 07.15 | 10.00 | 10.30 |
| Mutiara (KB) | Jumat–Sabtu | 07.15 | 09.00 | 09.30 |
| Intan (TK-A) | Senin–Kamis | 07.15 | 10.00 | 10.30 |
| Intan (TK-A) | Jumat–Sabtu | 07.15 | 09.00 | — |
| Berlian (TK-B) | Senin–Kamis | 07.15 | 10.30 | 11.00 |
| Berlian (TK-B) | Jumat–Sabtu | 07.15 | 09.00 | — |

**Pembagian hari efektif Mutiara:**
- Mutiara 1,2,3 → Senin, Rabu, Jumat (3 hari/minggu)
- Mutiara 4,5,6 → Selasa, Kamis, Sabtu (3 hari/minggu)
- Setiap semester 2 jadwal di-rolling antar kelompok tersebut

### 2.4 Siklus Akademik

#### Kenaikan Kelas
- Diproses oleh admin administrasi di akhir tahun ajaran
- Sistem melakukan kenaikan massal: Mutiara → Intan, Intan → Berlian
- Admin dapat mengecualikan siswa tertentu untuk **tinggal kelas** (siswa tetap di jenjang yang sama di tahun ajaran berikutnya)
- Setelah proses kenaikan kelas dikonfirmasi, modul keuangan akan generate tagihan registrasi tahunan dan tagihan bulanan untuk tahun ajaran baru sesuai jenjang baru siswa

#### Kelulusan
- Hanya untuk siswa Berlian yang menyelesaikan jenjang TK-B
- Admin memproses kelulusan per siswa atau massal
- Saat diproses:
  1. Sistem generate **tagihan wisuda** dengan nominal sesuai konfigurasi tarif tahun ajaran aktif
  2. Saldo **tabungan wajib Berlian** siswa dialokasikan otomatis untuk melunasi tagihan wisuda
  3. Jika saldo tabungan wajib **lebih** → sisa saldo dikembalikan ke tabungan umum siswa
  4. Jika saldo tabungan wajib **kurang** → sisa tagihan wisuda menjadi hutang yang harus dilunasi
- Status siswa berubah menjadi **Lulus**
- Seluruh riwayat keuangan siswa tetap dapat diakses

#### Pindah Rombel
- Perpindahan siswa antar rombel dalam jenjang yang sama (misal Intan 1 → Intan 3)
- Murni perubahan administratif, **tidak ada efek ke tagihan**
- Riwayat rombel per tahun ajaran tetap tercatat

#### Mutasi Masuk dari Sekolah Luar
- Hanya untuk jenjang TK (tidak untuk KB)
- Siswa mutasi hanya dapat masuk ke **Intan 1 atau Intan 8**
- Tagihan dihitung mulai dari **bulan masuk**, bukan dari awal tahun ajaran
- Admin mengisi tanggal mulai efektif siswa sebagai acuan generate tagihan

#### Pindah Sekolah / Keluar
- Admin menonaktifkan siswa dengan mencatat tanggal keluar dan alasan
- Tagihan aktif yang belum lunas tetap tercatat sebagai tunggakan dalam riwayat
- Status siswa berubah menjadi **Keluar/Pindah**

---

## 3. Modul Keuangan

### 3.1 Konfigurasi Tarif per Tahun Ajaran

Hanya **Superadmin** yang dapat mengatur tarif. Konfigurasi dilakukan per tahun ajaran sehingga perubahan tarif tidak memengaruhi data tahun ajaran yang sudah berjalan.

**Item tarif yang dapat dikonfigurasi:**

| Kelompok Tarif | Item | Keterangan |
|---|---|---|
| SPP | SPP KB, SPP TK | Per bulan, per jenjang |
| Infaq Harian | Nominal per hari efektif | Berlaku semua jenjang |
| Biaya Awal | Seragam, rompi prasiaga, tas, kaos kaki, lunch box, baju ganti, infaq sarpras, infaq APE, buku DDTK, biaya psikotes IQ | Per item, dibayar sekali saat pertama masuk |
| Biaya Registrasi | MPLS, buku bayar, infaq awal tabungan, buku PK karakter, kaos field trip, map hasil karya, map raport & foto raport, alat belajar, buku Asik Membaca, buku kreativitas, iuran kegiatan kecamatan/kabupaten, buku jurnal, administrasi LPP, kalender, buku kotak, jilbab field trip | Per item, per jenjang (nominal bisa berbeda antar jenjang) |
| Pasta | Robotika, Sempoa Kids, Tilawah, Laptop Kids, Taekwondo, Tari, Melukis, Menyanyi | Per jenis, per bulan |
| Calisan | Calisan KB, Calisan TK | Per bulan (KB: 3x/minggu, TK: 4x/minggu) |
| Ekstrakurikuler | Aslin (TK-B saja) | Per bulan |
| Tabungan Wajib Berlian | Nominal per hari Senin | Hanya TK-B |
| Daycare | Pendaftaran, akomodasi, SPD KB, SPD TK, paket KB, paket TK, SPP harian lepas, paket harian, biaya konsumsi | Per item/kategori |
| Wisuda | Nominal biaya wisuda | Per tahun ajaran |
| Administrasi Tabungan | Persentase biaya admin penarikan tabungan umum oleh wali murid | Default 2,5% |

### 3.2 Manajemen Tagihan

#### Generate Otomatis

**Tagihan Biaya Awal** — trigger: siswa baru pertama kali masuk dan di-assign ke rombel
- Generate satu kali
- Berisi item-item biaya awal sesuai konfigurasi tarif tahun ajaran aktif
- Dapat diedit per item oleh admin keuangan setelah generate

**Tagihan Registrasi Tahunan** — trigger: awal tahun ajaran atau kenaikan kelas
- Generate satu kali per tahun ajaran per siswa
- Item dan nominal mengikuti jenjang siswa (Mutiara / Intan / Berlian) dan jenis kelamin (ada item khusus perempuan: jilbab field trip)
- Dapat dicicil — admin keuangan mengatur jadwal dan nominal cicilan
- Denda cicilan terlambat bersifat fleksibel, dicatat manual oleh admin keuangan

**Tagihan Bulanan** — trigger: otomatis setiap bulan selama tahun ajaran berjalan
- Generate per bulan per siswa
- Isi tagihan bulanan:
  - SPP (sesuai jenjang)
  - Infaq harian = nominal/hari × jumlah hari efektif bulan tersebut (diambil dari input hari efektif rombel)
  - Pasta yang diikuti siswa (bisa lebih dari satu pasta)
  - Calisan (jika siswa terdaftar Calisan)
  - Ekstrakurikuler Aslin (khusus TK-B jika terdaftar)
  - Tabungan Wajib Berlian (khusus TK-B, nominal × jumlah hari Senin di bulan tersebut)
- Admin keuangan dapat menambah, mengedit, atau menghapus item setelah generate
- Item insidental (rekreasi, field trip, dll) dapat ditambahkan oleh admin keuangan ke tagihan bulanan kapan saja

**Tagihan Wisuda** — trigger: proses kelulusan siswa Berlian
- Generate satu kali saat admin memproses kelulusan
- Nominal sesuai konfigurasi tarif wisuda tahun ajaran aktif
- Langsung dialokasikan dari tabungan wajib Berlian siswa secara otomatis

#### Kelola Tagihan per Siswa

- Admin keuangan dapat mengakses halaman tagihan per siswa
- Tampil semua tagihan (aktif, lunas, cicilan) lintas tahun ajaran
- Dari halaman detail siswa di modul administrasi terdapat **shortcut** langsung ke halaman ini
- Admin keuangan dapat:
  - Menambah item tagihan baru (insidental)
  - Mengedit nominal item tagihan yang sudah ada
  - Menghapus item tagihan yang tidak relevan
  - Mengatur jadwal cicilan untuk tagihan registrasi

### 3.3 Manajemen Pembayaran

#### Alur Pembayaran

```
Admin pilih siswa
  → Tampil ringkasan tagihan belum lunas (per bulan, registrasi, dll)
  → Admin pilih mode:
      [A] Bayar semua  → input total → konfirmasi
      [B] Bayar per item → pilih item → input nominal per item → konfirmasi
  → (Opsional) Tambah item di luar tagihan:
      - Setoran tabungan umum
      - Item insidental baru
  → Pilih sumber pembayaran:
      - Kas (default)
      - Alokasi dari tabungan umum siswa (tanpa biaya admin)
  → Sistem validasi: nominal ≤ tagihan item yang dipilih
  → Simpan & cetak struk pembayaran
```

#### Aturan Pembayaran

- Nominal pembayaran **tidak boleh melebihi** nominal tagihan item yang dipilih (validasi hard di sistem)
- Jika nominal yang dibayar **kurang** dari tagihan item → selisih tercatat sebagai hutang/sisa tagihan item tersebut
- Setiap pembayaran item dicatat dengan referensi ke tagihan spesifik yang dituju (bukan hanya total kas masuk)
- Pembayaran bisa dilakukan kapan saja, tidak harus per bulan penuh

#### Cetak Struk Pembayaran

- Struk dapat dicetak langsung dari browser setelah transaksi pembayaran
- Isi struk: tanggal, nama siswa, rombel, daftar item yang dibayar beserta nominalnya, total dibayar, sisa hutang (jika ada), nama admin yang mencatat

### 3.4 Manajemen Tabungan

#### Tabungan Umum

| Skenario | Biaya Admin | Alur |
|---|---|---|
| Wali murid minta tarik tunai | 2,5% dari nominal penarikan | Admin catat penarikan, saldo berkurang, berangkas berkurang |
| Admin pakai tabungan untuk bayar tagihan siswa | Tanpa biaya | Admin pilih sumber "tabungan umum" saat proses pembayaran, saldo berkurang otomatis |
| Setoran tabungan umum | — | Admin tambah item tabungan umum saat proses pembayaran, nominal masuk ke saldo tabungan & berangkas |

- Saldo tabungan umum per siswa selalu up-to-date di sistem
- Riwayat mutasi tabungan (masuk/keluar beserta keterangan) dapat dilihat dan dicetak per siswa

#### Tabungan Wajib Berlian

- Ditagihkan setiap hari Senin sebagai bagian dari tagihan bulanan TK-B
- Nominal: konfigurasi × jumlah hari Senin di bulan berjalan
- Dana masuk ke **berangkas** (bukan kas biasa)
- Saat proses kelulusan: saldo tabungan wajib dialokasikan otomatis ke tagihan wisuda
  - Lebih → kembalikan ke tabungan umum
  - Kurang → sisa jadi hutang tagihan wisuda
- Wali murid **tidak dapat** menarik tabungan wajib Berlian secara mandiri (hanya untuk wisuda)

### 3.5 Manajemen Pengeluaran

- Admin keuangan mencatat pengeluaran secara manual
- Field yang diisi: tanggal, nominal, pilih kategori pos (mengikuti kategori pemasukan), pilih sub-pos, keterangan, upload bukti (opsional)

**Kategori & Sub-pos Pengeluaran (mengikuti struktur pemasukan):**

| Kategori | Sub-pos |
|---|---|
| Biaya Awal | Infaq sarpras, infaq APE, biaya psikotes IQ, koperasi |
| Biaya Registrasi | Biaya MPLS, buku PK karakter, alat belajar, iuran kegiatan kecamatan/kabupaten, administrasi LPP, kalender, koperasi |
| SPP | Gaji guru (dan kebutuhan operasional lain dari pos SPP, pasta, SPD daycare) |

- Riwayat pengeluaran dapat difilter berdasarkan kategori, sub-pos, dan periode tanggal

### 3.6 Kas & Berangkas

#### Kas

- Seluruh transaksi pemasukan (pembayaran tagihan, setoran tabungan) masuk ke kas secara otomatis
- Admin keuangan dapat mencatat **transfer dari kas ke berangkas** sewaktu-waktu dengan nominal dan keterangan
- Saldo kas real-time = total pemasukan − total pengeluaran − total transfer ke berangkas

#### Berangkas

- Saldo berangkas merupakan akumulasi dari:
  - Transfer masuk dari kas
  - Setoran tabungan umum siswa (langsung ke berangkas)
  - Setoran tabungan wajib Berlian (langsung ke berangkas)
- Berangkas berkurang saat:
  - Penarikan tabungan umum oleh wali murid
  - Alokasi tabungan wajib Berlian ke tagihan wisuda
- Saldo berangkas ditampilkan terpisah dari saldo kas

#### Tutup Buku Harian

Alur tutup buku:

```
Admin input nominal kas fisik yang dihitung secara fisik
  → Sistem hitung total kas dari transaksi hari ini
  → Tampil perbandingan: kas sistem vs kas fisik
  → Jika ada selisih → admin wajib isi keterangan
  → Admin konfirmasi tutup buku
  → Semua transaksi hari tersebut dikunci (tidak bisa diedit)
  → Laporan harian tersimpan dan dapat diakses oleh Kepala Sekolah & Yayasan
```

- Tutup buku dapat dilakukan sekali per hari oleh admin keuangan
- Jika terlewat, admin keuangan dapat tutup buku hari sebelumnya dengan konfirmasi superadmin

### 3.7 Laporan Keuangan

Semua laporan dapat **dicetak dari browser** (print-friendly layout).

#### Laporan Harian
- Ringkasan pemasukan per pos hari tersebut
- Ringkasan pengeluaran hari tersebut
- Saldo kas awal, mutasi, saldo kas akhir
- Saldo berangkas
- Hasil rekonsiliasi tutup buku (kas sistem vs kas fisik, selisih, keterangan)
- Dapat diakses oleh: Admin Keuangan, Kepala Sekolah, Superadmin

#### Laporan Bulanan
- Total pemasukan per pos (SPP, infaq harian, pasta, registrasi, daycare, dll)
- Total pengeluaran per kategori
- Tagihan yang seharusnya masuk vs realisasi pembayaran
- Rekap tunggakan per jenjang/rombel
- Dapat diakses oleh: Admin Keuangan, Kepala Sekolah, Superadmin

#### Laporan Tahunan
- Ringkasan keuangan seluruh tahun ajaran
- Total pemasukan vs pengeluaran
- Saldo akhir kas dan berangkas
- Dapat diakses oleh: Admin Keuangan, Kepala Sekolah, Yayasan, Superadmin

#### Rekap per Siswa
- Riwayat seluruh tagihan (per jenis, per bulan)
- Riwayat pembayaran (tanggal, nominal, item yang dibayar)
- Total tunggakan aktif
- Saldo tabungan umum dan tabungan wajib (jika berlaku)
- Dapat dicetak untuk ditunjukkan ke wali murid
- Dapat diakses oleh: Admin Keuangan, Superadmin

#### Rekap per Kelas/Rombel
- Daftar siswa beserta status pembayaran bulan berjalan
- Total tagihan vs realisasi pembayaran per rombel
- Persentase kepatuhan pembayaran
- Dapat diakses oleh: Admin Keuangan, Kepala Sekolah, Superadmin

#### Cetak Struk Pembayaran
- Dicetak setiap selesai transaksi pembayaran
- Isi: tanggal transaksi, nama siswa, rombel, detail item yang dibayar, nominal per item, total dibayar, sisa hutang (jika ada), nama admin
- Dapat dicetak ulang dari riwayat pembayaran

---

## 4. Daycare

Daycare adalah layanan terpisah dari rombel reguler. Siswa daycare dapat berasal dari dalam sekolah (siswa Mutiara/Intan/Berlian yang memperpanjang jam) maupun dari luar sekolah.

**Biaya Daycare:**

| Jenis | Nominal |
|---|---|
| Pendaftaran (biaya awal) | Rp 150.000 |
| Akomodasi (biaya awal) | Rp 250.000 |
| SPD Bulanan KB | Rp 200.000 |
| SPD Bulanan TK | Rp 400.000 |
| Paket Bulanan KB (SPD + Konsumsi) | Rp 500.000 |
| Paket Bulanan TK (SPD + Konsumsi) | Rp 900.000 |
| SPP Harian Lepas | Rp 15.000 |
| Paket Harian (Harian + Konsumsi) | Rp 35.000 |
| Biaya Konsumsi | Rp 20.000/hari |

- Pengelolaan tagihan dan pembayaran daycare mengikuti alur yang sama dengan tagihan reguler
- Siswa daycare dari luar sekolah tetap perlu diinput sebagai data siswa (minimal profil dasar) agar dapat dibuatkan tagihan

---

## 5. Catatan Integrasi Antar Modul

| Aksi di Modul Administrasi | Efek di Modul Keuangan |
|---|---|
| Siswa baru di-assign ke rombel | Generate tagihan biaya awal |
| Tahun ajaran baru dimulai & siswa assigned ke rombel | Generate tagihan registrasi tahunan + tagihan bulanan |
| Input hari efektif bulan berjalan | Nominal infaq harian di tagihan bulanan bulan tersebut terupdate |
| Siswa daftarkan ke pasta/calisan/ekskul | Item pasta/calisan/ekskul masuk ke tagihan bulanan berikutnya |
| Kenaikan kelas dikonfirmasi | Generate tagihan registrasi tahunan & bulanan tahun ajaran baru |
| Proses kelulusan dikonfirmasi | Generate tagihan wisuda, alokasi tabungan wajib otomatis |
| Siswa mutasi masuk | Generate tagihan mulai bulan masuk |
| Siswa keluar/pindah | Tagihan aktif dibekukan, riwayat tetap tersimpan |
