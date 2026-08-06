# Tasks: Kategori Penerimaan Dinamis

> Dibuat dari `tasks/plan.md`. Centang `[x]` saat task selesai.

---

## Phase 1: Backend Foundation

### [ ] Task 1: Model, Migration & Seed Income Categories

**Description:** Buat tabel `income_categories` (code, name), migration untuk menambah kolom `income_category_id` di `income_transactions`, backfill data existing, lalu drop kolom `category` lama. Seed 4 kategori awal.

**Acceptance criteria:**
- [ ] Tabel `income_categories` terbuat dengan kolom `id`, `code` (unique), `name`, `created_at`, `updated_at`
- [ ] Kolom `income_category_id` (FK) ada di `income_transactions`
- [ ] Semua row `income_transactions` yang ada ter-backfill: `category` string → `income_category_id` yang sesuai
- [ ] Kolom `category` lama sudah di-drop dari `income_transactions`
- [ ] Seeder `SeedIncomeTransactions` di-update: seed kategori dulu, pakai FK

**Verification:**
- [ ] `go build ./...` di `apps/api` sukses
- [ ] Jalankan aplikasi → cek tabel `income_categories` ada 4 row
- [ ] Query: `SELECT * FROM income_transactions` — kolom `category` sudah hilang, `income_category_id` terisi

**Dependencies:** None

**Files likely touched:**
- `apps/api/model/income_category.go` (new)
- `apps/api/model/income_transaction.go`
- `apps/api/cmd/api/main.go`
- `apps/api/seeders/income_transaction_seeder.go`

**Estimated scope:** Medium (4 files)

---

### [ ] Task 2: Income Category CRUD API

**Description:** Buat DTO, repository, service, dan handler untuk CRUD `income_categories`. Endpoint: `GET/POST/PUT/DELETE /v1/income-categories`. Daftarkan routes di `main.go`.

**Acceptance criteria:**
- [ ] `GET /v1/income-categories` — mengembalikan list semua kategori (flat array)
- [ ] `POST /v1/income-categories` — membuat kategori baru (validasi: code unique, format `^[a-z][a-z0-9_]*$`)
- [ ] `PUT /v1/income-categories/:id` — update nama kategori
- [ ] `DELETE /v1/income-categories/:id` — hapus (gagal kalau masih dipakai transaksi)
- [ ] Routes di-protect JWT + `RequireModule(ModuleKeuangan)`

**Verification:**
- [ ] `go build ./...` sukses
- [ ] Test via curl/Postman: CRUD lengkap berfungsi
- [ ] Hapus kategori yang masih dipakai → 422 error

**Dependencies:** Task 1

**Files likely touched:**
- `apps/api/dto/income_category.go` (new)
- `apps/api/repository/income_category_repository.go` (new)
- `apps/api/service/income_category_service.go` (new)
- `apps/api/handler/income_category_handler.go` (new)
- `apps/api/cmd/api/main.go`

**Estimated scope:** Medium (5 files)

---

### Checkpoint: Phase 1
- [ ] `go build ./...` sukses
- [ ] API income-categories CRUD berfungsi penuh
- [ ] Data existing income_transactions ter-backfill dengan benar
- [ ] Kolom `category` lama sudah hilang

---

## Phase 2: Integrasi Income Transaction ke Kategori Baru

### [ ] Task 3: Ubah Income Transaction — dari String Category ke FK

**Description:** Ubah `CreateIncomeTransactionRequest` dari menerima `category: string` menjadi `income_category_id: uint`. Update service, handler, dan repository. Hapus hardcode `incomeCategoryLabels` map di service.

**Acceptance criteria:**
- [ ] DTO `CreateIncomeTransactionRequest.Category string` → `IncomeCategoryID uint`
- [ ] Validation tidak lagi `oneof=bos donasi ...` tapi `required` + cek FK exists
- [ ] Service `Create` & `Update` resolve nama kategori dari DB (JOIN `income_categories`) untuk deskripsi cash transaction
- [ ] Repository `FindAll` filter by `income_category_id` bukan string `category`
- [ ] Response `IncomeTransactionResponse` menyertakan nested `category: {id, code, name}`

**Verification:**
- [ ] `go build ./...` sukses
- [ ] `POST /v1/income-transactions` dengan `income_category_id` berfungsi
- [ ] `GET /v1/income-transactions?income_category_id=X` filter berfungsi
- [ ] Response mengandung `category: {id, code, name}`

**Dependencies:** Task 2

**Files likely touched:**
- `apps/api/dto/income_transaction.go`
- `apps/api/service/income_transaction_service.go`
- `apps/api/repository/income_transaction_repository.go`
- `apps/api/handler/income_transaction_handler.go`

**Estimated scope:** Medium (4 files)

---

### [ ] Task 4: Ubah Report — JOIN ke income_categories, Hapus Hardcode Label

**Description:** Di `report_repository.go` (`FindPemasukanSummary`, `SumIncomeTransactionsByCategory`) dan `report_service.go` (PosisiKas), ganti hardcode `incomeLabels` map dengan JOIN ke `income_categories` table. Filter report tetap pakai `code` untuk backward compatibility.

**Acceptance criteria:**
- [ ] `FindPemasukanSummary` — JOIN ke `income_categories` untuk label, filter by `income_categories.code`
- [ ] `SumIncomeTransactionsByCategory` — tetap GROUP BY, tapi label di-resolve di service layer dari DB
- [ ] `GetPosisiKas` — tidak lagi referensi `incomeCategoryLabels` hardcode
- [ ] Filter `income_categories=bos,donasi` di report tetap berfungsi

**Verification:**
- [ ] `go build ./...` sukses
- [ ] `GET /v1/reports/pemasukan?income_categories=bos` — tampil data dengan label "Dana BOS"
- [ ] `GET /v1/reports/posisi-kas` — kategori income muncul dengan nama dari DB
- [ ] Tambah kategori baru lewat API → muncul di laporan tanpa deploy ulang

**Dependencies:** Task 3

**Files likely touched:**
- `apps/api/repository/report_repository.go`
- `apps/api/service/report_service.go`

**Estimated scope:** Small (2 files)

---

### Checkpoint: Phase 2
- [ ] `go build ./...` sukses
- [ ] Income transaction pakai FK, bukan string
- [ ] Semua laporan tampil dengan label dari DB
- [ ] Tidak ada hardcode `"bos"`, `"donasi"`, `"hibah"`, `"lainnya"` di backend

---

## Phase 3: Regenerasi + Frontend

### [ ] Task 5: Regenerate Swagger & Orval Frontend Client

**Description:** Generate ulang `swagger.json` dari anotasi Go handler yang baru. Lalu jalankan `pnpm run generate:api` untuk generate frontend API client (React Query hooks & TypeScript types).

**Acceptance criteria:**
- [ ] `swagger.json` mengandung endpoint `/v1/income-categories` (CRUD)
- [ ] `swagger.json` mengandung DTO `CreateIncomeTransactionRequest` dengan `income_category_id` (bukan `category` string)
- [ ] Orval generate sukses — folder `apps/dashboard/src/api/endpoints/income-categories/` terbuat
- [ ] Type `DtoIncomeCategoryResponse` ada di `apps/dashboard/src/api/model/`
- [ ] Type `DtoCreateIncomeTransactionRequestCategory` (hardcoded enum) sudah hilang

**Verification:**
- [ ] `pnpm run generate:api` sukses tanpa error
- [ ] `pnpm run check` (biome) sukses tanpa TypeScript error

**Dependencies:** Task 4

**Files likely touched:**
- `apps/api/docs/swagger.json` (regenerated)
- `apps/api/docs/swagger.yaml` (regenerated)
- `apps/api/docs/docs.go` (regenerated)
- `apps/dashboard/src/api/endpoints/income-categories/` (new, auto-generated)
- `apps/dashboard/src/api/model/` (updated, auto-generated)

**Estimated scope:** Small (regeneration, no manual coding)

---

### [ ] Task 6: Halaman Kelola Kategori Penerimaan

**Description:** Buat halaman `/keuangan/penerimaan/kategori` yang menampilkan list kategori penerimaan dalam bentuk card grid (flat). Fitur: tambah, edit (nama), hapus. Mirror pola dari `pengeluaran/kategori.tsx` tapi tanpa parent-child tree.

**Acceptance criteria:**
- [ ] Halaman bisa diakses di `/keuangan/penerimaan/kategori`
- [ ] Menampilkan semua kategori dalam card grid (nama + kode)
- [ ] Tombol "Tambah Kategori" → SlideOver form (nama + kode)
- [ ] Tombol edit per kategori → SlideOver form (edit nama, kode readonly)
- [ ] Tombol hapus → ConfirmDialog (gagal kalau masih dipakai)
- [ ] Loading, empty, error state tertangani
- [ ] Navigasi breadcrumb: Penerimaan > Kategori

**Verification:**
- [ ] `pnpm run build` sukses
- [ ] Buka `/keuangan/penerimaan/kategori` → list tampil
- [ ] Tambah kategori baru → muncul di list
- [ ] Edit kategori → nama berubah
- [ ] Hapus kategori yang belum dipakai → berhasil
- [ ] Hapus kategori yang sudah dipakai transaksi → toast error

**Dependencies:** Task 5

**Files likely touched:**
- `apps/dashboard/src/routes/_authenticated/keuangan/penerimaan/kategori.tsx` (new)

**Estimated scope:** Medium (1 file, ~250 lines)

---

### [ ] Task 7: Ubah Halaman Form & List Penerimaan

**Description:** Di `baru.tsx`, `$id.tsx`, dan `index.tsx`: ganti dropdown hardcode `CATEGORY_OPTIONS` dengan data dari `useGetV1IncomeCategories()`. Kirim `income_category_id` sebagai ganti `category` string. Hapus semua `CATEGORY_LABELS`, `CATEGORY_VARIANTS`, dan `CATEGORY_OPTIONS` hardcode.

**Acceptance criteria:**
- [ ] `baru.tsx` — dropdown kategori dari API, `createMutation` kirim `income_category_id`
- [ ] `$id.tsx` — dropdown edit dari API, badge tampil pakai `income_category.name`
- [ ] `index.tsx` — filter dropdown dari API, badge kolom "Kategori" dari `item.income_category.name`
- [ ] Filter `category` query param → `income_category_id`
- [ ] Tidak ada lagi import `DtoCreateIncomeTransactionRequestCategory` dari model hardcode
- [ ] Loading state di dropdown (saat fetch kategori)

**Verification:**
- [ ] `pnpm run build` sukses
- [ ] `pnpm run check` — tidak ada TypeScript error
- [ ] Buka `/keuangan/penerimaan/baru` → dropdown berisi kategori dari DB
- [ ] Catat penerimaan baru → sukses, muncul di list dengan badge nama kategori
- [ ] Edit penerimaan → dropdown berisi kategori dari DB
- [ ] Filter kategori di halaman list → berfungsi

**Dependencies:** Task 5, Task 6

**Files likely touched:**
- `apps/dashboard/src/routes/_authenticated/keuangan/penerimaan/baru.tsx`
- `apps/dashboard/src/routes/_authenticated/keuangan/penerimaan/$id.tsx`
- `apps/dashboard/src/routes/_authenticated/keuangan/penerimaan/index.tsx`

**Estimated scope:** Medium (3 files)

---

### Checkpoint: Complete
- [ ] `go build ./...` sukses di `apps/api`
- [ ] `pnpm run build` sukses di `apps/dashboard`
- [ ] `pnpm run check` sukses — tidak ada error
- [ ] End-to-end: tambah kategori → catat penerimaan pakai kategori baru → lihat di list → muncul di laporan
- [ ] Zero hardcode string kategori di seluruh codebase
