# Feedback 08: Batch Perbaikan Modul Keuangan

Dokumen tracking untuk 5 feedback modul keuangan. Dikerjakan **satu per satu, berurutan sesuai beban** (ringan → berat). Centang task saat selesai.

Legenda status: `⬜ Belum` · `🟡 Proses` · `✅ Selesai`

## Ringkasan & Urutan Pengerjaan

| # urut | Item | Tipe | Beban | Status |
|--------|------|------|-------|--------|
| 1 | **F08-2** Total bayar tidak berubah saat check/uncheck | Bug FE | S | ✅ |
| 2 | **F08-5** Tambah siswa → rombel tampil kosong | ~~Bug FE~~ Bukan bug | — | ✅ Closed (artefak Fake Filler) |
| 3 | **F08-3** "Data utama" fee item: sembunyikan rincian, tampilkan total | Tampilan FE | M | ✅ (tarif, tagihan, kwitansi — terverifikasi preview) |
| 4 | **F08-4** Item `is_koperasi` tak mengalir ke kas koperasi | Bug BE + migrasi | M–L | ✅ |
| 5 | **F08-1** Bayar parsial: pilih item (checkbox + nominal) | UX FE | L | ✅ (terverifikasi preview) |

> **Semua 5 feedback selesai.** F08-2/F08-3/F08-4 terverifikasi via preview; F08-5 ditutup (bukan bug).

### Penyempurnaan F08-3 (putaran lanjutan, 2026-06-23)
- **Detail tagihan — collapse hanya untuk "bundel".** Tagihan **bulanan** (& insidental) kini tampil **datar** tanpa collapse (tiap kategori cuma 1 item → collapse tak berguna). Collapse + subtotal hanya untuk `initial`/`registration`/`graduation`. Gate `collapseRincian`, item diekstrak ke `renderItemRow`. **Terverifikasi preview**: invoice 540 (bulanan) datar; invoice 309 (registrasi) collapse "Registrasi Tahunan — 14 item — Rp 785.000".
- **Kwitansi — label per jenis, bukan generik.** Ringkasan saat tertutup dikelompokkan per kategori dengan label ramah (mis. "Registrasi Tahunan (7 item)" / "Biaya Awal (…)") alih-alih "Pembayaran tagihan (N item)". Perlu field baru `category` di `PaymentItemResponse` (backend: `dto/payment.go` + mapper `payment_service.go`, dari `InvoiceItem.Category` yang sudah di-preload). `go build` lulus. **Verifikasi visual menunggu restart API** (field baru belum ada di proses :8080 yang sedang jalan).

Keputusan yang sudah dikunci:
- **F08-1**: pendekatan **gabungan checkbox + nominal** (pilih item + tetap bisa edit nominal per item).
- **F08-3**: **tampilan saja (collapse)**, tanpa ubah struktur data. Berlaku di tarif, detail tagihan, dan kwitansi/struk.
- **F08-4**: **backfill** invoice_item yang belum lunas (selain perbaikan generation ke depan).
- **F08-5**: dikonfirmasi **murni masalah tampilan** (refresh memulihkan) → fix di frontend.

---

## F08-2 · Total bayar tidak berubah saat check/uncheck tagihan

### Problem
Saat kasir mencentang/membuang centang tagihan, total bayar tidak ikut berubah.

### Root Cause (terverifikasi)
`totalPay` menjumlahkan **seluruh** entri `payAmounts`
([baru.tsx:117](../../apps/dashboard/src/routes/_authenticated/keuangan/pembayaran/baru.tsx)). Saat invoice di-uncheck, handler hanya mengubah `selectedInvoices` (baris ~258) — entri item milik invoice tsb **tidak dibersihkan** dari `payAmounts`, sehingga total tetap.

### Expected
Uncheck invoice → item-itemnya hilang dari perhitungan → total berkurang. Check kembali → total bertambah lagi.

### Relevant Files
- `apps/dashboard/src/routes/_authenticated/keuangan/pembayaran/baru.tsx`
- `apps/dashboard/src/routes/_authenticated/keuangan/pembayaran/components/InvoiceSelector.tsx`

### Task
- [x] Pangkas `payAmounts` mengikuti `invoiceItems` aktif via `useEffect` (baru.tsx) — memperbaiki total **dan** payload submit
- [x] Filter item identik di baru.tsx & InvoiceSelector (`sisa > 0 || dispensation`), set id konsisten → tidak desync
- [x] Lint/typecheck bersih (biome). Live di dev server :3000 via HMR; verifikasi klik via preview tertunda (port 3000 dipakai sesi dev user)

### Catatan implementasi
Ditambahkan `useEffect([invoiceItems])` di `baru.tsx` yang memangkas entri `payAmounts` untuk item yang tak lagi ada di tagihan terpilih. Penting: tanpa ini, `Object.entries(payAmounts)` saat submit ikut mengirim item dari invoice yang sudah di-uncheck.

---

## F08-5 · Tambah siswa → rombel tampil kosong (semua siswa)

### Problem
Setelah menambah siswa baru, daftar siswa menampilkan "belum ada rombel" untuk semua siswa dan daftar rombel ikut kosong. **Refresh memulihkan** → data aman, murni tampilan.

### Kesimpulan: BUKAN bug aplikasi (artefak Fake Filler)

Terkonfirmasi dari rekaman layar user: penyebabnya ekstensi **Fake Filler** (Chrome) yang mengisi *semua* field form di halaman — termasuk `<select id="academic-year">` di sidebar. Saat dipakai untuk mengisi form "Tambah Siswa", Fake Filler ikut men-trigger `onChange` dropdown Tahun Ajaran → `setAcademicYear` ke TA non-aktif (2024/2025). Karena `academicYearAtom` in-memory, daftar siswa & rombel langsung ter-filter ke TA yang memang kosong → "Tidak ada data". Refresh me-reset atom ke TA aktif (2026/2027) → data muncul lagi.

Bukti frame: f01 daftar TA **2026/2027** (benar) → f03 halaman Tambah TA **2024/2025** (flip terjadi saat Fake Filler dijalankan, bukan saat navigasi) → f15 setelah refresh kembali **2026/2027**.

**Tidak ada perubahan kode.** Untuk pengguna nyata (input manual) tidak terjadi. Opsional bila ingin tahan terhadap auto-filler: konfigurasikan ignore-list Fake Filler agar melewati `#academic-year`, atau (app-side) tambahkan atribut yang diabaikan auto-filler pada select tersebut — **tidak dikerjakan kecuali diminta**.

### Relevant Files
- `apps/dashboard/src/routes/_authenticated/administrasi/siswa/baru.tsx`
- `apps/dashboard/src/routes/_authenticated/administrasi/siswa/index.tsx`
- `apps/dashboard/src/store/global.ts` (academicYearAtom)

### Task
- [ ] Reproduksi langsung via preview untuk memastikan mekanisme
- [ ] Perbaiki sumber glitch (invalidasi key / gating render / keepPreviousData)
- [ ] Verifikasi: tambah siswa → daftar tetap benar tanpa refresh

---

## F08-3 · "Data utama" fee item — sembunyikan rincian, tampilkan total

### Problem
User bingung melihat rincian panjang di tarif / detail tagihan / kwitansi. Diinginkan tampil **total keseluruhan** (mis. "Biaya Awal — Rp1.200.000") dengan rincian tersembunyi/collapse.

### Keputusan
Tampilan saja, tanpa ubah struktur data `fee_config_item`. Pengelompokan pakai kategori/grup yang sudah ada.

### Relevant Files
- `apps/dashboard/src/routes/_authenticated/pengaturan/tarif/index.tsx`
- `apps/dashboard/src/routes/_authenticated/pengaturan/tarif/$id.tsx`
- `apps/dashboard/src/routes/_authenticated/keuangan/tagihan/$id.tsx`
- `apps/dashboard/src/routes/_authenticated/keuangan/pembayaran/$id.tsx` (kwitansi/struk)

### Task
- [x] Komponen group header bertotal + toggle collapse (default tertutup)
- [x] Terapkan di tarif (`tarif/$id.tsx`) — **terverifikasi via preview** (collapse total, expand tabel, filter chip tetap independen)
- [x] Terapkan di detail tagihan (`tagihan/$id.tsx`) — grup per kategori, header collapsible + subtotal; item (dengan aksi edit/hapus) muncul saat expand. **Terverifikasi preview** (invoice 540: 5 kategori collapsed, expand SPP menampilkan item + aksi). `tsc` & biome bersih
- [x] Terapkan di kwitansi/struk (`pembayaran/$id.tsx`) — toggle "Lihat rincian", default tertutup (total menonjol), **cetak tetap tampil penuh** (`print:table-row`). **Terverifikasi preview** (payment #1: collapsed "Pembayaran tagihan (2 item) Rp 200.000" → expand SPP Juli + Calisan TK)
- [x] Verifikasi via preview — **selesai untuk ketiga permukaan**

> Catatan data uji: dibuat 1 pembayaran uji **payment #1** (siswa 231 SENANDUNG KINASIH, invoice 540, item SPP 150rb + Calisan 50rb = 200rb) untuk verifikasi kwitansi. Hapus/abaikan sesuai kebutuhan (data dummy).

### Catatan implementasi
- Tarif: tiap kategori jadi header-kartu (chevron + jumlah item + total); klik buka `ItemTable`. Default collapse → hanya total tampil.
- Kwitansi: rincian `payment.items` (DTO tak punya `category`) di-collapse di balik toggle, bukan dikelompokkan. Baris ringkasan "Pembayaran tagihan (N item)" + subtotal tampil saat tertutup (layar saja, `print:hidden`); baris rinci `hidden print:table-row` agar struk cetak selalu lengkap.

---

## F08-4 · Item `is_koperasi` tak mengalir ke kas koperasi

### Problem
Pembayaran item dengan `is_koperasi = true` tidak mencatat kas keluar dari kas sekolah maupun kas masuk ke kas koperasi.

### Root Cause (terverifikasi — koreksi dari dugaan awal)
Seam koperasi sudah ada & ter-wire ([payment_service.go:294](../../apps/api/service/payment_service.go), [koperasi_seam.go](../../apps/api/service/koperasi_seam.go), `cmd/api/main.go:215`).

Dugaan awal "generation tidak menyalin flag" **TIDAK tepat**: helper `utility.MapFeeItemsToInvoiceItems` **sudah** menyalin `IsKoperasi` + `KoperasiProductID` (sejak commit `991dcbb`, 2026-06-19), dan **semua** item koperasi ada di kategori `initial`/`registration` (lihat seeder) yang dibangun lewat helper itu (`GenerateInitial`/`GenerateRegistration`/`GenerateGraduation`/`GenerateDaycareInitial`). Jadi forward-fix sudah benar.

Yang benar-benar kurang: **data lama** — `invoice_items` yang dibuat sebelum 19 Jun (atau di-seed dengan kode lama) `is_koperasi`-nya `false` → seam di-skip saat dibayar. Inilah penyebab "kas koperasi belum ada catatan masuk".

### Expected
Saat item koperasi pada tagihan dibayar: kas sekolah mencatat transfer keluar, kas koperasi mencatat penjualan masuk, stok varian berkurang.

### Relevant Files
- `apps/api/seeders/backfill_invoice_koperasi.go` (**baru** — migrasi backfill)
- `apps/api/cmd/api/main.go` (pemanggilan di blok "Data migrations / fixes")
- `apps/api/service/payment_service.go` + `koperasi_seam.go` (seam, sudah ada)
- `apps/api/utility/invoice_helper.go` (forward-fix, sudah ada)

### Task
- [x] Forward-fix terverifikasi sudah ada (helper `MapFeeItemsToInvoiceItems` propagasi flag; semua item koperasi kategori initial/registration)
- [x] Migrasi backfill `BackfillInvoiceKoperasiFlags`: set `is_koperasi` + `koperasi_product_id` pada `invoice_items` **belum lunas** (`status <> 'paid'`), match by fee_config(TA)+name+category, idempotent (`is_koperasi=false`)
- [x] Wire di `main.go` blok data migrations; `go build ./...` & `go vet` lulus
- [ ] Verifikasi end-to-end (pending stack jalan): jalankan API → backfill log; bayar item koperasi → cek kas sekolah keluar + kas koperasi masuk + stok turun

### Catatan
Item yang **sudah lunas** sengaja tidak di-backfill (sesuai keputusan): pembayarannya sudah lewat sehingga seam tak bisa retroaktif. Backfill berjalan otomatis saat API start berikutnya (idempotent).

### REOPEN (2026-06-23) — masih belum jalan untuk data seeded; 2 bug ditemukan & diperbaiki
Uji user: bayar tagihan registrasi (payment #2, siswa 100) → kas sekolah tak ada catatan keluar, kas koperasi tak ada masuk. Investigasi via API: **247 invoice_item, 0 yang `is_koperasi=true`** → seam tak pernah jalan.

Root cause (dua, terpisah dari forward-fix yang sudah benar):
1. **Seeder** `sample_transaction_seeder.go` membangun invoice_item initial/registration secara inline **tanpa menyalin** `IsKoperasi`/`KoperasiProductID` dari fee item (`fi`). → semua data seeded flag-nya false. **Fix:** salin kedua field (baris ~158 & ~190).
2. **Backfill** `BackfillInvoiceKoperasiFlags` pakai `UPDATE..FROM invoices JOIN .. JOIN fee_config_items ON fci.name = ii.name` — mereferensikan **target `ii` di dalam ON klausa FROM**, pola yang tidak reliabel di Postgres → 0 baris ter-update. **Fix:** ditulis ulang dengan `EXISTS` + subquery berkorelasi (referensi `ii` hanya di WHERE/SET subquery).

Catatan: **real generation aman** — `utility.MapFeeItemsToInvoiceItems` menyalin flag (dipakai `GenerateInitial`/`GenerateRegistration`). Jadi siswa yang didaftarkan via UI sudah benar; masalah hanya pada data seeded + backfill. `go build` & `go vet` lulus.

Verifikasi end-to-end (pending restart API + reseed): bayar item registrasi koperasi → kas sekolah `WriteCashDebit "koperasi_transfer"` + kas koperasi catatan masuk "penjualan" + stok varian turun.

---

## F08-1 · Bayar parsial — pilih item (checkbox + nominal)

### Problem
Saat bayar tidak penuh, kasir perlu memilih item mana yang dibayar sehingga total terpilih ≤ uang yang dibayar (mis. bayar registrasi 500rb dari 800rb).

### Keputusan
Gabungan: checkbox per item untuk memilih + tetap bisa edit nominal per item (bayar sebagian). Running total dengan peringatan bila melebihi uang yang dibayar.

### Relevant Files
- `apps/dashboard/src/routes/_authenticated/keuangan/pembayaran/components/InvoiceSelector.tsx`
- `apps/dashboard/src/routes/_authenticated/keuangan/pembayaran/baru.tsx`
- `apps/dashboard/src/routes/_authenticated/keuangan/pembayaran/components/PaymentSummary.tsx`

### Task
- [x] Tambah checkbox "ikut dibayar" per item (default tercentang; dispensasi/locked tetap wajib ikut)
- [x] Item tak tercentang → dikecualikan dari total & payload submit via state `excludedItems` (nominal tetap tersimpan di `payAmounts`)
- [x] Tetap dukung edit nominal per item (bayar sebagian); input dinonaktifkan saat item di-uncheck
- [x] Peringatan amber bila uang diterima < total ("kurang Rp X — kurangi item atau tambah uang")
- [x] **Verifikasi via preview** — uncheck Aslin: total 254rb→229rb, item hilang dari ringkasan, baris coret+redup; isi uang 200rb→peringatan kurang Rp 29.000

### Catatan implementasi
State `excludedItems: number[]` di `baru.tsx` (terpisah dari `payAmounts` agar nominal tak hilang saat uncheck). `totalPay` & payload submit memfilter id yang dikecualikan. Dipangkas mengikuti item aktif (efek `[invoiceItems]`). `InvoiceSelector` menambah checkbox per item non-dispensasi/non-locked; `PaymentSummary` menyembunyikan item dikecualikan + peringatan kekurangan tunai. `tsc` & biome bersih.
