# Plan: Kirim Slip Gaji via WhatsApp (Wablas) — Tautan Publik

**Status:** Selesai (Task 1–3)
**Referensi legacy:** `apps/old/penggajian/dist/wablas_fungsi.php`, `pages/Penggajian/gaji_kirimwa*.php`, `wa_helper.php`

## Keputusan (terkunci)
1. **Kirim TEKS berisi tautan** (bukan file PDF) via Wablas `send-message`. Nomor tujuan `sdm_employees.no_telp` (sudah `62…`).
2. **Token stateless** (HMAC-SHA256), isi `employee_id` + `exp`, **berlaku 3 hari**, dibuat **on-demand** setiap kali tautan dibuat/dikirim. Tanpa tabel token.
3. **Halaman publik** `/s/<token>` (di luar `_authenticated`): profil + riwayat + detail slip (read-only), **1 karyawan saja**, dengan **peringatan** bahwa tautan sementara + tombol **Download PDF**.
4. **Tanpa PIN.** Proteksi: token panjang, kedaluwarsa 3 hari, `noindex`, rate-limit.
5. **Kirim massal async**: worker latar memproses antrian; tabel `sdm_kirim_wa` = **sumber status** (`pending`/`processing`/`sent`/`failed`/`unknown`).
6. **Pembuka pesan** memakai kalimat doa yang sama dengan PDF.
7. **Kirim Semua**: hanya karyawan **aktif** yang **punya data gaji periode tsb** dan punya `no_telp`; selainnya dilewati (dihitung di `skipped`). Yang sudah `sent`/`processing` **tidak** diantrekan ulang (`already_sent`/`processing`) agar tidak ada pesan dobel.
8. **Kirim Ulang yang Gagal**: mengantrekan ulang **hanya** baris `failed` pada periode tsb; baris `sent` tidak pernah disentuh. Tombolnya hanya tampil di UI bila ada baris gagal.
9. **Timeout ≠ gagal**: bila Wablas tidak merespons (timeout/koneksi), status = `unknown` ("Belum pasti"), bukan `failed` — pesan bisa saja sudah terkirim. Status dikoreksi otomatis oleh **webhook tracking Wablas** (`delivered`/`read`/`sent` → `sent`, `cancel`/`rejected` → `failed`).
10. **Koreksi manual**: operator dapat menandai baris `failed`/`unknown` menjadi `sent` (per baris atau massal per periode) setelah mencocokkan dashboard Wablas. Ini jaring pengaman bila webhook belum aktif atau event sudah terlewat — Wablas tidak menyediakan endpoint *pull* status pesan.

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
- Config `.env`: `PUBLIC_APP_URL`, `PUBLIC_LINK_SECRET` (fallback `JWT_SECRET`), `PUBLIC_LINK_TTL_HOURS=72`, `WABLAS_DOMAIN`, `WABLAS_TOKEN`, `WABLAS_WEBHOOK_SECRET`.
- Webhook tracking (tanpa JWT): `POST|GET /api/v1/public/wablas/tracking?secret=<WABLAS_WEBHOOK_SECRET>` — payload Wablas `{id, phone, status, deviceId}`; status dipetakan ke baris terbaru dengan nomor tujuan sama.
- (Task 3) `sdm_kirim_wa` + worker async + endpoint kirim.

### Frontend
- Route publik `/s/$token` (route group terpisah), halaman read-only + warning + tombol PDF.
- Halaman Penggajian: tombol **Salin Link** + **Kirim WA** per baris; **Kirim Semua** di header; **Kirim Ulang Gagal** muncul hanya bila ada baris `failed`; **Tandai Semua Terkirim** muncul bila ada `failed`/`unknown`; status pengiriman dipantau **otomatis tiap 5 detik**, dengan tombol **Muat Ulang** untuk refresh segera.

## Task
1. **[selesai]** Backend: token + endpoint publik + `share-link`.
2. **[selesai]** Frontend: halaman publik `/s/$token`.
3. **[selesai]** WA: Salin Link + Kirim WA (per baris) + Kirim Semua (async + `sdm_kirim_wa` + worker) via Wablas `send-message`.

## Endpoint
| Method | Path | Fungsi |
|---|---|---|
| GET | `/v1/sdm/employees/:id/share-link` | Buat tautan publik (token stateless, TTL 3 hari) |
| POST | `/v1/sdm/penggajian/kirim-wa/kirim/:employee_id` | Kirim slip 1 karyawan (sinkron) |
| POST | `/v1/sdm/penggajian/kirim-wa/semua` | Jadwalkan kirim semua karyawan aktif (async, melewati yang sudah `sent`) |
| POST | `/v1/sdm/penggajian/kirim-wa/ulang-gagal` | Antrekan ulang hanya baris `failed` pada periode tsb (async) |
| POST | `/v1/sdm/penggajian/kirim-wa/tandai-terkirim` | Tandai 1 karyawan (failed/unknown) sebagai terkirim |
| POST | `/v1/sdm/penggajian/kirim-wa/tandai-semua-terkirim` | Tandai semua baris failed/unknown pada periode sebagai terkirim |
| GET | `/v1/sdm/penggajian/kirim-wa/status?periode=` | Status kirim per periode |
| POST/GET | `/v1/public/wablas/tracking?secret=` | Webhook tracking status Wablas (tanpa JWT) |
| GET | `/v1/public/slip?token=` | Profil + riwayat (tanpa JWT) |
| GET | `/v1/public/slip/detail?token=&periode=` | Slip lengkap 1 periode (tanpa JWT) |

## Setup & Operasional
Isi **`.env`** (jangan commit) — lihat juga `apps/.env.example`:

```
PUBLIC_APP_URL=https://dashboard.alizzah.sch.id   # basis URL halaman publik
PUBLIC_LINK_SECRET=<acak-panjang>                  # fallback JWT_SECRET bila kosong
PUBLIC_LINK_TTL_HOURS=72                           # masa berlaku tautan (3 hari)
WABLAS_DOMAIN=https://jogja.wablas.com             # domain device Wablas
WABLAS_TOKEN=<token-device[.secretkey]>            # token (rahasia)
WABLAS_WEBHOOK_SECRET=<acak-panjang>                # secret URL webhook tracking
```

- Worker antrian berjalan di dalam `cmd/sdm`; **tidak aktif** bila `WABLAS_*` kosong
  (start akan mencatat `[sdm-kirimwa] Wablas belum dikonfigurasi — worker tidak aktif`).
- Worker memproses status `pending` tiap 5 detik, jeda 1,5 detik antar kirim, dan
  menyimpan hasil (`sent`/`failed`/`unknown` + `pesan_error` + `attempts`) ke `sdm_kirim_wa`.
- Status pengiriman di halaman penggajian dipantau otomatis via polling **5 detik**
  (progres worker & koreksi webhook langsung terlihat); tombol **Muat Ulang** tersedia untuk refresh segera.

### Mengaktifkan webhook tracking (sekali per device)
1. Isi `WABLAS_WEBHOOK_SECRET` (mis. `openssl rand -hex 32`) lalu restart `sdm-api`.
2. Buka **detail device** di Wablas (kolom Webhook URL berisi placeholder
   `https://your-domain.com/webhook, https://your-domain.com/tracking, https://your-domain.com/device-status`).
   Isi dengan URL tracking kita:
   `https://api.alizzah.anaslabs.my.id/api/v1/public/wablas/tracking?secret=<secret>`
3. Alternatif lewat API: `POST /api/device/change-webhook-url` body `{"webhook_url": "<URL di atas>"}`
   dengan header `Authorization: <WABLAS_TOKEN>.<SECRET_KEY>`.
4. Uji: buka URL tsb di browser (GET) → `{"status":true,...}`. Lalu kirim 1 slip dan cek
   `GET /v1/sdm/penggajian/kirim-wa/status?periode=` — baris `unknown` berubah `sent`
   begitu event `delivered`/`read` masuk (log: `[sdm-kirimwa] webhook status phone=... tersinkron=true`).

> Handler hanya memproses payload tracking (punya `phone` **dan** `status`). Bila URL yang sama
> juga menerima event pesan masuk / status device, event itu dibalas `{"status":true,"message":"ignored"}`
> agar Wablas tidak menganggap webhook gagal, dan hanya dicatat di log.
>
> Bila `WABLAS_WEBHOOK_SECRET` kosong, endpoint webhook menolak semua request (503) —
> status `unknown` tidak akan terkoreksi otomatis.

### Cek port & restart binary (dev)
```bash
lsof -nP -iTCP:8082 -sTCP:LISTEN           # pastikan port SDM bebas/dipakai siapa
cd apps/api && go build -o /tmp/alizzah-sdm ./cmd/sdm
nohup /tmp/alizzah-sdm > /tmp/alizzah-sdm.log 2>&1 &   # jalankan dari apps/api
```
