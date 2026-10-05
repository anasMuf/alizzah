# Epic: Skip Tagihan Bulanan PASTA & Fasilitas

> **Status:** Ready
> **Priority:** P1

---

## 1. Ringkasan Masalah

Admin tidak bisa menonaktifkan tagihan bulanan (PASTA/ekskul, fasilitas) pada **bulan-bulan tertentu yang dipilih** tanpa menghentikan enrollment secara total. Kebutuhan nyata: *"Agustus sudah bayar, September berhenti, tapi Oktober masih aktif"* — atau memilih bulan tidak berurutan (mis. Oktober, Januari, Maret) untuk di-skip.

Temuan diverifikasi dari dua jalur yang ada, keduanya tidak memenuhi kebutuhan:

1. **Aksi "Hapus item tagihan"** — semua item invoice bulanan di-generate dengan `IsMandatory: true` hardcoded (termasuk PASTA opsional), sehingga tombol hapus disembunyikan di UI dan backend menolak dengan *"Tidak bisa menghapus item mandatory"*.
2. **Alur "Berhenti" (`Unenroll`)** — dulu hanya mendukung cutoff `end_date = time.Now()` (bulan berjalan ke depan); tidak ada pemilihan bulan. Jalur `Update` yang menerima `end_date` bebas (backdate) tidak memanggil cleanup invoice sama sekali. `end_date` bersifat cutoff tunggal, tidak bisa mewakili "Oktober aktif lagi".
   > **Perubahan berikutnya (Aturan B):** cleanup `Unenroll` diubah dari "bulan berjalan ke depan" menjadi "mulai bulan `start_date` ke depan" — semua item unpaid PASTA/fasilitas yang dihentikan ikut dibersihkan, termasuk bulan-bulan sebelum `end_date` (mis. item Agustus saat berhenti di September). Lihat `RemoveExtracurricularInvoices` / `RemoveFacilityInvoices`.

Fitur yang dirancang: **skip tagihan per bulan** — admin memilih daftar bulan (bebas/tidak berurutan) di mana tagihan PASTA/fasilitas tidak ditagihkan, tanpa mengubah status enrollment (tetap Aktif).

## 2. Temuan Codebase (State Saat Ini)

| File | Kondisi |
|------|---------|
| `apps/api/service/invoice_generate_service.go:338-363` | Loop PASTA di `GenerateMonthly` — item ditambahkan per bulan; titik cek skip |
| `apps/api/service/invoice_generate_service.go:397-440` | Loop fasilitas di `GenerateMonthly` — titik cek skip |
| `apps/api/service/invoice_generate_service.go:749-792` | `AddExtracurricularToMonthlyRange` — backfill rentang bulan `start_date..ay.EndDate`; titik cek skip |
| `apps/api/service/invoice_generate_service.go:794-838` | `addExtracurricularItemToMonthly` — helper per bulan (dipakai ulang untuk re-add) |
| `apps/api/service/invoice_generate_service.go:1718-1864` | `AddFacilityToMonthlyRange` — backfill fasilitas; titik cek skip |
| `apps/api/service/invoice_generate_service.go:840-884` | `RemoveExtracurricularFromFutureInvoices` — pola hapus item (name+category match, unpaid only) |
| `apps/api/service/invoice_generate_service.go:1866-1928` | `RemoveFacilityFromFutureInvoices` — pola hapus item fasilitas (facility_id/name match, unpaid only) |
| `apps/api/service/student_extracurricular_service.go:155-192` | `Unenroll` — `end_date = now`, cleanup via `RemoveExtracurricularInvoices` mulai bulan `start_date` |
| `apps/api/dto/student_extracurricular.go:9-11` | `UpdateStudentExtracurricularRequest` — hanya `end_date` |
| `apps/api/cmd/api/main.go:53-69` | Daftar AutoMigrate (tempat daftarkan model baru) |
| `apps/api/cmd/api/main.go:578-591` | Pola nested route siswa (`/:id/extracurriculars/:se_id`, `/:id/facilities/:facilityId`) |
| `apps/api/cmd/api/main.go:126-131` | Pola unique index partial via `db.Exec` |

Catatan: unique index `uq_active_extracurricular_per_year` (`student_extracurriculars (student_id, extracurricular_id, academic_year_id) WHERE end_date IS NULL`) menjamin satu enrollment aktif per (siswa, ekskul, tahun ajaran) → keying exclusion per (student + entity_ref) unambiguous.

## 3. Desain Solusi

### 3a. Model Data

Tabel baru `billing_month_exclusions`:

```
BillingMonthExclusion {
  id, student_id, entity_type ("extracurricular"|"facility"),
  entity_ref_id (extracurricular_id / facility_id),
  month (1-12), year, academic_year_id, created_at, updated_at
}
```

Unique index `uq_billing_exclusion` pada `(student_id, entity_type, entity_ref_id, month, year)` — sekaligus mempercepat lookup `Exists` di jalur generate.

Keying **student + entity_ref** (bukan enrollment ID): lookup di `GenerateMonthly` langsung memakai data yang tersedia (studentID + extracurricularID), tanpa resolve enrollment; stabil terhadap re-enrollment.

### 3b. API

| Method | Route | Deskripsi |
|--------|-------|-----------|
| GET | `/v1/students/:id/extracurriculars/:se_id/billing-exclusions` | Daftar bulan off |
| PUT | `/v1/students/:id/extracurriculars/:se_id/billing-exclusions` | Set daftar (replace-all) |
| GET | `/v1/students/:id/facilities/:facilityId/billing-exclusions` | Daftar bulan off |
| PUT | `/v1/students/:id/facilities/:facilityId/billing-exclusions` | Set daftar (replace-all) |

Body PUT: `{ "months": [{ "month": 10, "year": 2025 }, ...] }` — **replace-all**; daftar yang dikirim adalah source of truth. Semua route `RequireModule(ModuleAdministrasi)` sesuai pola existing.

### 3c. Integrasi Generate (Skip)

Helper di `invoiceGenerateService`: `isMonthExcluded(studentID, entityType, entityRefID, month, year) bool` (repo exclusion di-inject). Cek dipasang di 4 titik:

1. `GenerateMonthly` — loop PASTA (L338-363): skip `extracurricularID` jika bulan ini di-exclude
2. `GenerateMonthly` — loop fasilitas (L397-440): skip `sf` jika bulan ini di-exclude
3. `AddExtracurricularToMonthlyRange` (L785-789): skip bulan yang di-exclude dalam rentang
4. `AddFacilityToMonthlyRange` (L1793+): skip bulan yang di-exclude

`SyncExtracurricularMonthlyInvoices` aman otomatis (memanggil #3).

### 3d. Apply-Diff saat PUT (1 transaksi)

1. Ambil daftar lama vs baru (dedupe + validasi bulan dalam tahun ajaran aktif)
2. **Bulan baru di-off** (di list baru, tidak di lama): hapus item unpaid dari invoice bulan itu + `recalculateInvoiceTotal`
3. **Bulan off dicabut** (di lama, tidak di baru): tambahkan kembali item via helper per-bulan yang sudah ada (`addExtracurricularItemToMonthly` / logika per-bulan fasilitas) + recalc
4. Simpan daftar baru (delete all + insert, dalam tx)

Item yang sudah **dibayar** tidak pernah dihapus — response menyertakan peringatan bulan yang dilewati.

### 3e. UI

- Halaman PASTA siswa (`ekskul.tsx`) & fasilitas (`fasilitas.tsx`): tombol **"Kelola Bulan"** (ikon kalender) per enrollment aktif, di samping "Berhenti"
- Dialog: grid 12 bulan tahun ajaran aktif (Jul → Jun) dengan checkbox; centang = skip; bulan yang item-nya sudah dibayar → checkbox disabled + tooltip "sudah dibayar"
- Simpan → PUT; toast sukses/warning; invalidate query invoice + enrollment
- API client ditulis manual mengikuti pola Orval (seperti `invoice-quantity.ts`)

### 3f. Interaksi dengan "Berhenti" (Unenroll)

"Skip" dan "Berhenti" adalah dua fitur terpisah yang hidup berdampingan:

- **Berhenti** (`Unenroll`): `end_date = now`, enrollment jadi Tidak Aktif, semua item unpaid PASTA/fasilitas itu dibersihkan dari invoice mulai bulan `start_date` ke depan (Aturan B — termasuk bulan-bulan sebelum `end_date`). Item yang sudah dibayar tetap dipertahankan.
- **Skip** (baru): enrollment tetap Aktif, hanya tagihan bulan terpilih yang di-off-kan

Keputusan: saat `Unenroll` (Berhenti) dipanggil untuk sebuah enrollment, **semua baris exclusion enrollment tersebut dihapus** — data tidak dibiarkan menggantung. Berlaku di `studentExtracurricularService.Unenroll` dan `studentFacilityService.Unenroll`.

## 4. Edge Cases

- Bulan sudah dibayar → item tidak dihapus; warning ke admin
- Invoice bulan belum ada → tidak ada yang dihapus; exclusion tetap tersimpan dan berlaku saat generate
- Pencabutan skip → item ditambahkan jika belum ada (idempotent; existing key check sudah ada di `addExtracurricularItemToMonthly`)
- Bulan di luar tahun ajaran aktif → tolak (422)
- Duplikat bulan dalam request → dedupe
- Enrollment sudah `end_date` (berhenti) → tombol "Kelola Bulan" tidak muncul (hanya enrollment aktif)
- `Unenroll` (Berhenti) → exclusion untuk enrollment tsb dihapus (R.8); skip lama tidak menggantung
- PASTA wajib (Aslin) → tetap bisa di-skip (admin yang memutuskan, konsisten dengan mekanisme)
- Konkurensi PUT → transaksi + unique index sebagai safety net
- `is_mandatory=true` pada item tidak menghalangi hapus via mekanisme skip (hapus pakai `Unscoped().Delete`, tidak cek IsMandatory — sama seperti `RemoveExtracurricularFromFutureInvoices`)

## 5. Requirements (IMMUTABLE)

- R.1: Admin dapat memilih **daftar bulan bebas** (tidak harus berurutan) dalam tahun ajaran aktif di mana tagihan PASTA/ekskul tidak ditagihkan, tanpa mengubah status enrollment (tetap Aktif).
- R.2: Berlaku juga untuk fasilitas dengan perilaku identik.
- R.3: Bulan yang di-skip: item **unpaid** dihapus dari invoice bulan tersebut; item **paid** tidak dihapus; bulan di-skip pada **semua** generate/sync berikutnya.
- R.4: Pencabutan skip mengembalikan item ke invoice bulan tersebut (jika belum ada).
- R.5: Data disimpan di tabel `billing_month_exclusions` keyed `(student_id, entity_type, entity_ref_id, month, year)` dengan unique index.
- R.6: API GET (list) & PUT (replace-all) per enrollment ekstrakurikuler dan fasilitas.
- R.7: UI dialog "Kelola Bulan" dengan checkbox 12 bulan tahun ajaran aktif di halaman PASTA & fasilitas siswa; bulan sudah dibayar ditandai nonaktif.
- R.8: Saat enrollment di-berhentikan (`Unenroll`), semua baris exclusion untuk (student, entity_type, entity_ref) dihapus.

## 6. Success Criteria (MUST ALL BE TRUE)

- [ ] Unit test service apply-diff: menambah & mencabut exclusion menghasilkan perubahan invoice yang benar (hapus unpaid, re-add, recalc)
- [ ] Unit test generate: `GenerateMonthly` & `AddExtracurricularToMonthlyRange` skip bulan yang di-exclude (pasta & fasilitas)
- [ ] Unit test: item paid tidak pernah dihapus pada bulan yang di-skip
- [ ] Unit test: `Unenroll` menghapus exclusion terkait (ekskul & fasilitas)
- [ ] Integration test: PUT → item hilang dari invoice bulan tsb; GET → daftar kembali; PUT kosong → item kembali
- [ ] Unit test: `Unenroll` menghapus exclusion terkait (ekskul & fasilitas)
- [ ] UI: tombol "Kelola Bulan" muncul, simpan → toast + item di invoice hilang/muncul sesuai pilihan
- [ ] `go build ./...` sukses
- [ ] Pre-commit hooks passing

## 7. Anti-Patterns (FORBIDDEN)

- ❌ NO memakai `end_date`/cutoff tunggal untuk skip (tidak bisa mewakili "Oktober aktif lagi"; `Update` saat ini bahkan tidak cleanup invoice)
- ❌ NO menyimpan exclusion sebagai kolom JSON di tabel enrollment (susah query, tidak konsisten dengan pola codebase)
- ❌ NO menghapus item yang sudah dibayar (integritas pembayaran; R.3)
- ❌ NO mengubah status enrollment saat skip (R.1 — enrollment tetap Aktif)
- ❌ NO menerima bulan di luar tahun ajaran aktif (validasi wajib)
- ❌ NO memperbaiki `is_mandatory` di epic ini (fitur terpisah — lihat Scope Boundaries)

## 8. Scope Boundaries

**In scope:**
- Ekstrakurikuler (pasta/calisan/ekskul) + fasilitas
- Backend: model, repo, service, handler, route, integrasi generate & apply-diff
- Frontend: dialog "Kelola Bulan" di halaman PASTA & fasilitas siswa, API client manual

**Out of scope (deferred/never):**
- SPP/SPD utama — mekanisme berbeda (terikat enrollment), epic terpisah
- Daycare — mekanisme berbeda
- Perbaikan `is_mandatory=true` hardcoded di generate invoice — epic terpisah (membuka aksi hapus item manual untuk PASTA opsional)
- Prorata bulan terakhir — tidak diminta
- Batch lintas siswa — tidak diminta

## 9. Design Discovery

### Key Decisions Made

| Pertanyaan | Jawaban | Implikasi |
|------------|---------|-----------|
| Semantik off bulan X | Bulan X tidak ditagih (item dihapus) | `fromMonth = month` per bulan; berlaku per-bulan |
| Cakupan | PASTA + Fasilitas | Mekanisme seragam untuk keduanya |
| Input UI | Dropdown bulan + tahun (multi) | Dialog checkbox grid 12 bulan |
| Model | Daftar bulan off, bukan end_date | Tabel baru `billing_month_exclusions` |
| Status enrollment saat skip | Tetap Aktif | Hanya tagihan yang di-skip |
| Penyimpanan | Tabel baru (bukan JSON) | Queryable, dipakai ulang di semua jalur generate |
| Keying | student + entity_ref (bukan enrollment ID) | Lookup langsung di `GenerateMonthly`, stabil thd re-enrollment |
| Perilaku skip saat "Berhenti" | **Hapus exclusion** (opsi B) | `Unenroll` membersihkan exclusion; tidak ada data menggantung |

### Open Concerns Raised

- "Apakah ada pilihan multi?" → Multi-bulan (daftar bebas), bukan multi-siswa/batch
- PASTA wajib (Aslin) di-skip? → Diizinkan; keputusan admin
- Bulan sudah dibayar → item tidak dihapus, warning; konsumen keuangan tetap akurat
- Skip & Berhenti dibedakan? → Ya; Berhenti tetap ada, skip hanya menambah kontrol tagihan per bulan
- Apa yang terjadi pada skip saat Berhenti? → Dihapus (R.8)

## 10. Tasks

- **Task 1: Model + Repository + DTO + AutoMigrate** → [task-1-model-repository-billing-exclusions.md](./task-1-model-repository-billing-exclusions.md) (Ready)
- Task 2: Service `SetExclusions` (apply-diff) + integrasi skip di jalur generate + cleanup exclusion saat `Unenroll` (dibuat iteratif setelah Task 1)
- Task 3: Handler + routes + DTO response
- Task 4: Frontend API client + dialog "Kelola Bulan" (ekskul & fasilitas)
