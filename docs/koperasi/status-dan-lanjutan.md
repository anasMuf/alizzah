# Status & Panduan Lanjutan — Modul Koperasi

> Dokumen **handoff** agar pengerjaan bisa dilanjutkan (oleh siapa pun / agen lain) tanpa konteks sesi sebelumnya. Tanggal acuan: **2026-06-16**.
>
> Untuk **keputusan** lihat [feedback-01.md](./feedback-01.md); **kontrak API** lihat [api-contract.md](./api-contract.md); **pola FE** lihat [frontend-implementation-plan.md](./frontend-implementation-plan.md).

## 1. Status saat ini

Modul koperasi (backend 8a–8e + FE-0…FE-5 + seeder) sudah selesai sebelumnya. **Feedback putaran 1 — Step 1 (fondasi backend) SELESAI & ter-merge ke `develop`:**

| PR | Isi | Status |
|---|---|---|
| #33 | Hapus opsi `potong_gaji` dari penjualan & pembelian (P4/PB2) — hanya pinjaman yang punya potong gaji | ✅ merged |
| #34 | Master kategori & satuan (B2) — tabel generik `koperasi_master_data(kind,name)`, endpoint `/categories` & `/units`, FE `MasterSelect` (dropdown + tambah-baru inline) | ✅ merged |
| #35 | Varian barang (B1) — backend + migrasi + FE | ✅ merged |

### Detail B1 (varian) yang sudah jadi
- Tabel **`koperasi_product_variants`** (`product_id, name, cost_price, sale_price, stock, is_active`). **Harga & stok pindah ke level varian.** Setiap barang punya ≥1 varian; barang "tanpa varian" = satu varian bernama **`Default`**.
- `koperasi_products` **tidak lagi** punya kolom `cost_price/sale_price/stock` (dibuang oleh migrasi setelah datanya disalin ke varian).
- Penjualan & pembelian: item menerima **`variant_id`** (disarankan); `product_id` masih diterima → di-resolve ke varian `Default` (kompatibilitas picker lama). `SaleItem`/`PurchaseItem` menyimpan `variant_id` + snapshot `variant_name`. Stok & HPP per varian.
- Laporan stok: **satu baris per varian**.
- `GET /products` mengembalikan `variants[]` + `variant_count` + **agregat kompatibilitas** (`cost_price`/`sale_price` = varian default, `stock` = total).
- Migrasi `barang.MigrateVariants` (idempotent, dipanggil di `cmd/koperasi/main.go` setelah AutoMigrate): backfill varian `Default` dari kolom legacy → drop kolom legacy → isi `variant_id` item lama.
- FE `BarangForm`: toggle **"Barang memiliki beberapa varian"** (OFF = mode sederhana → varian `Default`; ON = editor varian). Stok varian existing read-only (dikelola transaksi). Daftar barang menampilkan badge **"N varian"**.

### Data demo di DB dev
Verifikasi menyisakan beberapa barang/transaksi uji di DB dev: **Kaos Olahraga** & **Sepatu Sekolah** (multi-varian), **Pensil 2B**, beberapa penjualan uji. Aman dihapus; seeder fresh menghasilkan contoh varian yang rapi (Seragam Batik S/M/L).

## 2. Cara menjalankan & verifikasi lokal

Arsitektur: **modular monolith multi-binary**, satu PostgreSQL bersama (lihat [adr-001](../architecture/adr-001-modular-structure.md), [adr-002](../architecture/adr-002-deployment-multi-binary.md)).

- **school-api** (`cmd/api`, port `8080`) — akademik + keuangan; **login hanya di sini**.
- **koperasi-api** (`cmd/koperasi`, port `8081` via env `KOPERASI_PORT`) — seluruh route `/api/v1/koperasi/*`. Memvalidasi JWT yang sama (shared `JWT_SECRET` + token-blacklist di DB bersama).

Backend (dari `apps/api/`, `godotenv` memuat `../../.env`):
```bash
cd apps/api
go build -o /tmp/alizzah-api ./cmd/api && /tmp/alizzah-api            # :8080
KOPERASI_PORT=8081 go run ./cmd/koperasi                              # :8081 (AutoMigrate+MigrateVariants+Seed jalan saat start)
```

Frontend: satu app `apps/dashboard` (Vite). `customInstance` mengarahkan URL ber-`/koperasi/` ke `VITE_KOPERASI_API_URL` (:8081/api), selain itu ke `VITE_API_URL` (:8080/api).

**User seed** (password semua `password123`): `superadmin@alizzah.sch.id`, `admin_koperasi@alizzah.sch.id`, `admin_keuangan@alizzah.sch.id`, dst.

Cek cepat via API:
```bash
T=$(curl -s -X POST localhost:8080/api/v1/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin_koperasi@alizzah.sch.id","password":"password123"}' | jq -r .data.token)
curl -s localhost:8081/api/v1/koperasi/products -H "Authorization: Bearer $T" | jq
```

> Gotcha dev: bila menambah **route bersarang** baru, **restart Vite** (dev server panjang menumpuk module graph basi antar branch → error "failed to resolve" palsu). Production build selalu otoritatif.

## 3. Konvensi FE koperasi (penting)

- Koperasi memakai **hooks React Query tulisan-tangan**, **bukan Orval** (client Orval sekolah yang ter-commit masih stale; regen penuh ditunda). Helper di [`features/koperasi/lib/client.ts`](../../apps/dashboard/src/features/koperasi/lib/client.ts): `kopGet`, `kopGetPaged` (`{data, meta}`), `kopSend`. BASE = `/v1/koperasi`. Envelope `{message, data}` di-unwrap ke `data`.
- Pola per-fitur: `features/koperasi/<fitur>/api.ts` (types + keys + hooks) + komponen + route page di `routes/_authenticated/koperasi/`.
- Komponen UI bersama via `#/components/ui` (Atomic Design). Belum ada `Select` atom → koperasi punya `MasterSelect` lokal sebagai contoh dropdown.
- RBAC koperasi (lihat `internal/modules/koperasi/koperasi.go`): `manage` = superadmin + admin_koperasi (master/transaksi); `view` lebih luas (+ keuangan/kepsek/yayasan) untuk kas & laporan.

## 4. Langkah berikutnya (urutan feedback-01)

1. **POS Penjualan (P1–P3, P5)** — ganti SlideOver "Catat Penjualan" jadi **halaman kasir penuh**: kiri = cari/grid barang → klik tambah; barang ber-varian → pilih varian (harga otomatis dari varian); kanan = keranjang (qty editable, subtotal, total berjalan) + pembeli (picker siswa `/students` atau nama bebas) + **bayar awal parsial** (sisa = piutang). Validasi nominal (P5). Backend **sudah siap** (kirim `variant_id` per item). Boleh meniru halaman "Catat Pembayaran" modul keuangan.
   - File acuan: [`features/koperasi/penjualan/PenjualanForm.tsx`](../../apps/dashboard/src/features/koperasi/penjualan/PenjualanForm.tsx), [`penjualan/api.ts`](../../apps/dashboard/src/features/koperasi/penjualan/api.ts), barang `useProducts` (punya `variants[]`).
2. **POS Pembelian (PB1, PB3)** — pola POS sama untuk restock dari pemasok (pilih pemasok → tambah barang+varian dengan harga beli → bayar parsial → hutang).
3. **Anggota (A2)** — bulk register + halaman detail + shortcut (import pegawai menunggu modul SDM, lihat A1).
4. **M1 — penyaluran dana** ([penyaluran-dana-koperasi.md](./penyaluran-dana-koperasi.md)): **TERBLOKIR** sampai keputusan **§6** (pemetaan item fee ↔ barang/varian & dampak stok) dibuat user. Hapus fitur Modal lama + seam pembayaran-registrasi → penjualan koperasi.
5. **Laporan Kontrol Bulanan** ([../core/plans/laporan-kontrol-bulanan.md](../core/plans/laporan-kontrol-bulanan.md)) — laporan keuangan **sekolah** lintas modul (bukan koperasi), dikerjakan setelah open item.

## 5. Catatan kerja
- Per perubahan: branch dari `develop`, PR di-squash-merge (`gh pr merge --squash --delete-branch`).
- Verifikasi tiap PR: `go build ./... && go vet`, `tsc --noEmit && biome check` (di `apps/dashboard`), lalu cek alur via curl + browser preview.
