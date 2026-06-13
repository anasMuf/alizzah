# ADR-002: Topologi Deployment — Multi-Binary Modular Monolith

- **Status:** Diterima — 2026-06-11 · **Ditegaskan 2026-06-12** (dua binary dipertahankan)
- **Pemicu:** Kebutuhan modul **Koperasi** bisa **deploy/restart terpisah** + **isolasi fault** (satu modul error tak menjatuhkan yang lain)
- **Lanjutan dari:** [ADR-001](./adr-001-modular-structure.md) (struktur modular)

> **Revisi 2026-06-12:** Keputusan **dua binary backend tetap berlaku** (school-api + koperasi-api). Yang dikoreksi hanya sisi **frontend**: koperasi kini **satu modul di `apps/dashboard`**, BUKAN app terpisah. Konsekuensinya, **satu frontend (dashboard) memanggil dua backend** — request `/koperasi/*` diarahkan ke koperasi-api, sisanya ke school-api, lewat path-routing di `@alizzah/api-client` (env `VITE_KOPERASI_API_URL`) untuk dev dan nginx host (satu domain, split by-path) untuk produksi.

---

## 1. Konteks

ADR-001 menetapkan backend sebagai **modular monolith** (satu binary, modul = batas kode). Muncul kebutuhan operasional:
1. Koperasi harus bisa **dideploy & direstart sendiri** tanpa mengganggu modul sekolah.
2. **Isolasi fault**: crash fatal di koperasi tidak boleh menjatuhkan akademik/keuangan.

Pertanyaan: apakah perlu **microservice**? **Tidak.** Skala Alizzah (satu sekolah KB/TK) tak butuh scaling independen, tim besar, atau data store terpisah. Microservice malah menambah pajak sistem terdistribusi — paling kritis: seam **penyaluran modal** (ADR koperasi D1) menulis *kas sekolah* + *kas koperasi* dalam **satu transaksi DB**; di DB-per-service itu jadi saga/2PC.

## 2. Keputusan

Pakai **multi-binary dari satu codebase, berbagi satu PostgreSQL** ("deployable modulith"):

```
apps/api/
├── cmd/
│   ├── api/main.go        → binary "school-api"   (akademik + keuangan)  :8080
│   └── koperasi/main.go   → binary "koperasi-api" (modul koperasi)        :8081
├── internal/
│   ├── bootstrap/         → NewEcho() / APIGroup() / Run() dipakai semua binary
│   ├── shared/  platform/
│   └── modules/{akademik,keuangan,koperasi}/
```

- **Satu image Docker, dua binary** (`/app/api`, `/app/koperasi`). `compose` memilih binary lewat `entrypoint`.
- Tiap entrypoint memakai `internal/bootstrap` agar setup Echo/middleware/shutdown tidak terduplikasi.
- **Bukan** microservice: tidak ada DB per service, tidak ada panggilan jaringan antar-modul, tidak ada distributed transaction.

### Pemenuhan kebutuhan
| Kebutuhan | Tercapai karena |
|---|---|
| Deploy/restart koperasi terpisah | Kontainer `koperasi-api` sendiri (image sama, entrypoint beda) |
| Isolasi fault | Proses OS terpisah → crash fatal koperasi tak menyentuh school-api. Di dalam tiap proses, Echo `Recover()` sudah menahan panic per-request |
| Seam modal tetap atomik | DB tunggal → tetap satu `db.Transaction` |
| Join `sales.student_id → students` | DB tunggal → FK + join biasa |

## 3. Kepemilikan migrasi

**Tiap binary memigrasi tabel miliknya sendiri**, dan domainnya tak tumpang-tindih:
- `school-api` → model sekolah (`users`, `students`, `cash_transactions`, …).
- `koperasi-api` → `koperasi_*` (lewat `koperasi.Module.Models()`).

Karena tabel terpisah, keduanya bisa migrasi saat deploy masing-masing → **benar-benar independen**. Migrasi yang breaking pada tabel bersama (tak ada saat ini) harus dikoordinasi manual.

## 4. Deployment

- **Image**: `Dockerfile` build `./cmd/api` **dan** `./cmd/koperasi`, menyalin keduanya. ENTRYPOINT default `/app/api`.
- **Compose**: service `koperasi-api` (image sama, `entrypoint: ["/app/koperasi"]`, `PORT=8081`, hanya `depends_on: postgres`).
- **Env baru**: `KOPERASI_API_PORT` (default 8092 di host), `KOPERASI_CORS_ALLOWED_ORIGINS` (fallback ke `CORS_ALLOWED_ORIGINS`).
- **Routing**: reverse proxy host arahkan `/api/v1/koperasi/*` → `koperasi-api`, sisanya → `school-api`. Alternatif: app frontend koperasi pakai `VITE_API_URL` langsung ke `koperasi-api`.

## 5. Pengerasan dalam-proses (komplementer)
Lepas dari split: pasang `recover()` di goroutine background, hindari `log.Fatal` di jalur request, set `ReadTimeout`/`WriteTimeout` Echo, batasi pool DB. Menutup celah fatal-proses yang tersisa.

## 6. Konsekuensi

**Positif** — deploy/restart & isolasi fault per modul; tanpa distributed transaction; image tunggal sederhana; mudah dikembalikan ke single-binary bila perlu.

**Negatif / trade-off**
- Skema DB **dibagi** → disiplin migrasi saat ada perubahan tabel bersama.
- Isolasi **proses**, bukan **data** — kedua binary secara teknis bisa menyentuh tabel sama (justru ini yang menjaga seam modal tetap mudah).
- Ops +1 service + aturan proxy.

## 7. Alternatif yang ditolak
| Alternatif | Alasan ditolak |
|---|---|
| **Single binary** (status quo ADR-001) | Tak ada isolasi proses; crash fatal menjatuhkan semua |
| **Microservice penuh** (DB per service) | Distributed transaction untuk seam modal; join lintas-jaringan; ops berat — tak sepadan untuk skala 1 sekolah |

## 8. Kapan baru pindah microservice
Bila salah satu modul butuh **scaling** ekstrem & independen, ada **tim terpisah** berbeda kadens rilis, butuh **isolasi data/compliance** ketat, atau **data store** berbeda. Belum ada yang berlaku. Karena modul sudah berbatas tegas, ekstraksi jadi service tetap **evolusi, bukan rewrite**.
