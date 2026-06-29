# PRD: Modul Koperasi

> Bagian dari ekosistem **Alizzah Manajemen**. Dokumen ini adalah _single source of truth_ untuk scope modul Koperasi.
> Turunan dokumen: [`erd.md`](./erd.md) · [`api-contract.md`](./api-contract.md) · [`integration-plan.md`](./integration-plan.md)

---

## Product Overview

**Modul Koperasi** adalah unit usaha sekolah yang dikelola sebagai **entitas keuangan mandiri** di dalam dashboard Alizzah. Koperasi menjalankan tiga lini kegiatan:

1. **Jual-beli barang** — menjual perlengkapan ke siswa/wali murid (seragam, tas, baju adat, buku, lunchbox, dll) dan melakukan pembelian/restock barang dari pemasok.
2. **Simpan-pinjam** — memberikan pinjaman tanpa bunga kepada anggota (staf sekolah, pengurus yayasan, dan pihak lain yang disetujui yayasan), dengan angsuran yang dapat dipotong gaji atau dibayar manual.
3. **Pembukuan kas** — mencatat seluruh arus kas masuk/keluar koperasi (termasuk modal, transaksi lain-lain) dalam satu jurnal yang dapat ditelusuri dan dilaporkan per bulan menurut kategori.

Koperasi memperoleh **modal** dari Departemen Keuangan sekolah pada setiap tahun ajaran. Walaupun buku kasnya terpisah dari kas sekolah, modul ini **berelasi** dengan modul lain: penyaluran modal tercatat di kedua sisi, dan transaksi penjualan dapat mereferensi data siswa untuk keperluan riwayat & laporan.

---

## Background Problem & Solution

### Problem
- Pencatatan koperasi saat ini manual (buku/Excel), rawan selisih dan sulit diaudit.
- Tidak ada jurnal arus kas yang menautkan setiap mutasi uang ke dokumen sumbernya (penjualan, pembelian, pinjaman).
- Stok barang dan harga modal tidak terpantau, sehingga laba penjualan tidak terukur.
- Hutang (ke pemasok), piutang (dari pembeli), dan pinjaman anggota tercecer — sulit tahu siapa kurang bayar berapa.
- Modal dari sekolah tidak tercatat rapi sebagai pengeluaran sekolah sekaligus modal masuk koperasi.

### Solution
Satu modul terintegrasi di dashboard yang:
- Menyatukan master data (anggota, pemasok, barang) dan seluruh transaksi.
- Menerapkan **jurnal arus kas berbasis referensi** (pola yang sama dengan kas/berangkas sekolah) sehingga tiap rupiah dapat ditelusuri ke sumbernya.
- Mendukung **pembayaran sebagian (parsial)** di semua transaksi → otomatis menjadi hutang/piutang yang terpantau.
- Menyediakan **laporan keuangan koperasi** (arus kas, laba-rugi, rekap hutang/piutang/pinjaman, stok) yang diklasifikasikan per kategori dan periode.

---

## Keputusan Desain (terkunci)

Keputusan berikut sudah disepakati bersama _product owner_ dan mengikat untuk ERD & implementasi:

| # | Topik | Keputusan | Implikasi |
|---|---|---|---|
| D1 | **Pemisahan keuangan** | Koperasi punya **buku kas sendiri** (`koperasi_cash_transactions`), terpisah dari kas & berangkas sekolah | Laba-rugi koperasi berdiri sendiri. Modal = pengeluaran sekolah + injeksi modal koperasi (dobel sisi). |
| D2 | **Sumber anggota** | **Tabel anggota mandiri** (`koperasi_members`), independen dari modul SDM yang belum ada | Anggota diinput manual; ada penanda tipe (pegawai/pengurus yayasan/pihak luar). Disiapkan untuk di-link ke modul SDM kelak. |
| D3 | **Simpanan anggota** | **Tidak ada simpanan** (pokok/wajib/sukarela). Koperasi hanya pinjaman + jual-beli | Tidak ada entitas simpanan. Sumber dana = modal sekolah + laba usaha. |
| D4 | **Bunga pinjaman** | **Tanpa bunga** — pokok saja | Total tagihan pinjaman = jumlah pinjaman. Angsuran = pinjaman ÷ tenor. Tidak ada perhitungan jasa. |
| D5 | **Harga pokok (HPP)** | **Modal manual per barang** (field `harga_modal` di produk, diupdate manual) | Laba per item = (harga jual − harga modal saat transaksi) × qty. Saat penjualan, harga modal di-_snapshot_. |
| D6 | **Relasi siswa** | **Relasi ringan** — penjualan menyimpan `student_id` (nullable) untuk riwayat & laporan | Kas tetap terpisah; piutang siswa **tidak** dibayar dari tabungan sekolah dan **tidak** muncul di tab keuangan siswa (kecuali sebagai PTH read-only). |

### Asumsi yang diusulkan (silakan dikoreksi)
- **A1 — Role baru `admin_koperasi`** (pengurus koperasi) ditambahkan ke RBAC. `superadmin` akses penuh; `kepala_sekolah` & `yayasan` hanya melihat laporan koperasi (konsisten dengan pola modul Keuangan). Penyaluran modal dari sisi sekolah dilakukan `admin_keuangan`/`superadmin`.
- **A2 — Scoping tahun ajaran.** Modal dan seluruh transaksi koperasi terikat `academic_year_id`, mengikuti konvensi seluruh sistem.
- **A3 — "Potong gaji"** dimodelkan sebagai _metode pembayaran_ (`potong_gaji`) yang dicatat manual oleh admin. Integrasi payroll otomatis ditunda hingga modul SDM tersedia.

---

## Features

### Core Features (MVP)

**Master Data**
- [ ] CRUD **Anggota** koperasi (tipe: pegawai / pengurus yayasan / pihak luar; status aktif/nonaktif)
- [ ] CRUD **Pemasok** (pihak luar sekolah)
- [ ] CRUD **Barang/Produk** — nama, kategori, satuan, **harga modal (manual)**, harga jual, stok berjalan

**Modal**
- [ ] **Penyaluran modal** dari Keuangan sekolah ke koperasi per tahun ajaran (tercatat sebagai pengeluaran sekolah **dan** modal masuk koperasi dalam satu aksi)

**Transaksi Barang**
- [ ] **Penjualan** ke siswa/wali (multi-item) — kurangi stok, _snapshot_ harga modal untuk laba, opsional `student_id`
- [ ] **Pembelian/Restock** dari pemasok (multi-item) — tambah stok, referensi pemasok
- [ ] Penjualan & pembelian dapat dibayar **sebagian** → sisanya jadi **piutang** (penjualan) / **hutang** (pembelian)
- [ ] Pencatatan **pembayaran** cicilan piutang/hutang (parsial, multi)

**Simpan-Pinjam**
- [ ] **Pinjaman** anggota — keperluan, jumlah, tenor (jumlah angsuran), metode (potong gaji / manual), tanpa bunga
- [ ] **Angsuran/pembayaran pinjaman** — fleksibel (pas seangsuran atau lebih/sekaligus)
- [ ] Rekap pinjaman per anggota: total hutang / sudah dibayar / sisa

**Transaksi Lain & Jurnal**
- [ ] **Transaksi lain-lain** pemasukan/pengeluaran (mis. biaya operasional, pendapatan jasa) dengan kategori
- [ ] **Jurnal arus kas** koperasi — daftar semua mutasi kas + referensi dokumen sumber + saldo berjalan

**Laporan**
- [ ] **Laporan bulanan** pemasukan/pengeluaran terklasifikasi per kategori
- [ ] **Laba-rugi** (penjualan − HPP − pengeluaran operasional)
- [ ] **Rekap hutang & piutang** (outstanding)
- [ ] **Rekap pinjaman** per anggota
- [ ] **Laporan stok** & nilai persediaan

### Nice to Have (NTH)
- [ ] Kategori barang sebagai master tersendiri (MVP: cukup string kategori)
- [ ] Cetak/ekspor nota penjualan & bukti pembayaran (PDF)
- [ ] Notifikasi stok menipis (ambang batas per barang)
- [ ] Filter & pencarian lanjutan di jurnal (per kategori/periode/anggota)

### Plan to Have (PTH)
- [ ] Integrasi **payroll** sungguhan untuk potong gaji otomatis (menunggu modul SDM)
- [ ] Surface **riwayat pembelian koperasi** (read-only) di tab keuangan siswa modul Administrasi
- [ ] **SHU / bagi hasil** akhir tahun ke anggota
- [ ] **Bunga/jasa** pinjaman (bila kebijakan berubah)
- [ ] Anggota = referensi data pegawai dari modul **SDM** saat modul itu hadir
- [ ] Aplikasi mobile: anggota cek sisa pinjaman & wali cek riwayat pembelian

---

## User Stories

### Admin Koperasi (pengurus)
- Sebagai admin koperasi, saya ingin mendata anggota, pemasok, dan barang beserta harga modal & jualnya, agar transaksi dapat dicatat dengan referensi yang benar.
- Sebagai admin koperasi, saya ingin mencatat penjualan barang ke siswa/wali (boleh dicicil), agar stok berkurang otomatis dan sisa pembayaran tercatat sebagai piutang.
- Sebagai admin koperasi, saya ingin mencatat pembelian/restock dari pemasok (boleh berhutang), agar stok bertambah dan hutang ke pemasok terpantau.
- Sebagai admin koperasi, saya ingin mencatat pinjaman anggota beserta jumlah angsurannya, agar saya tahu siapa berhutang berapa, sudah dibayar berapa, dan sisanya berapa.
- Sebagai admin koperasi, saya ingin menerima angsuran pinjaman secara fleksibel (pas atau lebih, tunai atau potong gaji), agar pelunasan mengikuti kondisi nyata anggota.
- Sebagai admin koperasi, saya ingin mencatat pemasukan/pengeluaran lain-lain berkategori, agar seluruh arus kas koperasi lengkap.
- Sebagai admin koperasi, saya ingin melihat jurnal arus kas beserta referensinya, agar setiap mutasi uang dapat ditelusuri sumbernya.
- Sebagai admin koperasi, saya ingin melihat laporan bulanan dan laba-rugi, agar kinerja koperasi terukur.

### Admin Keuangan / Superadmin
- Sebagai admin keuangan, saya ingin menyalurkan modal ke koperasi tiap tahun ajaran, agar tercatat sebagai pengeluaran sekolah sekaligus modal masuk koperasi tanpa input ganda.

### Kepala Sekolah / Yayasan
- Sebagai kepala sekolah/yayasan, saya ingin melihat laporan keuangan koperasi, agar dapat mengawasi pengelolaan unit usaha sekolah secara transparan.

---

## Glosarium

| Istilah | Arti dalam modul ini |
|---|---|
| **Modal** | Dana dari Keuangan sekolah ke koperasi per tahun ajaran (kas masuk koperasi). |
| **Piutang** | Sisa yang belum dibayar pembeli atas penjualan barang. |
| **Hutang** | Sisa yang belum dibayar koperasi ke pemasok atas pembelian barang. |
| **Pinjaman** | Uang yang dipinjam anggota; ditagih lewat angsuran tanpa bunga. |
| **Angsuran** | Cicilan pelunasan pinjaman; fleksibel nominalnya. |
| **HPP** | Harga Pokok Penjualan = harga modal barang saat terjual. |
| **Jurnal arus kas** | Buku besar mutasi kas koperasi dengan referensi ke dokumen sumber. |

---

## Reference
- PRD induk & pola modul Keuangan: [`../core/prd.md`](../core/prd.md), [`../core/prd-feature-detail.md`](../core/prd-feature-detail.md)
- Konvensi dokumentasi & pipeline: [`../README.md`](../README.md)
- Pola ledger referensial: `apps/api/model/cash_transaction.go`, `apps/api/service/transaction_writer_service.go`
- Pola hutang/piutang parsial: `apps/api/model/invoice.go`, `apps/api/model/payment.go`
