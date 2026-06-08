# Deployment Alizzah — VPS + Docker + GitHub Actions

Panduan deploy stack Alizzah ke **satu VPS** memakai **Docker Compose**, reverse
proxy **Nginx + Certbot** (HTTPS otomatis), dan **GitHub Actions** (CI/CD paralel
ke GitHub Container Registry / GHCR).

## Arsitektur

```
                    Internet
                       │  :80 / :443
              ┌────────▼─────────┐
              │  nginx (edge)    │  TLS via Certbot
              │  app.<domain> ───┼──► dashboard (nginx, SPA)
              │  api.<domain> ───┼──► api (Go/Echo :8080) ──► postgres (volume)
              └──────────────────┘
```

Alur CI/CD: `push ke main` → checks (Go + Vite, paralel) → build image `api` &
`dashboard` (paralel) → push ke GHCR → SSH ke VPS → `docker compose pull && up -d`.
Migrasi DB jalan otomatis saat container API start (GORM AutoMigrate).

---

## ✅ Yang perlu Anda siapkan / berikan

### 1. VPS
- [ ] **IP publik** server.
- [ ] OS **Ubuntu 22.04/24.04 LTS** (asumsi default) + akses **SSH**.
- [ ] **Docker Engine + plugin Compose** terpasang (perintah di bawah).
- [ ] Firewall membuka port **22, 80, 443**.
- [ ] Spek minimal disarankan: **2 vCPU / 2–4 GB RAM / 40 GB disk**.

### 2. Domain & DNS
- [ ] Dua **A record** mengarah ke IP VPS:
      `app.<domain>` dan `api.<domain>`.
- [ ] **Email** untuk notifikasi Let's Encrypt.

### 3. GitHub (repo `anasMuf/alizzah`)
Tambahkan di **Settings → Secrets and variables → Actions**:

**Secrets**
| Nama | Isi |
|------|-----|
| `SSH_HOST` | IP/hostname VPS |
| `SSH_USER` | user SSH (mis. `deploy`) |
| `SSH_KEY` | **private key** untuk deploy (lihat langkah kunci di bawah) |
| `SSH_PORT` | port SSH (opsional, default `22`) |
| `DEPLOY_PATH` | path repo di VPS, mis. `/opt/alizzah` |
| `GHCR_PAT` | opsional — hanya bila package GHCR di-set privat |

**Variables**
| Nama | Isi |
|------|-----|
| `VITE_API_URL` | URL API yang ditanam ke frontend, mis. `https://api.<domain>/api` |

### 4. Secret aplikasi (diisi di file `.env` pada VPS)
- [ ] `DB_PASSWORD` — password Postgres yang kuat.
- [ ] `JWT_SECRET` — string acak panjang (`openssl rand -hex 32`).
- [ ] `SEED_ADMIN_PASSWORD` — password awal untuk 5 user seeder (set sebelum deploy pertama).

> Integrasi lain (SMTP/email, storage upload, payment gateway PPDB) belum ada di
> kode. Bila nanti ditambah, daftarkan env-nya di `docker-compose.yml` + `.env`.

---

## Langkah pertama kali (di VPS)

### 1. Pasang Docker
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # logout-login agar berlaku
```

### 2. Buat user deploy & kunci SSH untuk CI
Di **mesin lokal**, buat keypair khusus CI (tanpa passphrase):
```bash
ssh-keygen -t ed25519 -f alizzah_deploy -C "github-actions"
```
- Isi **public key** (`alizzah_deploy.pub`) ke `~/.ssh/authorized_keys` user deploy di VPS.
- Isi **private key** (`alizzah_deploy`) ke GitHub Secret `SSH_KEY`.

### 3. Clone repo & siapkan `.env`
```bash
sudo mkdir -p /opt/alizzah && sudo chown $USER /opt/alizzah
git clone https://github.com/anasMuf/alizzah.git /opt/alizzah
cd /opt/alizzah
cp .env.production.example .env
nano .env          # isi domain, DB_PASSWORD, JWT_SECRET, IMAGE_OWNER, dll
```

### 4. Siapkan image (build pertama via CI) & login GHCR
Image dibangun GitHub Actions. Picu **sekali** dengan push ke `main` (atau jalankan
workflow manual) sampai job **build** selesai → image tersedia di GHCR. Lalu di VPS:
```bash
# hanya bila package GHCR privat (kalau sudah public, lewati):
echo <GHCR_PAT> | docker login ghcr.io -u anasMuf --password-stdin

docker compose pull          # tarik image api, dashboard, postgres, nginx
```
> Urutan penting: image harus ada SEBELUM langkah berikutnya, karena nginx perlu
> me-resolve container `api`/`dashboard` saat start.

### 5. Terbitkan sertifikat TLS (sekali)
Pastikan A-record aktif & image sudah ter-pull, lalu:
```bash
chmod +x deploy/init-letsencrypt.sh
./deploy/init-letsencrypt.sh
```
> Uji dulu dengan `LETSENCRYPT_STAGING=1` di `.env` untuk menghindari rate limit;
> kalau sukses, hapus baris itu dan jalankan ulang script.

### 6. Nyalakan stack
```bash
docker compose up -d
docker compose ps
```

Buka `https://dashboard.alizzah.anaslabs.my.id` dan
`https://api.alizzah.anaslabs.my.id/health` → harus `{"status":"ok"}`.

> Setelah bootstrap ini sukses, **deploy berikutnya otomatis** oleh CI setiap push ke `main`.

### 7. Data awal & ganti password (PENTING)

Saat API start pertama kali pada DB kosong, **seeder otomatis mengisi data baseline**:
roster siswa TA 2026/2027, 5 user, tahun ajaran, rombel, tarif, kategori, fasilitas,
hari efektif, serta **tagihan (biaya awal/registrasi/bulanan) berstatus _unpaid_**.
Saldo kas mulai 0 (data keuangan contoh dimatikan via `seedSampleFinance = false`).

> Pendekatan ini = **"seeder sebagai sumber data"**. Data produksi identik dengan
> hasil seeder di lokal — **tidak perlu impor / `pg_dump` manual**. Semua seeder
> idempotent (cek `Count` dulu), jadi restart/redeploy berikutnya tidak menduplikasi.

> ⚠️ **Password user awal** diambil dari `SEED_ADMIN_PASSWORD` di `.env` (isi
> SEBELUM deploy pertama). Kelima user memakai password tersebut — setelah login,
> disarankan ganti password masing-masing user lewat aplikasi. Bila env kosong,
> kode fallback ke `password123` (jangan dibiarkan di produksi).
>
> Catatan: dispensasi/keringanan **contoh** tidak lagi di-seed di produksi
> (`seedSampleFinance = false`), jadi tagihan awal bersih tanpa diskon.

> ⚠️ **JANGAN** jalankan API dengan flag `--reseed` di produksi — itu
> `TRUNCATE ... CASCADE` (menghapus data + seluruh turunannya). Khusus dev.

> Catatan: seeder = **bootstrap sekali**. Mengubah isi seeder setelahnya TIDAK
> mengubah data produksi (seeder skip karena data sudah ada). Setelah live,
> input/koreksi data dilakukan lewat aplikasi.

---

## Operasional

| Aksi | Perintah |
|------|----------|
| Lihat log | `docker compose logs -f api` |
| Status | `docker compose ps` |
| Update manual | `git pull && docker compose pull && docker compose up -d` |
| **Rollback** | set `IMAGE_TAG=<sha-lama>` di `.env` lalu `docker compose up -d` |
| Backup DB | `docker compose exec postgres pg_dump -U $DB_USER $DB_NAME > backup_$(date +%F).sql` |
| Reseed (hati-hati) | `docker compose run --rm api /app/api --reseed=all` |

Setelah deploy berjalan, CI akan otomatis: setiap merge ke `main` → build →
push GHCR → SSH deploy. Deploy disematkan ke commit SHA sehingga mudah rollback.

---

## Catatan penting
- **`VITE_API_URL` di-bake saat build**, bukan runtime. Mengubah URL API berarti
  rebuild image dashboard (ubah Variable lalu trigger ulang workflow).
- **Seeder jalan tiap start container API, tapi idempotent** (semua cek `Count`
  dulu → skip bila data ada) dan data keuangan sample mati (`seedSampleFinance = false`),
  jadi **tidak menduplikasi** saat redeploy. Lihat bagian "Data awal & ganti password".
  Bila menambah seeder baru untuk produksi, pastikan tetap idempotent.
- **CORS** ditangani aplikasi Go via `CORS_ALLOWED_ORIGINS`, bukan nginx.
