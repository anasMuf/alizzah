# Plan: Modul SDM / HR — Penggajian (Kontrak Desain Final)

> **Status: Disetujui owner (2026-09-01).** Dokumen ini adalah kontrak desain —
> requirement bersifat immutable; task breakdown di bawah beradaptasi saat eksekusi.
> Sumber perilaku gaji: `apps/old/penggajian/docs/` (01–06).

## 1. Keputusan Pemilik (agreed)

| # | Keputusan | Pilihan |
|---|-----------|---------|
| K1 | Sumber data karyawan | **SDM jadi sumber kanonik**; `koperasi_employees` menjadi **VIEW** di atas `sdm_employees` |
| K2 | Model penggajian | **Snapshot + kunci periode** (finalisasi), bukan hitung dinamis murni — fix F2 |
| K3 | Integrasi keuangan | **Standalone** (tidak auto-jurnal ke modul keuangan); **proses finalisasi** adalah pengendali operasional |
| K4 | Deployment | **Binary terpisah `cmd/sdm`** (pola ADR-002 / koperasi), port `SDM_PORT=8082`, host `SDM_API_PORT=8093` |
| K5 | Periode | Ikut **Tahun Ajaran** di UI/laporan; storage **DATE `YYYY-MM-05`** — tanggal 5 = payday (kebijakan sekolah) |

## 2. Requirements (IMMUTABLE)

1. Periode gaji disimpan sebagai `DATE` dengan **hari = 5** (payday), contoh `2026-05-05` = gaji Mei 2026 dibayar tgl 5.
2. Semua tabel transaksional SDM memakai `periode DATE` (absen, pinjam_detail, payroll_periode).
3. Rumus gaji **identik** aplikasi lama (Dokumen 03): pokok (sertifikasi 50% / impasing 0%), kehadiran, siaga, piket, bonus tidak terlambat 100.000 & tidak pulang awal 50.000, subtotal fungsional/tugas/PJ/lain-lain, − angsuran.
4. Golongan efektif dihitung dari `tgl_masuk` vs tanggal periode (tanpa mutasi per-request — fix F5).
5. Penggajian punya dua status: **preview** (hitung dinamis) dan **finalized** (snapshot tersimpan). Setelah finalized, perubahan absen/HR/pinjaman **tidak mengubah slip** (fix F2).
6. Alur finalisasi: `finalize` (simpan snapshot, transaksional) → `unlock` (buka koreksi, hapus snapshot) → `finalize` ulang.
7. `koperasi_employees` menjadi view read-only di atas `sdm_employees`; koperasi tidak menulis karyawan lagi (hapus seed koperasi); endpoint `/koperasi/employees*` tetap berfungsi tanpa perubahan kode.
8. Modul SDM dilayani binary **`cmd/sdm`** sendiri; tidak ada wiring SDM di `cmd/api`.
9. UI SDM memakai `academicYearAtom` global; picker periode dibatasi rentang TA aktif; **rekap per Tahun Ajaran** (`GET /sdm/rekap?academic_year_id=`).
10. Hapus data kotor legacy (placeholder, id mati) — hanya seed data valid (31 karyawan, 6 golongan, master HR).

## 3. Success Criteria (MUST ALL BE TRUE)

- [ ] `go build ./...`, `go vet ./...`, `go test ./...` lulus (termasuk unit test kalkulasi gaji & finalisasi)
- [ ] `pnpm run build`, `tsc --noEmit`, biome check lulus
- [ ] Smoke test: seed → input absen → preview → finalize → unlock → ubah data → finalize → slip/rekap stabil
- [ ] `\dv koperasi_employees` = view; `/v1/koperasi/employees` tetap mengembalikan data
- [ ] `cmd/sdm` berjalan mandiri (`GET /api/v1/sdm/health`); tidak ada route SDM di binary `cmd/api`
- [ ] Rekap per TA mengembalikan bulan-bulan dalam rentang `ta.start_date`–`ta.end_date` (payday 5)
- [ ] Periode lama `mmYYYY` termigrasi/ditampilkan benar sebagai `YYYY-MM-05` (jika ada data import)

## 4. Anti-Patterns (FORBIDDEN)

- ❌ Jangan simpan periode sebagai `varchar mmYYYY` (sorting salah di batas tahun, tanpa tipe — K5).
- ❌ Jangan hitung gaji murni dinamis tanpa finalisasi (F2: slip berubah saat master HR berubah).
- ❌ Jangan taruh tabel karyawan duplikat (`koperasi_employees` + `sdm_employees` berdampingan) — satu sumber kebenaran.
- ❌ Jangan buat tabel `koperasi_employees` fisik baru dari koperasi (view dipelihara SDM).
- ❌ Jangan `DELETE FROM pinjam_detail` massal saat absen diinput (F1) — upsert idempotent per (periode, employee).
- ❌ Jangan kode keras id kedisiplinan (`id_ks=1/3`) — pakai `kode` stabil (siaga/piket).
- ❌ Jangan mutasi `golongan_id` karyawan di setiap request (F5) — hitung efektif saat kalkulasi.
- ❌ Jangan me-replikasi gaji libur (K1 owner) dan fitur autentikasi PHP lama (S1–S3) tanpa JWT+RBAC `sdm`.

## 5. Arsitektur

### 5.1 Skema (tabel `sdm_*`, periode DATE day-05)

```
sdm_golongan / sdm_tarif_kehadiran / sdm_kedisiplinan(kode) / sdm_fungsional
sdm_tugas_tambahan / sdm_penanggung_jawab / sdm_lainlain(nama unik)
sdm_employees: id, legacy_id, nama, tgl_masuk, golongan_id?, sertifikasi, impasing, is_active
sdm_fungsional_detail / sdm_tugas_tambahan_detail(+nilai) / sdm_penanggung_jawab_detail / sdm_lainlain_detail(+nilai)
sdm_absen: (periode DATE, employee_id) unique, hadir, hadir_siaga, hadir_terlambat, hadir_piket, pulang_awal
sdm_pinjam: employee_id unique (akumulatif), tgl_pinjam, jumlah, angsuran_terbayar, sisa, is_lunas, tgl_lunas
sdm_pinjam_detail: (periode DATE, pinjam_id), angsuran
sdm_payroll_periode: periode DATE unique, status(open|finalized), user_id, finalized_at, total_gaji
sdm_payroll_detail: payroll_periode_id, employee_id, kode_komponen, nama_komponen, nominal, urutan
```

`kode_komponen` snapshot: `hr_pokok, kehadiran, siaga, piket, bonus_terlambat, bonus_pulang_awal,
subtotal_absen, fungsional*, tugas_tambahan*, penanggung_jawab*, lainlain*, angsuran, total_gaji`
(baris `*` = rincian item, subtotal dijumlah dari baris tsb → slip & rekap historis penuh).

### 5.2 Backend — `cmd/sdm` (binary mandiri, pola cmd/koperasi)

```
cmd/sdm/main.go: config.LoadEnv → DBInit → sdm.New(shared.New(db)) →
                AutoMigrate(sdm models) → sdm.Seed(db) → sdm.EnsureEmployeeView(db) →
                bootstrap.NewEcho → RegisterRoutes → Run(Port("SDM_PORT","8082"))
```

- **Keluar dari `cmd/api/main.go`**: model SDM di AutoMigrate, `sdm.Seed`, `sdmModule.RegisterRoutes`.
- **Koperasi**: hapus `&anggota.Employee{}` dari `koperasi.Models()`; hapus `seedEmployees`; `EnsureEmployeeView` idempotent dipanggil juga dari boot koperasi (urutan start tidak penting).
- **Migrasi view (sekali, idempotent)**: cek `relkind` `koperasi_employees`; jika masih tabel → `DROP FK fk_koperasi_members_employee`, `DROP TABLE koperasi_employees`, `CREATE VIEW koperasi_employees AS SELECT id, legacy_id, nama AS full_name, tgl_masuk AS join_date, is_active, created_at, updated_at, deleted_at FROM sdm_employees`.

### 5.3 Alur finalisasi (K2/K3)

```
Input absen/HR/angsuran (periode YYYY-MM-05)
  → GET /sdm/penggajian?periode → { status: preview|finalized, rows }
      (finalized → baca sdm_payroll_detail; preview → hitung dinamis)
  → POST /sdm/penggajian/finalize {periode}   (transaksi: hitung + tulis snapshot + status)
  → slip & rekap baca snapshot (stabil)
  → POST /sdm/penggajian/unlock {periode}     (koreksi: hapus snapshot, status open)
```

### 5.4 API Contract (`/api/v1/sdm/*`, JWT + `RequireModule("sdm")`)

| Method | Path | Catatan |
|--------|------|---------|
| CRUD | `/golongan`, `/kehadiran`, `/kedisiplinan`, `/fungsional`, `/tugas-tambahan`, `/penanggung-jawab`, `/lainlain` | master |
| CRUD + `/hr` + lampiran | `/employees`, `/employees/:id`, `/employees/:id/{fungsional,tugas-tambahan,penanggung-jawab,lainlain}[/:detail_id]` | karyawan |
| GET/PUT/DELETE | `/absen?periode=YYYY-MM-05` | list / bulk upsert / hapus periode |
| GET/POST | `/pinjaman`, `/pinjaman/:id/angsuran` | akumulatif per guru |
| GET | `/penggajian?periode=` → `{status, rows}` | preview/finalized |
| POST | `/penggajian/finalize`, `/penggajian/unlock` | snapshot |
| GET | `/penggajian/:employee_id?periode=` | slip (snapshot bila finalized) |
| GET | `/rekap?academic_year_id=` | rekap per TA (range payday) |
| GET | `/summary?academic_year_id=` | statistik dashboard |

### 5.5 Frontend (penyesuaian dari build awal)

- `custom-instance.ts`: `/sdm/*` → `VITE_SDM_API_URL` (default `http://localhost:8082/api`).
- Semua halaman `/sdm/*`: pakai `academicYearAtom`; tanpa TA aktif → placeholder "Pilih tahun ajaran".
- Picker periode: bulan-bulan dalam rentang TA; nilai `YYYY-MM-05`; tampil "Mei 2026 · payday 5".
- Penggajian: badge status Preview/Finalized + tombol Finalisasi / Buka Kembali (dengan ConfirmDialog).
- Rekap: per TA (pilih TA), tabel gabungan bulan + total; slip & rekap cetak tetap.

## 6. Task Breakdown

### Phase 0 — Persiapan & migrasi data ✅
- [x] **T0** Migrasi skema: periode `mmYYYY`→`DATE`; tambah tabel payroll; validasi & backfill (jika ada data)
- [x] **T1** `EnsureEmployeeView` + pembersihan koperasi (Models, seed); verifikasi `/koperasi/employees`

### Phase 1 — Backend inti ✅
- [x] **T2** Ubah model/service absen, pinjam_detail, penggajian ke `periode DATE` + helper payday (day=5)
- [x] **T3** Snapshot: model `sdm_payroll_periode` + `sdm_payroll_detail`; endpoint finalize/unlock; GET penggajian/slip baca snapshot saat finalized
- [x] **T4** Rekap & summary per Tahun Ajaran (`academic_year_id`)
- [x] **T5** Pisah binary: `cmd/sdm/main.go`; lepas wiring dari `cmd/api`; Dockerfile + compose + nginx note
- [x] Unit test: kalkulasi, snapshot round-trip, periode parse

### Phase 2 — Frontend ✅
- [x] **T6** `custom-instance` `/sdm/*`; hook & tipe `periode` DATE; helper TA→bulan, payday display
- [x] **T7** Adaptasi halaman: absen/penggajian/slip/laporan (TA scope, picker, status, finalize/unlock)
- [x] **T8** Rekap per TA + sidebar/env; biome/tsc/build

### Phase 3 — Deploy & verifikasi ✅
- [x] **T9** Runbook produksi (lihat §7); smoke test end-to-end di lokal; verifikasi view & port

## 7. Production Runbook (K4)

```bash
# 1) Cek port
lsof -i :8093 || ss -tlnp | grep -E ':8093|:8082'

# 2) Env (.env production)
#   SDM_PORT=8082
#   SDM_API_PORT=8093

# 3) Build & push image (satu image, 3 binary: api, koperasi, sdm)
cd apps/api && docker build -t ghcr.io/$IMAGE_OWNER/alizzah-api:$IMAGE_TAG . && docker push ...

# 4) Deploy & verifikasi
docker compose up -d sdm-api
curl -s http://127.0.0.1:8093/api/v1/sdm/health

# 5) Nginx: /api/sdm/* → 127.0.0.1:8093; VITE_SDM_API_URL = VITE_API_URL (path-based)

# 6) Verifikasi view & data
docker compose exec postgres psql -U $DB_USER -d $DB_NAME -c "\dv koperasi_employees"
docker compose exec postgres psql -U $DB_USER -d $DB_NAME -c "SELECT count(*) FROM koperasi_employees;"
```

## 8. Catatan

- `payday day = 5` dikonstankan di backend (helper `PaydayDay`) — enhancement: pindah ke Settings bila kebijakan berubah.
- Konsolidasi lanjutan: modul Cuti & Izin; integrasi gaji → keuangan (K3 ditunda).
- Dokumen sumber perilaku: `apps/old/penggajian/docs/03-logika-bisnis-kalkulasi-gaji.md` (rumus wajib dipertahankan).
