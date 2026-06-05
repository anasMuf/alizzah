# A01-L08: DailyClosing Create Tanpa Transaksi

## Problem (Masalah / Konteks)

`DailyClosingService.Create()` melakukan `FindByDate` + `Create` di luar transaksi database. Dua request concurrent bisa sama-sama melewati cek "tutup buku untuk tanggal ini sudah ada" dan membuat **duplicate daily closing**.

## Current Behavior (Kondisi Saat Ini)

**File:** `apps/api/service/daily_closing_service.go:60-93`

```go
func (s *dailyClosingService) Create(closedBy uint, req dto.CreateDailyClosingRequest) (*dto.DailyClosingListResponse, error) {
    closingDate, _ := utility.ParseDate(req.ClosingDate)
    
    existing, _ := s.repo.FindByDate(closingDate)  // ← cek di luar tx
    if existing != nil {
        return nil, echo.NewHTTPError(409, "Tutup buku untuk tanggal ini sudah ada")
    }
    
    // ... perhitungan ...
    
    // ❌ Tidak dalam transaksi — race condition antara FindByDate dan Create
    if err := s.repo.Create(dc); err != nil {
        return nil, err
    }
}
```

### Steps to Reproduce

1. Dua admin menekan "Tutup Buku" untuk tanggal yang sama secara hampir bersamaan
2. Kedua request: `FindByDate` → `nil` (belum ada)
3. Kedua request lanjut ke `Create` → duplicate daily closing

## Expected Behavior (Kondisi yang Diharapkan)

Tiga opsi:

### Opsi A: Unique constraint di database
```sql
ALTER TABLE daily_closings ADD CONSTRAINT uq_daily_closing_date UNIQUE (closing_date);
```
+ tangkap error duplicate key di aplikasi → return 409.

### Opsi B: Transaksi dengan SELECT FOR UPDATE
Tidak efektif karena `FindByDate` mencari record yang belum ada — tidak ada row untuk dilock.

### Opsi C: Kombinasi
Tambahkan unique constraint + transaksi (untuk atomicity perhitungan + insert).

## Relevant Files / Area

- `apps/api/service/daily_closing_service.go:60-93` — Create
- Database — perlu unique constraint

## Task (Daftar Pekerjaan)

- [ ] Tambahkan unique constraint di level database: `UNIQUE (closing_date)`
- [ ] Wrap Create dalam transaksi database
- [ ] Tangkap error duplicate dan return 409
- [ ] Tulis test concurrent
