# Rencana: Laporan Kontrol Bulanan (Konsolidasi Keuangan Sekolah)

> Laporan pemantauan keuangan **lintas modul** untuk **pimpinan** (kepala sekolah & yayasan), berbentuk matriks **12 bulan (Juli–Juni) × kategori** dalam satu tahun ajaran. Mengacu contoh nyata: `docs/Control Bulanan AL IZZAH WALI PAPAT - Google Spreadsheet.pdf`.
>
> Asal-usul: feedback koperasi putaran 1 ([../../koperasi/feedback-01.md](../../koperasi/feedback-01.md), butir L2) — ternyata kebutuhan laporannya **bukan** koperasi, melainkan kontrol keuangan **sekolah menyeluruh**; koperasi hanya satu baris di dalamnya.

**Status:** 🟡 perencanaan — keputusan utama terkunci; perlu konfirmasi pemetaan sumber data (lihat §6).

## 1. Tujuan & audiens
- **Audiens:** kepala sekolah & yayasan (+ admin keuangan & superadmin). Alat **monitoring**, read-only.
- **Tujuan:** satu layar yang menunjukkan arus pemasukan, beban, tabungan, kas, piutang, dan hutang sekolah per bulan sepanjang tahun ajaran — untuk pengambilan keputusan pimpinan.

## 2. Keputusan terkunci
| # | Keputusan |
|---|---|
| K1 | **Penempatan:** ringkasan di **Dashboard** (panel/halaman untuk role `kepala_sekolah`, `yayasan`, `admin_keuangan`, `superadmin`). |
| K2 | **Pengisian:** target **otomatis penuh** — tampilkan **semua** kategori yang dibutuhkan; yang modulnya **sudah ada** diisi & terintegrasi otomatis sekarang, kategori yang **belum** ada sumber datanya ditandai (mis. "—"/"belum") dan **menyusul** saat modulnya dibangun. |
| K3 | **Baris Koperasi (REVISI):** = **alokasi item Biaya Awal/Registrasi koperasi** yang dibayar siswa, terkumpul per bulan (otomatis) — lihat [feedback-01 §Modal (M1)](../../koperasi/feedback-01.md). **Bukan** setoran/entri manual (keputusan awal diganti oleh M1). |

## 3. Struktur laporan (mengikuti contoh)
Matriks: **baris = kategori**, **kolom = 12 bulan** (Jul…Jun) + (opsional) kolom Total. Per tahun ajaran aktif.

Seksi:
1. **PEMASUKAN** (rincian per sumber) → Total Pemasukan
2. **PENGELUARAN** → **Beban Operasional** (rincian) + **Beban Administrasi** (rincian) → TOTAL BEBAN
3. **TABUNGAN** (saldo & kas tabungan dipegang)
4. **KAS** (saldo berjalan; bisa negatif)
5. **PIUTANG** (rincian) → Total Piutang
6. **HUTANG SEKOLAH** → Total Hutang

## 4. Pemetaan baris → sumber data → status
Status: ✅ = bisa otomatis dari data yang ada · 🟡 = perlu entri manual (sementara/permanen) · ⬜ = **gap**, butuh modul/fitur baru (menyusul).

### Pemasukan
| Baris (contoh) | Sumber data sistem | Status |
|---|---|---|
| Biaya Masuk Anak Baru KB–TK | Invoice/Payment tipe registrasi/biaya awal (`fee_config` initial) | ✅ |
| Biaya Semester / DU | Invoice/Payment fee semester | ✅ (cek penamaan) |
| SPP | Invoice/Payment `monthly_spp` | ✅ |
| Infaq Harian | Fee "Infaq Harian" | ✅ |
| Tabungan Berlian | Modul Tabungan (`student_savings`) | ✅ |
| Jasa Antar Jemput | Fasilitas "Antar Jemput" (invoice) | ✅ |
| BOP / BOS | `income_transactions` kategori `bos` | ✅ |
| Pendapatan lain-lain | `income_transactions` (kategori lain) | ✅/🟡 |
| Kelulusan | Fee "Biaya Wisuda"/event kelulusan | 🟡 (cek) |
| PASTA | Ekstrakurikuler "Pasta" (fee ekskul) | 🟡 (cek) |
| Pemasukan LBB | — (belum ada modul LBB/bimbel) | ⬜ |
| **Koperasi** | **Alokasi item registrasi koperasi** (M1), otomatis saat siswa bayar | ✅ (ikut M1) |

### Pengeluaran
| Baris | Sumber data | Status |
|---|---|---|
| Beban operasional umum (kegiatan, bekal, dll) | Modul Pengeluaran (`expenses` + `expense_categories`) | ✅ jika dicatat |
| **Gaji Pegawai / Guru / Ekstrakurikuler** | Belum ada modul payroll khusus (bisa via `expenses` kategori "Gaji Guru" bila admin mencatat) | 🟡/⬜ |
| Honorarium, THR | `expenses` (kategori) bila dicatat | 🟡 |
| Beban Administrasi (ATK, listrik & air, telpon & internet) | `expenses` (kategori) | ✅ jika dicatat |

### Tabungan / Kas / Piutang / Hutang
| Baris | Sumber data | Status |
|---|---|---|
| Saldo Tabungan | `student_savings` / `savings_transactions` (laporan tabungan) | ✅ |
| Saldo Kas (berjalan) | `cash_transactions` / `daily_closings` (laporan posisi-kas/saldo) | ✅ |
| Total Piutang | Invoice belum lunas (`invoices`/`invoice_installments`) | ✅ |
| Hutang Sekolah ke … | — (belum ada pencatatan hutang sekolah) | ⬜ |

> Catatan: modul keuangan sudah punya agregasi `income_summary`/`expense_summary`/`net` (lihat `apps/api/dto/report.go`, laporan monthly/annual). Laporan kontrol ini = **penyajian 12-bulan + kategorisasi lebih rinci** di atas data yang sama, plus baris koperasi (manual) & placeholder gap.

## 5. Pendekatan teknis (ringkas)
- **Backend (modul keuangan):** endpoint `GET /v1/reports/control-bulanan?academic_year_id=` → struktur seksi×bulan. Agregasi per bulan dari sumber yang ada (payments per fee-type, expenses per kategori, savings, cash, unpaid invoices, income_transactions). Baris tanpa sumber → 0/null + flag `pending: true`.
- **Baris koperasi (M1):** dihitung dari **alokasi item Biaya Awal/Registrasi** yang ditandai "koperasi" & sudah dibayar siswa (otomatis), diakumulasi per bulan — bukan entri manual. Bergantung implementasi M1 di modul koperasi.
- **Frontend (Dashboard):** panel/halaman "Kontrol Bulanan" untuk `kepala_sekolah`/`yayasan`/`admin_keuangan`/`superadmin` — tabel matriks (sticky header bulan), kategori yang `pending` ditandai abu-abu/"belum tercatat". Bisa pilih tahun ajaran.
- **RBAC:** read untuk kepsek/yayasan/keuangan/superadmin (pola sama laporan annual yang sudah mengizinkan kepsek/yayasan).

## 6. Gap & fase (otomatis bertahap, K2)
**Bisa otomatis sekarang** (Fase 1): pemasukan via payments/fees + tabungan + antar-jemput + BOP + kas + piutang; beban via modul Pengeluaran (yang sudah dicatat); baris koperasi (entri manual).

**Menyusul** (Fase berikutnya, saat modul/data ada):
- **Payroll/Gaji** (pegawai, guru, ekskul, honorarium, THR) — butuh penataan: kategori beban khusus atau modul gaji.
- **Hutang Sekolah** — belum ada pencatatan; perlu definisi (hutang ke siapa: tabungan? koperasi? pihak luar?).
- **LBB** dan sumber pemasukan lain yang belum bermodul.

## 7. Jawaban open items (terkonfirmasi user)
1. **Pemetaan pemasukan §4 — terverifikasi:** sudah ada sbg fee/income → SPP (`monthly_spp`), Biaya Awal (`initial`), Registrasi (`registration` per jenjang), Infaq (Sarpras/APE/Harian/Awal Tabungan), **PASTA** (`pasta_*` + ekskul), **Kelulusan** (Biaya Wisuda/`graduation`), Antar-Jemput (fasilitas), BOP (`income_transactions` `bos`), Tabungan (savings). **Belum ada (⬜):** "Pemasukan LBB" & "Pendapatan lain-lain" generik.
2. **Gaji/Beban — ⬜ belum dicatat sama sekali.** Butuh **modul SDM/payroll** (fase terpisah). Semua baris gaji/honorarium/THR = gap sampai modul itu ada.
3. **Hutang Sekolah — ⬜ belum ada pencatatan.** Definisi: utang sekolah ke **pihak luar** (pemasok, tukang, dsb). Perlu fitur pencatatan hutang vendor (fase terpisah).
4. **Periode:** tahun ajaran **Jul–Jun** (sesuai contoh). ✅
5. **Baris Koperasi — DIREVISI (lihat di bawah).** Bukan "setoran manual" — koperasi kini didanai dari **item Biaya Awal/Registrasi tertentu** yang dibayar siswa (lihat [feedback-01 §Modal (M1)](../../koperasi/feedback-01.md)). Maka baris "Koperasi" di kontrol = **alokasi item-registrasi koperasi** yang terkumpul per bulan (otomatis saat pembayaran), bukan entri manual. **K3 di §2 perlu disesuaikan** mengikuti keputusan M1.

> **Langkah berikut:** finalkan jadi spesifikasi implementasi (endpoint `reports/control-bulanan` + komponen Dashboard), dengan ketentuan: baris ber-modul diisi otomatis (Fase 1), baris **gaji** & **hutang vendor** = placeholder "belum tercatat" sampai modul SDM/hutang dibangun, baris **Koperasi** ikut alur M1 (alokasi item registrasi).
