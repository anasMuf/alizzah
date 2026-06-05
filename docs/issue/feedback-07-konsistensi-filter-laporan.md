# Feedback 07: Konsistensi UX Filter di Semua Halaman Laporan

## Konteks

Halaman laporan saat ini menggunakan pola filter yang berbeda-beda:

| Halaman | Pola Filter | Masalah |
|---------|-------------|---------|
| Harian | Date picker + "Tampilkan" / "Ganti Filter" | 2-state (selected vs confirmed) |
| Bulanan | Month + Year dropdowns + "Tampilkan" / "Ganti Filter" | 2-state |
| Tahunan | TA dropdown + "Tampilkan" / "Ganti Filter" | 2-state |
| Posisi Kas | Month + Year + "Tampilkan" / "Ganti Filter" | 2-state |
| Saldo | Month + Year + Category + "Tampilkan" / "Ganti Filter" | 2-state |
| Pengeluaran | Month + Year + "Tampilkan" / "Ganti Filter" | 2-state |
| Tabungan | Type + Month + Year + "Tampilkan" / "Ganti Filter" | 2-state |
| Kelas | ClassGroup + Month + Year (auto-fetch) | Langsung fetch, tidak ada tombol |
| Rekap Siswa | Search siswa + TA toggle | Search-based |

**Masalah utama:**
1. Pola "Tampilkan" → "Ganti Filter" menggunakan **2-state**: user pilih filter → klik "Tampilkan" → data muncul → link "Ganti Filter" muncul → klik → reset ke state pilih. Ini tidak konsisten dengan halaman non-laporan yang langsung filter (seperti daftar pengeluaran, penerimaan, pembayaran, kas transaksi).
2. Beberapa halaman langsung auto-fetch (kelas), beberapa butuh klik tombol — tidak konsisten.
3. Visual filter bar berbeda-beda antar halaman.

## Tujuan

Standarisasi UX filter di semua halaman laporan agar konsisten dengan halaman operasional lainnya (pengeluaran, penerimaan, kas transaksi).

## Pola Target

Mengikuti pola yang sudah dipakai di halaman **Penerimaan**, **Kas Transaksi**, **Daftar Pengeluaran**:

```
┌──────────────────────────────────────────────────────────┐
│  [Bulan ▾]  [Tahun ▾]  [Kategori ▾]   Reset Filter      │
└──────────────────────────────────────────────────────────┘
```

**Prinsip:**
1. **Auto-fetch** — data langsung dimuat saat filter berubah, tidak perlu tombol "Tampilkan"
2. **Default terisi** — bulan/tahun default ke bulan ini, langsung tampil data
3. **Reset Filter** — satu tombol untuk reset semua filter ke default
4. **Satu state** — tidak ada "Ganti Filter" / 2-state. Filter selalu terlihat dan editable.
5. **Layout seragam** — semua filter dalam satu baris horizontal `flex flex-wrap gap-4 items-end`

## Halaman yang Perlu Diubah

### 1. Laporan Harian (`harian.tsx`)
- **Saat ini:** Date picker + "Tampilkan Laporan" / "Ganti Filter"
- **Target:** Date picker auto-fetch (default hari ini). Tidak perlu tombol.

### 2. Laporan Bulanan (`bulanan.tsx`)
- **Saat ini:** Month + Year dropdowns + "Tampilkan" / "Ganti Filter"
- **Target:** Month + Year auto-fetch (default bulan ini). Tidak perlu tombol.

### 3. Laporan Tahunan (`tahunan.tsx`)
- **Saat ini:** TA dropdown + "Tampilkan" / "Ganti Filter"
- **Target:** TA dropdown auto-fetch (default TA aktif). Tidak perlu tombol.

### 4. Laporan Posisi Kas (`posisi-kas.tsx`)
- **Saat ini:** Month + Year + "Tampilkan" / "Ganti Filter"
- **Target:** Month + Year auto-fetch.

### 5. Laporan Saldo (`saldo.tsx`)
- **Saat ini:** Month + Year + Category + "Tampilkan" / "Ganti Filter"
- **Target:** Month + Year + Category auto-fetch.

### 6. Laporan Transaksi Pengeluaran (`pengeluaran.tsx`)
- **Saat ini:** Month + Year + "Tampilkan" / "Ganti Filter"
- **Target:** Month + Year auto-fetch.

### 7. Laporan Tabungan (`tabungan.tsx`)
- **Saat ini:** Type + Month + Year + "Tampilkan" / "Ganti Filter"
- **Target:** Type + Month + Year auto-fetch.

### 8. Laporan Kelas (`kelas.tsx`)
- **Saat ini:** Sudah auto-fetch, tapi visual mungkin perlu diseragamkan.
- **Target:** Seragamkan visual filter bar.

### 9. Rekap Siswa (`siswa.tsx`)
- **Saat ini:** Search-based, sudah berbeda by design (wajar).
- **Target:** Tidak perlu diubah — pola search memang berbeda dari filter bulan/tahun.

## Perubahan Teknis per Halaman

Untuk setiap halaman (kecuali kelas dan siswa):

1. **Hapus 2-state** — buang `reportMonth`/`reportYear` terpisah dari `selectedMonth`/`selectedYear`. Cukup satu state.
2. **Hapus tombol "Tampilkan"** — data langsung fetch saat filter berubah.
3. **Hapus link "Ganti Filter"** — filter selalu visible dan editable.
4. **Set default** — bulan/tahun default ke bulan ini, `enabled: true` dari awal.
5. **Tambah "Reset Filter"** jika ada >2 filter field.

### Contoh Refactor (Bulanan)

**Sebelum:**
```tsx
const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
const [selectedYear, setSelectedYear] = useState(now.getFullYear());
const [reportMonth, setReportMonth] = useState(0);
const [reportYear, setReportYear] = useState(0);
const shouldFetch = reportMonth > 0 && reportYear > 0;
// ... tombol "Tampilkan" / "Ganti Filter"
```

**Sesudah:**
```tsx
const [month, setMonth] = useState(now.getMonth() + 1);
const [year, setYear] = useState(now.getFullYear());
// Auto-fetch — tidak perlu shouldFetch, tidak perlu tombol
const { data } = useGetMonthlyReport({ month, year, academic_year_id: activeAy?.id }, {
  query: { enabled: !!activeAy?.id }
});
```

## File yang Perlu Diubah

| File | Perubahan |
|------|-----------|
| `laporan/harian.tsx` | Hapus 2-state, auto-fetch default hari ini |
| `laporan/bulanan.tsx` | Hapus 2-state, auto-fetch default bulan ini |
| `laporan/tahunan.tsx` | Hapus 2-state, auto-fetch default TA aktif |
| `laporan/posisi-kas.tsx` | Hapus 2-state, auto-fetch |
| `laporan/saldo.tsx` | Hapus 2-state, auto-fetch |
| `laporan/pengeluaran.tsx` | Hapus 2-state, auto-fetch |
| `laporan/tabungan.tsx` | Hapus 2-state, auto-fetch |
| `laporan/kelas.tsx` | Visual seragam (sudah auto-fetch) |

**Tidak diubah:** `laporan/siswa.tsx` (pola search, bukan filter bulan)

## Estimasi

Perubahan ringan per file — pattern refactor yang sama diulang 7 kali. Tidak ada perubahan backend.
