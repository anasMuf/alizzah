# PRD: Alizzah Manajemen

## Product Overview

**Alizzah Manajemen** adalah platform ERP berbasis web untuk manajemen operasional sekolah KB/TK secara terpadu. Platform ini hadir sebagai dashboard tunggal yang mengintegrasikan modul-modul manajemen sekolah meliputi administrasi akademik, keuangan, SDM, dan modul lainnya di masa mendatang.

Pada fase pertama ini, fokus pengembangan diarahkan pada dua modul inti: **Modul Administrasi** dan **Modul Keuangan**, yang keduanya saling terintegrasi namun dikelola secara terpisah sesuai dengan peran dan tanggung jawab masing-masing pengguna.

Platform ini menggantikan proses pencatatan manual yang saat ini masih berjalan, sehingga seluruh data keuangan dan administrasi sekolah dapat dikelola secara terpusat, akurat, dan dapat dilaporkan secara real-time kepada pimpinan.

---

## Features (Core)

### 1. Manajemen Akses & Role

Sistem menggunakan role-based access control (RBAC) dengan lima tingkatan:

| Role | Akses |
|------|-------|
| Superadmin | Penuh — semua modul, konfigurasi tarif, manajemen user |
| Admin Administrasi | Kelola modul administrasi |
| Admin Keuangan | Kelola modul keuangan |
| Kepala Sekolah | View semua laporan (keuangan + administrasi) |
| Yayasan | View laporan keuangan saja |

---

### 2. Modul Administrasi

#### 2.1 Manajemen Tahun Ajaran
- Buat dan kelola tahun ajaran (multi tahun ajaran)
- Set kalender akademik dan jumlah hari efektif per bulan per rombel
- Tahun ajaran aktif sebagai konteks seluruh operasional sistem

#### 2.2 Manajemen Data Siswa
- CRUD data siswa: profil dasar (nama, TTL, jenis kelamin, agama, dll), data wali murid (nama, kontak, hubungan — satu wali murid dapat memiliki lebih dari satu siswa), dokumen administrasi
- Tab keuangan pada detail siswa: ringkasan tagihan, saldo tabungan, dan shortcut ke halaman tagihan siswa
- Riwayat akademik siswa: rombel per tahun ajaran, status (aktif, lulus, pindah)
- Migrasi data siswa dari sistem lama (format SQL)

#### 2.3 Manajemen Rombel
- CRUD rombel per tahun ajaran: Mutiara (KB), Intan (TK-A), Berlian (TK-B)
- Konfigurasi jadwal per rombel (hari, jam masuk, jam pulang)
- Assign siswa ke rombel
- Input hari efektif per bulan per rombel (digunakan sebagai dasar tagihan infaq harian)

#### 2.4 Siklus Akademik
Seluruh proses siklus akademik di bawah ini **memicu generate atau perubahan tagihan** secara otomatis di modul keuangan:

- **Kenaikan kelas** — proses akhir tahun ajaran: Mutiara → Intan, Intan → Berlian. Dapat dikecualikan untuk siswa tinggal kelas
- **Kelulusan** — proses untuk siswa Berlian yang menyelesaikan jenjang TK-B: generate tagihan wisuda, alokasi otomatis dari tabungan wajib Berlian
- **Pindah rombel** — perpindahan antar rombel dalam jenjang yang sama (murni administratif, tanpa efek tagihan)
- **Mutasi masuk** — siswa baru dari sekolah luar, hanya untuk jenjang TK (masuk ke Intan 1 atau Intan 8). Tagihan mulai dihitung dari bulan masuk
- **Pindah sekolah / keluar** — menonaktifkan siswa dan menutup tagihan aktif

---

### 3. Modul Keuangan

#### 3.1 Konfigurasi Tarif per Tahun Ajaran
Hanya dapat dikelola oleh **Superadmin**. Tarif dikonfigurasi per tahun ajaran sehingga perubahan tidak memengaruhi tahun ajaran sebelumnya.

Tarif yang dapat dikonfigurasi:
- SPP bulanan per jenjang (KB/TK)
- Infaq harian (per hari efektif)
- Biaya awal pendaftaran (per item)
- Biaya registrasi tahunan (per item, per jenjang)
- Biaya pasta per jenis per bulan
- Biaya daycare (biaya awal, SPD, paket)
- Biaya wisuda kelulusan
- Tarif administrasi penarikan tabungan umum (default 2,5%)

#### 3.2 Manajemen Tagihan

**Generate Otomatis:**

| Jenis Tagihan | Trigger | Keterangan |
|---|---|---|
| Tagihan Biaya Awal | Siswa baru masuk | Sekali di awal |
| Tagihan Registrasi Tahunan | Awal tahun ajaran baru | Bisa dicicil |
| Tagihan Bulanan | Setiap bulan selama tahun ajaran | SPP + infaq harian + pasta yang diikuti |
| Tagihan Wisuda | Proses kelulusan siswa | Dilunasi otomatis dari tabungan wajib |

**Kelola Tagihan per Siswa (Admin Keuangan):**
- Tambah, edit, atau hapus item tagihan hasil generate
- Tambah item insidental ke tagihan bulanan (misal: rekreasi, field trip)
- Daftar pasta yang diikuti siswa sebagai dasar tagihan pasta bulanan
- Konfigurasi cicilan untuk tagihan registrasi tahunan (jadwal dan nominal per cicilan)
- Riwayat seluruh tagihan per siswa lintas tahun ajaran

#### 3.3 Manajemen Pembayaran

**Alur Pembayaran:**
1. Admin memilih siswa → tampil tagihan yang belum lunas
2. Admin memilih mode pembayaran:
   - **Bayar semua** — langsung input total
   - **Bayar per item** — pilih item tagihan mana yang dibayar, dengan nominal bisa kurang dari tagihan (sisa menjadi hutang/cicilan)
3. Admin dapat menambah item pembayaran di luar tagihan: tabungan umum, item insidental
4. Validasi: nominal pembayaran tidak boleh melebihi tagihan item yang dipilih
5. Sumber pembayaran: kas atau alokasi dari tabungan umum siswa (tanpa biaya administrasi)
6. Cetak/simpan bukti pembayaran

**Rekam Jejak:**
- Setiap pembayaran tercatat: tanggal, nominal, item tagihan yang dituju, sisa hutang per item
- Riwayat pembayaran per siswa dapat dilihat dan dicetak

#### 3.4 Manajemen Tabungan

**Tabungan Umum:**
- Dicatat per siswa, masuk saat pembayaran
- Penarikan oleh wali murid: diajukan ke admin, dikenakan biaya administrasi 2,5%
- Penarikan untuk pembayaran tagihan oleh admin: tanpa biaya administrasi
- Riwayat mutasi tabungan per siswa

**Tabungan Wajib Berlian:**
- Tagihan Rp 10.000 setiap hari Senin, masuk ke berangkas
- Saat proses kelulusan: saldo tabungan wajib dialokasikan otomatis untuk melunasi tagihan wisuda
- Jika saldo lebih dari tagihan wisuda → sisa dikembalikan ke tabungan umum siswa
- Jika saldo kurang → sisa menjadi hutang tagihan wisuda

#### 3.5 Manajemen Pengeluaran
- Input manual pengeluaran: nominal, tanggal, pilih kategori pos (mengikuti kategori pemasukan: Biaya Awal, Registrasi, SPP), dan sub-pos
- Upload bukti pengeluaran (opsional)
- Riwayat pengeluaran dapat difilter per kategori, periode

#### 3.6 Kas & Berangkas

**Kas:**
- Seluruh transaksi pemasukan masuk ke kas
- Admin dapat memindahkan nominal dari kas ke berangkas sewaktu-waktu

**Berangkas:**
- Tempat penyimpanan tabungan (umum + wajib Berlian) secara fisik
- Saldo berangkas tercatat di sistem
- Berkurang saat tabungan wajib dialokasikan ke tagihan wisuda atau tabungan umum dicairkan

**Tutup Buku Harian:**
- Admin input nominal kas fisik yang ada
- Sistem membandingkan dengan total transaksi harian
- Selisih dicatat beserta keterangan
- Transaksi hari yang sudah ditutup tidak dapat diedit
- Laporan harian dapat diakses oleh Kepala Sekolah dan Yayasan

#### 3.7 Laporan Keuangan

| Jenis Laporan | Keterangan |
|---|---|
| Laporan Harian | Ringkasan pemasukan, pengeluaran, saldo kas, dan rekonsiliasi tutup buku |
| Laporan Bulanan | Total pemasukan per pos, pengeluaran per kategori, tagihan vs realisasi |
| Laporan Tahunan | Ringkasan keuangan per tahun ajaran |
| Rekap per Siswa | Riwayat tagihan, pembayaran, saldo tabungan, tunggakan |
| Rekap per Kelas | Realisasi pembayaran per rombel |

Semua laporan dapat dicetak dan diexport.

---

## User Stories

### Superadmin

- Sebagai superadmin, saya ingin membuat tahun ajaran baru, agar seluruh operasional administrasi dan keuangan terikat pada periode yang tepat
- Sebagai superadmin, saya ingin mengkonfigurasi tarif biaya per tahun ajaran, agar perubahan tarif tidak berdampak pada data tahun ajaran sebelumnya
- Sebagai superadmin, saya ingin mengelola akun dan role pengguna, agar setiap staf hanya dapat mengakses modul sesuai tanggung jawabnya

### Admin Administrasi

- Sebagai admin administrasi, saya ingin menambah data siswa baru beserta data wali murid, agar profil siswa tersimpan lengkap di sistem
- Sebagai admin administrasi, saya ingin mengassign siswa ke rombel pada tahun ajaran aktif, agar tagihan bulanan siswa dapat ter-generate otomatis
- Sebagai admin administrasi, saya ingin memproses kenaikan kelas di akhir tahun ajaran, agar siswa berpindah jenjang dan tagihan tahun ajaran baru terbentuk secara otomatis
- Sebagai admin administrasi, saya ingin memproses siswa tinggal kelas, agar siswa tetap di jenjang yang sama pada tahun ajaran berikutnya
- Sebagai admin administrasi, saya ingin mencatat siswa mutasi masuk dari sekolah luar, agar tagihan siswa tersebut mulai dihitung dari bulan masuk
- Sebagai admin administrasi, saya ingin memindahkan siswa antar rombel dalam jenjang yang sama, agar data rombel siswa selalu akurat tanpa mengganggu tagihan
- Sebagai admin administrasi, saya ingin memproses kelulusan siswa Berlian, agar tagihan wisuda ter-generate dan tabungan wajib Berlian teralokasi otomatis
- Sebagai admin administrasi, saya ingin menginput jumlah hari efektif per bulan per rombel, agar tagihan infaq harian siswa dapat dihitung dengan tepat

### Admin Keuangan

- Sebagai admin keuangan, saya ingin melihat dan mengelola tagihan per siswa hasil generate otomatis, agar saya dapat menyesuaikan tagihan jika ada perubahan
- Sebagai admin keuangan, saya ingin mencatat pembayaran per siswa dengan memilih item tagihan mana yang dibayar dan berapa nominalnya, agar cicilan dan hutang per item tercatat dengan akurat
- Sebagai admin keuangan, saya ingin menambahkan item insidental ke tagihan bulanan siswa, agar biaya seperti rekreasi atau field trip dapat tercatat dalam sistem
- Sebagai admin keuangan, saya ingin mencatat penarikan tabungan umum oleh wali murid, agar saldo tabungan siswa selalu akurat dan biaya administrasi terhitung otomatis
- Sebagai admin keuangan, saya ingin menggunakan saldo tabungan umum siswa untuk melunasi tagihan, agar proses pembayaran lebih fleksibel tanpa dikenakan biaya administrasi
- Sebagai admin keuangan, saya ingin mencatat pengeluaran beserta kategori pos-nya, agar arus kas keluar terdokumentasi dengan baik
- Sebagai admin keuangan, saya ingin melakukan tutup buku harian dengan menginput saldo kas fisik, agar selisih kas dapat diidentifikasi dan dicatat setiap hari
- Sebagai admin keuangan, saya ingin memindahkan nominal dari kas ke berangkas, agar dana tabungan fisik tersimpan terpisah dan tercatat di sistem
- Sebagai admin keuangan, saya ingin mencetak laporan rekap per siswa, agar dapat ditunjukkan kepada wali murid sebagai bukti pembayaran dan saldo tabungan

### Kepala Sekolah

- Sebagai kepala sekolah, saya ingin melihat laporan keuangan harian, bulanan, dan tahunan, agar saya dapat memantau kondisi keuangan sekolah secara menyeluruh
- Sebagai kepala sekolah, saya ingin melihat rekap pembayaran per kelas, agar saya dapat mengetahui tingkat kepatuhan pembayaran per rombel

### Yayasan

- Sebagai perwakilan yayasan, saya ingin melihat laporan keuangan sekolah, agar saya dapat mengawasi pengelolaan keuangan sekolah secara transparan

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| **Backend** | Go 1.25, Echo v4, GORM, PostgreSQL, JWT Auth, Swagger (swag) |
| **Frontend** | React 19, TanStack Router (file-based), TanStack Query, Tailwind CSS v4, Lucide React |
| **Tooling** | Vite 8, Biome (linter/formatter), Orval (API codegen dari Swagger), Nx, pnpm workspaces |
| **Arsitektur** | Monorepo — `apps/api` (Go) + `apps/platform` (React) |
| **Auth** | JWT Bearer Token, RBAC (5 role) |
| **Database** | PostgreSQL — multi tahun ajaran, soft delete via GORM |

---

## References

- Dokumen internal sekolah: `rincian_biaya_registrasi.md`, `pos_pemasukan_biaya_awal.md`, `pos_pemasukan_biaya_daycare.md`, `pos_pemasukan_infaq_pembayaran.md`, `pos_pengeluaran.md`, `list_rombel.md`, `list_pasta.md`
- Struktur monorepo & template dokumentasi: `README.md`, `docs/README.md`
- Referensi pattern serupa: sistem informasi keuangan sekolah (SIPLAH, SIPLah Kemdikbud), aplikasi SPP sekolah lokal
