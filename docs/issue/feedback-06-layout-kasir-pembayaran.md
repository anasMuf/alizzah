# Feedback 06: Redesign Layout Pembayaran — Single Page (POS Kasir)

## Konteks

Layout pembayaran saat ini menggunakan wizard 4-step dalam satu card (`baru.tsx`, 745 baris). Setiap step scroll vertikal saat konten banyak. User ingin layout statis tanpa scroll vertikal (scroll dalam komponen masih boleh), seperti layout kasir/POS.

## Tujuan

Redesign halaman pembayaran menjadi layout single-page statis yang menampilkan semua elemen sekaligus tanpa stepper, seperti POS kasir retail.

## Status Saat Ini

**Wizard 4 step:**
1. Pilih Siswa — search + select siswa
2. Pilih Tagihan — checklist invoices + input nominal per item + item tambahan
3. Metode Pembayaran — pilih cash/tabungan + input uang diterima + kembalian
4. Konfirmasi — ringkasan + submit

**Masalah:**
- Step 2 paling besar: daftar tagihan + items + item insidental → scroll panjang
- User harus klik "Lanjut" berulang kali
- Tidak efisien untuk kasir yang proses banyak siswa berturut-turut

## Rencana Implementasi

### Layout Baru — Single Page, Fixed Height

```
┌──────────────────────────────────────────────────────────┐
│  [🔍 Cari siswa...        ]    Ahmad Fauzi - Berlian    │
├──────────────────────┬───────────────────────────────────┤
│                      │                                   │
│  TAGIHAN             │  RINGKASAN                        │
│  ┌────────────────┐  │                                   │
│  │ ☑ SPP Juli     │  │  SPP Juli 2025        Rp 350.000  │
│  │   Rp 350.000   │  │  Infaq Harian (22h)   Rp 110.000  │
│  │ ☑ Infaq Juli   │  │  ─────────────────────────────── │
│  │   Rp 110.000   │  │  Subtotal Tagihan     Rp 460.000  │
│  │ ☐ Pasta Juli   │  │  Tab. Umum            Rp  50.000  │
│  │   Rp  75.000   │  │  ─────────────────────────────── │
│  │                │  │  TOTAL                Rp 510.000  │
│  │ (scrollable)   │  │                                   │
│  └────────────────┘  │  ┌─────────────────────────────┐ │
│                      │  │ Uang diterima: [    510000 ]│ │
│  ITEM TAMBAHAN       │  │ Kembalian:           Rp   0 │ │
│  ┌────────────────┐  │  │ ☐ Kembalian → Tabungan      │ │
│  │ Tab. Umum:     │  │  └─────────────────────────────┘ │
│  │ [50000] [+]    │  │                                   │
│  │ Insidental:    │  │  Sumber: (●) Kas  ( ) Tabungan   │
│  │ [nama] [nom][+]│  │  Catatan: [________________]     │
│  └────────────────┘  │                                   │
│                      │  [ Proses & Cetak Struk ]         │
├──────────────────────┴───────────────────────────────────┤
│  footer info: siswa terakhir, total hari ini, dll        │
└──────────────────────────────────────────────────────────┘
```

### Prinsip Desain

1. **Fixed viewport** — halaman pas di layar (h-screen), tidak ada scroll body
2. **2-panel layout** — kiri: input (tagihan + item tambahan), kanan: ringkasan + aksi
3. **Scroll internal** — daftar tagihan bisa scroll dalam container-nya
4. **Cari siswa di atas** — input search yang langsung tampilkan dropdown, auto-fill semua data
5. **Auto-update** — saat checklist tagihan berubah, ringkasan kanan otomatis update
6. **No stepper** — semua terlihat sekaligus, tidak ada navigasi antar step
7. **Quick reset** — setelah submit berhasil, form reset dan fokus kembali ke search siswa

### Perubahan Teknis

**File: `apps/dashboard/src/routes/_authenticated/keuangan/pembayaran/baru.tsx`**

Rewrite komponen dari wizard menjadi layout POS:

```tsx
function PembayaranBaruPage() {
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header: search siswa */}
      <div className="flex-shrink-0 border-b p-4">
        <SearchSiswa onSelect={handleSelect} />
      </div>

      {/* Body: 2 panel */}
      <div className="flex-1 flex min-h-0">
        {/* Panel kiri: tagihan + item tambahan */}
        <div className="w-1/2 border-r flex flex-col">
          <DaftarTagihan /> {/* scrollable internal */}
          <ItemTambahan />  {/* fixed di bawah */}
        </div>

        {/* Panel kanan: ringkasan + pembayaran */}
        <div className="w-1/2 flex flex-col">
          <RingkasanPembayaran />  {/* grow */}
          <AksiPembayaran />       {/* fixed di bawah */}
        </div>
      </div>
    </div>
  );
}
```

### Komponen yang Dipecah

State management tetap di parent, tapi render dipecah jadi sub-komponen:

| Komponen | Fungsi |
|----------|--------|
| `SearchSiswa` | Input search + dropdown hasil + info siswa terpilih |
| `DaftarTagihan` | List invoice + checkbox + input nominal per item (scrollable) |
| `ItemTambahan` | Form tabungan umum + item insidental |
| `RingkasanPembayaran` | Daftar item yang akan dibayar + total |
| `AksiPembayaran` | Input uang diterima, pilih sumber, catatan, tombol submit |

### File yang Perlu Diubah

| File | Perubahan |
|------|-----------|
| `apps/dashboard/src/routes/_authenticated/keuangan/pembayaran/baru.tsx` | **Rewrite** — dari wizard ke layout POS |

Logic dan API calls tetap sama, hanya layout dan rendering yang berubah. Tidak ada perubahan backend.

## Catatan

- State management bisa tetap di satu komponen (lift state up) atau pakai Jotai atoms
- Responsive: pada layar kecil bisa fallback ke layout stack (panel atas-bawah), tapi prioritas desktop karena ini untuk admin kasir
- Pertimbangkan keyboard shortcuts: Enter untuk submit, Escape untuk reset, Tab navigation antar field
