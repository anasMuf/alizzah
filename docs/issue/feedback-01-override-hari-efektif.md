# Feedback 01: Override Jumlah Hari Efektif per Item Tagihan

## Konteks

Saat ini hari efektif diinput secara global per rombel (`effective_days` table) dan digunakan sebagai default saat generate tagihan bulanan. Namun admin tidak bisa mengubah jumlah hari langsung di detail tagihan siswa tertentu — misal siswa yang masuk tengah bulan, izin panjang, dll.

Item tagihan yang terpengaruh:
- **Infaq harian** (`monthly_infaq`, unit: `per_day`) — dihitung: `amount × total_days`
- **Tabungan Wajib Berlian** (`savings_mandatory`, unit: `per_monday`) — dihitung: `amount × total_mondays`

## Tujuan

Admin keuangan bisa mengubah jumlah hari/jumlah Senin langsung di halaman detail tagihan siswa, yang akan me-recalculate nominal item tagihan tersebut.

## Status Saat Ini

### Backend
- `invoice_items` tidak menyimpan jumlah hari. Jumlah hari hanya embedded di nama item: `"Infaq Harian (22 hari)"`, `"Tab. Wajib (4 Senin)"`
- `RecalculateInfaqHarian()` di `invoice_generate_service.go:349` recalculate berdasarkan `effective_days` global — tidak support override per siswa
- Tidak ada endpoint untuk mengubah jumlah hari per item tagihan

### Frontend
- Halaman detail tagihan (`tagihan/$id.tsx`) tampil read-only untuk item tagihan
- Admin hanya bisa edit item tagihan di halaman rombel → hari efektif, yang berlaku global

## Rencana Implementasi

### 1. Migrasi Database — Tambah kolom di `invoice_items`

```sql
ALTER TABLE invoice_items ADD COLUMN quantity INT;
ALTER TABLE invoice_items ADD COLUMN unit_price DECIMAL(15,2);
```

- `quantity`: jumlah hari atau jumlah Senin (nullable — null berarti item flat/fixed)
- `unit_price`: harga satuan per hari/per Senin (nullable)
- Ketika `quantity` dan `unit_price` ada, `amount = quantity × unit_price`
- Migrasi data existing: parse jumlah dari nama item dan populate kolom baru

### 2. Backend — Update model & logic

**Model `invoice_item.go`:**
```go
type InvoiceItem struct {
    // ...existing fields...
    Quantity  *uint    `gorm:""`                        // jumlah hari/senin (nil = fixed)
    UnitPrice *float64 `gorm:"type:decimal(15,2)"`      // harga satuan (nil = fixed)
}
```

**Service `invoice_generate_service.go`:**
- Update `GenerateMonthly()` — saat buat item infaq/tabungan wajib, simpan `quantity` dan `unit_price` di samping `amount`
- Update `RecalculateInfaqHarian()` — skip item yang sudah di-override manual (tandai dengan field baru atau logic: jika `quantity` berbeda dari `effective_days.TotalDays`)

**Endpoint baru — `PUT /v1/invoices/:id/items/:item_id/quantity`:**
```json
// Request
{ "quantity": 18 }

// Response — item yang sudah di-recalculate
{ "id": 123, "quantity": 18, "unit_price": 5000, "amount": 90000, ... }
```

- Validasi: hanya item dengan `unit_price` yang bisa diubah
- Validasi: `quantity` tidak boleh 0 negatif
- Validasi: item yang sudah dibayar penuh (`status = paid`) tidak bisa diubah
- Jika `paid_amount > 0`, `amount` baru harus >= `paid_amount`
- Recalculate `invoice.total_amount` setelah update

### 3. Frontend — Edit quantity di halaman detail tagihan

**Halaman `tagihan/$id.tsx`:**
- Pada kolom item tagihan yang punya `quantity`, tampilkan field input angka (inline edit)
- Saat user ubah angka → hit endpoint `PUT .../quantity` → refresh data
- Tampilkan info: `unit_price × quantity = amount`
- Visual: badge "Override" jika quantity berbeda dari default hari efektif rombel

### File yang Perlu Diubah

| Layer | File | Perubahan |
|-------|------|-----------|
| Model | `apps/api/model/invoice_item.go` | Tambah field `Quantity`, `UnitPrice` |
| DTO | `apps/api/dto/invoice.go` | Tambah field di response & request baru |
| Service | `apps/api/service/invoice_generate_service.go` | Simpan quantity/unit_price saat generate, skip override saat recalculate |
| Handler | `apps/api/handler/invoice_handler.go` | Endpoint baru PUT quantity |
| Route | `apps/api/route/routes.go` | Register endpoint baru |
| Frontend | `apps/dashboard/src/routes/_authenticated/keuangan/tagihan/$id.tsx` | Inline edit quantity |
| API Client | Auto-generate via Orval | — |
