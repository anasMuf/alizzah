# Feedback Modul Koperasi — Putaran 1

> Umpan balik setelah frontend koperasi (FE-0…FE-5) selesai & ter-merge ke develop.
> Dokumen ini merekam **keputusan** tiap butir agar implementasi berikutnya jelas.
> Konteks: [`prd.md`](./prd.md) · [`erd.md`](./erd.md) · [`api-contract.md`](./api-contract.md) · [`frontend-implementation-plan.md`](./frontend-implementation-plan.md)

**Status:** 🟡 perencanaan — keputusan terkunci di bawah; menunggu **contoh laporan** dari user untuk butir Laporan.

## Ringkasan keputusan

| # | Butir | Keputusan | Dampak | Prioritas |
|---|---|---|---|---|
| A1 | Import data pegawai (SQL) → anggota | **Tunggu modul SDM**; sementara pakai bulk-action manual | FE (bulk) | Sedang |
| A2 | Bulk register + detail anggota + shortcut | **Ya** — halaman detail anggota + aksi cepat | FE | Sedang |
| B1 | Varian barang (ukuran/harga berbeda) | **Ya — opsional per barang** | Backend + FE (besar) | Tinggi |
| B2 | Master kategori & satuan barang | **Ya** — master + dropdown (bukan input bebas) | Backend kecil + FE | Sedang |
| P1 | Layout Catat Penjualan | **POS / kasir (halaman penuh)** | FE besar | Tinggi |
| P2 | Pilih varian saat penjualan | **Ya** (mengikuti B1) | FE | Tinggi |
| P3 | Pembayaran parsial di POS | **Ya** — bayar awal di POS, sisa = piutang | FE | Tinggi |
| P4 | `potong_gaji` di penjualan | **Hapus** (default tunai; transfer menyusul) | Backend + FE kecil | Rendah |
| P5 | Validasi input nominal | **Ya** | FE | Rendah |
| PB1 | Layout Catat Pembelian | **POS-style halaman penuh** (mengikuti P1) | FE besar | Tinggi |
| PB2 | `potong_gaji` di pembelian | **Hapus** | Backend + FE kecil | Rendah |
| PB3 | Validasi input nominal | **Ya** | FE | Rendah |
| M1 | **Modal koperasi (KOREKSI)** | **Hapus penyaluran manual**; dana koperasi = item Biaya Awal/Registrasi tertentu (configurable) yg dibayar siswa → auto kas koperasi + penjualan ke siswa | Backend besar + FE (hapus Modal) | Tinggi |
| L1 | Penjelasan kolom "Netto" bulanan | **Bukan bug** — netto = masuk − keluar per kategori | — | — |
| L2 | "Contoh laporan" = **Control Bulanan sekolah** (lintas modul) | **Bukan laporan koperasi** → inisiatif laporan tingkat **sistem/keuangan**; koperasi hanya 1 baris kontribusi | Sistem (besar, dok terpisah) | Tinggi |

---

## Anggota

### A1 — Sumber data anggota (pegawai SQL)
**Keputusan:** Tunggu **modul SDM**. Data pegawai **tidak** di-import massal sekarang untuk menghindari data ganda yang harus direkonsiliasi saat SDM hadir. Sesuai keputusan terkunci **D2** (tabel anggota koperasi mandiri, independen SDM).

- Sementara: anggota didaftarkan lewat **bulk-action manual** (A2) + form satuan yang sudah ada.
- Saat modul SDM siap: rancang integrasi pegawai↔anggota (mis. tombol "tambahkan pegawai sebagai anggota", atau FK opsional `employee_id`). Dicatat sebagai pekerjaan **Fase SDM**, di luar lingkup sekarang.

### A2 — Bulk register + detail anggota + shortcut
**Keputusan:** Implementasikan.
- **Bulk register**: pilih banyak (mis. dari daftar/tempel nama) → daftarkan sekaligus sebagai anggota. (Saat SDM ada, bulk dari daftar pegawai.)
- **Halaman detail anggota** (`/koperasi/anggota/$id`): identitas + ringkasan (total pinjaman aktif, sisa hutang, riwayat pembelian) + **shortcut**: "Ajukan Pinjaman", "Catat Penjualan ke anggota ini", dll.
- Backend: endpoint detail/ringkasan per anggota mungkin perlu ditambah (rekap pinjaman per anggota sudah ada via `/loans/summary`).

---

## Barang

### B1 — Varian barang (KEPUTUSAN: YA, opsional)
Barang boleh punya beberapa **varian** (mis. Seragam → S/M/L/XL) dengan **harga modal, harga jual, dan stok berbeda**. Barang tanpa varian tetap bisa seperti sekarang.

**Aspek yang terdampak (hasil pemeriksaan):**

| Aspek | Dampak |
|---|---|
| **Model/DB** | Tabel baru `koperasi_product_variants` (`product_id` FK, `name`/label varian, `cost_price`, `sale_price`, `stock`). **Harga & stok pindah ke level varian.** Barang non-varian = 1 "varian default" (transparan ke user). |
| **Stok** | Stok di-track **per varian**, bukan per barang. Penyesuaian stok (jual/beli) menyasar `variant_id`. |
| **Harga/HPP** | `cost_price`/`sale_price` per varian; snapshot HPP saat penjualan ambil dari varian. |
| **Penjualan/Pembelian** | `SaleItem`/`PurchaseItem` mereferensi **`variant_id`** (bukan hanya `product_id`). Pemilih item: pilih barang → pilih varian → harga otomatis dari varian. |
| **Laporan Stok** | Baris per varian (atau barang dengan sub-baris varian); nilai persediaan dari stok×HPP per varian. |
| **Migrasi** | Tiap barang lama → buat 1 varian default (bawa harga/stok). `SaleItem`/`PurchaseItem` lama → isi `variant_id` ke varian default. |
| **Seeder** | Seeder master ([`seed.go`](apps/api/internal/modules/koperasi/seed.go)) tambah contoh varian (mis. seragam S/M/L). |
| **API contract** | Endpoint barang + item jual/beli berubah (tambah variant). Perlu update `api-contract.md`. |

**Usulan desain:** "semua barang punya ≥1 varian" (non-varian = satu varian default) → satu jalur kode, lebih bersih daripada hibrida (harga di barang **atau** di varian). UI menyembunyikan kerumitan: barang tanpa varian tampil seperti sekarang (1 baris harga/stok).

**Catatan lingkup:** ini perubahan **backend + frontend besar** (model, migrasi, service jual/beli, laporan, semua form & picker terkait). Disarankan dikerjakan sebagai **fase tersendiri** sebelum atau bersamaan dengan rombak POS (karena picker POS butuh varian).

### B2 — Master kategori & satuan
**Keputusan:** Implementasikan master data.
- Tabel `koperasi_categories` & `koperasi_units` (atau satu master generik) + CRUD ringkas.
- Form barang: **dropdown** kategori & satuan (bukan teks bebas). Boleh "tambah baru" inline.
- Migrasi: nilai kategori/satuan teks bebas yang ada → jadikan entri master.

---

## Penjualan

### P1 — Layout POS / kasir (KEPUTUSAN: POS halaman penuh)
Ganti SlideOver "Catat Penjualan" menjadi **halaman kasir penuh**:
- **Kiri:** pencarian/daftar barang cepat (grid/list) → klik untuk tambah ke keranjang; jika barang punya varian, muncul pilihan varian (P2).
- **Kanan:** keranjang (item, qty editable, subtotal), **total berjalan**, pembeli (siswa via picker `/students` / nama bebas), lalu **pembayaran** (P3).
- Pola/komponen boleh meniru halaman **Catat Pembayaran** modul keuangan agar konsisten.

### P2 — Pilih varian saat penjualan
**Keputusan:** Ya. Saat memilih barang ber-varian, tampilkan opsi varian (ukuran dll); harga otomatis dari varian terpilih. (Bergantung B1.)

### P3 — Pembayaran di POS (parsial)
**Keputusan:** POS punya langkah **pembayaran awal** — boleh **penuh atau sebagian**; sisa otomatis jadi **piutang** (status sebagian/belum). Pelunasan berikutnya tetap lewat **detail penjualan → Catat Pembayaran** (form yang sudah ada). Jadi: POS = transaksi + bayar awal; detail = cicilan lanjutan.

### P4 — Hapus `potong_gaji` dari penjualan
**Keputusan:** Hapus opsi `potong_gaji` pada pembayaran penjualan. Default **tunai**; metode lain (mis. transfer) bisa ditambah belakangan. *(Potong gaji hanya relevan untuk **pinjaman** anggota/pegawai.)* Perlu sesuaikan backend `penjualan.PaymentRequest`/`CreateRequest` (validasi `oneof`) + FE.

### P5 — Validasi input nominal
**Keputusan:** Tambah validasi: nominal > 0, tidak melebihi sisa/total yang relevan, format angka rapi, cegah submit nilai tak valid. Berlaku di POS & form pembayaran.

---

## Pembelian

### PB1 — Layout POS-style
**Keputusan:** Samakan dengan rencana POS penjualan (halaman penuh): pilih pemasok → tambah barang (+ varian) ke daftar dengan **harga beli** → total → bayar (parsial → hutang). Konsisten dengan P1.

### PB2 — Hapus `potong_gaji` dari pembelian
**Keputusan:** Hapus. Membayar **pemasok** tidak relevan dengan potong gaji. Default tunai (+ transfer menyusul).

### PB3 — Validasi input nominal
**Keputusan:** Sama dengan P5.

---

## Modal Koperasi (KOREKSI ALUR — penting)

**Koreksi pemahaman:** "modal" koperasi **bukan** penyaluran dana manual dari keuangan (seperti fitur **Modal** yang sudah terlanjur dibangun di FE-2). Alur sebenarnya: pada **Biaya Awal & Registrasi** tiap tahun ajaran terdapat **item-item tertentu yang menjadi milik koperasi** (mis. barang perlengkapan: 4 Stel Seragam, Rompi, Tas, Kaos Kaki, Lunch Box, Baju Ganti). Saat siswa **membayar**, porsi item-koperasi itu menjadi pemasukan/dana koperasi.

**Keputusan:**
- **M1a — Konfigurasi item koperasi:** tambah **setting** agar admin menandai **fee item mana** (Biaya Awal & Registrasi) yang dialokasikan ke koperasi. Daftar lengkap ditentukan **user**, tidak hardcode. Teknis: flag/penanda `koperasi` pada `fee_config_item`.
- **M1b — Aliran otomatis saat dibayar:** ketika pembayaran invoice memuat item-koperasi, sistem **otomatis**: (1) **kredit kas koperasi** sebesar porsi item tsb, dan (2) mencatatnya sebagai **penjualan koperasi ke siswa** (tertaut `student_id`). Ini **seam keuangan → koperasi** yang dipicu **pembayaran siswa** (bukan penyaluran manual).
- **M1c — Hapus & ganti fitur Modal:** **hapus** penyaluran modal manual yang sudah ada — backend `capital-injections` + halaman **Modal** (menu Koperasi) + **Modal Koperasi** (menu Keuangan) + seam/kartu terkait. Digantikan aliran registrasi di atas.

**Dampak teknis:**
- **Keuangan:** penanda item-koperasi di fee config; pada `payment_service`, saat item-koperasi dibayar → picu seam ke koperasi.
- **Koperasi:** terima seam → buat **penjualan** (sumber = "registrasi", tertaut siswa) + kredit kas. Hapus modul/halaman Modal. **Penjualan koperasi kini punya 2 sumber:** POS manual + auto dari registrasi (perlu penanda `source`).
- **Pemetaan item ↔ barang:** fee item (mis. "4 Stel Seragam") perlu dipetakan ke **barang/varian koperasi** agar stok & HPP/laba terhitung — atau diputuskan penjualan-registrasi **tidak** memotong stok bila barang registrasi dikelola di luar stok koperasi. **Detail desain menyusul.**
- **Migrasi:** data `capital-injections` lama (mis. modal 5jt di dev) ditarik/dihapus saat fitur Modal dibuang.

> **Reconcile:** baris "Koperasi" di [Laporan Kontrol Bulanan](../core/plans/laporan-kontrol-bulanan.md) perlu disesuaikan dengan alur ini (bukan lagi "setoran manual").

---

## Laporan

### L1 — Penjelasan kolom "Netto" (laporan bulanan)
**Bukan bug.** Laporan bulanan saat ini = **ringkasan arus kas per kategori**, bukan saldo berjalan:
- `Masuk (credit)` = total pemasukan kategori; `Keluar (debit)` = total pengeluaran kategori.
- `Netto = Masuk − Keluar` **per kategori** (mis. modal +5jt; pinjaman/pencairan −1jt).
- Baris **Total**: Total Masuk, Total Keluar, **Total Netto = arus kas bersih bulan itu**.

Yang user harapkan (debit/kredit + **saldo berjalan** ala jurnal) adalah **format berbeda** → kemungkinan tercakup oleh L2.

### L2 — Laporan yang dibutuhkan = "Control Bulanan" sekolah (lintas modul)
Contoh dari user (`docs/Control Bulanan AL IZZAH WALI PAPAT - Google Spreadsheet.pdf`) ternyata **bukan laporan koperasi**, melainkan **laporan kontrol keuangan bulanan SEKOLAH** — matriks **12 bulan (Juli–Juni) × kategori**:
- **Pemasukan**: Biaya Masuk KB/TK, Semester/DU, Tabungan Berlian, SPP, Infaq Harian, Jasa Antar Jemput, BOP, Pendapatan lain-lain, LBB, Kelulusan, PASTA, **Koperasi** → Total Pemasukan
- **Pengeluaran**: Beban Operasional (jasa antar-jemput, kegiatan, bekal, **gaji pegawai**, **gaji guru ekstrakurikuler**, kelulusan…) + Beban Administrasi (ATK/perbaikan komputer-printer, listrik & air, telpon & internet, honorarium, THR) → TOTAL BEBAN
- **Tabungan** (saldo + kas tabungan dipegang), **Kas** (saldo berjalan), **Total Piutang** (PPDB, semester, tabungan, SPP, infaq, kelulusan…), **Hutang Sekolah**

**Implikasi (keputusan):**
- Ini **inisiatif laporan tingkat sistem/keuangan**, jauh lebih luas dari koperasi → **DI LUAR lingkup modul koperasi**.
- Koperasi hanya menyumbang **satu baris "Pemasukan: Koperasi"** (kontribusi/laba bersih) — konsisten **D1** (kas koperasi terpisah; yang masuk kontrol sekolah hanya kontribusinya, bukan seluruh kas koperasi).
- **5 laporan koperasi** yang sudah ada **tetap** untuk operasional koperasi (tidak diganti).
- Akan dibuat **dokumen perencanaan terpisah** di level sistem/keuangan untuk "Laporan Kontrol Bulanan", termasuk **analisis sumber data** (mana yang sudah ada di modul keuangan vs gap, mis. beban gaji/honorarium yang mungkin belum tercatat).

> **Open item:** konfirmasi penempatan & semantik baris koperasi (lihat pertanyaan di PR/chat) sebelum dokumen perencanaan sistem ditulis.

---

## Catatan urutan implementasi (usulan)

Karena banyak butir saling bergantung, urutan yang masuk akal:

1. **Backend varian (B1)** + master kategori/satuan (B2) + hapus `potong_gaji` (P4/PB2) + migrasi data → satu fondasi backend.
2. **Modal (M1)**: hapus fitur penyaluran manual; tambah penanda item-koperasi di fee config + seam pembayaran-registrasi → penjualan koperasi + kas. (Sebaiknya bareng/menyusul fondasi backend karena menyentuh penjualan & kas.)
3. **FE master**: form Barang dengan varian + dropdown kategori/satuan.
4. **POS Penjualan (P1–P3, P5)** lalu **POS Pembelian (PB1, PB3)** — pakai picker varian.
5. **Anggota**: bulk register + detail + shortcut (A2).
6. **Laporan (L2 / Kontrol Bulanan)** — dokumen perencanaan terpisah; setelah open items dikonfirmasi.

> Integrasi SDM/payroll (A1 + baris gaji di Kontrol Bulanan) di luar lingkup ini (fase terpisah saat modul SDM ada).
