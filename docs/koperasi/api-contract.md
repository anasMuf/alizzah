# API Contract: Modul Koperasi

> Berdasarkan: [`erd.md`](./erd.md). Mengikuti konvensi [`../core/api-contract.md`](../core/api-contract.md).

## Base URL & Konvensi
- Base path: `/api/v1`. Seluruh endpoint koperasi di-prefix `/koperasi`.
- Auth: JWT Bearer (`Authorization: Bearer <token>`) untuk semua endpoint.
- Format respons & status code: identik dengan API sekolah (lihat [`../core/api-contract.md`](../core/api-contract.md)).
  - Sukses tunggal: `{ "message": "...", "data": {...} }`
  - Sukses list: `{ "message": "...", "data": [...], "meta": { "page", "limit", "total" } }`
  - Error: `{ "message": "..." }`
- Validasi body: `go-playground/validator`. Anotasi Swagger wajib di tiap handler → regen Orval.

## Role Akses (A1)

| Grup endpoint | superadmin | admin_koperasi | admin_keuangan | kepala_sekolah / yayasan |
|---|---|---|---|---|
| Master (anggota, pemasok, barang) | ✅ kelola | ✅ kelola | — | — |
| Penjualan, pembelian, pinjaman, pembayaran, lain-lain | ✅ kelola | ✅ kelola | — | — |
| **Penyaluran modal** (`POST /koperasi/capital-injections`) | ✅ | — | ✅ | — |
| Jurnal kas & saldo | ✅ | ✅ | view | view |
| Laporan koperasi | ✅ | ✅ | view | view |

> Disisipkan via `middleware.RequireRoles(...)` seperti pola modul Keuangan.

---

## Ringkasan Endpoint

| Resource | Method & Path |
|---|---|
| Anggota | `GET/POST /koperasi/members`, `GET/PUT/DELETE /koperasi/members/:id` |
| Pemasok | `GET/POST /koperasi/suppliers`, `GET/PUT/DELETE /koperasi/suppliers/:id` |
| Barang | `GET/POST /koperasi/products`, `GET/PUT/DELETE /koperasi/products/:id` |
| Master Kategori | `GET/POST /koperasi/categories`, `PUT/DELETE /koperasi/categories/:id` (sumber dropdown barang, B2) |
| Master Satuan | `GET/POST /koperasi/units`, `PUT/DELETE /koperasi/units/:id` (sumber dropdown barang, B2) |
| Modal | `GET/POST /koperasi/capital-injections`, `GET /koperasi/capital-injections/:id` |
| Penjualan | `GET/POST /koperasi/sales`, `GET/DELETE /koperasi/sales/:id` |
| Pembelian | `GET/POST /koperasi/purchases`, `GET/DELETE /koperasi/purchases/:id` |
| Pinjaman | `GET/POST /koperasi/loans`, `GET /koperasi/loans/:id`, `GET /koperasi/loans/:id/installments` |
| Pembayaran | `POST /koperasi/sales/:id/payments`, `POST /koperasi/purchases/:id/payments`, `POST /koperasi/loans/:id/payments` |
| Lain-lain | `GET/POST /koperasi/misc-transactions`, `DELETE /koperasi/misc-transactions/:id` |
| Jurnal Kas | `GET /koperasi/cash/balance`, `GET /koperasi/cash/transactions` |
| Laporan | `GET /koperasi/reports/monthly`, `/profit-loss`, `/receivables`, `/payables`, `/loans`, `/stock` |

---

## Detail Endpoint Kunci

### Varian barang (B1)
Harga modal, harga jual, dan stok berada di **level varian** (`koperasi_product_variants`). Setiap barang punya ≥1 varian; barang "tanpa varian" = satu varian `Default`.
- `POST/PUT /koperasi/products` menerima `variants: [{id?, name, cost_price, sale_price, stock?, is_active?}]`. Bila `variants` kosong, field legacy `cost_price/sale_price/stock` membuat/memperbarui satu varian `Default` (kompatibilitas form lama).
- `GET /koperasi/products` mengembalikan `variants[]` + `variant_count`, plus agregat kompatibilitas (`cost_price`/`sale_price` varian default, `stock` = total stok semua varian).
- Item **penjualan & pembelian** menerima `variant_id` (disarankan). `product_id` masih diterima dan di-resolve ke varian `Default`. Item menyimpan snapshot `variant_id` + `variant_name`.
- `GET /koperasi/reports/stock` kini **satu baris per varian** (`variant_id`, `variant_name`).

### Penyaluran Modal — seam lintas modul (D1)
```
POST /koperasi/capital-injections      (superadmin | admin_keuangan)
```
Body:
```json
{ "academic_year_id": 3, "injection_date": "2026-07-01", "amount": 5000000, "notes": "Modal awal TA 2026/2027" }
```
Validasi: `academic_year_id` required; `amount` gt=0.
Efek (satu transaksi DB):
1. Tulis **debit** `cash_transactions` sekolah (`source_type=koperasi_modal`).
2. Buat `koperasi_capital_injections` (simpan `school_cash_txn_id`).
3. Tulis **credit** `koperasi_cash_transactions` (`source_type=capital_injection`).

Respons `201`:
```json
{ "message": "Modal berhasil disalurkan", "data": { "id": 1, "amount": 5000000, "school_cash_txn_id": 142, "academic_year_id": 3 } }
```

### Penjualan (D5, D6)
```
POST /koperasi/sales                   (superadmin | admin_koperasi)
```
Body:
```json
{
  "academic_year_id": 3,
  "student_id": 57,
  "buyer_name": null,
  "sale_date": "2026-07-10",
  "items": [
    { "product_id": 4, "quantity": 1, "unit_price": 150000 },
    { "product_id": 9, "quantity": 2, "unit_price": 25000 }
  ],
  "initial_payment": 100000,
  "payment_method": "cash"
}
```
Validasi: minimal 1 item; `quantity` gt=0; `unit_price` gte=0; stok cukup (`product.stock >= quantity`); `initial_payment` lte total. `student_id` & `buyer_name` keduanya opsional (salah satu disarankan).
Efek: buat sale + items (snapshot `unit_cost` dari `product.cost_price`); `stock -= qty`; bila `initial_payment>0` → buat `koperasi_payments`(in) + credit kas; set `status`.

### Pembelian / Restock
```
POST /koperasi/purchases               (superadmin | admin_koperasi)
```
Body mirip penjualan dengan `supplier_id`, `reference_number`, `items[].unit_price` = harga beli, `initial_payment` (out). Efek: `stock += qty`; `cost_price` **tidak** otomatis berubah (D5).

### Pinjaman (D4)
```
POST /koperasi/loans                   (superadmin | admin_koperasi)
```
Body:
```json
{ "academic_year_id": 3, "member_id": 8, "purpose": "Biaya berobat", "principal": 1200000, "tenor": 6, "repayment_method": "potong_gaji", "loan_date": "2026-07-15" }
```
Validasi: `member_id` exists & aktif; `principal` gt=0; `tenor` gte=1; `repayment_method` ∈ {potong_gaji, manual}.
Efek: buat loan; generate `koperasi_loan_installments` (`amount_due = principal/tenor`, sisa pembulatan ke angsuran terakhir); **debit** kas (`source_type=loan_disbursement`).

```
POST /koperasi/loans/:id/payments      (superadmin | admin_koperasi)
```
Body: `{ "amount": 200000, "payment_date": "2026-08-01", "method": "potong_gaji", "notes": "" }`
Efek: alokasi `amount` ke angsuran terurut (fleksibel — boleh > satu angsuran); `paid_amount += amount`; update `status`; `koperasi_payments`(in) + credit kas.

### Pembayaran piutang/hutang
```
POST /koperasi/sales/:id/payments      → direction in,  credit kas
POST /koperasi/purchases/:id/payments  → direction out, debit kas
```
Body: `{ "amount", "payment_date", "method", "notes" }`. Validasi: `amount` gt=0 & lte sisa (`total_amount - paid_amount`).

### Jurnal Kas
```
GET /koperasi/cash/balance             → { "balance": 4250000, "academic_year_id": 3 }
GET /koperasi/cash/transactions        ?page&limit&academic_year_id&source_type&start_date&end_date
```
Tiap baris menyertakan `source_type`, `source_id`, `category`, `description` (referensi).

### Laporan
```
GET /koperasi/reports/monthly          ?academic_year_id&month&year
GET /koperasi/reports/profit-loss      ?academic_year_id&start_date&end_date
GET /koperasi/reports/receivables      ?academic_year_id            (piutang penjualan outstanding)
GET /koperasi/reports/payables         ?academic_year_id            (hutang pembelian outstanding)
GET /koperasi/reports/loans            ?academic_year_id&member_id  (rekap pinjaman: total/dibayar/sisa)
GET /koperasi/reports/stock                                          (stok & nilai persediaan = stock × cost_price)
```
- **monthly**: agregasi `koperasi_cash_transactions` per `category` (credit vs debit).
- **profit-loss**: `pendapatan_penjualan` − `HPP` (Σ `unit_cost×qty`) − `pengeluaran_operasional` (misc expense) = `laba_bersih`.

---

## Validasi & Status Code Penting
| Skenario | Status |
|---|---|
| Stok tidak cukup saat penjualan | `422` |
| Pembayaran melebihi sisa hutang/piutang | `400` |
| `tenor` < 1 atau `principal` ≤ 0 | `400` |
| Anggota/pemasok/barang tidak ditemukan | `404` |
| Role tidak berwenang (mis. admin_koperasi salurkan modal) | `403` |
| Hapus barang yang masih punya stok / terpakai transaksi | `409` |
