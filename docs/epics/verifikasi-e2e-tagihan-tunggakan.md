# Verifikasi End-to-End: Tagihan Tunggakan & CRUD Tagihan Manual

> **Epik:** [Tagihan Tunggakan (Backfill) + CRUD Tagihan Manual](./tagihan-tunggakan-backfill.md)
> **Status:** Selesai (HTTP + database); verifikasi browser belum dijalankan
> **Tanggal:** 2026-09-17
> **Commit yang diverifikasi:** `3926137` (HEAD `feat/tagihan-tunggakan-manual`)

---

## Mengapa dokumen ini ada

Task 1–9 sudah lulus unit test, tetapi belum pernah menyentuh runtime. Server yang
sedang berjalan saat itu (`go run ./cmd/api`, start 07:54) berpotensi lebih tua dari
commit terakhir. Dokumen ini mencatat verifikasi terhadap **binary yang dibangun dari
HEAD**, dijalankan di atas **salinan database**, supaya hasilnya bukan asumsi.

## Lingkungan

| Aspek | Nilai |
|---|---|
| API | binary `/tmp/alizzah-api` dari `go build ./cmd/api` pada HEAD |
| Port | `8090` (terpisah dari dev server pengguna di `8080`) |
| Database | `alizzah_e2e` — **salinan** `alizzah_test` via `pg_dump \| psql` |
| Data | 248 siswa, 3258 invoice, 66 item tarif aktif, 3 tahun ajaran |
| TA aktif | id `3` (2026/2027); TA lampau uji: id `2` (2025/2026) |
| Siswa uji | id `248` (level `mutiara`, enrollment aktif di TA 3) |
| Docker | tidak dipakai — PostgreSQL 14 lokal di port 5432 |

Database salinan dipakai agar data dev pengguna tidak tercemar. Setelah selesai,
`alizzah_e2e` di-`drop` dan instance 8090 dimatikan.

## Hasil

**27 asersi: 26 lulus, 1 gagal karena kesalahan skrip** (bukan bug — skrip membaca
`.data.academic_year_id`, padahal respons detail memakai `.data.academic_year.id`).
Kegagalan itu diverifikasi ulang langsung ke database dan hasilnya benar.

### 1. Buat tunggakan TA lampau (`arrears`)

`POST /v1/invoices` → **201**. Invoice `3307`: `academic_year_id=2` (TA asal),
`type=arrears`, `total_amount=350000` dihitung server, item tunggal kategori
`arrears`, `is_mandatory=false`.

### 2. Tunggakan lintas TA terlihat di daftar tagihan siswa

`GET /v1/students/248/invoices` **tanpa** parameter `academic_year_id` → **200**,
invoice `3307` (milik TA 2) muncul. Ini mengonfirmasi jalur baca lintas-TA (R.10).

### 3. Kartu total tunggakan

`GET /v1/students/248` → `financial_summary.total_unpaid=2864000`, mencakup
tunggakan TA lampau. (Ini jalur yang tidak bisa diuji lewat sqlite karena
`monthlyVisibilityCond` memakai SQL PostgreSQL `make_date(...)::int`.)

### 4. Buat tagihan rinci (`manual`) TA aktif

`POST /v1/invoices` → **201**. Invoice `3308`: TA aktif (3), `total_amount=200000`
= jumlah dua item, item pertama `is_mandatory=false`.

> Verifikasi `is_mandatory=false` penting: GORM mengecualikan field bernilai zero
> yang bertag `default` dari INSERT, sehingga `BulkCreateNonMandatoryItems` harus
> menempuh `Create` + `UPDATE`. Terbukti tersimpan `f` di baris item `18944`/`18945`.

### 5. Validasi payload

| Kasus | HTTP |
|---|---|
| `arrears` tanpa keterangan | 422 |
| `arrears` dengan lebih dari 1 item | 422 |
| `manual` dengan nominal 0 | 422 |
| Siswa tidak ada | 404 |
| Tahun ajaran tidak ada | 404 |
| `type=monthly` (bukan manual/arrears) | 400 |
| `items` kosong | 400 |

### 6. `PUT /v1/invoices/:id`

`manual` → **200**, `notes` dan `due_date` tersimpan. `arrears` dengan `notes=""`
→ **422** (keterangan adalah jejak asal tunggakan, tidak boleh dikosongkan).

### 7. Bayar tunggakan TA lampau di kasir

`POST /v1/payments` (`academic_year_id` = TA aktif, `source=cash`, satu item
menunjuk item invoice tunggakan) → **201**, `payment.id=5068`.

Bukti database:

```
invoices:           id=3307  academic_year_id=2  type=arrears  status=paid  paid_amount=350000
payments:           id=5068  academic_year_id=3  source=cash   total_amount=350000
cash_transactions:  id=9854  academic_year_id=3  transaction_type=debit  amount=350000  source=payment/5068
```

Ini mengonfirmasi **R.9 / Q1=A secara end-to-end**: invoice tetap milik TA asal,
sementara pembayaran dan kas tercatat di TA aktif.

### 8. Guard hapus

| Kasus | HTTP |
|---|---|
| `DELETE` manual belum dibayar | 200 |
| `DELETE` tunggakan yang sudah dibayar | 409 |
| `DELETE` tagihan hasil generate | 409 |

### 9. Guard regenerate (Task 7)

`POST /v1/students/248/regenerate-invoices` → **200**. Tiga invoice
`arrears`/`manual` — termasuk tunggakan `3307` yang sudah lunas di TA lampau —
semuanya **selamat** dengan id yang sama; jumlahnya tidak berubah (3 → 3).

## Temuan

### T1. Penegakan mode-vs-TA hanya di klien (batasan terdokumentasi, bukan bug)

`POST /v1/invoices` **menerima** `arrears` untuk TA aktif (HTTP 201) dan `manual`
untuk TA lampau (HTTP 201) — keduanya ditolak oleh aturan UI di
`manual-invoice.ts`. Ini **disengaja** dan tercatat di
[Task 9](./task-9-validasi-mode-tahun-ajaran.md) baris 54: *"Tidak ada perubahan
backend. Batasan ini murni aturan UI; server tetap menerima kedua type."*

Konsekuensi: klien lain atau panggilan API langsung bisa membuat kombinasi yang
tidak konsisten dengan aturan produk. Tidak ditindaklanjuti di sini karena
mengubahnya berarti mengubah kontrak epik — perlu keputusan produk terpisah.

### T2. Verifikasi browser belum dijalankan

Kombinasi TA × mode pada UI, serta peringatan enrollment
(`studentLevelWarning`), baru diuji pada level logika murni (`vitest`). Verifikasi
visual memerlukan browser dan belum dilakukan karena tidak ada perkakas browser
otomatis di lingkungan ini. Aturan UI sudah diuji unit; sisanya adalah tampilan.

## Yang tersisa

- [ ] Verifikasi browser: TA aktif bertarif → Rinci aktif & Total disabled;
      TA lampau → Total aktif & Rinci disabled dengan sebab; TA aktif tanpa tarif →
      banner blokir + Simpan nonaktif; siswa tanpa enrollment → peringatan level.
- [ ] Keputusan produk: apakah penegakan mode-vs-TA perlu naik ke backend (T1).
