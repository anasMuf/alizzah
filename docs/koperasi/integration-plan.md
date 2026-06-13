# Rencana Integrasi: Modul Koperasi → Codebase

> Cara modul Koperasi masuk ke arsitektur tanpa mengganggu modul Administrasi & Keuangan.
> Konteks: [`prd.md`](./prd.md) · [`erd.md`](./erd.md) · [`api-contract.md`](./api-contract.md)

> ⚠️ **Struktur mengikuti [ADR-001](../architecture/adr-001-modular-structure.md).** Koperasi dibangun sebagai **modul greenfield di struktur modular baru**, bukan ditumpuk ke folder flat lama:
> - **Backend:** `internal/modules/koperasi/<feature>/` (tiap fitur = package berisi `handler.go`/`service.go`/`repository.go`/`model.go`/`dto.go`).
> - **Frontend:** **modul di dalam `apps/dashboard`** (bukan app terpisah — koreksi, lihat ADR-002), memakai `packages/{ui,api-client,auth,config}`.
> - Tanggung jawab tiap lapisan & logika di bawah ini tetap berlaku — hanya **lokasinya** yang mengikuti ADR. Bagian §1 & §4 sudah disesuaikan; selebihnya (seam modal, urutan sub-batch, DoD, aturan stok/HPP) tetap valid.

Modul ini menjadi **Batch 8** (penomoran batch melanjutkan konvensi existing). Ia **menambah**, bukan mengubah, sehingga risiko regresi pada modul existing minimal. Tiga titik sentuh ke modul lain: (1) seam penyaluran modal ke ledger kas sekolah (`shared/ledger`), (2) FK nullable `student_id` ke `students`, (3) role baru di RBAC.

---

## 1. Backend (`apps/api`)

Struktur **module → feature → layer** ([ADR-001](../architecture/adr-001-modular-structure.md)). Modul tinggal di `internal/modules/koperasi/`, dibagi per **fitur** (tiap fitur = satu package Go):
```
internal/modules/koperasi/
├── anggota/      barang/      penjualan/    pembelian/
├── pinjaman/     kas/         modal/        laporan/
└── koperasi.go   # Module: New(deps), RegisterRoutes(g), Models()
```

### 1.1 Models (di dalam package fitur masing-masing)
Tiap fitur menaruh model-nya di `model.go` package itu (embed `PrimaryKey` + `BaseModelTimeAt`, kecuali ledger). Pemetaan tabel → fitur:
| Fitur (package) | Model |
|---|---|
| `anggota` | `KoperasiMember` |
| `barang` | `KoperasiProduct` |
| `penjualan` | `KoperasiSale`, `KoperasiSaleItem` |
| `pembelian` | `KoperasiPurchase`, `KoperasiPurchaseItem`, `KoperasiSupplier` |
| `pinjaman` | `KoperasiLoan`, `KoperasiLoanInstallment` |
| `kas` | `KoperasiCashTransaction`, `KoperasiPayment`, `KoperasiMiscTransaction` |
| `modal` | `KoperasiCapitalInjection` |
- `KoperasiCashTransaction` meniru `cash_transaction.go` (tanpa soft delete, ada `source_type`/`source_id`).
- Tiap model tetap punya `TableName()` (mis. `return "koperasi_members"`).
- `koperasi.go` meng-agregasi semua model lewat `Models()` untuk dipakai AutoMigrate di main.go.

### 1.2 AutoMigrate — `apps/api/main.go`
Tambah blok di akhir daftar `db.AutoMigrate(...)` (sekitar [main.go:49](../../apps/api/main.go)):
```go
// Batch 8 — Koperasi
&model.KoperasiMember{}, &model.KoperasiSupplier{}, &model.KoperasiProduct{},
&model.KoperasiCapitalInjection{},
&model.KoperasiPurchase{}, &model.KoperasiPurchaseItem{},
&model.KoperasiSale{}, &model.KoperasiSaleItem{},
&model.KoperasiLoan{}, &model.KoperasiLoanInstallment{},
&model.KoperasiPayment{}, &model.KoperasiMiscTransaction{},
&model.KoperasiCashTransaction{},
```
Tambah juga partial unique index bila perlu (mis. nomor nota pemasok unik per supplier) memakai `db.Exec(...)` seperti pola index existing di main.go.

### 1.3 Repository — `apps/api/repository/`
Satu repo per agregat (`koperasi_member_repository.go`, dst). Ikuti signature existing (`Create`, `CreateWithTx`, `FindByID`, `List`, `Update`, `Delete`). Penting:
- `koperasi_cash_transaction_repository.go` sediakan `CreateWithTx`, `SumByType`, `ListPaginated`, `DeleteBySource` — mirror `cash_transaction_repository.go`.
- `koperasi_product_repository.go` sediakan `AdjustStock(tx, id, delta)` (operasi atomik di dalam transaksi).

### 1.4 Service — `apps/api/service/`
Inti logika bisnis. Reuse pola transaksi DB (`db.Transaction(func(tx *gorm.DB) error { ... })`) seperti `payment_service.go`.

**`koperasi_cash_writer_service.go`** — kembar dari [`transaction_writer_service.go`](../../apps/api/service/transaction_writer_service.go):
```go
type KoperasiCashWriter interface {
    WriteCredit(ayID uint, date time.Time, amount float64, sourceType string, sourceID *uint, category, desc string, by uint, tx *gorm.DB) (uint, error)
    WriteDebit(...)  // sama, transaction_type=debit
}
```
> Mengembalikan `id` baris kas agar dokumen sumber bisa menyimpan `cash_txn_id`.

Service lain & tanggung jawabnya:
| Service | Tanggung jawab kunci |
|---|---|
| `koperasi_member_service.go` / `..._supplier` / `..._product` | CRUD master + guard hapus (409 bila terpakai/masih ada stok) |
| `koperasi_capital_service.go` | **Seam modal** (lihat §3) — butuh `cashService` sekolah + `KoperasiCashWriter` |
| `koperasi_sale_service.go` | Buat sale+items, snapshot `unit_cost`, kurangi stok, pembayaran awal, tulis kas (credit) |
| `koperasi_purchase_service.go` | Buat purchase+items, tambah stok, pembayaran awal, tulis kas (debit) |
| `koperasi_loan_service.go` | Buat loan, generate jadwal `principal/tenor`, disburse (debit kas), terima angsuran fleksibel |
| `koperasi_payment_service.go` | Alokasi pembayaran ke sale/purchase/loan, update `paid_amount`/`status`, tulis kas |
| `koperasi_misc_service.go` | Pemasukan/pengeluaran lain-lain + tulis kas |
| `koperasi_report_service.go` | Monthly (group by category), profit-loss (HPP dari `unit_cost`), receivables/payables/loans/stock |

Sertakan `*_service_test.go` untuk logika berisiko (alokasi angsuran fleksibel, snapshot HPP, sinkron stok) — mengikuti contoh `class_group_service_test.go`.

### 1.5 Handler — `apps/api/handler/`
Satu handler per resource dengan anotasi Swagger lengkap (wajib, agar Orval bisa generate). Mirror `expense_handler.go` / `payment_handler.go`. Pakai `dto` request/response baru di `apps/api/dto/koperasi_*.go` dan helper `success_response.go` / `paginated_response.go` yang sudah ada.

### 1.6 Routes — `apps/api/main.go`
Tambah grup setelah blok Reports (sekitar [main.go:514](../../apps/api/main.go)):
```go
// Batch 8: Koperasi
kop := api.Group("/koperasi", middleware.JWTAuth(tokenBlacklistRepo))
kopManage := []string{"superadmin", "admin_koperasi"}
kopView    := []string{"superadmin", "admin_koperasi", "kepala_sekolah", "yayasan"}

kop.GET("/members", koperasiMemberHandler.List, middleware.RequireRoles(kopManage...))
// ... CRUD members/suppliers/products
kop.POST("/capital-injections", koperasiCapitalHandler.Create,
    middleware.RequireRoles("superadmin", "admin_keuangan")) // seam modal
kop.POST("/sales", koperasiSaleHandler.Create, middleware.RequireRoles(kopManage...))
kop.POST("/loans/:id/payments", koperasiPaymentHandler.PayLoan, middleware.RequireRoles(kopManage...))
kop.GET("/cash/transactions", koperasiCashHandler.Transactions, middleware.RequireRoles(kopView...))
kop.GET("/reports/monthly", koperasiReportHandler.Monthly, middleware.RequireRoles(kopView...))
// ... selengkapnya lihat api-contract.md
```
Dan blok **Dependency Injection** (repos → services → handlers) di bagian wiring main.go, mengikuti urutan existing (Batch 6/7 sebagai contoh).

### 1.7 Seeders — `apps/api/seeders/`
Tambah `seed_koperasi.go` dan panggil di `main.go` setelah seeder existing:
```go
seeders.SeedKoperasiMasters(db)       // anggota, pemasok, barang contoh
seeders.SeedKoperasiTransactions(db)  // modal, penjualan, pembelian, pinjaman contoh (depends on TA & students)
```
Daftarkan grup baru di flag `--reseed` (`koperasi`).

---

## 2. Role baru `admin_koperasi` (A1)

| Lokasi | Perubahan |
|---|---|
| `apps/api/seeders/` (seed users) | Tambah akun contoh role `admin_koperasi` |
| `apps/api/main.go` (routes) | Pakai di `RequireRoles` seperti §1.6 |
| `apps/dashboard` Sidebar & guards | Tambah flag `isAdminKoperasi` |
| Dokumen | Update tabel role di [`../core/prd-feature-detail.md`](../core/prd-feature-detail.md) (opsional) |

> Tidak ada perubahan skema `users` — cukup nilai string `role` baru. Konsisten dengan RBAC existing.

---

## 3. Seam lintas modul: Penyaluran Modal (D1)

Pola acuan: **`CashService.TransferToVault`** (`apps/api/service/cash_service.go`) yang menulis _cash debit + vault credit_ dalam satu transaksi. Modal koperasi analog: _school-cash debit + koperasi-cash credit_.

```go
// koperasi_capital_service.go (disederhanakan)
func (s *svc) Create(req dto.CreateCapitalInjection, by uint) (*model.KoperasiCapitalInjection, error) {
    return s.db.Transaction(func(tx *gorm.DB) error {
        // 1) Debit kas SEKOLAH (pakai writer existing)
        if err := s.schoolCashWriter.WriteCashDebit(req.AcademicYearID, req.Date, req.Amount,
            "koperasi_modal", nil, "Penyaluran modal koperasi", by, tx); err != nil { return err }
        schoolTxnID := /* id baris debit */

        // 2) Buat record modal
        ci := &model.KoperasiCapitalInjection{ ..., SchoolCashTxnID: schoolTxnID }
        if err := tx.Create(ci).Error; err != nil { return err }

        // 3) Credit kas KOPERASI
        _, err := s.koperasiCashWriter.WriteCredit(req.AcademicYearID, req.Date, req.Amount,
            "capital_injection", &ci.ID, "modal", "Modal dari keuangan sekolah", by, tx)
        return err
    })
}
```
- `schoolCashWriter` = `TransactionWriterService` yang **sudah** ada (di-inject ke service koperasi).
- Idempotensi/role: hanya `admin_keuangan`/`superadmin` (lihat §1.6) — pihak yang berwenang mengeluarkan kas sekolah.
- Penghapusan modal (bila diizinkan) harus membalik **kedua** sisi (pola `DeleteCashBySource`).

> **Alternatif** (lebih longgar): sisi sekolah cukup pakai modul Pengeluaran existing dengan kategori "Modal Koperasi", lalu admin koperasi mencatat modal masuk terpisah. Lebih sederhana tapi rawan input ganda/tidak sinkron — **tidak direkomendasikan**.

---

## 4. Frontend — modul di `apps/dashboard`

Koperasi adalah **modul di dalam `apps/dashboard`** (seperti administrasi & keuangan), **bukan** app terpisah — karena bagian dari suite Manajemen yang sama (audiens & login sama). Pola **feature-first**: route tipis di `routes/_authenticated/koperasi/`, isi di `features/koperasi/`.

> **Dashboard memanggil DUA backend** (karena backend tetap 2 binary, ADR-002). Path `/koperasi/*` → koperasi-api, sisanya → school-api. Diatur via path-routing di `@alizzah/api-client` (`customInstance` membaca `VITE_KOPERASI_API_URL`) untuk dev; di produksi nginx host memisah by-path dalam satu domain.

### 4.1 API hooks (Orval) via `@alizzah/api-client`
Regen Swagger (`swag` di `apps/api`, anotasi handler koperasi sudah ada) → Orval generate ke `packages/api-client` (satu sumber, dipakai dashboard). `customInstance` otomatis mengarahkan path `/koperasi/*` ke koperasi-api.

### 4.2 Routes — `apps/dashboard/src/routes/_authenticated/koperasi/`
Cangkang tipis; komponen halaman dari `features/koperasi/`:
```
koperasi/index.tsx        → Overview (saldo kas, ringkasan)
koperasi/anggota/  barang/  pemasok/
koperasi/penjualan/  pembelian/  pinjaman/
koperasi/kas/transaksi.tsx → jurnal arus kas
koperasi/laporan/{bulanan,laba-rugi,piutang,hutang,stok}.tsx
```
**Penyaluran modal** diletakkan di menu **Keuangan** (dipicu `admin_keuangan`), memanggil endpoint koperasi-api.

### 4.3 Navigasi — Sidebar dashboard
Tambah section "Koperasi" di `apps/dashboard/src/components/layout/Sidebar.tsx` (pola sama dengan section "Keuangan"): operasional untuk `admin_koperasi`/`superadmin`; Laporan juga untuk `kepala_sekolah`/`yayasan`.

### 4.4 Komponen
Pakai `@alizzah/ui` (sudah dipakai dashboard) + hooks dari `@alizzah/api-client`. Tanpa dependensi UI baru.

---

## 5. Urutan Implementasi (sub-batch)

| Sub-batch | Lingkup | Hasil bisa diuji |
|---|---|---|
| **0 — Fondasi** (selesai) | Backend: skeleton `internal/{platform,shared,modules}` + main.go pola Register/Models. Frontend: ekstrak `packages/{ui,api-client,auth,config}` (dashboard mengonsumsinya). (Lihat [ADR-001 §7](../architecture/adr-001-modular-structure.md).) | dashboard build hijau memakai packages |
| **8a — Master** | Fitur `anggota`, `barang`, `pembelian`(supplier) — model+repo+service+handler per package. Role `admin_koperasi`. Seeder master. | CRUD master jalan end-to-end |
| **8b — Kas & Modal** | `koperasi_cash_*` + `KoperasiCashWriter` + seam penyaluran modal. Endpoint saldo & jurnal. | Modal masuk; saldo & jurnal tampil; kas sekolah ter-debit |
| **8c — Barang dagang** | Penjualan & pembelian (multi-item, parsial, stok, HPP snapshot) + pembayaran piutang/hutang. | Jual/beli + cicilan; stok & kas akurat |
| **8d — Simpan-pinjam** | Pinjaman + jadwal angsuran + pembayaran fleksibel + rekap per anggota. | Pinjam, angsur, rekap hutang anggota |
| **8e — Lain-lain & Laporan** | Transaksi lain-lain + laporan (bulanan, laba-rugi, piutang/hutang, pinjaman, stok). | Semua laporan tampil & cocok dengan jurnal |
| **8f — Frontend** | Routes + Sidebar + halaman per sub-fitur (paralel mengikuti 8a–8e setelah Orval). | UI lengkap |

Setiap sub-batch: backend dulu (model→handler) → regen Swagger/Orval → frontend. Tambah unit test service untuk 8b–8d.

---

## 6. Checklist Definition of Done
- [ ] AutoMigrate sukses tanpa menyentuh tabel modul lain
- [ ] Seeder koperasi jalan & terdaftar di `--reseed`
- [ ] Role `admin_koperasi` terjaga di semua route koperasi; penyaluran modal hanya `admin_keuangan`/`superadmin`
- [ ] Penyaluran modal menulis **dua** sisi (kas sekolah debit + kas koperasi credit) dalam satu transaksi DB
- [ ] Stok tidak pernah negatif; HPP ter-snapshot saat penjualan
- [ ] `paid_amount`/`status` konsisten dengan Σ `koperasi_payments`
- [ ] Setiap mutasi kas punya baris `koperasi_cash_transactions` dengan `source_type`+`source_id`
- [ ] Saldo kas koperasi == Σ credit − Σ debit; laporan cocok dengan jurnal
- [ ] Swagger ter-update & Orval ter-regen; lint Biome bersih (CI blocking)
- [ ] Unit test service untuk alokasi angsuran, sinkron stok, dan seam modal hijau
