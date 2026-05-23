# UX Flow: Keuangan — Operasional Harian

> Berdasarkan: `prd-feature-detail.md`, `ux-flow-global.md`, `ux-flow-keuangan-transaksi.md`
> Direferensikan oleh: `ux-flow-keuangan-laporan.md`

---

## Konteks & Prinsip Desain

Domain ini mencakup aktivitas rutin admin keuangan setiap hari: mencatat pengeluaran, memantau saldo kas dan berangkas, dan menutup buku di akhir hari. Prinsip desain yang diterapkan:

1. **Rutinitas harus cepat** — admin keuangan menjalankan ini setiap hari, maka alur harus sesedikit mungkin langkah
2. **Tutup buku adalah aksi final** — setelah dikonfirmasi, transaksi hari itu terkunci. UI harus komunikasikan ini dengan jelas sebelum konfirmasi
3. **Saldo selalu real-time** — halaman kas dan berangkas harus menampilkan saldo terkini tanpa perlu refresh manual
4. **Kas dan berangkas adalah dua kantong terpisah** — UI harus membedakan keduanya dengan jelas agar admin tidak salah membaca saldo

---

## Sitemap (Scope Dokumen Ini)

```
/dashboard/keuangan/
├── /pengeluaran
│   ├── /                           → List pengeluaran
│   └── /baru                       → Form catat pengeluaran baru
└── /kas
    ├── /                           → Overview kas & berangkas
    ├── /transaksi                  → Riwayat transaksi kas lengkap
    ├── /berangkas
    │   └── /transaksi              → Riwayat transaksi berangkas
    └── /tutup-buku
        ├── /                       → Form tutup buku harian
        └── /riwayat                → Riwayat tutup buku semua hari
```

---

## 1. Pengeluaran

### 1.1 List Pengeluaran (`/keuangan/pengeluaran`)

#### Layout

```
┌────────────────────────────────────────────────────────┐
│ PageHeader: "Pengeluaran"           [+ Catat Pengeluaran]│
├────────────────────────────────────────────────────────┤
│ [🔍 Cari keterangan...] [Kategori ▼] [Tanggal dari-ke] │
│ [Reset Filter]                                         │
├────────────────────────────────────────────────────────┤
│                                                        │
│  TOTAL PENGELUARAN PERIODE INI       Rp 8.500.000      │
│                                                        │
├────────────────────────────────────────────────────────┤
│ ┌──┬────────────┬─────────────────┬─────────┬────────┐ │
│ │# │ Tanggal    │ Kategori        │ Nominal │ Aksi   │ │
│ ├──┼────────────┼─────────────────┼─────────┼────────┤ │
│ │1 │ 31 Jul 25  │ SPP > Gaji Guru │ 5jt     │[Detail]│ │
│ │2 │ 28 Jul 25  │ Registrasi >    │ 800rb   │[Detail]│ │
│ │  │            │ Alat Belajar    │         │        │ │
│ │3 │ 25 Jul 25  │ Biaya Awal >    │ 250rb   │[Detail]│ │
│ │  │            │ Infaq Sarpras   │         │        │ │
│ └──┴────────────┴─────────────────┴─────────┴────────┘ │
│ < 1 2 3 >                               Tampil 20/30   │
└────────────────────────────────────────────────────────┘
```

#### Flow: Navigasi dari List

```mermaid
flowchart LR
    A[List Pengeluaran] -->|Klik '+ Catat'| B[Form Pengeluaran Baru\n/pengeluaran/baru]
    A -->|Klik 'Detail'| C[SlideOver detail pengeluaran\ndengan opsi Edit dan Hapus]
```

### 1.2 Catat Pengeluaran Baru (`/keuangan/pengeluaran/baru`)

Form sederhana — admin mengisi empat field utama dan selesai.

#### Layout

```
┌────────────────────────────────────────────────────────┐
│ PageHeader: "Catat Pengeluaran"                        │
│ Breadcrumb: Pengeluaran > Catat Baru                   │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Tanggal *                                            │
│  [📅 Hari ini — 31 Juli 2025]                          │
│                                                        │
│  Kategori *                                           │
│  [Pilih Kategori ▼]                                   │
│                                                        │
│  (Setelah kategori utama dipilih)                     │
│  Sub-kategori *                                       │
│  [Pilih Sub-kategori ▼]                               │
│                                                        │
│  ┌─────────────────────────┐                          │
│  │ Biaya Awal              │                          │
│  │  └ Infaq Sarpras        │ ← Sub-kategori           │
│  │  └ Infaq APE            │                          │
│  │  └ Biaya Psikotes IQ    │                          │
│  │  └ Koperasi             │                          │
│  ├─────────────────────────┤                          │
│  │ Biaya Registrasi        │                          │
│  │  └ Biaya MPLS           │                          │
│  │  └ Buku PK Karakter     │                          │
│  │  └ Alat Belajar         │                          │
│  │  └ ...                  │                          │
│  ├─────────────────────────┤                          │
│  │ SPP                     │                          │
│  │  └ Gaji Guru            │                          │
│  └─────────────────────────┘                          │
│                                                        │
│  Nominal *                                            │
│  [Rp ________________________]                        │
│                                                        │
│  Keterangan *                                         │
│  [Gaji guru bulan Juli 2025...]                       │
│                                                        │
│  Bukti Pengeluaran (opsional)                         │
│  [📎 Upload file...]                                   │
│  Foto struk, nota, atau bukti transfer                │
│                                                        │
├────────────────────────────────────────────────────────┤
│  [Batal]                          [Simpan Pengeluaran] │
└────────────────────────────────────────────────────────┘
```

#### Flow: Submit Pengeluaran Baru

```mermaid
flowchart TD
    A[User isi form] --> B{Tanggal yang dipilih}
    B -->|Tanggal sudah terkunci\noleh tutup buku confirmed| C[Alert warning\n'Tanggal ini sudah dikunci\noleh tutup buku harian.\nPilih tanggal lain.'\nTombol Simpan disabled]
    B -->|Tanggal masih bisa diedit| D[Lanjut validasi normal]
    D --> E{Validasi klien}
    E -->|Gagal| F[Error inline per field]
    F --> A
    E -->|Lolos| G[Klik 'Simpan Pengeluaran']
    G --> H[POST /expenses]
    H --> I{Response}
    I -->|201| J[Navigate ke /pengeluaran\nToast: 'Pengeluaran berhasil dicatat'\nSaldo kas otomatis berkurang]
    I -->|422 tanggal terkunci| K[Alert: 'Tanggal ini sudah dikunci\noleh tutup buku harian']
    I -->|400| L[Alert error validasi]
    I -->|Error| M[Toast error generik]
```

### 1.3 Detail & Edit Pengeluaran (SlideOver)

Diklik dari tombol "Detail" di list pengeluaran.

#### Layout SlideOver

```
┌─────────────────────────────────┐
│ Detail Pengeluaran         [✕]  │
├─────────────────────────────────┤
│ Tanggal   : 31 Juli 2025        │
│ Kategori  : SPP                 │
│ Sub       : Gaji Guru           │
│ Nominal   : Rp 5.000.000        │
│ Keterangan: Gaji guru Juli 2025 │
│ Bukti     : [Lihat Bukti →]     │
│ Dicatat   : Admin Keuangan      │
│             31 Jul 09:15 WIB    │
├─────────────────────────────────┤
│ [Edit]              [Hapus]     │
└─────────────────────────────────┘
```

#### Flow: Edit Pengeluaran

```mermaid
flowchart TD
    A[Klik 'Edit' di SlideOver] --> B{Tanggal pengeluaran\nsudah terkunci?}
    B -->|Ya — tanggal terkunci| C[Tombol Edit disabled\nTooltip: 'Pengeluaran pada tanggal ini\nsudah dikunci oleh tutup buku']
    B -->|Tidak| D[Form edit muncul inline\npre-filled dengan data existing]
    D --> E[User ubah data]
    E --> F[Klik Simpan]
    F --> G[PUT /expenses/:id]
    G --> H{Response}
    H -->|200| I[SlideOver tutup\nList refresh\nToast sukses]
    H -->|422| J[Alert: 'Tidak dapat mengedit\npengeluaran yang sudah terkunci']
```

#### Flow: Hapus Pengeluaran

```mermaid
flowchart TD
    A[Klik 'Hapus' di SlideOver] --> B{Tanggal terkunci?}
    B -->|Ya| C[Tombol Hapus disabled\nTooltip: 'Tidak dapat dihapus,\ntanggal sudah dikunci']
    B -->|Tidak| D[ConfirmDialog\n'Hapus pengeluaran ini?\nSaldo kas akan dikembalikan.']
    D -->|Konfirmasi| E[DELETE /expenses/:id]
    E --> F{Response}
    F -->|200| G[SlideOver tutup\nList refresh\nToast sukses\nSaldo kas terupdate]
    F -->|422| H[Alert error]
```

#### State Halaman Pengeluaran

| State | Tampilan |
|---|---|
| Loading | Skeleton tabel |
| Empty | EmptyState: "Belum ada pengeluaran dicatat. Klik '+ Catat' untuk mulai." |
| Error | Alert + Retry |
| Success | Tabel pengeluaran + total periode |

---

## 2. Kas & Berangkas

### 2.1 Overview Kas & Berangkas (`/keuangan/kas`)

Halaman utama yang menampilkan kondisi kas dan berangkas secara real-time beserta mutasi terkini hari ini.

#### Layout

```
┌────────────────────────────────────────────────────────┐
│ PageHeader: "Kas & Berangkas"                          │
│ TA 2025/2026  ·  Hari ini: Jumat, 20 Juli 2025        │
├─────────────────────────────┬──────────────────────────┤
│ KAS                         │ BERANGKAS                │
│                             │                          │
│ Saldo                       │ Saldo                    │
│ Rp 12.500.000               │ Rp 3.200.000             │
│                             │                          │
│ Pemasukan hari ini          │ Tab. Umum (semua siswa)  │
│ ↑ Rp 1.500.000              │ Rp 1.800.000             │
│                             │                          │
│ Pengeluaran hari ini        │ Tab. Wajib (Berlian)     │
│ ↓ Rp 250.000                │ Rp 1.400.000             │
│                             │                          │
│ Tutup buku terakhir:        │ [Lihat Riwayat           │
│ Kamis, 19 Juli 2025 ✅      │  Transaksi Berangkas →]  │
│                             │                          │
│ [Lihat Riwayat Transaksi →] │                          │
│ [Transfer ke Berangkas]     │                          │
├─────────────────────────────┴──────────────────────────┤
│                                                        │
│  [Tutup Buku Hari Ini]                                 │
│                                                        │
│  MUTASI HARI INI                                       │
│  ┌────────────────────────────────────────────────┐   │
│  │ ↑ 09:30  Pembayaran Ahmad Fauzan   +Rp 190.000 │   │
│  │ ↑ 09:45  Pembayaran Budi Santosa   +Rp 327.000 │   │
│  │ ↓ 10:00  Pengeluaran Gaji Guru     -Rp 250.000 │   │
│  │ ↑ 10:15  Pembayaran Citra Dewi     +Rp 983.000 │   │
│  └────────────────────────────────────────────────┘   │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Status tutup buku:**
- ✅ = tutup buku hari sebelumnya sudah dikonfirmasi → tampil hijau
- ⚠️ = tutup buku hari sebelumnya belum dilakukan → tampil kuning dengan peringatan

#### Flow: Transfer Kas ke Berangkas

```mermaid
flowchart TD
    A[Klik 'Transfer ke Berangkas'] --> B[SlideOver muncul]
    B --> C[Tampil saldo kas saat ini: Rp 12.500.000]
    C --> D[Isi nominal transfer]
    D --> E{Validasi real-time}
    E -->|Nominal > saldo kas| F[Field merah\nError: 'Melebihi saldo kas'\nTombol Simpan disabled]
    E -->|Nominal ≤ saldo kas| G[Preview:\nKas setelah: Rp 12.000.000\nBerangkas setelah: Rp 3.700.000]
    G --> H[Isi keterangan opsional]
    H --> I[Klik Simpan Transfer]
    I --> J[POST /cash/transfers]
    J --> K{Response}
    K -->|200| L[SlideOver tutup\nSaldo kas & berangkas terupdate\nMutasi baru muncul\nToast: 'Transfer berhasil']
    K -->|422 saldo kurang| M[Alert: 'Saldo kas tidak mencukupi']
    K -->|Error| N[Alert error]
```

### 2.2 Riwayat Transaksi Kas (`/keuangan/kas/transaksi`)

#### Layout

```
┌────────────────────────────────────────────────────────┐
│ PageHeader: "Riwayat Transaksi Kas"                    │
│ Breadcrumb: Kas & Berangkas > Riwayat Transaksi        │
├────────────────────────────────────────────────────────┤
│ [Tanggal dari-ke]  [Jenis ▼: Masuk/Keluar]  [Tipe ▼]  │
│ [Reset Filter]                                         │
├────────────────────────────────────────────────────────┤
│                                                        │
│  SALDO PERIODE INI                                     │
│  Pemasukan: Rp 24.300.000  Pengeluaran: Rp 8.500.000   │
│  Saldo Akhir: Rp 12.500.000                           │
│                                                        │
├────────────────────────────────────────────────────────┤
│ ┌──┬────────────┬─────────────────────────┬──────────┐ │
│ │# │ Tanggal    │ Keterangan              │ Nominal  │ │
│ ├──┼────────────┼─────────────────────────┼──────────┤ │
│ │  │ 20 Jul 25  │                         │          │ │
│ │1 │            │ ↑ Pembayaran Ahmad F.   │+Rp190.000│ │
│ │2 │            │ ↑ Pembayaran Budi S.    │+Rp327.000│ │
│ │3 │            │ ↓ Pengeluaran Gaji Guru │-Rp250.000│ │
│ ├──┼────────────┼─────────────────────────┼──────────┤ │
│ │  │ 19 Jul 25  │                         │          │ │
│ │4 │            │ ↑ Pembayaran Citra D.   │+Rp 83.000│ │
│ └──┴────────────┴─────────────────────────┴──────────┘ │
│ < 1 2 3 >                               Tampil 20/200  │
└────────────────────────────────────────────────────────┘
```

Transaksi dikelompokkan per hari dengan pemisah tanggal. Pemasukan ditampilkan hijau dengan prefix `↑`, pengeluaran merah dengan prefix `↓`.

---

## 3. Tutup Buku Harian

Ini adalah flow paling penting di dokumen ini karena berdampak pada penguncian data.

### 3.1 Halaman Tutup Buku (`/keuangan/kas/tutup-buku`)

Diakses dari tombol "Tutup Buku Hari Ini" di overview kas, atau dari sidebar jika admin menjadikannya rutinitas.

#### Layout Awal — Belum Ada Tutup Buku Hari Ini

```
┌────────────────────────────────────────────────────────┐
│ PageHeader: "Tutup Buku Harian"                        │
│ Breadcrumb: Kas & Berangkas > Tutup Buku               │
│ Jumat, 20 Juli 2025                                    │
├────────────────────────────────────────────────────────┤
│                                                        │
│  RINGKASAN TRANSAKSI HARI INI                         │
│  ┌──────────────────────────────────────────────────┐ │
│  │                                                  │ │
│  │  Saldo Kas Awal (kemarin)     Rp 11.500.000      │ │
│  │                                                  │ │
│  │  + Pemasukan Hari Ini                            │ │
│  │    (8 transaksi pembayaran)   + Rp  1.500.000    │ │
│  │                                                  │ │
│  │  - Pengeluaran Hari Ini                          │ │
│  │    (1 transaksi pengeluaran)  - Rp    250.000    │ │
│  │                               ─────────────────  │ │
│  │  Saldo Kas Sistem             Rp 12.750.000      │ │
│  │                                                  │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  HITUNG KAS FISIK                                     │
│  Masukkan jumlah uang fisik yang ada di kas:          │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │ Rp [____________________________]                │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  (Setelah nominal diisi — Preview Selisih)            │
│  ┌──────────────────────────────────────────────────┐ │
│  │                                                  │ │
│  │  Kas Fisik (diinput)    Rp 12.750.000            │ │
│  │  Kas Sistem             Rp 12.750.000            │ │
│  │  ─────────────────────────────────────           │ │
│  │  Selisih                Rp          0  ✅        │ │
│  │                                                  │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  Keterangan (wajib jika ada selisih)                  │
│  [_______________________________________________]     │
│                                                        │
│  ⚠️  Setelah dikonfirmasi, seluruh transaksi hari ini  │
│     tidak dapat diedit atau dihapus.                  │
│                                                        │
│  [Simpan Tutup Buku]                                  │
└────────────────────────────────────────────────────────┘
```

#### Flow: Proses Tutup Buku

```mermaid
flowchart TD
    A[Admin buka halaman tutup buku] --> B[Sistem hitung otomatis:\nSaldo awal + pemasukan hari ini\n- pengeluaran hari ini\n= Saldo Kas Sistem]
    B --> C[Admin input kas fisik]
    C --> D{Selisih = kas fisik - kas sistem}
    D -->|Selisih = 0| E[✅ Preview: Tidak ada selisih\nField keterangan opsional\nTombol Simpan aktif]
    D -->|Selisih ≠ 0| F[⚠️ Preview: Ada selisih sekian\nField keterangan WAJIB diisi\nTombol Simpan disabled sampai keterangan diisi]
    E --> G[Klik 'Simpan Tutup Buku']
    F --> H[Admin isi keterangan]
    H --> G
    G --> I[POST /daily-closings\nbody: academic_year_id, closing_date, physical_cash_amount, notes]
    I --> J{Response}
    J -->|201 is_confirmed=false| K[Halaman berubah ke\nStatus: Menunggu Konfirmasi]
    J -->|409 sudah ada tutup buku hari ini| L[Alert: 'Tutup buku hari ini\nsudah pernah dibuat']
    J -->|400 keterangan kurang| M[Alert: 'Keterangan wajib diisi\nkarena ada selisih kas']
    J -->|Error| N[Alert error]
```

#### Layout Setelah Simpan — Menunggu Konfirmasi

```
┌────────────────────────────────────────────────────────┐
│ PageHeader: "Tutup Buku Harian"                        │
│ Jumat, 20 Juli 2025                                    │
├────────────────────────────────────────────────────────┤
│                                                        │
│  STATUS: ⏳ MENUNGGU KONFIRMASI                        │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │ Kas Fisik     Rp 12.750.000                      │ │
│  │ Kas Sistem    Rp 12.750.000                      │ │
│  │ Selisih       Rp          0                      │ │
│  │ Keterangan    —                                  │ │
│  │ Dibuat        Admin Keuangan · 16:30 WIB         │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  ⚠️  Setelah dikonfirmasi, seluruh transaksi tanggal   │
│     20 Juli 2025 akan dikunci permanen.               │
│                                                        │
│  [Konfirmasi Tutup Buku]                              │
│                                                        │
└────────────────────────────────────────────────────────┘
```

#### Flow: Konfirmasi Tutup Buku

```mermaid
flowchart TD
    A[Klik 'Konfirmasi Tutup Buku'] --> B[ConfirmDialog\n'Semua transaksi 20 Juli 2025\nakan dikunci permanen.\nProses ini tidak dapat dibatalkan.\nLanjutkan?']
    B -->|Batal| C[Dialog tutup\nStatus tetap Menunggu Konfirmasi]
    B -->|Konfirmasi| D[PATCH /daily-closings/:id/confirm]
    D --> E{Response}
    E -->|200| F[Status berubah: ✅ DIKONFIRMASI\nToast: 'Tutup buku berhasil dikonfirmasi'\nTransaksi hari ini terkunci]
    E -->|409 sudah dikonfirmasi| G[Alert: 'Tutup buku ini\nsudah dikonfirmasi sebelumnya']
    E -->|400 keterangan kurang| H[Alert: 'Keterangan wajib diisi\nkarena ada selisih']
    E -->|Error| I[Alert error]
```

#### Layout Setelah Konfirmasi — Terkunci

```
┌────────────────────────────────────────────────────────┐
│ PageHeader: "Tutup Buku Harian"                        │
│ Jumat, 20 Juli 2025                                    │
├────────────────────────────────────────────────────────┤
│                                                        │
│  STATUS: ✅ DIKONFIRMASI & TERKUNCI                    │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │ Kas Fisik     Rp 12.750.000                      │ │
│  │ Kas Sistem    Rp 12.750.000                      │ │
│  │ Selisih       Rp          0                      │ │
│  │ Keterangan    —                                  │ │
│  │ Dikonfirmasi  Admin Keuangan · 16:35 WIB         │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  🔒 Seluruh transaksi 20 Juli 2025 telah dikunci.     │
│     Pengeluaran dan pembayaran pada tanggal ini       │
│     tidak dapat diedit atau dihapus.                  │
│                                                        │
│  [Lihat Laporan Harian →]                             │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### 3.2 Tutup Buku Hari yang Terlewat

Jika admin keuangan tidak melakukan tutup buku pada hari tertentu, mereka masih bisa membuat tutup buku untuk hari yang sudah lewat.

#### Flow: Akses Tutup Buku Hari Lama

```mermaid
flowchart TD
    A[Admin buka /kas/tutup-buku] --> B{Hari ini sudah\ntutup buku?}
    B -->|Sudah| C[Tampil status hari ini\n+ link 'Lihat Riwayat Tutup Buku']
    B -->|Belum| D[Form tutup buku hari ini]

    C --> E[Klik 'Lihat Riwayat']
    E --> F[Tampil list tutup buku semua hari]
    F --> G[Klik hari yang belum tutup buku]
    G --> H[Form tutup buku untuk hari tersebut\nSistem hitung ulang kas sistem\nper tanggal tersebut]
    H --> I[Proses sama seperti tutup buku hari ini]
```

#### Layout Riwayat Tutup Buku

```
┌────────────────────────────────────────────────────────┐
│ PageHeader: "Riwayat Tutup Buku"                       │
├────────────────────────────────────────────────────────┤
│ [Bulan ▼]  [Status ▼: Semua/Dikonfirmasi/Belum]       │
├────────────────────────────────────────────────────────┤
│ ┌────────────┬────────────┬────────────┬─────────────┐ │
│ │ Tanggal    │ Kas Fisik  │ Selisih    │ Status      │ │
│ ├────────────┼────────────┼────────────┼─────────────┤ │
│ │ 20 Jul 25  │ 12.750.000 │ 0          │ ✅ Terkunci  │ │
│ │ 19 Jul 25  │ 11.500.000 │ -50.000    │ ✅ Terkunci  │ │
│ │ 18 Jul 25  │ —          │ —          │ ⚠️ Belum     │ │
│ │ 17 Jul 25  │ —          │ —          │ ⚠️ Belum     │ │
│ └────────────┴────────────┴────────────┴─────────────┘ │
│                                                        │
│ [Buat Tutup Buku] per baris yang belum                 │
└────────────────────────────────────────────────────────┘
```

---

## 4. State & Edge Cases per Halaman

### State Global Domain Ini

| Halaman | Loading | Empty | Error |
|---|---|---|---|
| List Pengeluaran | Skeleton tabel | EmptyState: "Belum ada pengeluaran dicatat" | Alert + Retry |
| Form Pengeluaran | — | — | Alert error inline |
| Overview Kas | Skeleton 2 kolom + skeleton list mutasi | — | Alert + Retry |
| Riwayat Transaksi Kas | Skeleton tabel | EmptyState: "Belum ada transaksi" | Alert + Retry |
| Tutup Buku | Skeleton ringkasan transaksi | — | Alert |
| Riwayat Tutup Buku | Skeleton tabel | EmptyState: "Belum ada tutup buku" | Alert + Retry |

### Edge Cases Penting

| Skenario | Penanganan |
|---|---|
| Tutup buku hari ini sudah ada (duplikat) | Form tutup buku diganti dengan tampilan status hari ini. Tidak ada cara membuat tutup buku kedua untuk hari yang sama |
| Tutup buku hari yang terlewat banyak (misal 5 hari) | Bisa dilakukan satu per satu dari riwayat. Tidak ada batch tutup buku |
| Selisih kas negatif (kas fisik < sistem) | Preview menampilkan selisih dengan warna merah. Keterangan wajib diisi |
| Selisih kas positif (kas fisik > sistem) | Preview menampilkan selisih dengan warna hijau. Keterangan tetap wajib diisi |
| Edit pengeluaran setelah tutup buku dikonfirmasi | Tombol Edit dan Hapus disabled di SlideOver. Tooltip: "Tidak dapat diubah, tanggal sudah dikunci tutup buku" |
| Transfer kas ke berangkas saat kas = 0 | Tombol Transfer disabled. Tooltip: "Saldo kas kosong" |
| Upload bukti pengeluaran — format tidak didukung | Validasi di klien, alert: "Hanya mendukung format JPG, PNG, atau PDF" |
| Hari ini belum ada transaksi sama sekali | Ringkasan tutup buku menampilkan semua 0. Masih bisa melakukan tutup buku |
| Overview kas saat berangkas > total saldo tabungan semua siswa | Tidak ada error UI — ini bisa terjadi jika ada transfer manual. Tampilkan apa adanya |
| Admin keuangan mencoba akses tutup buku hari kemarin yang sudah dikonfirmasi orang lain | Tampil status ✅ Terkunci dengan info siapa yang mengkonfirmasi — tidak ada tombol apapun |
