# Epic: Bulan Tagihan pada Mode "Tagihan Berjalan" (Form Tambah Tagihan)

> **Status:** Planned
> **Priority:** P2
> **Area:** Keuangan — Tagihan (backend `apps/api`, dashboard `apps/dashboard`)

---

## 1. Ringkasan Masalah

Form **Tambah Tagihan** (`ManualInvoiceForm.tsx`) punya dua mode:

| Label UI | mode | `type` invoice | TA yang sah |
|---|---|---|---|
| **Tagihan Berjalan (rinci)** | `itemized` | `manual` | TA aktif (+ punya tarif) |
| Tunggakan (nominal total) | `total` | `arrears` | selain TA aktif |

Mode **"Tagihan Berjalan"** saat ini **tidak punya pemilih bulan**. Akibatnya tagihan
rinci yang diinput admin tersimpan tanpa periode (`invoices.month`/`invoices.year` = NULL):

- Daftar tagihan menampilkan periode `Bulan X / YYYY` **hanya bila** `month` & `year`
  terisi; kalau NULL ia jatuh ke nama tahun ajaran
  (`apps/dashboard/src/routes/_authenticated/keuangan/tagihan/index.tsx:373`).
- Filter **Bulan** pada daftar tagihan tidak mengenali tagihan berjalan ini.

Padahal kolom `Invoice.Month` / `Invoice.Year` **sudah ada** di model (nullable) dan
DTO respons sudah mengirimkannya — yang kurang hanyalah pengisian pada jalur manual.

## 2. Temuan Codebase (State Saat Ini)

- `apps/api/model/invoice.go:5-15` — `Invoice` punya `Month *uint`, `Year *uint` (nullable).
- `apps/api/dto/invoice.go:115-122` — `CreateInvoiceRequest` **belum** punya `month`/`year`.
- `apps/api/service/invoice_service.go:251-260` — `CreateManual` membangun `model.Invoice`
  **tanpa** mengisi `Month`/`Year` → selalu NULL untuk `manual` maupun `arrears`.
- `apps/api/service/invoice_mode.go` — cermin server dari `modeAvailability`
  (aturan mode-vs-TA). Tempat alami untuk helper validasi bulan.
- `apps/api/model/academic_year.go:7-13` — `AcademicYear{Name, StartDate, EndDate, IsActive}`.
- `apps/api/repository/invoice_visibility.go:20` — `monthlyVisibilityCond` **hanya**
  menyaring `type = 'monthly'`; tagihan `manual` tidak terpengaruh (diterima — lihat §8).
- Frontend form: `apps/dashboard/src/features/keuangan/components/ManualInvoiceForm.tsx`.
- Logika murni + test: `apps/dashboard/src/features/keuangan/manual-invoice.ts` &
  `manual-invoice.test.ts`.
- Helper daftar bulan TA yang **sudah ada** dan dipakai lintas fitur:
  `buildAcademicYearMonths(startDate, endDate)` + `MONTH_NAMES` di
  `apps/dashboard/src/components/molecules/BillingMonthsDialog.tsx`
  (sudah diimpor di `administrasi/ekskul/$id.tsx`, `administrasi/siswa/$id/ekskul.tsx`).
- `DtoAcademicYearResponse` sudah membawa `start_date`/`end_date`, sehingga form dapat
  membangun daftar bulan TA dari `selectedAy`.

## 3. Desain Solusi

### 3a. Model Data

**Tidak ada perubahan model / migrasi.** Memakai kolom `invoices.month` & `invoices.year`
yang sudah ada. Satu periode (bulan) per invoice — bukan per item.

### 3b. API — `POST /v1/invoices`

`CreateInvoiceRequest` ditambah (opsional di DTO, **wajib secara bisnis untuk `manual`**):

```go
Month *uint `json:"month" validate:"omitempty,min=1,max=12"`
Year  *uint `json:"year"  validate:"omitempty"`
```

Aturan service (`CreateManual`):

- `type = manual` → `month` & `year` **wajib**; harus jatuh di rentang TA terpilih.
  Bila kosong → `422 "Bulan tagihan wajib diisi"`.
  Bila di luar rentang → `422 "Bulan tagihan di luar rentang tahun ajaran"`.
- `type = arrears` → `month`/`year` diabaikan, tetap NULL (tidak ada perubahan).

### 3c. Bentuk Form

Pada mode **"Tagihan Berjalan (rinci)"** ditambahkan field **"Bulan Tagihan"** — satu
`<select>` berisi bulan-bulan rentang TA terpilih (urut kronologis, Jul→Jun dst.),
memakai `buildAcademicYearMonths(selectedAy.start_date, selectedAy.end_date)` dan
`MONTH_NAMES` untuk label (`September 2025`).

- Nilai default: **bulan berjalan** bila berada dalam rentang TA; jika tidak,
  bulan pertama TA.
- Field hanya muncul pada mode rinci (mode tunggakan tidak berubah).
- Ketika siswa/TA berganti konteks, default bulan dihitung ulang (mengikuti reset
  isian yang sudah ada di `useEffect`).

### 3d. Flow Data

Form → `handleSubmit` membangun `ManualInvoiceFormState` (kini + `month`/`year`) →
`validateManualInvoice` (menolak bila bulan kosong / di luar rentang) →
`buildCreateInvoicePayload` (menyertakan `month`/`year` hanya untuk mode rinci) →
`POST /v1/invoices` → `CreateManual` memvalidasi ulang & menyimpan ke `invoices`.

### 3e. Tampilan

Daftar tagihan mulai menampilkan `Bulan X / YYYY` untuk tagihan berjalan baru, dan
filter **Bulan** mulai mengenalinya. Tidak ada perubahan komponen daftar.

## 4. Edge Cases

- TA aktif, hari ini sebelum TA mulai / setelah TA selesai → default bulan = **bulan
  pertama/terakhir** TA (clamp), bukan bulan kalender hari ini.
- `selectedAy` belum termuat → daftar bulan kosong; tombol Simpan sudah ter-disable
  oleh guard `isOpen`/`academicYearId` yang ada, dan validasi menolak submit.
- Bulan depan (masih di dalam TA) **boleh** dipilih (keputusan 2A). Tidak akan
  disembunyikan karena `monthlyVisibilityCond` hanya berlaku untuk `type='monthly'`.
- Invoice `manual` lama (month/year NULL) tetap valid — tidak ada backfill.

## 5. Requirements (IMMUTABLE)

- **R.1** Mode "Tagihan Berjalan (rinci)" pada form Tambah Tagihan menyediakan pemilih
  **Bulan Tagihan**.
- **R.2** Bulan tagihan **wajib** pada mode rinci; default **bulan berjalan** bila berada
  dalam rentang TA terpilih, selain itu bulan pertama TA.
- **R.3** Pilihan bulan **dibatasi** pada bulan-bulan dalam rentang TA terpilih
  (`start_date`..`end_date`).
- **R.4** Bulan disimpan di level **invoice** (`invoices.month`/`invoices.year`), bukan item.
- **R.5** Mode **Tunggakan (`arrears`) tidak** memakai bulan; `month`/`year` tetap NULL.
- **R.6** Server **memvalidasi ulang** (wajib untuk `manual` + rentang TA) sebagai
  pertahanan lapis kedua, terlepas dari validasi klien.
- **R.7** Tagihan berjalan baru tampil sebagai `Bulan X / YYYY` di daftar dan terfilter
  oleh filter Bulan.

## 6. Success Criteria (MUST ALL BE TRUE)

- [ ] Field **Bulan Tagihan** muncul pada mode "Tagihan Berjalan (rinci)" & tidak muncul pada mode tunggakan.
- [ ] Opsi bulan hanya berisi bulan-bulan dalam rentang TA terpilih.
- [ ] Default bulan = bulan berjalan (di dalam TA); invoice ter-buat menyimpan `month`/`year` tersebut.
- [ ] Submit mode rinci tanpa bulan → ditolak (klien & server).
- [ ] `arrears` tetap menyimpan `month`/`year` = NULL.
- [ ] `POST /v1/invoices` `type=manual` dengan bulan di luar rentang TA → 422.
- [ ] Daftar tagihan menampilkan periode `Bulan X / YYYY` & filter Bulan mengenainya.
- [ ] Unit test backend & frontend baru lulus; `go build ./...` sukses; pre-commit hooks passing.

## 7. Anti-Patterns (FORBIDDEN)

- ❌ **NO bulan per item** (keputusan 4A) — cukup level invoice; jangan tambah kolom di `invoice_items`.
- ❌ **NO mengisi `month`/`year` untuk `arrears`** (keputusan 3 "tidak"; tunggakan = nominal total historis tanpa periode).
- ❌ **NO validasi rentang hanya di klien** (R.6: server harus menolak juga).
- ❌ **NO mengubah `monthlyVisibilityCond`** agar berlaku untuk `type='manual'` — tagihan manual sengaja tidak ikut aturan sembunyikan bulan depan.
- ❌ **NO hard-code daftar/nama bulan** di form — pakai `buildAcademicYearMonths` + `MONTH_NAMES` yang sudah ada.
- ❌ **NO migrasi / kolom / model baru** — pakai `invoices.month`/`invoices.year`.
- ❌ **NO mengubah field/DTO `arrears`** atau perilaku CRUD tagihan manual yang sudah ada.

## 8. Scope Boundaries

**In scope:**
- Field "Bulan Tagihan" pada mode rinci + default bulan berjalan.
- Validasi wajib + rentang TA (klien & server).
- Pengisian `invoices.month`/`year` pada `CreateManual` untuk `manual`.
- Regenerasi Swagger + Orval client (`dtoCreateInvoiceRequest`).

**Out of scope (deferred/never):**
- Backfill bulan untuk invoice `manual` lama (NULL dibiarkan).
- Bulan pada mode `arrears`.
- Bulan per item.
- Menyembunyikan tagihan berjalan untuk bulan depan.
- Mengubah tampilan/filter daftar tagihan (tidak perlu — cukup datanya terisi).

## 9. Open Questions

- Edit bulan pada invoice yang sudah dibuat? **Ditinjau: tidak** — `UpdateInvoiceRequest`
  saat ini hanya `notes` & `due_date`; bulan terkait periode tagihan sehingga mengubahnya
  berisiko. Di luar scope; bisa jadi epic terpisah bila dibutuhkan.
- Perlu konfirmasi string pesan error persis agar klien & server seragam (selaras pola
  `invoice_mode.go` yang menyamakan redaksi dengan `manual-invoice.ts`).

## 10. Design Discovery

### Key Decisions Made

| Pertanyaan | Jawaban | Implikasi |
|---|---|---|
| Bulan mengisi `Invoice.Month/Year`? Wajib? | **1A** — ya, wajib, default bulan berjalan | Validasi wajib + default bulan berjalan; simpan di invoice |
| Batasan rentang bulan? | **2A** — hanya bulan dalam rentang TA | Helper rentang tunggal dipakai klien & server |
| Mode tunggakan (`arrears`) perlu bulan? | **Tidak** | `arrears` tetap NULL; anti-pattern tertulis |
| Level bulan: invoice atau item? | **4A** — level invoice | Tidak ada kolom baru di `invoice_items` |

### Research Deep-Dives

#### Ketersediaan kolom periode & jalur pengisian
**Question explored:** Apakah backend sudah punya tempat menyimpan bulan tagihan manual?
**Sources consulted:**
- `apps/api/model/invoice.go` — kolom `Month`/`Year` sudah ada (nullable).
- `apps/api/dto/invoice.go` — `CreateInvoiceRequest` belum punya field bulan.
- `apps/api/service/invoice_service.go:251` — `CreateManual` tidak mengisi bulan.

**Findings:** Kolom & respons periode sudah lengkap; kekurangan hanya di DTO + service.
**Conclusion:** Tidak perlu migrasi; cukup DTO + service + form.

#### Reuse helper bulan TA di frontend
**Question explored:** Apakah sudah ada cara membangun daftar bulan TA yang konsisten?
**Sources consulted:**
- `apps/dashboard/src/components/molecules/BillingMonthsDialog.tsx` — `buildAcademicYearMonths` & `MONTH_NAMES`.
- Pemakaian di `administrasi/ekskul/$id.tsx`, `administrasi/siswa/$id/ekskul.tsx`.

**Findings:** Helper sudah diekspor & dipakai lintas fitur (urutan Jul→Jun).
**Conclusion:** Impor helper yang ada; jangan duplikasi daftar bulan.

### Dead-End Paths

#### Menyembunyikan tagihan berjalan untuk bulan depan
**Why explored:** `monthlyVisibilityCond` menyembunyikan tagihan bulanan masa depan;
tampak konsisten bila tagihan berjalan ikut aturan yang sama.
**Investigation:** Membaca `invoice_visibility.go` — kondisi bergantung pada `type='monthly'`;
memperluasnya ke `manual` akan mengubah perilaku tagihan manual historis & menambah risiko.
**Why abandoned:** Keputusan 2A hanya soal batas rentang TA; menyembunyikan bulan depan
bukan permintaan dan berisiko. Dicatat sebagai anti-pattern.

### Open Concerns Raised

- "Apakah tagihan berjalan bulan depan nanti tersembunyi?" → Tidak; `type='manual'`
  tidak tersentuh `monthlyVisibilityCond` (diterima).
- "Bagaimana invoice manual lama tanpa bulan?" → Dibiarkan NULL; tidak ada backfill.

## 11. Tasks

> Dibuat **iteratif** — task berikutnya dibuat setelah hasil task sebelumnya diketahui.

- [**Task 1 (backend)** — Bulan pada Invoice Manual (`type=manual`)](./task-1-backend-bulan-tagihan-manual.md) — **✅ Done**.
  DTO + validasi rentang TA + penyimpanan `invoices.month`/`year` + test & spec Swagger (`month`/`year` di docs).
- [**Task 2 (frontend)** — Field "Bulan Tagihan" pada mode Tagihan Berjalan](./task-2-frontend-bulan-tagihan-berjalan.md) — **✅ Done**.
  Pemilih bulan + default bulan berjalan, `manual-invoice.ts` & test, `ManualInvoiceForm.tsx`, reuse `buildAcademicYearMonths`/`MONTH_NAMES`.
