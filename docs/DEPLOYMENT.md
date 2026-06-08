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
        │  api.alizzah…    ├──► 127.0.0.1:8091 ─► container api (Go/Echo :8080) ─► postgres (internal)
        │  dashboard.aliz… ├──► 127.0.0.1:8090 ─► container dashboard (nginx SPA)
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
| `VITE_API_URL` | `https://api.alizzah.anaslabs.my.id/api` (di-bake saat build) |
| `GHCR_PAT` | opsional — hanya bila package GHCR privat |

**`.env` di VPS** (jangan di-commit): `DB_PASSWORD`, `JWT_SECRET`, `SEED_ADMIN_PASSWORD`,
`CORS_ALLOWED_ORIGINS`, `IMAGE_OWNER`, dst (lihat `.env.production.example`).

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

## Operasional

| Aksi | Perintah (di `DEPLOY_PATH`) |
|------|----------|
| Lihat log | `docker compose logs -f api` |
| Status | `docker compose ps` |
| Update manual | `git pull && docker compose pull && docker compose up -d` |
| **Rollback** | set `IMAGE_TAG=<sha-lama>` di `.env` lalu `docker compose up -d` |
| Backup DB | `docker compose exec postgres pg_dump -U $DB_USER $DB_NAME > backup_$(date +%F).sql` |

CI otomatis: merge ke `main` → build → push GHCR → SSH deploy. Deploy disematkan ke commit SHA (mudah rollback).

## Catatan penting
- **TLS & domain di nginx HOST + certbot host** (bukan di compose). Compose hanya expose `127.0.0.1:8090/8091`.
- **`VITE_API_URL` di-bake saat build** — ganti URL = rebuild image dashboard (ubah Secret lalu trigger ulang workflow).
- **CORS** ditangani aplikasi Go via `CORS_ALLOWED_ORIGINS`, bukan nginx.
- **Resource ketat** (RAM ~2 GB, disk 20 GB): build di CI (bukan di VPS); rajin `docker image prune`.
