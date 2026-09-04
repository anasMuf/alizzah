# Epic: Zona Default & Override per Bulan — Fasilitas (Antar Jemput)

> **Status:** Ready
> **Priority:** P1
> **Related:** [skip-tagihan-bulanan-pasta-fasilitas.md](./skip-tagihan-bulanan-pasta-fasilitas.md)

---

## 1. Ringkasan Masalah

Fasilitas antar jemput ditagih **per bulan** dengan harga per hari sesuai **zona**. Saat ini zona hanya disimpan **satu nilai** di `student_facilities.fee_config_item_id` (kolom "Zona/Paket" di tab *Pengaturan*). Perubahan zona menulis ulang item invoice **bulan berjalan ke depan saja** (`RemoveFacilityFromFutureInvoices` + `AddFacilityToMonthlyRange`), sedangkan **bulan-bulan sebelumnya tidak pernah diubah** — padahal input admin **tidak selalu realtime** (sering *backdate*, mis. baru diinput September untuk memperbaiki Agustus).

Kasus nyata (siswa id 230): awal ZONA 2 → diubah ke ZONA 1. Invoice September sudah benar ZONA 1, tapi tagihan Agustus tetap `ZONA 2 (16 hari)` Rp 240.000 — dianggap "perhitungan keliru" karena tidak ada cara mengoreksi bulan lalu, dan tidak ada riwayat zona per bulan selain snapshot nama item yang tersebar di `invoice_items`.

Keputusan desain (hasil diskusi):
1. **Zona default** per pendaftaran diatur di tab **Pengaturan** (kolom "Zona/Paket" — nilai `student_facilities.fee_config_item_id` seperti sekarang).
2. **Zona per bulan** direkam eksplisit (tabel baru) dan diatur/diubah di tab **Jumlah Hari Bulanan** — boleh untuk **bulan lalu** (backdate), bulan berjalan, maupun bulan depan.
3. Mengubah **default** → menyelaraskan **semua bulan** dalam tahun ajaran yang item fasilitasnya **belum dibayar dan tanpa override** (termasuk bulan lalu). Bulan ber-override dan bulan yang item-nya sudah dibayar tidak disentuh otomatis.
4. Item invoice bulan yang **sudah dibayar** tetap bisa diubah **dengan konfirmasi eksplisit** (`force`) — `paid_amount` dipertahankan, selisih menjadi sisa tagihan/kelebihan bayar.

## 2. Temuan Codebase (State Saat Ini)

| File | Kondisi |
|------|---------|
| `apps/api/model/student_facility.go` | Enrollment fasilitas: satu zona `FeeConfigItemID *uint` + `StartDate`/`EndDate` |
| `apps/api/service/facility_service.go:340-395` | `UpdateEnrollment` — ganti default zona, lalu goroutine `RemoveFacilityFromFutureInvoices` + `AddFacilityToMonthlyRange` (mulai bulan berjalan) |
| `apps/api/service/facility_service.go:566-660` | `GetStudentsByFacility` — daftar siswa per fasilitas; `FacilityStudentItemResponse` berisi `invoice_item_id`, `current_month_days`, `fee_config_item` (default) utk bulan terpilih |
| `apps/api/service/invoice_generate_service.go:2306-2371` | `addFacilityItemToMonthly` — pola nama item `"<zona/fasilitas> (N hari)"`, qty=hari, amount=qty×unit_price; idempotent per bulan |
| `apps/api/service/invoice_generate_service.go:2394-2452` | `removeFacilityItemsFromInvoices` — match item via `facility_id` atau nama legacy; hanya item `paid_amount = 0` |
| `apps/api/repository/invoice_item_repository.go` | `Update(item)` (`Save`), `FindByInvoiceID`, `UpdatePaidAmount` |
| `apps/api/model/payment_item.go` | Alokasi pembayaran **per item invoice** (`payment_items.invoice_item_id`) → `invoice_items.paid_amount` |
| `apps/api/cmd/api/main.go:99-103` | AutoMigrate fasilitas & `BillingMonthExclusion` (pola tabel kecil keyed student+entity) |
| `apps/api/cmd/api/main.go:630-644` | Route siswa fasilitas: `POST /:id/facilities`, `PUT /:id/facilities/:facilityId`, `GET .../current-month-days`, `DELETE`, `.../billing-exclusions` — semua `guard.RequireModule(middleware.ModuleAdministrasi)` |
| `apps/api/dto/facility.go` | `UpdateStudentFacilityRequest{FeeConfigItemID}`, `FacilityStudentItemResponse`, `FacilityStudentQueryParams{Month,Year}` |
| `apps/dashboard/.../fasilitas/$facilityId.tsx` | Tab `Pengaturan` (kolom Zona/Paket + zona CRUD) & tab `Jumlah Hari Bulanan` (`FacilityMonthlyDaysTab`: pilih bulan → edit jumlah hari per siswa) |

Catatan: invoice bulanan dibuat **awal tahun ajaran untuk semua bulan** (Juli..Juni); item fasilitas ditambahkan per bulan (qty=0 & amount=0 utk bulan yang belum ditetapkan harinya). Item `invoice_items` adalah **snapshot per bulan** (nama+zona+harga) — sudah berfungsi sebagai riwayat, hanya saja tidak ada cara mengubahnya per bulan dari UI.

## 3. Desain Solusi

### 3a. Model Data

Tabel baru `student_facility_month_zones`:

```
StudentFacilityMonthZone {
  id,
  student_facility_id FK,
  month (1-12), year,
  fee_config_item_id FK *uint   -- null = "tanpa zona"
  created_at, updated_at
}
```

Unique index `uq_sf_month_zone (student_facility_id, month, year)`. **Absence baris = ikut default** (`student_facilities.fee_config_item_id`); **keberadaan baris = override eksplisit**. Menghapus baris = kembali ke default. Keying per `student_facility_id` (bukan student+facility) karena satu bulan milik satu pendaftaran — konsisten dgn halaman detail fasilitas yang bekerja per enrollment.

**Zona efektif bulan M** = override bulan M (bila ada) **?: default** (bisa NULL = tanpa zona → pakai item dasar nama fasilitas, pola `resolveFacilityFeeItems`).

### 3b. API (semua `RequireModule(ModuleAdministrasi)`)

| Method | Route | Deskripsi |
|--------|-------|-----------|
| PUT | `/v1/students/:id/facilities/:facilityId/month-zone` | Set override zona utk `{month, year, fee_config_item_id: uint\|null, force?: bool}`. `null` = "tanpa zona"; `force=true` utk bulan yang item-nya sudah dibayar |
| DELETE | `/v1/students/:id/facilities/:facilityId/month-zone?month=&year=` | Hapus override → ikut default (rewrite bulan tsb) |
| GET | `/v1/facilities/:id/students?month=&year=` | Perluas tiap baris: `month_zone_fee_config_item_id` (efektif), `month_zone_overridden`, `month_item_paid` — untuk dropdown zona & konfirmasi di tab bulanan |

PUT/DELETE `month-zone` → setelah simpan/hapus override, **rewrite item invoice bulan itu saja** via method baru pada `InvoiceGenerateService`:
- cari item fasilitas bulan tsb (`facility_id` match, fallback nama legacy),
- `paid_amount = 0` → rewrite langsung;
- `paid_amount > 0` → wajib `force`; `paid_amount` **dipertahankan**;
- **quantity (hari) dipertahankan**; amount baru = `quantity × unit_price zona`; nama item = `"<zona> (N hari)"` (atau nama fasilitas bila tanpa zona);
- status item & total invoice dihitung ulang (`recalculateInvoiceTotal`).

### 3c. Perubahan Semantik "Ubah Zona Default" (`UpdateEnrollment`)

`PUT /v1/students/:id/facilities/:facilityId {fee_config_item_id}` (tab Pengaturan) sekarang berarti **ubah default** + menyelaraskan:

- untuk **setiap bulan** dgn item invoice fasilitas yang **belum dibayar** dan **tanpa override** → rewrite ke zona default (quantity dipertahankan);
- bulan **ber-override** → dilewati (tetap zona override-nya);
- item **sudah dibayar** → dilewati otomatis (hanya bisa diubah via PUT month-zone + `force`);
- bulan tanpa item invoice (skip/berhenti/sebelum start) → tidak disentuh.

Response memuat ringkasan `{reconciled, skipped_paid, skipped_override}` utk toast.

### 3d. Tab Bulanan (frontend)

Tab `Jumlah Hari Bulanan` (`FacilityMonthlyDaysTab`) — pilih bulan (boleh **bulan lalu**, backdate) → per siswa tampil:
- kolom **Zona** (dropdown: `Default` / `Tanpa zona` / daftar zona) — value awal = zona efektif bulan tsb dari GET;
- kolom **Jumlah Hari** (input seperti sekarang);
- jika item bulan tsb **sudah dibayar** → ubah zona/hari butuh konfirmasi (warning selisih → jadi sisa tagihan/kelebihan bayar), lalu kirim `force: true`.

### 3e. Integrasi Jalur "Tambah Item" (Generate/Reaktivasi/Restore)

Jalur yang **menambahkan** item fasilitas ke bulan (`AddFacilityToMonthlyRange`, loop fasilitas `GenerateMonthly`, `RestoreFacilityItemToMonthly`) memakai `resolveFacilityFeeItems` (default). Agar konsisten dgn override, resolve per bulan menjadi `override[month] ?: default` saat override ada.

### 3f. Cleanup

- `Unenroll` / hapus enrollment → hapus semua baris `student_facility_month_zones` pendaftaran tsb (tidak menggantung), serupa R.8 epic skip-tagihan.

## 4. Edge Cases

- Bulan item **sudah dibayar** + PUT month-zone tanpa `force` → 409/422 dengan pesan "item sudah dibayar"; FE menampilkan ConfirmDialog lalu kirim ulang dgn `force=true`.
- `force=true` dgn harga baru lebih rendah → `paid_amount > amount` = **kelebihan bayar** (negatif pada `remaining_or_excess`); lebih tinggi → sisa tagihan. `paid_amount` & `payment_items` tidak berubah; admin menuntaskan kelebihan/sisa via mekanisme kasir (di luar epic ini).
- Month di luar rentang tahun ajaran enrollment → 422.
- Bulan belum ada item invoice (skip bulanan / sebelum start / setelah end) → override tetap **tersimpan**; berlaku saat item bulan tsb dibuat nanti oleh jalur tambah (3e). PUT/DELETE tidak membuat item baru secara retroaktif.
- Zona target sudah di-soft-delete / nonaktif → tolak (422 "zona tidak ditemukan/tidak aktif"), konsisten validasi `UpdateEnrollment`.
- Override bernilai sama dgn default → tidak masalah (baris eksplisit); FE memilih `Default` → DELETE.
- "Tanpa zona" (default NULL + tidak ada item dasar) → item bulan tsb tidak dapat dibuat; rewrite bulan dengan item yang sudah ada tetap berjalan utk `Tanpa zona` hanya bila item dasar (nama fasilitas) ditemukan.
- Item legacy tanpa `facility_id` → match via nama fasilitas/zona (helper `facilityItemNameMatches`).
- Konkurensi → unique index + `FirstOrCreate`/`Where+Save` transaksional per (sf, month, year).
- Mengubah hari (PUT quantity) tdk berubah — tetap memakai `current-month-days`/endpoint quantity existing.

## 5. Requirements (IMMUTABLE)

- R.1: Zona **default** per pendaftaran = `student_facilities.fee_config_item_id`, diatur di tab *Pengaturan*.
- R.2: Tabel baru `student_facility_month_zones` keyed `(student_facility_id, month, year)` unique; absence = ikut default; `fee_config_item_id` NULL pada baris = "tanpa zona".
- R.3: Zona efektif bulan M = override ?: default.
- R.4: PUT/DELETE month-zone mengubah zona **satu bulan** dan menulis ulang item invoice bulan tsb; `quantity` (hari) & `paid_amount` dipertahankan; `amount = quantity × unit_price`; total invoice & status item dihitung ulang.
- R.5: Mengubah default → selaraskan **semua bulan** (termasuk bulan lalu) yang item-nya **unpaid** dan **tanpa override**; bulan ber-override & item paid dilewati; response ringkasan.
- R.6: Item bulan yang sudah dibayar tidak dapat diubah tanpa `force` (409/422); dengan `force`, `paid_amount` dipertahankan dan selisih dikembalikan sebagai sisa/kelebihan bayar pada response.
- R.7: GET `/v1/facilities/:id/students?month&year` menyertakan `month_zone_fee_config_item_id`, `month_zone_overridden`, `month_item_paid` per baris.
- R.8: Bulan di luar rentang tahun ajaran enrollment → tolak (422). Zona nonaktif/tidak ditemukan → tolak.
- R.9: `Unenroll`/hapus enrollment membersihkan baris month-zone pendaftaran tsb.
- R.10: Jalur penambah item fasilitas (range/generate/restore) menghormati override per bulan (R.3).
- R.11: Tab bulanan FE menampilkan dropdown zona per siswa per bulan + konfirmasi untuk item paid (`force`).

## 6. Success Criteria (MUST ALL BE TRUE)

- [ ] Unit test service: PUT month-zone unpaid → item bulan berubah (nama/harga/amount), bulan lain tidak berubah
- [ ] Unit test: PUT month-zone pada item paid tanpa `force` → error; dengan `force` → item berubah, `paid_amount` tetap, `remaining_or_excess` benar (sisa & kelebihan bayar)
- [ ] Unit test: DELETE month-zone → kembali ke default; baris override hilang
- [ ] Unit test: ubah default → bulan unpaid tanpa override ikut disesuaikan (termasuk bulan lalu); bulan ber-override & item paid dilewati; quantity dipertahankan
- [ ] Unit test: `Unenroll` menghapus month-zone terkait
- [ ] Unit test: jalur tambah item (reaktivasi/restore) memakai zona efektif (override ?: default)
- [ ] GET `/v1/facilities/:id/students` per bulan → field zona efektif & `month_item_paid` terisi
- [ ] UI: dropdown zona di tab bulanan; ganti zona default di tab Pengaturan → toast ringkasan; konfirmasi item paid
- [ ] `go build ./...` sukses; `pnpm run build` sukses (FE)
- [ ] Pre-commit hooks passing

## 7. Anti-Patterns (FORBIDDEN)

- ❌ NO menyimpan pengaturan per bulan sebagai JSON di enrollment (sulit query, tak konsisten dgn pola `billing_month_exclusions`)
- ❌ NO memakai `end_date`/cutoff tunggal untuk semantik zona per bulan (input backdate; R.1-R.4)
- ❌ NO rewrite item bulan yang sudah dibayar tanpa `force` (integritas pembayaran; R.6)
- ❌ NO menghapus/mengubah `quantity` hari saat ganti zona (hari diatur manual per bulan; R.4)
- ❌ NO menghitung ulang dari hari efektif saat rewrite (menimpa koreksi manual)
- ❌ NO otomatis menyentuh bulan ber-override saat ganti default (override = keputusan eksplisit; R.5)
- ❌ NO membuat item bulan secara retroaktif saat PUT/DELETE month-zone (menghidupkan kembali bulan skip/berhenti)
- ❌ NO prorata harian di bulan pergantian (tidak diminta; lihat Scope Boundaries)

## 8. Scope Boundaries

**In scope:**
- Fasilitas antar jemput (facility category `facility`, unit `per_day`)
- Backend: model + repo + DTO + service (semantik default & month-zone) + handler/route + integrasi jalur tambah item
- Frontend: dropdown zona per bulan di tab `Jumlah Hari Bulanan`, alur ubah default di tab *Pengaturan*, konfirmasi item paid, API client manual (pola `invoice-quantity.ts`)

**Out of scope (deferred/never):**
- Prorata harian di bulan pergantian — tidak diminta (bulan dipilih per bulan; item tetap flat per bulan)
- Penuntasan kelebihan bayar / refund — mekanisme kasir terpisah
- Ekskul/PASTA/daycare — mekanisme terpisah (epic skip-tagihan hanya menyentuh skip)
- Riwayat audit perubahan (siapa/ganti kapan) — `updated_at` enrollment + audit trail existing
- Multi-siswa/batch — tidak diminta

## 9. Design Discovery

### Key Decisions Made

| Pertanyaan | Jawaban | Implikasi |
|------------|---------|-----------|
| Model zona per bulan | **Tabel override per bulan** (bukan tulis ulang item tanpa penanda) | `student_facility_month_zones`; absence = default (R.2) |
| Efek ubah default | **Semua bulan unpaid tanpa override** ikut disesuaikan (termasuk bulan lalu) | `UpdateEnrollment` men-scan seluruh bulan AY (R.5) |
| Bulan sudah dibayar | **Boleh diubah dgn konfirmasi (`force`)**, selisih jadi sisa/kelebihan bayar | paid_amount dipertahankan; status/total dihitung ulang (R.6) |
| Lokasi input per bulan | Tab `Jumlah Hari Bulanan` (bukan tab Pengaturan) | Dropdown zona + hari per siswa per bulan (R.11) |
| Lokasi default | Tab *Pengaturan* (kolom Zona/Paket, nilai existing) | Semantik PUT enrollment berubah jadi "default + reconcile" (R.1, R.5) |
| Item invoice per bulan | Tetap snapshot sumber tagihan | Rewrite in-place (bukan hapus+buat) agar quantity/paid aman (R.4) |
| Bulan tanpa item saat PUT | Override disimpan, tidak membuat item retroaktif | Berlaku saat item dibuat jalur tambah (R.10; edge case) |
| Cleanup saat berhenti | Hapus month-zone pendaftaran | Tidak menggantung (R.9) |

### Open Concerns Raised

- Nama tab bulanan ("Jumlah Hari Bulanan") — apakah diganti label (mis. "Zona & Hari Bulanan")? → keputusan kecil saat Task FE.
- Item paid + `force` menurunkan harga → kelebihan bayar tercatat di invoice (`paid_amount > total`) — penuntasan (refund/reallocation) di luar epic.

## 10. Tasks

- **Task 1: Model + Repository + DTO + AutoMigrate** — ✅ selesai (build & test hijau)
- **Task 2: Service + handler + routes** — ✅ selesai: `RewriteFacilityMonthItem` (invoice-gen), semantik default (`UpdateEnrollment` → reconcile semua bulan unpaid tanpa override), `SetMonthZone`/`ClearMonthZone`, extend GET students (zona efektif & `month_item_paid`)
- **Task 3: Integrasi jalur tambah item (override-aware) + cleanup saat `Unenroll`** — ✅ selesai: `facilityFeeItemsForMonth` di `AddFacilityToMonthlyRange` & `RestoreFacilityItemToMonthly`; month-zone dibersihkan saat Unenroll; unit test R.9
- **Task 4: Frontend — API client manual + tab bulanan (dropdown zona + konfirmasi paid) + alur ubah default di tab Pengaturan (toast ringkasan)** — ✅ selesai: `facility-month-zone.ts`, dropdown zona per bulan (Default/Tanpa zona/zona), ConfirmDialog saat item sudah dibayar (`force`), toast ringkasan reconcile saat ubah default
- **Task 5: Unit tests backend** — ✅ sebagian (rewrite unpaid/paid+force, reconcile, PUT/DELETE, GET zona efektif, cleanup Unenroll); repository test menyusul bila perlu
