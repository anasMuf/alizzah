# Deployment Alizzah — VPS (nginx host) + Docker + GitHub Actions

Stack Alizzah berjalan di **VPS bersama** (`anaslabs`, multi-app) di belakang
**nginx HOST** yang sudah ada. Container hanya expose ke `127.0.0.1`; nginx host
yang terminate TLS (Certbot host) & mem-proxy. Build & deploy via **GitHub Actions → GHCR → SSH**.

## Arsitektur

```
            Internet :443
                 │
        ┌────────▼─────────┐   (nginx HOST, sudah ada)
        │  nginx host      │   TLS via certbot host
        │  api.alizzah…    ├──► 127.0.0.1:8091 ─► container api           (:8080) ─┐
        │   ├ /api/v1/koperasi ├► 127.0.0.1:8092 ─► container koperasi-api (:8081) ├─► postgres
        │   ├ /api/v1/sdm      ├► 127.0.0.1:8093 ─► container sdm-api       (:8082) ┤   (internal)
        │   └ /api/v1/public   ├► (sdm-api)
        │  dashboard.aliz… ├──► 127.0.0.1:8090 ─► container dashboard (nginx SPA)  ─┘
        └──────────────────┘
```

Alur CI/CD: `push ke main` → checks (Go + Vite, paralel) → build image `api` &
`dashboard` (paralel) → push GHCR → SSH ke VPS → `docker compose pull && up -d`.
Migrasi DB otomatis saat container API start (GORM AutoMigrate).

## Detail lingkungan (terverifikasi)

- VPS Debian 13, nginx host pegang `:80/:443`, sudah melayani app lain (anaslabs, maqom, tracking-sholat).
- Domain: `api.alizzah.anaslabs.my.id` (cert sudah ada) & `dashboard.alizzah.anaslabs.my.id` (cert baru).
- Port loopback container: API `127.0.0.1:8091`, dashboard `127.0.0.1:8090` (atur via `API_PORT`/`WEB_PORT`).
- Deploy lama (PM2/Node di `~/alizzah`) digantikan stack Docker ini.

---

## GitHub — Secrets & Variables

**Environment secrets** — environment `ANASLABS_VPS` (sudah ada):
| Nama | Isi |
|------|-----|
| `VPS_HOST` | IP VPS |
| `VPS_USER` | user SSH (`anas`) |
| `VPS_KEY` | private key deploy (pakai yang lama — tak perlu generate ulang) |

**Repository secrets**:
| Nama | Isi |
|------|-----|
| `DEPLOY_PATH` | path clone repo di VPS, mis. `/home/anas/alizzah-app` |
| `GHCR_PAT` | opsional — hanya bila package GHCR privat |

**Repository variables** (tab **Variables**, bukan Secrets — URL publik, tidak sensitif):
| Nama | Isi |
|------|-----|
| `VITE_API_URL` | `https://api.alizzah.anaslabs.my.id/api` (di-bake saat build) |
| `VITE_SDM_API_URL` | `https://api.alizzah.anaslabs.my.id/api` (SDM, by-path; samakan dgn `VITE_API_URL`) |

**`.env` di VPS** (jangan di-commit): `DB_PASSWORD`, `JWT_SECRET`, `SEED_ADMIN_PASSWORD`,
`CORS_ALLOWED_ORIGINS`, `IMAGE_OWNER`, dst (lihat `.env.production.example`). Untuk modul SDM/HR:
`PUBLIC_APP_URL`, `PUBLIC_LINK_SECRET`, `PUBLIC_LINK_TTL_HOURS`, `WABLAS_DOMAIN`, `WABLAS_TOKEN`,
`SDM_API_PORT`, `SDM_CORS_ALLOWED_ORIGINS`.

> Integrasi koperasi → ledger keuangan sekolah **default nonaktif**. Untuk mengaktifkan kembali
> (mis. agar transaksi koperasi muncul di laporan sekolah): `KOPERASI_SEAM_ENABLED=true`
> (seam pembayaran) dan/atau `KOPERASI_BRIDGE_ENABLED=true` (bridge lain-lain). Saat nonaktif,
> artefak bridge lama di `expenses`/`cash_transactions` dibersihkan otomatis oleh
> `seeders.FixKoperasiBridgeArtifacts` saat `school-api` start. Lihat
> [koperasi/status-dan-lanjutan.md](./koperasi/status-dan-lanjutan.md) §6.

---

## Bootstrap pertama kali (di VPS)

### 1. Build image dulu (via CI)
Picu **sekali** dengan push/merge ke `main` sampai job **build** hijau → image ada di GHCR.

### 2. Direktori deploy bersih + `.env`
Pakai direktori baru (jangan campur dengan clone lama `~/alizzah` yang masih struktur PM2):
```bash
git clone https://github.com/anasMuf/alizzah.git ~/alizzah-app
cd ~/alizzah-app
cp .env.production.example .env
nano .env            # IMAGE_OWNER=anasmuf, DB_PASSWORD, JWT_SECRET, SEED_ADMIN_PASSWORD, CORS_ALLOWED_ORIGINS
```
Set GitHub secret `DEPLOY_PATH` = `/home/anas/alizzah-app`.

### 3. Pull image & nyalakan stack
```bash
# bila package GHCR privat:
echo <GHCR_PAT> | docker login ghcr.io -u anasMuf --password-stdin
docker compose pull
docker compose up -d
docker compose ps              # api & dashboard healthy?
curl -s http://127.0.0.1:8091/health     # -> {"status":"ok"}
```

### 4. Arahkan nginx host ke container
Referensi config ada di `deploy/nginx-host/`.

**API** — edit site yang sudah ada, ganti target proxy:
```bash
sudo sed -i 's#proxy_pass http://localhost:3011;#proxy_pass http://127.0.0.1:8091;#' \
  /etc/nginx/sites-available/alizzah-api
```

**Dashboard** — site baru + TLS:
```bash
sudo cp deploy/nginx-host/alizzah-dashboard.conf /etc/nginx/sites-available/alizzah-dashboard
sudo ln -s /etc/nginx/sites-available/alizzah-dashboard /etc/nginx/sites-enabled/
# pastikan A-record dashboard.alizzah.anaslabs.my.id -> IP VPS sudah aktif
sudo certbot --nginx -d dashboard.alizzah.anaslabs.my.id
sudo nginx -t && sudo systemctl reload nginx
```

Verifikasi: `https://dashboard.alizzah.anaslabs.my.id` &
`https://api.alizzah.anaslabs.my.id/health` → `{"status":"ok"}`.

> Setelah ini, **deploy berikutnya otomatis** tiap push ke `main`.

### 5. Bersihkan deploy lama (reclaim disk)
Setelah stack baru OK & data terverifikasi:
```bash
# (opsional) backup DB lama dulu
docker exec -t alizzah_postgres pg_dumpall -U postgres > ~/alizzah_old_$(date +%F).sql
docker rm -f alizzah_postgres                       # container DB lama
docker volume ls                                    # cari & hapus volume lama bila yakin
rm -rf ~/alizzah/node_modules ~/alizzah/.turbo      # cruft build lama (besar)
docker image prune -af
df -h /
```

### 6. Data awal & ganti password (PENTING)
Saat API start pertama pada DB kosong, **seeder mengisi baseline otomatis**: roster
siswa TA 2026/2027, 5 user, tahun ajaran, rombel, tarif, kategori, fasilitas, hari
efektif, serta **tagihan (awal/registrasi/bulanan) berstatus _unpaid_**; saldo kas 0.

> **"Seeder sebagai sumber data"** — identik dengan lokal, tanpa `pg_dump`. Semua
> seeder idempotent (cek `Count`), aman saat redeploy.

> ⚠️ **Password user awal** dari `SEED_ADMIN_PASSWORD` (isi SEBELUM deploy pertama).
> Setelah login, ganti password tiap user lewat aplikasi. Bila kosong → fallback `password123`.

> ⚠️ **JANGAN** `--reseed` di produksi (`TRUNCATE ... CASCADE`). Seeder = bootstrap sekali;
> ubah seeder setelahnya tidak mengubah data prod. Setelah live, input via aplikasi.

---

## Modul SDM/HR (`sdm-api`) — penyiapan & migrasi

`cmd/sdm` adalah binary **ketiga** (image sama, `entrypoint: ["/app/sdm"]`, port container 8082,
loopback host `SDM_API_PORT` default **8093**). Ia memigrasi tabel `sdm_*` **dan** memelihara
view `koperasi_employees` (sumber kanonik karyawan = modul SDM). Lihat `docs/sdm/plan.md` &
`docs/sdm/kirim-wa-plan.md`.

### Prasyarat `.env` (VPS)
```
PUBLIC_APP_URL=https://dashboard.alizzah.anaslabs.my.id   # basis tautan /s/<token>
PUBLIC_LINK_SECRET=<openssl rand -hex 32>                  # WAJIB, beda dari JWT_SECRET
PUBLIC_LINK_TTL_HOURS=72
WABLAS_DOMAIN=https://jogja.wablas.com
WABLAS_TOKEN=<token-device[.secretkey]>
SDM_API_PORT=8093
SDM_CORS_ALLOWED_ORIGINS=https://dashboard.alizzah.anaslabs.my.id
```
> Bila `PUBLIC_LINK_SECRET` **dan** `JWT_SECRET` kosong, `sdm-api` **menolak start** (`log.Fatal`)
> — mencegah token tautan publik dipalsukan.

### GitHub Variable
`VITE_SDM_API_URL` = `https://api.alizzah.anaslabs.my.id/api` (by-path, samakan `VITE_API_URL`).
Di-*bake* saat build image dashboard.

### Nginx host (by-path, satu domain `api.alizzah…`)
Tambahkan ke site `alizzah-api` (sudah ada di `deploy/nginx-host/alizzah-api.conf`):
```nginx
location /api/v1/sdm    { proxy_pass http://127.0.0.1:8093; ... }
location /api/v1/public { proxy_pass http://127.0.0.1:8093; ... }
```
Nginx memilih prefix terpanjang → `/api/v1/sdm` & `/api/v1/public` ke **sdm-api**, sisanya ke api.
```bash
sudo nginx -t && sudo systemctl reload nginx
```

### ⚠️ Backup DB SEBELUM deploy pertama SDM
Start pertama `sdm-api` menjalankan migrasi **satu arah**: `EnsureEmployeeView` **DROP tabel fisik
`koperasi_employees`** lalu menggantinya dengan **VIEW** atas `sdm_employees`, plus `AutoMigrate`
tabel `sdm_*`.
```bash
docker compose exec postgres pg_dump -U "$DB_USER" "$DB_NAME" > ~/backup_pre-sdm_$(date +%F).sql
```
Rollback image **tidak** otomatis membalik migrasi ini — pulihkan dari backup bila perlu.

### Deploy & verifikasi
```bash
cd "$DEPLOY_PATH" && git pull && docker compose pull && docker compose up -d
docker compose ps                                            # sdm-api healthy?
curl -s http://127.0.0.1:8093/health                         # {"status":"ok"}
docker compose exec postgres psql -U "$DB_USER" -d "$DB_NAME" -c "\dv koperasi_employees"  # harus VIEW
```

### Go-live Wablas (hati-hati)
Worker antrian **aktif** begitu `WABLAS_*` terisi: ia memproses baris `pending` di `sdm_kirim_wa`
dan **mengirim WhatsApp sungguhan**. Jangan menekan **Kirim Semua** di produksi sebelum siap;
uji dulu ke satu nomor internal.

### Uji di staging dulu
Unit test memakai SQLite; `EnsureEmployeeView` & migrasi rentang golongan hanya teruji di Postgres
lokal. Disarankan uji pada DB salinan/staging sebelum produksi.

---

## Operasional

| Aksi | Perintah (di `DEPLOY_PATH`) |
|------|----------|
| Lihat log | `docker compose logs -f api` |
| Lihat log SDM | `docker compose logs -f sdm-api` |
| Status | `docker compose ps` |
| Update manual | `git pull && docker compose pull && docker compose up -d` |
| **Rollback** | set `IMAGE_TAG=<sha-lama>` di `.env` lalu `docker compose up -d` |
| Backup DB | `docker compose exec postgres pg_dump -U $DB_USER $DB_NAME > backup_$(date +%F).sql` |

CI otomatis: merge ke `main` → build → push GHCR → SSH deploy. Deploy disematkan ke commit SHA (mudah rollback).

## Catatan penting
- **TLS & domain di nginx HOST + certbot host** (bukan di compose). Compose hanya expose `127.0.0.1:8090/8091`.
- **`VITE_API_URL` / `VITE_SDM_API_URL` di-bake saat build** — ganti URL = rebuild image dashboard (ubah Variable lalu trigger ulang workflow).
- **CORS** ditangani aplikasi Go via `CORS_ALLOWED_ORIGINS` (api/koperasi) & `SDM_CORS_ALLOWED_ORIGINS` (sdm), bukan nginx.
- **Migrasi SDM bersifat satu arah** (tabel `koperasi_employees` → view) — selalu backup sebelum deploy pertama `sdm-api`.
- **Resource ketat** (RAM ~2 GB, disk 20 GB): build di CI (bukan di VPS); rajin `docker image prune`.
