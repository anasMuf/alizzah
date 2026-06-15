# Penyaluran Dana Keuangan → Penjualan Koperasi (Koreksi Alur Modal)

> **Perubahan desain** cara koperasi memperoleh dana. Menggantikan fitur "Modal" (penyaluran manual) yang sudah dibangun di FE-2. Lingkup: **lintas modul** (Keuangan ↔ Koperasi).
>
> Asal: feedback koperasi putaran 1 ([feedback-01.md](./feedback-01.md), butir M1). Dokumen ini memuat detail alur & dampak teknisnya secara terpisah.

**Status:** 🟡 perencanaan — keputusan utama terkunci; satu detail desain (pemetaan item ↔ barang/varian & stok) masih perlu diputuskan (§6).

## 1. Latar belakang — koreksi pemahaman
**Pemahaman lama (salah, terlanjur diimplementasi):** keuangan menyalurkan **modal** (lump-sum) ke koperasi via fitur **Modal/`capital-injections`** — debit kas sekolah, kredit kas koperasi — sebagai modal untuk belanja stok.

**Alur sebenarnya:** koperasi **tidak** menerima penyaluran dana manual. Pada **Biaya Awal & Registrasi** tiap tahun ajaran terdapat **item-item tertentu milik koperasi** (mis. barang perlengkapan: 4 Stel Seragam, Rompi, Tas, Kaos Kaki, Lunch Box, Baju Ganti). Ketika **siswa membayar**, porsi item-koperasi itulah yang menjadi dana/pemasukan koperasi.

## 2. Keputusan (terkunci)
| # | Keputusan |
|---|---|
| **M1a** | **Konfigurasi item koperasi.** Admin menandai **fee item mana** (di Biaya Awal & Registrasi) yang dialokasikan ke koperasi. Daftar lengkap ditentukan **user**, tidak hardcode. Teknis: penanda (flag/kategori) `koperasi` pada `fee_config_item`. |
| **M1b** | **Aliran otomatis saat dibayar.** Saat pembayaran invoice memuat item-koperasi, sistem otomatis: (1) **kredit kas koperasi** sebesar porsi item tsb; (2) mencatat **penjualan koperasi ke siswa** (tertaut `student_id`). Seam **Keuangan → Koperasi** dipicu **pembayaran siswa** (bukan aksi manual). |
| **M1c** | **Hapus & ganti fitur Modal.** Bongkar penyaluran modal manual: backend `capital-injections` + halaman **Modal** (menu Koperasi) + **Modal Koperasi** (menu Keuangan) + seam/kartu terkait. Digantikan alur M1b. |

## 3. Alur detail
```
[Admin] Konfigurasi: tandai fee item "milik koperasi" (M1a)
        (mis. seragam, tas, lunch box, dst di Biaya Awal/Registrasi)
                 │
[Siswa]  Bayar tagihan Biaya Awal/Registrasi (sebagian/penuh) — modul Keuangan
                 │  pembayaran teralokasi ke item-item
                 ▼
[Seam]   Untuk setiap item-koperasi yang TERBAYAR pada pembayaran itu:
           → catat PENJUALAN koperasi ke siswa (source="registrasi", student_id)
           → KREDIT kas koperasi sebesar nilai terbayar item tsb
                 │  (atomik, satu transaksi DB — pola seam existing)
                 ▼
[Koperasi] Penjualan & kas koperasi bertambah otomatis; tampil di laporan koperasi.
```

Catatan:
- Pembayaran **parsial** → alokasi proporsional/utuh ke item-koperasi perlu aturan jelas (lihat §6).
- Idempoten: hindari dobel-catat bila pembayaran diedit/dibatalkan.

## 4. Dampak teknis
### Keuangan (school-api)
- `fee_config_item`: tambah penanda item-koperasi (mis. `is_koperasi bool` atau `owner=koperasi`). UI fee config: checkbox "Milik koperasi".
- `payment_service`: setelah pembayaran tercatat, deteksi porsi item-koperasi yang terbayar → panggil **seam** ke koperasi (lintas-modul, satu transaksi DB; pola sama seperti seam modal lama yang akan dibongkar — mekanismenya dipakai ulang).

### Koperasi (koperasi-api)
- Endpoint/handler internal menerima seam → buat `Sale` (penjualan) dengan **`source="registrasi"`** (bedakan dari POS manual), `student_id`, item & nilai; **kredit kas koperasi**.
- `Sale`/`SaleItem`: tambah kolom `source` (`pos` | `registrasi`).
- **Hapus** modul `modal` (capital-injection): model, repo, service, handler, route; + FE terkait.

### Frontend (dashboard)
- **Hapus** halaman **Modal** (menu Koperasi) & **Modal Koperasi** (menu Keuangan) + NavLink + kartu Overview terkait.
- Fee config (Keuangan): UI penanda item-koperasi.
- Penjualan koperasi: tampilkan **sumber** (POS vs Registrasi); penjualan registrasi mungkin read-only.

## 5. Migrasi
- Data `capital-injections` lama (mis. modal 5jt di dev) → ditarik/dihapus saat fitur Modal dibongkar.
- Tidak ada data registrasi-koperasi historis yang perlu di-backfill kecuali diminta.

## 6. Open item — perlu diputuskan
**Pemetaan item fee ↔ barang/varian koperasi & stok:**
- Apakah fee item (mis. "4 Stel Seragam") **dipetakan** ke barang/varian koperasi sehingga penjualan-registrasi **memotong stok** & menghitung **HPP/laba**? **Atau** barang registrasi dikelola **terpisah** (tanpa stok koperasi), sehingga penjualan-registrasi hanya mencatat nilai (kas + pendapatan) tanpa stok?
- Bila dipetakan: butuh tabel/relasi `fee_item ↔ product/variant` + qty default per siswa.

> Keputusan §6 menentукan kompleksitas implementasi. Disarankan dibahas sebelum mulai koding M1.

## 7. Dampak ke laporan
- **Kas & penjualan koperasi**: bertambah dari alur registrasi (otomatis).
- **Penjualan koperasi** kini punya **2 sumber**: POS manual + registrasi.
- **Laporan Kontrol Bulanan sekolah** ([../core/plans/laporan-kontrol-bulanan.md](../core/plans/laporan-kontrol-bulanan.md)): baris "Koperasi" = **alokasi item registrasi koperasi** ini (bukan setoran manual).

## 8. Urutan implementasi (terkait)
Sebaiknya dikerjakan **bersama fondasi backend** feedback koperasi (varian/master) karena menyentuh penjualan & kas koperasi. Prasyarat: keputusan §6 (pemetaan item↔barang).
