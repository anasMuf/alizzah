# Plan: Kirim Slip Gaji via WhatsApp (Wablas) — Tautan Publik

**Status:** Disetujui untuk implementasi (Task 1 berjalan)
**Referensi legacy:** `apps/old/penggajian/dist/wablas_fungsi.php`, `pages/Penggajian/gaji_kirimwa*.php`, `wa_helper.php`

## Keputusan (terkunci)
1. **Kirim TEKS berisi tautan** (bukan file PDF) via Wablas `send-message`. Nomor tujuan `sdm_employees.no_telp` (sudah `62…`).
2. **Token stateless** (HMAC-SHA256), isi `employee_id` + `exp`, **berlaku 3 hari**, dibuat **on-demand** setiap kali tautan dibuat/dikirim. Tanpa tabel token.
3. **Halaman publik** `/s/<token>` (di luar `_authenticated`): profil + riwayat + detail slip (read-only), **1 karyawan saja**, dengan **peringatan** bahwa tautan sementara + tombol **Download PDF**.
4. **Tanpa PIN.** Proteksi: token panjang, kedaluwarsa 3 hari, `noindex`, rate-limit.
5. **Kirim massal async**: worker latar memproses antrian; tabel `sdm_kirim_wa` = **sumber status** (`pending`/`sent`/`failed`).
6. **Pembuka pesan** memakai kalimat doa yang sama dengan PDF.
7. **Kirim Semua**: hanya karyawan **aktif**, lewati yang `no_telp` kosong.

## Persyaratan (IMMUTABLE)
- Tautan publik hanya menampilkan data **1 karyawan** (profil ringkas, golongan, rincian gaji). TIDAK boleh ada endpoint publik yang membocorkan daftar/anggota lain.
- Token tidak dapat dipalsukan (HMAC dengan secret dari env) dan ditolak setelah kedaluwarsa.
- Data gaji tetap benar: publik memakai kalkulasi/snapshot yang sama dengan slip internal.
- Worker WA idempotent & tahan restart: status tersimpan di DB.

## Anti-pattern (DILARANG)
- ❌ Token berisi data sensitif apa adanya (cukup `employee_id`+`exp`).
- ❌ Endpoint publik tanpa verifikasi token / tanpa rate-limit.
- ❌ Hardcode token Wablas di kode (pakai `.env`).
- ❌ Simpan email/NIK/alamat di halaman publik (hanya yang dibutuhkan slip).
- ❌ Kirim sinkron massal yang menahan request lama.

## Arsitektur
### Backend
- `internal/modules/sdm/publik/` — token sign/verify, handler publik (tanpa JWT), serta endpoint admin `GET /sdm/employees/:id/share-link`.
- Endpoint publik:
  - `GET /api/v1/public/slip?token=` → `{ employee, riwayat[] }`
  - `GET /api/v1/public/slip/detail?token=&periode=` → slip lengkap (1 periode)
- Config `.env`: `PUBLIC_APP_URL`, `PUBLIC_LINK_SECRET` (fallback `JWT_SECRET`), `PUBLIC_LINK_TTL_HOURS=72`, `WABLAS_DOMAIN`, `WABLAS_TOKEN`.
- (Task 3) `sdm_kirim_wa` + worker async + endpoint kirim.

### Frontend
- Route publik `/s/$token` (route group terpisah), halaman read-only + warning + tombol PDF.
- Halaman Penggajian: tombol **Salin Link** + **Kirim WA** per baris; **Kirim Semua** di header.

## Task
1. **[berjalan]** Backend: token + endpoint publik + `share-link`.
2. Frontend: halaman publik `/s/$token`.
3. WA: Salin Link + Kirim WA (per baris) + Kirim Semua (async + `sdm_kirim_wa` + worker) via Wablas `send-message`.
