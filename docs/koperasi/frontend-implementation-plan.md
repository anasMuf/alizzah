# Rencana Implementasi Frontend — Modul Koperasi

> Breakdown fase **frontend** modul Koperasi di `apps/dashboard`. Backend (sub-batch 8a–8e) **sudah selesai & ter-merge**; dokumen ini hanya soal UI. Untuk konteks penuh lihat [`integration-plan.md`](./integration-plan.md), [`api-contract.md`](./api-contract.md), [`prd.md`](./prd.md).

**Status:** 🟢 **SELESAI** — seluruh fase FE-0…FE-5 terimplementasi & terverifikasi (PR #18, #23, #24, #25, #26, #27, #28).

---

## 1. Arsitektur frontend (kondisi sekarang)

- **Satu app** `apps/dashboard` (tidak ada `packages/` lagi — sudah dilipat balik, PR #19). Impor internal via subpath **`#/*`** → `./src/*`.
- Koperasi = **modul/feature** di dalam dashboard. Pola **feature-first**: route tipis di `src/routes/_authenticated/koperasi/`, logika di `src/features/koperasi/`.
- **Dua backend** (backend tetap 2 binary): path `/koperasi/*` → **koperasi-api** (`:8081` dev, env `VITE_KOPERASI_API_URL`), sisanya → school-api (`:8080`). Pemisahan oleh `customInstance` di `src/api/mutator/custom-instance.ts`.
- **Hooks manual** (React Query), **bukan Orval** — client Orval modul sekolah yang ter-commit masih stale; regen penuh ditunda ke tugas pipeline tersendiri. Sampai saat itu, koperasi memakai helper `kopGet`/`kopSend`.
- **Komponen & tema** dari `#/components/ui` (Tailwind v4). Tanpa dependensi UI baru.

---

## 2. Pola referensi (dari fitur **Anggota** — replikasi untuk fitur lain)

Tiap fitur master = **3 file** + 1 baris sidebar. Data layer bersama sudah ada di [`src/features/koperasi/lib/client.ts`](apps/dashboard/src/features/koperasi/lib/client.ts) (`kopGet`/`kopSend`, BASE `/v1/koperasi`, auto-unwrap envelope `{message,data}`).

```
src/features/koperasi/<fitur>/api.ts        # types + query keys + hooks (kopGet/kopSend)
src/features/koperasi/<fitur>/<Fitur>Form.tsx   # SlideOver + FormField + mutation
src/routes/_authenticated/koperasi/<fitur>.tsx  # cangkang route + halaman list
src/components/layout/Sidebar.tsx           # tambah <NavLink> di section Koperasi
```

**`api.ts`** — meniru [`anggota/api.ts`](apps/dashboard/src/features/koperasi/anggota/api.ts): `interface X`/`XInput`, `xKeys` (namespace `["koperasi","<resource>", …]`), lalu `useXList/useCreateX/useUpdateX/useDeleteX` — tiap mutation `onSuccess: qc.invalidateQueries({ queryKey: xKeys.all })`.

**`<Fitur>Form.tsx`** — `SlideOver` + `FormField`, panggil `useCreateX`/`useUpdateX` dengan callback `onSuccess`/`onError` per-panggilan → `useToast().addToast({variant,title,message})`.

**route page** — `createFileRoute("/_authenticated/koperasi/<fitur>")`; pakai hook list (state `isLoading/isError`), search via `useMemo` filter, tabel, `Badge`, `EmptyState`, `ConfirmDialog` untuk hapus, `Button` "Tambah". Komponen diimpor dari `#/components/ui`: `Badge, Button, ConfirmDialog, EmptyState, useToast` (+ `SlideOver, FormField` di form).

---

## 3. RBAC & navigasi (sesuai backend `koperasi.go`)

| Kelompok | Role yang diizinkan | Fitur |
|---|---|---|
| **manage** | `superadmin`, `admin_koperasi` | anggota, barang, pemasok, penjualan, pembelian, pinjaman, lain-lain |
| **view** | + `admin_keuangan`, `kepala_sekolah`, `yayasan` | kas (saldo & jurnal), laporan |
| **modal — salur (POST)** | `superadmin`, `admin_keuangan` | penyaluran modal (di menu **Keuangan**) |
| **modal — lihat (GET)** | + `admin_koperasi` | riwayat modal |

Sidebar: section "Koperasi" digate `isAdminKoperasi`. Halaman view (kas/laporan) bila ingin tampil untuk kepsek/yayasan → gate terpisah (pola section "Keuangan"). **Penyaluran modal** ditaruh di section Keuangan (pemicu `admin_keuangan`), bukan di section Koperasi.

---

## 4. Fase implementasi (urutan)

Tiap fase = 1 PR ke `develop`. Backend semua sudah ada, jadi tiap fase murni FE + verifikasi browser.

| Fase | Fitur | Endpoint koperasi-api | Kompleksitas | Status |
|---|---|---|---|---|
| **FE-0** Fondasi | `lib/client.ts`, path-routing, sidebar, **Anggota** (CRUD) | `/members*` | referensi | ✅ #18 |
| **FE-1** Master | **Barang**, **Pemasok** (CRUD) | `/products*`, `/suppliers*` | rendah | ✅ #23 |
| **FE-2** Kas, Modal, Overview | Kas (read), riwayat Modal, Overview koperasi | `/cash/*`, `/capital-injections*` | sedang | ✅ #24 |
| **FE-3a** Penjualan | **Penjualan** multi-item + bayar piutang + **tautan siswa** (D6) | `/sales*`, `…/payments`, `GET /students` | tinggi | ✅ #25 |
| **FE-3b** Pembelian | **Pembelian** multi-item + bayar hutang | `/purchases*`, `…/payments` | tinggi | ✅ #26 |
| **FE-4** Simpan-pinjam | **Pinjaman** + jadwal angsuran + rekap per anggota | `/loans*`, `…/installments`, `…/payments`, `/loans/summary` | tinggi | ✅ #27 |
| **FE-5** Lain-lain & Laporan | **Lain-lain** + **5 Laporan** (bulanan, laba-rugi, piutang, hutang, stok) | `/misc-transactions*`, `/reports/*` | sedang | ✅ #28 |

### FE-1 — Master (Barang, Pemasok)
CRUD murni, salin pola Anggota persis. **Barang** punya field stok & harga/HPP (read-only stok di list; HPP manual saat input). **Pemasok** = master kontak. DoD: dua halaman CRUD end-to-end + 2 NavLink.

### FE-2 — Kas, Modal, Overview
- **Kas** (read-only): kartu saldo (`GET /cash/balance`) + tabel jurnal arus kas (`GET /cash/transactions`) dengan `source_type`/`source_id` & filter periode. Tanpa form.
- **Modal**: riwayat penyaluran (`GET /capital-injections`) untuk koperasi; **form salur** (`POST`) diletakkan di **menu Keuangan** (role `admin_keuangan`).
- **Overview** `koperasi/index.tsx`: ringkasan saldo (mengganti placeholder home "Saldo Bersih").

### FE-3 — Penjualan & Pembelian
Pola transaksi (lebih berat dari master):
- **List** (`GET /sales` | `/purchases`) dengan status pembayaran (Badge lunas/parsial/belum).
- **Form create** multi-item (tambah/hapus baris item, qty, harga; total auto). Penjualan kurangi stok; pembelian tambah stok + HPP.
- **Detail** (`GET /:id`): rincian item + riwayat pembayaran.
- **Aksi bayar** (`POST /:id/payments`): pembayaran parsial → update `paid_amount`/`status`.

### FE-4 — Pinjaman
- **List** (`GET /loans`) + **rekap** (`GET /loans/summary`).
- **Form pengajuan** (`POST /loans`): keperluan, nominal, tenor (free-text, tanpa bunga).
- **Detail** (`GET /:id` + `GET /:id/installments`): jadwal angsuran.
- **Aksi angsur** (`POST /:id/payments`): pembayaran fleksibel.

### FE-5 — Lain-lain & Laporan
- **Lain-lain** (`/misc-transactions`): list + form pemasukan/pengeluaran lain (kategori, nominal). Detail read.
- **Laporan** (read-only, filter periode): Bulanan, Laba-Rugi, Piutang, Hutang, Stok — masing-masing tabel + ringkasan, cocokkan dengan jurnal kas.

---

## 5. Definition of Done — per halaman

- [ ] Route `createFileRoute("/_authenticated/koperasi/<fitur>")` (cangkang tipis), komponen di `features/koperasi/<fitur>/`.
- [ ] `<NavLink>` di Sidebar (gate role sesuai §3).
- [ ] Hooks di `features/koperasi/<fitur>/api.ts` (query keys ber-namespace + invalidation di mutation).
- [ ] List: state **loading / empty (`EmptyState`) / error** ditangani; search bila relevan.
- [ ] Form (`SlideOver`): validasi minimal + `useToast` sukses/gagal.
- [ ] Detail page untuk fitur transaksi (penjualan, pembelian, pinjaman).
- [ ] `pnpm --filter dashboard check` (Biome) bersih + `build` hijau.
- [ ] **Diverifikasi di browser** (login `admin_koperasi`): create/edit/hapus/bayar berjalan, data sinkron.

---

## 6. Catatan teknis

- **Envelope**: API balas `{message, data}`; `customInstance` bungkus `{data: body}`; `kopGet`/`kopSend` meng-unwrap ke `data` langsung.
- **Path-routing**: cukup pakai BASE `/v1/koperasi` di `kopGet/kopSend` — `customInstance` mengenali substring `/koperasi/` dan mengarahkan ke `VITE_KOPERASI_API_URL`.
- **Query keys**: selalu diawali `"koperasi"` agar invalidasi terisolasi dari modul sekolah.
- **Jangan** regen Orval penuh untuk dashboard sampai ada tugas refresh pipeline khusus (client sekolah stale) — tetap hooks manual.
- **Dev lokal**: `apps/api` → `cmd/api` (`:8080`) + `cmd/koperasi` (`:8081`, env `KOPERASI_PORT`); dashboard `:3000`.
