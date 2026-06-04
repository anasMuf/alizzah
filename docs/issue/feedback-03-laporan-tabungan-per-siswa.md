# Feedback 03: Laporan Tabungan Umum per Siswa

## Konteks

Saat ini laporan tabungan (`/keuangan/laporan/tabungan`) menampilkan ringkasan global (semua siswa) per bulan — penerimaan, pengeluaran, selisih, saldo. Belum ada laporan individual per siswa yang menampilkan riwayat mutasi tabungan lengkap untuk dicetak saat pembagian tabungan.

## Tujuan

Admin bisa melihat dan mencetak laporan mutasi tabungan umum per siswa individual (riwayat setoran, penarikan, alokasi pembayaran, saldo berjalan).

## Status Saat Ini

### Yang Sudah Ada
- Halaman tabungan per siswa (`/keuangan/tabungan/siswa.$id.tsx`) — menampilkan daftar transaksi tabungan
- Backend endpoint `GET /v1/students/:id/savings/transactions` — return list transaksi tabungan per siswa
- Laporan tabungan global (`/keuangan/laporan/tabungan`) — ringkasan semua siswa per bulan

### Yang Belum Ada
- Format laporan cetak individual per siswa (saldo awal periode, mutasi, saldo akhir)
- Endpoint khusus laporan tabungan per siswa dengan saldo berjalan (running balance)

## Rencana Implementasi

### 1. Backend — Endpoint laporan tabungan per siswa

**Endpoint: `GET /v1/reports/savings/students/:id`**

Query params:
- `start_date` (opsional, default: awal tahun ajaran aktif)
- `end_date` (opsional, default: hari ini)

Response:
```json
{
  "student": { "id": 1, "full_name": "Ahmad Fauzi", "class_group": "Berlian" },
  "period": { "start_date": "2025-07-01", "end_date": "2026-06-04" },
  "saldo_awal": 150000,
  "rows": [
    {
      "date": "2025-09-05",
      "type": "deposit",
      "description": "Setoran via pembayaran Sept 2025",
      "debit": 50000,
      "credit": 0,
      "saldo": 200000
    },
    {
      "date": "2025-10-15",
      "type": "withdrawal",
      "description": "Penarikan oleh wali murid",
      "debit": 0,
      "credit": 30000,
      "saldo": 170000
    }
  ],
  "total_debit": 250000,
  "total_credit": 80000,
  "saldo_akhir": 320000
}
```

### 2. Frontend — Halaman laporan tabungan per siswa

**Opsi A — Tambah sub-halaman di laporan:** `/keuangan/laporan/tabungan/siswa/$id`
- Pencarian/pilih siswa dulu, lalu tampilkan laporan mutasi
- Filter periode (start_date, end_date)
- Tabel mutasi dengan saldo berjalan
- Tombol cetak → print layout yang rapi

**Opsi B — Tambah tombol "Cetak Laporan" di halaman tabungan siswa yang sudah ada**
- Di `/keuangan/tabungan/siswa.$id` tambah tombol cetak
- Buka dialog/popup untuk pilih periode
- Generate tampilan cetak

**Rekomendasi: Opsi A** — karena konteksnya "laporan" dan admin mungkin mau cetak banyak siswa berurutan.

**Layout cetak:**
```
===========================================
           PAUD AL-IZZAH
  Laporan Tabungan Umum Per Siswa
-------------------------------------------
Nama     : Ahmad Fauzi
Rombel   : Berlian
Periode  : Juli 2025 — Juni 2026
-------------------------------------------
No | Tanggal    | Keterangan        | Debit  | Kredit | Saldo
-------------------------------------------
   | Saldo Awal |                   |        |        | 150.000
 1 | 05/09/2025 | Setoran Sept 2025 | 50.000 |        | 200.000
 2 | 15/10/2025 | Penarikan wali    |        | 30.000 | 170.000
-------------------------------------------
   | Total      |                   |250.000 | 80.000 |
   | Saldo Akhir|                   |        |        | 320.000
===========================================
```

### File yang Perlu Dibuat/Diubah

| Layer | File | Perubahan |
|-------|------|-----------|
| DTO | `apps/api/dto/report.go` | Tambah struct laporan tabungan per siswa |
| Service | `apps/api/service/report_service.go` | Method baru: laporan tabungan individual |
| Handler | `apps/api/handler/report_handler.go` | Endpoint baru |
| Route | `apps/api/route/routes.go` | Register endpoint |
| Frontend Route | `apps/dashboard/src/routes/_authenticated/keuangan/laporan/tabungan/siswa.$id.tsx` | **Baru** |
| Frontend API | `apps/dashboard/src/api/endpoints/reports/tabungan.ts` | Hook baru untuk endpoint per siswa |
| Laporan Tabungan | `apps/dashboard/src/routes/_authenticated/keuangan/laporan/tabungan.tsx` | Tambah link "Lihat per Siswa" |
