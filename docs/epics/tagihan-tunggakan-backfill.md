# Epic: Tagihan Tunggakan (Backfill Tagihan Tahun Ajaran Sebelumnya) + CRUD Tagihan Manual

> **Status:** Ready
> **Priority:** P1

---

## 1. Ringkasan Masalah

Sekolah memiliki **tunggakan siswa dari tahun ajaran sebelumnya yang belum tercatat di sistem**. Karena tidak tercatat, tunggakan itu tidak muncul di "Total Tunggakan" siswa, tidak bisa dibayar lewat kasir, dan tidak masuk laporan. Mencatatnya secara rinci per item (SPP bulan X, infaq bulan Y, dst.) sangat melelahkan untuk data historis — yang dibutuhkan hanya **nominal total keseluruhan**.

Di sisi lain, resource `invoice` belum punya operasi Create/Delete sama sekali: **tidak ada `POST /v1/invoices`** dan tidak ada UI untuk membuat tagihan. Tagihan hanya lahir dari generate otomatis (siklus akademik, enrollment, sync tabungan wajib) atau dari `POST /v1/invoices/:id/items` pada invoice yang sudah ada.

Dua kebutuhan ini disatukan: **satu endpoint create invoice manual** dengan **dua mode form** yang ditentukan oleh kecocokan tahun ajaran — rinci (relasi ke tarif, total otomatis) bila TA tagihan = TA aktif, dan total-saja (tanpa rincian) bila TA tagihan ≠ TA aktif (yakni tunggakan historis).

**Konsekuensi desain yang sudah diterima (Q1=A):** invoice tunggakan dimiliki **tahun ajaran asal** sehingga laporan TA lampau menjadi benar, sementara **pembayaran dicatat di TA aktif** (kas periode berjalan). Rincian konsekuensi laporan ada di §3f.

## 2. Temuan Codebase (State Saat Ini)

| File | Kondisi |
|------|---------|
| `apps/api/model/invoice.go:7-16` | `Invoice{StudentID, AcademicYearID, Type(size:20), Month*, Year*, Status, TotalAmount, PaidAmount, DueDate*, Notes}` + soft delete. **Tidak ada** `invoice_number`, **tidak ada** `created_by`, **tidak ada** `enrollment_id`. `StudentID`/`AcademicYearID` hanya `index`, bukan unique |
| `apps/api/model/invoice.go:9` | `Type` = `initial` \| `registration` \| `monthly` \| `graduation` \| `daycare_initial` \| `incidental` |
| `apps/api/model/invoice_item.go:5-19` | `InvoiceItem{InvoiceID, Name, Category, Amount, PaidAmount, Status, IsMandatory, Quantity*, UnitPrice*, Notes, ...}`. **Tidak ada FK ke `fee_config_item`** — item hanya menyalin `Name`/`Category` |
| `apps/api/model/payment.go:7-14`, `model/payment_item.go:5-7` | `Payment{StudentID, AcademicYearID, PaymentDate, TotalAmount, SavingsDeposit, Source, Notes, CreatedBy}`. Pembayaran dialokasikan **per `invoice_item`, bukan per invoice** |
| `apps/api/service/invoice_service.go:16-34` | Interface `InvoiceService` — **tidak ada** `Create`. Yang ada: `GetAll`, `GetByID`, `GetBatch`, `GetByStudentID`, `AddItem`/`UpdateItem`/`UpdateItemQuantity`/`DeleteItem`, installments, `RecalculateTotalAmount`, `UpdateInvoiceStatus` |
| `apps/api/service/invoice_service.go:36-42` | `invoiceService` **tidak memegang `db *gorm.DB`** → butuh penambahan untuk transaksi create |
| `apps/api/service/invoice_service.go:403-445` | `RecalculateTotalAmount` — status invoice dihitung runtime; **tidak ada kolom sisa/outstanding** |
| `apps/api/utility/invoice_helper.go:48-54` | `utility.SumInvoiceItems(items []model.InvoiceItem) float64` — dipakai untuk total |
| `apps/api/repository/invoice_repository.go:146-167` | `FindByStudentID(studentID, type, status, academicYearID, showAll)` — filter TA **hanya bila `academicYearID != 0`** → **lintas-TA sudah didukung gratis** |
| `apps/api/repository/invoice_repository.go:130-140` | `FindByIDs` (dipakai `invoices/batch`) **tanpa** filter TA dan **tanpa** visibility cond |
| `apps/api/repository/invoice_repository.go:237-247` | `SumUnpaidByStudent` — **tanpa filter `academic_year_id`** → `financial_summary.total_unpaid` sudah menjumlah lintas TA |
| `apps/api/repository/invoice_visibility.go:20-26` | `monthlyVisibilityCond` menyembunyikan **hanya `type = 'monthly'`** yang periodenya di depan bulan berjalan → type baru dengan `month/year` NULL tidak terpengaruh |
| `apps/api/service/payment_service.go:147-176` | Validasi item: `amount > 0` (kecuali `dispensation`) dan `amount <= Amount - PaidAmount`. **Tidak ada validasi** `invoice.academic_year_id == req.academic_year_id` |
| `apps/api/service/payment_service.go:219-228` | `Payment.AcademicYearID = req.AcademicYearID` → kas & brangkas mengikuti TA pada request |
| `apps/api/service/invoice_generate_service.go:2817-2901` | `RegenerateForStudent` — **hard delete semua invoice** `WHERE student_id = ? AND academic_year_id = ?` **tanpa filter `type`** (L2844-2846), termasuk `DELETE FROM payment_items ...` (L2852). Menyasar hanya TA dari enrollment aktif (L2819-2824) |
| `apps/api/repository/report_repository.go:103-113` | `GetArrearsByClass` — label "arrears" tapi ter-scope `academic_year_id` **dan** `month`/`year` → **bukan** carry-over |
| `apps/api/cmd/api/main.go:270-272` | `ayRepo := repository.NewAcademicYearRepository(db)`, `studentRepo := repository.NewStudentRepository(db)` tersedia |
| `apps/api/cmd/api/main.go:364` | `service.NewInvoiceService(invoiceRepo, invoiceItemRepo, invoiceInstallmentRepo, paymentRepo, billingExclusionService)` |
| `apps/api/cmd/api/main.go:745-761` | Grup route `invoices` (semua `RequireModule(ModuleKeuangan)`); **tidak ada `POST ""`** |
| `apps/dashboard/src/routes/_authenticated/keuangan/tagihan/siswa.$id.tsx:28-36` | Daftar tagihan per siswa — selalu mengirim `academic_year_id: activeAy?.id` |
| `apps/dashboard/src/routes/_authenticated/keuangan/pembayaran/components/-InvoiceSelector.tsx:60-67` | Selector tagihan kasir — idem; item diambil via `useGetV1InvoicesBatch` (L112-117) |
| `apps/dashboard/src/routes/_authenticated/keuangan/pembayaran/baru.tsx:437-463` | Payload pembayaran mengirim `academic_year_id: activeAy?.id \|\| 1` |
| `apps/dashboard/src/routes/_authenticated/administrasi/siswa/$id/keuangan.tsx:58` | Kartu "Total Tunggakan" dari `summary.total_unpaid` (read-only) |
| `apps/dashboard/src/routes/_authenticated/keuangan/tagihan/$id.tsx:99-155` | Logika pemilihan item tarif + filter level/gender — **diekstrak, bukan ditulis ulang** |
| `apps/dashboard/src/components/ui.ts:14-22` | `SlideOver`, `FormField`, `CurrencyFormField`, `ConfirmDialog`, `Pagination` |
| `apps/dashboard/src/store/global.ts` | `academicYearAtom` (TA global); `AcademicYearSelector` di sidebar |

**Kesimpulan:** mekanisme tunggakan/carry-over/tagihan manual **tidak ada sama sekali**. Yang harus dibangun adalah jalur create/delete invoice manual; sisa jalur baca dan jalur bayar **sudah mendukung lintas-TA tanpa perubahan**.

## 3. Desain Solusi

### 3a. Model Data

**Tidak ada tabel atau kolom baru.** Memanfaatkan skema yang sudah tepat:

| Keputusan | Alasan |
|---|---|
| `invoices.type` menerima nilai baru `arrears` (tunggakan historis, total-only) dan `manual` (tagihan manual rinci) | Kolom sudah `size:20`; AutoMigrate tidak perlu perubahan |
| `month`/`year` = `NULL` untuk kedua type | Sama seperti `initial`; UI sudah punya fallback ke nama TA (`tagihan/index.tsx:361-364`) |
| Tunggakan = **1 invoice + 1 item** (`name`, `category="arrears"`, `amount`) | `InvoiceItem` menyimpan `name`+`category` bebas tanpa FK ke `fee_config_item` → tidak perlu struktur baru |
| `is_mandatory = false` pada item manual | Admin boleh mengoreksi/menghapus item selama belum lunas |
| `notes` **wajib** untuk `arrears` | Jejak asal tunggakan (mis. "Tunggakan SPP Ganjil 2024/2025") |
| **Tanpa** unique index `(student, AY, type)` | Sumber tunggakan bisa banyak; berbeda dari pola idempotent `initial`/`registration` |
| **Tanpa** kolom `source` | `type` sudah membedakan asal; kolom tambahan tidak sepadan (YAGNI) |

`payment`, `payment_item`, `fee_config*`, dan `financial_summary` **tidak berubah**.

### 3b. API

| Method | Route | Deskripsi |
|--------|-------|-----------|
| **POST** | `/v1/invoices` | Create invoice manual. **Total dihitung server.** |
| **PUT** | `/v1/invoices/:id` | Update `notes` + `due_date` saja (item lewat endpoint item existing) |
| **DELETE** | `/v1/invoices/:id` | Soft delete dengan guard ketat |

Request `POST /v1/invoices`:

```json
{
  "student_id": 123,
  "academic_year_id": 2,
  "type": "arrears",
  "due_date": "2026-10-01",
  "notes": "Tunggakan SPP Ganjil TA 2024/2025",
  "items": [
    { "name": "Tunggakan TA 2024/2025", "category": "arrears", "amount": 1500000 }
  ]
}
```

Aturan server:
- `total_amount = utility.SumInvoiceItems(items)` — **client tidak mengirim total**.
- `paid_amount = 0`, `status = "unpaid"`.
- `type = "arrears"` → `items` harus **tepat 1 baris**, `category` di-set `"arrears"`, `notes` wajib.
- `type = "manual"` → `items` **minimal 1 baris**.
- `student_id` & `academic_year_id` divalidasi eksis (via `studentRepo` & `ayRepo`).
- Semua terjadi dalam **satu transaksi**.
- Response: `dto.InvoiceDetailResponse` (via `mapInvoiceToDetailResponse`) di dalam `dto.SuccessResponse`.

`DELETE` guard (semua harus terpenuhi, jika tidak → 409):
1. `type IN ('arrears','manual')` — invoice hasil generate **tidak boleh** dihapus lewat sini.
2. `paid_amount == 0`.
3. Tidak ada `payment_item` terkait (via `paymentRepo` / cek `HasPayments` pada tiap item).

`PUT` hanya menulis `notes` & `due_date`; tidak menyentuh item, total, atau status.

Route didaftarkan pada grup `invoices` existing → otomatis `RequireModule(ModuleKeuangan)`.

**Perubahan tambahan:** `RegenerateForStudent` (`invoice_generate_service.go:2844-2846`) **wajib** menambahkan `AND type NOT IN ('arrears','manual')` pada query pengambilan ID invoice yang akan di-hard-delete. Tanpa ini, tagihan manual di TA aktif akan terhapus diam-diam.

**Tidak perlu endpoint baru** untuk menampilkan tunggakan lintas-TA: `GET /v1/students/:id/invoices` cukup dipanggil **tanpa** param `academic_year_id` (lihat §2).

### 3c. Bentuk Form

`SlideOver` (pola existing) + `FormField`/`CurrencyFormField`:

```
Siswa          : [pemilih siswa — ter-prefill & terkunci bila dibuka dari detail siswa]
Tahun Ajaran   : [select, default = TA aktif]
──────────────────────────────────────────────────────────────────
TA = TA aktif  →  MODE RINCI
  Item : [dropdown tarif — difilter level/gender siswa]
         [jumlah] × [harga satuan] = subtotal      [+ Tambah baris]
  Total: Rp 1.500.000  (read-only, dihitung otomatis)

TA ≠ TA aktif  →  MODE TOTAL
  ⓘ Banner: "Dicatat sebagai tunggakan historis TA 2024/2025 — tanpa rincian item."
  Nominal Tunggakan : [CurrencyInput]
  Keterangan        : [textarea — WAJIB]
──────────────────────────────────────────────────────────────────
Jatuh Tempo (opsional) : [date]
                         [ Batal ]  [ Simpan ]
```

Mode **ter-set otomatis** dari pilihan TA, tetapi ditampilkan sebagai kontrol eksplisit (segmented: *Tagihan Berjalan (rinci)* / *Tunggakan (nominal total)*) sehingga admin dapat mengubahnya. Ini menutup dua kasus sah yang akan terhalang bila mode dikunci murni pada TA: beban non-tarif di TA aktif (denda, seragam, uang kegiatan) dan tunggakan yang ternyata milik TA aktif.

Logika pemilihan tarif + filter level/gender **diekstrak** dari `tagihan/$id.tsx:99-155`.

### 3d. Flow Data

**A — Catat tunggakan (TA lampau).** Detail siswa → "Catat Tunggakan" (atau daftar Tagihan → "+ Tambah Tagihan" → pilih siswa) → pilih TA asal → mode Total → isi nominal + keterangan → `POST /v1/invoices` → 1 invoice `type=arrears` di TA asal + 1 item.
→ Invalidasi **juga** `useGetV1StudentsId`, karena `financial_summary.total_unpaid` ikut berubah.

**B — Tagihan manual rinci (TA aktif).** Sama, mode Rinci → invoice `type=manual` + N item.

**C — Pembayaran tunggakan lintas-TA.**
1. Kasir → pilih siswa → `InvoiceSelector` menampilkan **dua grup**: "Tagihan TA Aktif" (query existing) dan **"Tunggakan Tahun Ajaran Lain"** (query **tanpa** `academic_year_id`, difilter `academic_year_id !== activeAy.id && status !== 'paid'`, dikelompokkan per TA asal).
2. Centang → item masuk `selectedInvoices` → `useGetV1InvoicesBatch` (sudah AY-agnostic) mengembalikan `sisa_tagihan` → auto-fill `payAmounts`.
3. Submit mengirim **`academic_year_id = TA AKTIF`** → kas/brangkas tercatat di periode berjalan, `payment_item` menunjuk item TA lama → `RecalculateTotalAmount` memperbarui status invoice lama.
4. **Nol perubahan backend** di jalur ini.

**D — Perbaikan.** Hapus invoice manual hanya saat `paid_amount == 0`; bila sudah ada pembayaran, admin harus menghapus pembayarannya lebih dulu di menu Pembayaran. Tidak ada mekanisme void invoice.

### 3e. Tampilan

| Lokasi | Perubahan |
|---|---|
| `siswa/$id/keuangan.tsx` | Kartu "Total Tunggakan" **sudah otomatis** mencakup TA lampau — tidak diubah. *(Pemecahan menjadi "TA Aktif" vs "TA Lain" ditunda — lihat §8)* |
| `tagihan/siswa.$id.tsx` | Tabel existing tetap + **section baru "Tunggakan Tahun Ajaran Lain"**: kolom TA Asal, Keterangan, Total, Sisa, Status, Detail |
| `tagihan/index.tsx` | Filter "Jenis Tagihan" + opsi `arrears`/`manual`; tombol **"+ Tambah Tagihan"** di header. Halaman ini tetap terfilter TA aktif → tunggakan TA lampau **tidak** muncul di sini (by design; tempatnya di section per-siswa dan kasir) |
| `pembayaran/baru` + `-InvoiceSelector.tsx` | Grup baru "Tunggakan Tahun Ajaran Lain" + label TA asal per baris, dapat dibayar |
| `pembayaran/$id.tsx` (struk) | Rincian menampilkan nama item + TA asal |
| Helper `translateType` / `getStatusBadge` | Tambah `arrears` → "Tunggakan", `manual` → "Manual". Helper ini **diduplikasi di ≥3 file** — tambahkan konsisten di semuanya |

### 3f. Konsekuensi Laporan (diterima, bukan bug)

Karena invoice dimiliki TA asal sementara pembayaran dicatat di TA aktif: laporan TA lampau akan menunjukkan **"tagihan" naik tanpa "terbayar" naik** (payment rate turun), dan laporan TA aktif menunjukkan **"terbayar" naik tanpa "tagihan" pendamping** (payment rate bisa >100%). Ini konsekuensi tak terhindarkan dari backfill historis + kas periode berjalan. Keputusan: **diterima apa adanya** (cash-basis); tidak ada penandaan/pemisahan khusus di laporan pada epik ini.

## 4. Edge Cases

- `type=arrears` dengan `items` ≠ 1 → tolak 422
- `items` kosong → tolak 422
- `amount <= 0` → tolak 422 (tidak ada `dispensation` di tagihan manual)
- `student_id` atau `academic_year_id` tidak eksis → tolak 404/422 dengan pesan jelas
- Hapus invoice yang salah satu itemnya sudah ada `payment_item` → **409**, bukan partial delete
- Hapus invoice hasil generate (`monthly`/`initial`/`registration`/`graduation`/`daycare_initial`/`incidental`) → **409**
- Tunggakan di TA yang **sama** dengan TA aktif → ditolak server **422** (Task 9 menutupnya di UI, Task 10 menegakkannya di server). Beban non-tarif di TA aktif dilayani lewat `incidental_items` saat pembayaran.
- TA aktif **tanpa** item tarif aktif → kedua mode ditolak server **422**; UI memblokir form dengan sebab + tautan Pengaturan Tarif (Task 9/Task 10).
- `academic_year_id` untuk `type=arrears` → **wajib** bukan TA aktif (`type=manual` wajib TA aktif bertarif), ditegakkan server sejak Task 10
- Pembayaran lintas-TA: invoice TA lampau dibayar saat TA aktif → `payment.academic_year_id` = TA aktif, `payment_item.invoice_item_id` menunjuk TA lampau
- `RegenerateForStudent` dipanggil saat ada invoice `arrears`/`manual` → keduanya **tetap utuh**
- Invoice `arrears` dengan `month`/`year` NULL tidak terkena `monthlyVisibilityCond`
- `SumUnpaidByStudent` memasukkan tunggakan TA lampau → kartu "Total Tunggakan" naik. **Ini perilaku yang diinginkan**
- Satu siswa memiliki >1 invoice `arrears` pada TA yang sama → diizinkan
- Kasir mencentang tagihan TA aktif **dan** tunggakan TA lain dalam satu transaksi → alokasi per item sudah mendukung

## 5. Requirements (IMMUTABLE)

- **R.1**: Admin dapat membuat invoice manual untuk seorang siswa pada tahun ajaran tertentu dengan `type` baru `arrears` (satu item nominal total) atau `manual` (rinci per item).
- **R.2**: `total_amount` dihitung di server dari jumlah item; client **tidak** mengirim total.
- **R.3**: Invoice `arrears` dimiliki **tahun ajaran asal** (`academic_year_id` = TA yang dipilih), dengan `month`/`year` NULL dan `notes` wajib.
- **R.4** *(diamandemen oleh Task 9)*: Form adaptif — TA = TA aktif **dan punya konfigurasi tarif** → mode Rinci (item dari tarif, total otomatis); TA ≠ TA aktif → mode Total (satu input nominal). **Mode ditentukan mutlak oleh TA dan tidak dapat diubah admin.** Escape hatch pada versi awal R.4 dicabut; lihat Task 9.
- **R.4b** *(Task 9)*: Bila TA terpilih = TA aktif **tanpa** konfigurasi tarif, tidak ada mode yang sah — form diblokir total dengan sebab + tautan ke `/pengaturan/tarif`, dan tombol Simpan nonaktif.
- **R.4c** *(Task 9)*: Kesesuaian mode dengan TA divalidasi sebelum validasi isian, sehingga state basi tidak mungkin tersubmit.
- **R.5**: `DELETE /v1/invoices/:id` hanya berhasil untuk `type IN ('arrears','manual')` **dan** `paid_amount == 0` **dan** tanpa `payment_item`; selain itu 409. Soft delete.
- **R.6**: `PUT /v1/invoices/:id` hanya mengubah `notes` dan `due_date`.
- **R.7**: `RegenerateForStudent` **tidak** menghapus invoice `arrears`/`manual`.
- **R.8**: Daftar tagihan siswa **dan** layar kasir menampilkan section "Tunggakan Tahun Ajaran Lain" berisi **semua** invoice belum lunas dari TA selain TA aktif, berlabel TA asal, dan dapat dibayar.
- **R.9**: Pembayaran atas invoice TA lain dicatat dengan `academic_year_id` = **TA aktif**, tanpa mengubah `academic_year_id` invoice aslinya.
- **R.10**: `SumUnpaidByStudent` **tetap tanpa filter TA** sehingga kartu "Total Tunggakan" mencakup tunggakan lintas TA.
- **R.11**: `translateType` menampilkan label untuk `arrears` ("Tunggakan") dan `manual` ("Manual") di **semua** lokasi pemakaiannya.
- **R.12**: Semua route baru memakai `RequireModule(ModuleKeuangan)`.
- **R.13** *(Task 10)*: `POST /v1/invoices` **menegakkan kesesuaian mode dengan TA di server** — `arrears` ditolak 422 bila TA terpilih adalah TA aktif; `manual` ditolak 422 bila TA bukan TA aktif atau TA tersebut tidak punya item tarif aktif. Redaksi pesan identik dengan `modeAvailability` di klien. Validasi klien (Task 9) tetap ada sebagai lapis pertama; server adalah lapis kedua.

## 6. Success Criteria (MUST ALL BE TRUE)

Semua kriteria backend di bawah diverifikasi end-to-end pada 2026-09-17 — lihat
[Verifikasi E2E](./verifikasi-e2e-tagihan-tunggakan.md) untuk bukti lengkap
(27 asersi terhadap binary HEAD di atas salinan database).

- [x] Unit test service create: `total_amount` = jumlah item (server-side); `type=arrears` dengan ≠ 1 item ditolak; `items` kosong ditolak; `amount <= 0` ditolak
- [x] Unit test guard delete: invoice `arrears`/`manual` tanpa pembayaran terhapus; invoice hasil generate ditolak; invoice dengan pembayaran ditolak
- [x] Unit test regenerate: invoice `arrears`/`manual` **tidak** terhapus oleh `RegenerateForStudent`, invoice hasil generate terhapus
- [x] Integration test: POST → GET (`/v1/invoices/:id`) → DELETE roundtrip berhasil; DELETE pada invoice yang sudah dibayar → 409
- [x] Integration test: bayar invoice `arrears` TA lampau saat TA aktif → `payment.academic_year_id` = TA aktif, status invoice berubah `partial`/`paid`
- [x] Integration test: `GET /v1/students/:id/invoices` tanpa `academic_year_id` mengembalikan invoice lintas TA
- [ ] `useGetV1StudentsIdInvoices` dipanggil tanpa `academic_year_id` memberikan invoice TA lain beserta `academic_year.name` (label TA asal tersedia) — respons API sudah diverifikasi memuat objek `academic_year`; panggilan hook-nya sendiri belum diverifikasi di browser
- [ ] UI: form "Tambah Tagihan" dapat dibuka dari **daftar Tagihan** dan **detail siswa**; mode berpindah otomatis saat TA diubah dan dapat diubah manual; total pada mode Rinci terhitung otomatis — logika murni lulus unit test; verifikasi browser belum dijalankan
- [ ] UI: section "Tunggakan Tahun Ajaran Lain" tampil di daftar tagihan siswa dan di kasir; tagihan darinya dapat dicentang, dialokasikan, dan dibayar — logika murni lulus unit test; verifikasi browser belum dijalankan
- [ ] UI: setelah menyimpan tagihan, `useGetV1StudentsId` ikut ter-invalidate (agar kartu "Total Tunggakan" tidak basi) — belum diverifikasi di browser
- [x] `go build ./...` di `apps/api` sukses
- [x] `pnpm build` & `pnpm lint` di `apps/dashboard` sukses
- [ ] Swagger di-regenerate (`swag init`) dan client Orval di-generate ulang — Swagger sudah; client Orval masih tertunda (lihat §8)
- [x] Pre-commit hooks passing

## 7. Anti-Patterns (FORBIDDEN)

- ❌ **NO** mempercayai/menerima `total_amount` dari client (integritas keuangan: server wajib menghitung dari item — R.2)
- ❌ **NO** membuat tabel atau model baru untuk tunggakan (konsistensi: `invoice` + `invoice_item` sudah cukup; 1 tunggakan = 1 invoice + 1 item)
- ❌ **NO** menambah unique index `(student_id, academic_year_id, type)` untuk `arrears`/`manual` (sumber tunggakan bisa banyak; pola idempotent hanya untuk `initial`/`registration`/`monthly`)
- ❌ **NO** mengubah `SumUnpaidByStudent` menjadi ter-scope TA (akan menyembunyikan tunggakan — R.10)
- ❌ **NO** mengizinkan hapus/ubah invoice yang sudah memiliki pembayaran (integritas pembayaran — R.5)
- ❌ **NO** memakai `type = "incidental"` untuk tagihan manual (`incidental` dibuat otomatis saat pembayaran dan langsung lunas — lifecycle berbeda)
- ❌ **NO** mengizinkan `DELETE /v1/invoices/:id` menghapus invoice hasil generate (itu tugas `RegenerateForStudent`)
- ❌ **NO** ~~mengunci mode form murni pada kecocokan TA tanpa escape hatch~~ — **DIBATALKAN oleh Task 9**: escape hatch justru dicabut atas keputusan produk (Q3=C), karena mode rinci memang bergantung pada tarif milik TA terpilih
- ❌ **NO** mengaktifkan tombol mode yang tidak sah untuk TA terpilih (Task 9: tombol wajib disabled dengan sebab tertulis, bukan hanya divalidasi saat submit)
- ❌ **NO** mengandalkan validasi klien sebagai satu-satunya penjaga aturan mode-vs-TA (Task 10: server wajib menolak `arrears` di TA aktif dan `manual` di TA non-aktif/tanpa tarif dengan 422)
- ❌ **NO** memakai `FeeConfigRepository.FindByAcademicYearID` untuk menentukan "punya tarif" di server tanpa menyaring `is_active` — klien hanya melihat item aktif (`FindAll`), jadi definisinya harus identik agar UI dan API tidak berbeda pendapat
- ❌ **NO** menulis ulang logika pemilihan tarif/filter level-gender (ekstrak dari `tagihan/$id.tsx:99-155`)
- ❌ **NO** memperbaiki bug pre-existing `DELETE FROM payment_items` di `RegenerateForStudent:2852` (scope terpisah — lihat §8)
- ❌ **NO** mengubah `academic_year_id` invoice menjadi TA aktif saat dibayar — invoice tetap milik TA asal (R.9)

## 8. Scope Boundaries

**In scope:**
- Backend: `POST /v1/invoices`, `PUT /v1/invoices/:id`, `DELETE /v1/invoices/:id`, guard `RegenerateForStudent`, DTO, service, repository, route, anotasi Swagger
- Frontend: form adaptif "Tambah Tagihan" di 2 entry point, ekstraksi komponen pemilih tarif, helper label `arrears`/`manual`, section "Tunggakan Tahun Ajaran Lain" di daftar tagihan siswa & kasir, invalidasi query
- Regenerasi Swagger + Orval client

**Out of scope (deferred/never):**
- Input massal per rombel/kelas — **ditunda** (per siswa saja, Q5=A)
- Void/reversal invoice — tidak diminta; perbaikan lewat hapus pembayaran + hapus invoice
- Pemecahan kartu "Total Tunggakan" menjadi "TA Aktif" vs "TA Lain" — **dikerjakan belakangan** sebagai Task 6, tanpa field baru di `FinancialSummaryResponse` (dihitung di klien; lihat Catatan Implementasi Task 6)
- Penandaan/pemisahan pembayaran tunggakan di laporan TA aktif — **tidak dikerjakan** (Q9=A: cash-basis diterima)
- Perbaikan bug `payment_items` yatim di `RegenerateForStudent:2852` — **epik terpisah** (pre-existing, juga memengaruhi `incidental`)
- `invoice_number` dan `created_by` pada invoice — tidak diminta
- Mekanisme carry-over otomatis antar tahun ajaran — tidak diminta (input manual sudah cukup)

## 9. Design Discovery

### Key Decisions Made

| Pertanyaan | Jawaban | Implikasi |
|---|---|---|
| Q1: Invoice tunggakan dimiliki TA mana? | **A** — TA asal; pembayaran dicatat di TA berjalan | Laporan TA lampau benar; butuh jalur baca lintas-TA; konsekuensi laporan diterima (§3f) |
| Q2: Bagaimana tunggakan TA lain ditampilkan? | **A** — section khusus "Tunggakan Tahun Ajaran Lain" | `FindByStudentID` tanpa `academic_year_id` sudah cukup; tidak perlu endpoint baru |
| Q3: Granularitas item | **Kondisional** — TA sama → rinci per tarif + total otomatis; TA beda → satu nominal total | Dua nilai `type` baru: `manual` & `arrears`; total tetap dihitung server |
| Q4: Titik masuk form | **A** — daftar Tagihan & detail siswa | Perlu pemilih siswa reusable di form (ter-prefill dari detail siswa) |
| Q5: Cakupan input | **A** — per siswa | Tidak ada batch endpoint; massal ditunda |
| Q6: Escape hatch mode | **A** (awal) — mode eksplisit, dapat diubah | **DIBATALKAN oleh Q10/Task 9** — lihat baris di bawah |
| Q7: Guard `RegenerateForStudent` | **A** — kecualikan `arrears`/`manual` | 1 baris pada `invoice_generate_service.go:2844-2846`; mencegah kehilangan data |
| Q8: Isi section tunggakan | **A** — semua tagihan belum lunas dari TA lain | Lebih jujur: tunggakan = apa pun yang belum dibayar, termasuk `monthly` lama |
| Q9: Perlakuan di laporan | **A** — terima apa adanya (cash-basis) | Nol pekerjaan tambahan di modul laporan |
| Q10: Validasi mode vs TA (Task 9) | **1A + 2A + 3C + 4A** | Mode jadi ditentukan mutlak oleh TA; TA tanpa tarif diblokir total. Menggantikan Q6. **Task 10** menaikkan penegakan ini ke server (R.13) |

### Research Deep-Dives

**Jalur baca lintas-TA ternyata sudah tersedia.**
`FindByStudentID` (`invoice_repository.go:156-158`) hanya menerapkan filter TA bila `academicYearID != 0`, dan `FindByIDs` yang dipakai `invoices/batch` (`invoice_repository.go:130-140`) tidak punya filter TA sama sekali. **Kesimpulan:** section "Tunggakan Tahun Ajaran Lain" dan pembayarannya tidak membutuhkan endpoint baru — cukup frontend memanggil tanpa param AY lalu memfilter di klien.

**Service pembayaran tidak memvalidasi kesamaan TA.**
`payment_service.go:147-176` hanya memvalidasi nominal, dan `Payment.AcademicYearID` diambil apa adanya dari request (`L219-228`). **Kesimpulan:** membayar invoice TA lampau sambil mencatat kas di TA aktif sudah berjalan tanpa perubahan; ini menjadi keputusan sengaja (R.9), bukan kebetulan.

**`monthlyVisibilityCond` tidak menghalangi type baru.**
`invoice_visibility.go:20-26` hanya menyembunyikan `type = 'monthly'` yang periodenya di depan bulan berjalan. **Kesimpulan:** `arrears`/`manual` dengan `month`/`year` NULL selalu tampil dan tidak perlu pengecualian pada kondisi visibilitas.

**Logika pemilihan tarif sudah ada.**
`tagihan/$id.tsx:99-155` sudah memuat `useGetV1FeeConfigs` + `useGetV1FeeConfigsIdItems`, mengelompokkan per kategori, dan memfilter per level/gender siswa. **Kesimpulan:** mode Rinci pada form baru cukup mengekstrak logika ini menjadi komponen, bukan menulis dari nol.

### Dead-End Paths

**Kolom baru `origin_academic_year_id` (opsi Q1=B) — ditolak.**
Dipertimbangkan karena akan membuat tagihan TA lama otomatis tampil di TA aktif tanpa jalur baca lintas-TA. **Ditolak karena** laporan "tagihan vs pembayaran" TA aktif menjadi overstated (tagihan tahun lalu terhitung sebagai tagihan tahun ini), dan menambah kolom + migrasi yang tidak perlu. **Jangan ditinjau ulang kecuali** kebutuhan berubah menjadi "tunggakan harus terhitung sebagai tagihan TA berjalan".

**Endpoint terpisah `POST /v1/students/:id/arrears` — ditolak.**
Awalnya terlihat lebih bersih untuk kasus tunggakan. **Ditolak karena** akan menduplikasi logika create invoice + item yang identik; satu endpoint dengan `items[]` melayani kedua mode (mode Total = satu item), sehingga tidak ada validasi either/or yang kabur.

**Murni mengandalkan nomor TA sebagai pengunci mode — ditolak (Q6).**
Diusulkan pada Q3. **Ditolak karena** menghalangi beban non-tarif di TA aktif dan tunggakan milik TA aktif, serta membuat bentuk form berubah secara implisit. **Jangan ditinjau ulang kecuali** admin secara eksplisit meminta form yang lebih sederhana.

### Open Concerns Raised

- "Bagaimana kalau tagihan manual di TA aktif dobel dengan hasil generate?" → Mode Rinci di TA aktif menampilkan peringatan risiko dobel; tidak ada pencegahan otomatis (tidak ada unique index). Dicatat sebagai keterbatasan yang diterima.
- "Kalau tagihan manual dibuat lalu regenerate ditekan?" → Dijawab R.7: dikecualikan dari hard-delete.
- "Bagaimana kalau tunggakan ternyata milik TA aktif?" → **Tidak lagi mungkin** sejak Task 9 (Q10/3C). Yang tersedia untuk TA aktif: mode rinci dari tarif; beban non-tarif lewat `incidental_items` saat pembayaran.
- "Apakah laporan jadi aneh?" → Ya, dan sudah dinyatakan eksplisit di §3f; diterima sebagai konsekuensi cash-basis.
- "Apakah kartu Total Tunggakan ikut berubah?" → Ya, otomatis (R.10). Karena itu invalidasi `useGetV1StudentsId` wajib.
- "Kalau item tunggakan sudah dibayar sebagian?" → Boleh; perilaku `partial` existing langsung berlaku tanpa kode baru.

## 10. Tasks

- **Task 1: Backend — Endpoint Create Invoice Manual + Guard Regenerate** → [task-1-backend-create-invoice-manual.md](./task-1-backend-create-invoice-manual.md) (Done — verifikasi HTTP end-to-end belum dijalankan)
- Task 2: Backend — `DELETE /v1/invoices/:id` (guard 409) + `PUT /v1/invoices/:id` + anotasi Swagger lengkap → [task-2-backend-delete-update-invoice.md](./task-2-backend-delete-update-invoice.md) (Done)
- Task 3: Frontend — client API + logika murni (`manual-invoice.ts`) + form adaptif "Tambah Tagihan" di 2 entry point + label `arrears`/`manual` → [task-3-frontend-manual-invoice-form.md](./task-3-frontend-manual-invoice-form.md) (Done)
- Task 4: Frontend — section "Tunggakan Tahun Ajaran Lain" di daftar tagihan siswa (`tagihan/siswa.$id.tsx`) → [task-4-frontend-arrears-section-student-invoices.md](./task-4-frontend-arrears-section-student-invoices.md) (Done)
- Task 5: Frontend — section "Tunggakan Tahun Ajaran Lain" di kasir (`-InvoiceSelector.tsx`) + label TA asal di ringkasan & struk → [task-5-frontend-cashier-arrears-payment.md](./task-5-frontend-cashier-arrears-payment.md) (Done)
- Task 6 (opsional): pecah kartu "Total Tunggakan" menjadi TA Aktif vs TA Lain → [task-6-frontend-split-total-arrears-card.md](./task-6-frontend-split-total-arrears-card.md) (Done — tanpa perubahan backend)
- Task 7: aksi **Hapus & Edit keterangan** tagihan manual di detail tagihan (`tagihan/$id.tsx`) → [task-7-frontend-invoice-edit-delete.md](./task-7-frontend-invoice-edit-delete.md) (Done)
- Task 8 (baru, disarankan): regenerate **penuh** client Orval + satukan pemilih item tarif & `CATEGORY_LABELS` — lihat Catatan Implementasi Task 3 (#1, #2, #3)
- Task 9: Validasi kesesuaian **mode tagihan dengan tahun ajaran** (mencabut escape hatch Q6, blokir TA tanpa tarif) → [task-9-validasi-mode-tahun-ajaran.md](./task-9-validasi-mode-tahun-ajaran.md) (Done)

**Perbaikan pasca-review:**

- [fix-label-jenis-tagihan.md](./fix-label-jenis-tagihan.md) — kolom Keterangan menampilkan jenis tagihan mentah (`monthly`, `arrears`) karena peta label terduplikasi; disatukan ke `invoiceTypeLabel` (Done)
