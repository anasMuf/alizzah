# Epic: Input Jumlah Hari 0 pada Fasilitas (Antar Jemput)

> **Status:** Ready
> **Priority:** P1

---

## 1. Ringkasan Masalah

Keluhan user: *"absensi kehadiran di fasilitas antar jemput tidak bisa diinput angka 0, padahal ada siswa yang tidak memakai fasilitasnya di bulan tersebut."*

Kondisi saat ini (terverifikasi di kode):

1. **Backend menolak 0.** `apps/api/dto/invoice.go:91-93` — `Quantity uint \`validate:"required,min=1"\``. Untuk tipe `uint`, tag `required` gagal pada 0 (zero value) **dan** `min=1` menolaknya, sehingga request `{"quantity": 0}` selalu ditolak `400 VALIDATION_ERROR`.
2. **Frontend memblokir 0** di empat permukaan (§2).
3. **Tab "Jumlah Hari Bulanan" justru sudah dibangun untuk 0** — inputnya `min={0}` dan `handleSave` sudah mengirim 0. Jadi niat desainnya adalah 0 diizinkan; yang tertinggal hanya backend.
4. **Fitur skip tagihan sudah ada & teruji** (`billing_month_exclusions` + dialog "Kelola Bulan"), tetapi hanya dapat diakses dari halaman **per-siswa**, tidak dari halaman **fasilitas** tempat absensi antar jemput dikelola.

Keputusan yang sudah dikunci bersama user:

- **0 hari berarti bulan itu tidak ditagih, dan baris fasilitasnya tidak muncul di tagihan.**
- **Kemampuan input 0 hanya untuk item kategori `facility`** (infaq harian & tabungan wajib tetap minimal 1).

Konsekuensinya: "0 hari" diimplementasikan sebagai **alias dari mekanisme skip bulan yang sudah ada** — item unpaid bulan itu dihapus dari invoice dan bulan tersebut dicatat di `billing_month_exclusions`. Satu sumber kebenaran, tanpa mekanisme baru.

## 2. Temuan Codebase (State Saat Ini)

| File | Kondisi | Peran |
|------|---------|-------|
| `apps/api/dto/invoice.go:91-93` | `validate:"required,min=1"` | **Akar masalah** — menolak 0 |
| `apps/api/service/invoice_service.go:208-246` | `UpdateItemQuantity` — set quantity/amount/name + recalc total | Titik masuk permukaan tagihan/kasir |
| `apps/api/service/invoice_service.go:218-220` | `if item.Status == "paid"` → tolak | Digantikan pesan berbasis `PaidAmount` |
| `apps/api/dto/facility.go:50-56` | `FacilityCurrentMonthDaysResponse` | Dipakai kolom "Jumlah Hari" bulan berjalan |
| `apps/api/dto/facility.go:71-92` | `FacilityStudentItemResponse` (`current_month_days`, `month_zone_overridden`, `month_item_paid`) | Tempat menambah `month_excluded` |
| `apps/api/service/facility_service.go:630-708` | `GetCurrentMonthDays` | Sumber kolom bulan berjalan |
| `apps/api/service/facility_service.go:855-899` | `GetStudentsByFacility` — per baris ambil invoice + item (pola per-baris sudah ada) | Sumber tab bulanan |
| `apps/api/service/facility_service.go:711-751` | `Unenroll` — sudah memakai `invoiceGen`, `exclRepo`, `monthZoneRepo` (pola cleanup R.8/R.9) | Preseden injeksi dependensi |
| `apps/api/service/billing_exclusion_service.go:112-206` | `SetExclusions` — replace-all + diff: hapus item unpaid / restore item | **Mesin skip yang akan dipakai ulang** |
| `apps/api/service/billing_exclusion_service.go:183-204` | Apply: `RemoveFacilityItemFromMonthly` / `RestoreFacilityItemToMonthly` | Efek 0 ⇄ N hari |
| `apps/api/service/invoice_generate_service.go:1131-1177` | `RemoveFacilityItemFromMonthly` — hapus item unpaid + `recalculateInvoiceTotal`; **melewati item `paid_amount != 0` secara silent** | Alasan wajib pre-check item berbayar |
| `apps/api/service/invoice_generate_service.go:1179-1208` | `RestoreFacilityItemToMonthly` — idempotent, hari dari hari efektif | Jalur pencabutan 0 |
| `apps/api/service/invoice_generate_service.go:443-447` | `GenerateMonthly` skip bulan ter-exclude | Jaminan tidak muncul lagi saat generate |
| `apps/api/service/invoice_generate_service.go:2271-2275` | `AddFacilityToMonthlyRange` skip bulan ter-exclude | Jaminan saat enroll/reaktivasi |
| `apps/api/repository/billing_month_exclusion_repository.go:34-43` | `Exists(student, entity, ref, month, year)` | Lookup per baris untuk `month_excluded` |
| `apps/api/service/payment_service.go:159-162` | Pembayaran menolak `amount <= 0` | Item 0 tidak relevan lagi (item dihapus) |
| `apps/api/cmd/api/main.go:347,361,536,540` | Urutan konstruksi: `invoiceGenService` → `invoiceService` → `sfService` → `billingExclusionService` | Perlu reorder agar `sfService` bisa memakai exclusion service |
| `apps/api/cmd/api/main.go:643-645` | `students.PUT("/:id/facilities/:facilityId/month-zone", ...)` | **Pola endpoint per-bulan** yang akan ditiru |
| `apps/dashboard/.../fasilitas/$facilityId.tsx:838` & `:849` | input `min={1}`; `if (qty <= 0) return;` | Blokir 0 (kolom bulan berjalan) |
| `apps/dashboard/.../fasilitas/$facilityId.tsx:1560-1578` | input `min={0} max={31}` + `handleSave:1309` (`qty < 0` skip) | **Sudah** mengirim 0 |
| `apps/dashboard/.../keuangan/tagihan/$id.tsx:171-175` | `canSubmit` butuh `Number(unitQuantity) > 0` | Blokir 0 |
| `apps/dashboard/.../keuangan/pembayaran/components/-InvoiceSelector.tsx:643-650` | input `min={1}` | Blokir 0 |
| `apps/dashboard/.../keuangan/pembayaran/**` (`:135-138`, `:208-211`) | Filter item `sisa > 0 \|\| dispensation` | Item ter-skip otomatis hilang dari pilihan bayar ✅ |
| `apps/dashboard/src/components/molecules/BillingMonthsDialog.tsx` | Dialog skip yang sudah ada | Akan menampilkan bulan yang sama (satu sumber kebenaran) |

## 3. Desain Solusi

### 3a. Semantik

**Hari = 0 untuk satu bulan ⇒ bulan itu di-skip**: item fasilitas unpaid dihapus dari invoice bulan tersebut, bulan dicatat di `billing_month_exclusions`, enrollment tetap Aktif. `Hari ≥ 1` pada bulan yang ter-skip ⇒ skip dicabut, item dikembalikan dengan jumlah hari tersebut.

Ini berarti "input 0" dan "skip tagihan" menjadi **satu mekanisme yang sama** — persis dua alternatif yang disebut user, disatukan. Konsekuensi positifnya:

- **Stabil tanpa kode tambahan.** `RecalculateInfaqHarian:779-807` hanya memperbarui item yang ada → item yang sudah dihapus tidak bisa "hidup lagi". `GenerateMonthly` (`:443-447`) dan `AddFacilityToMonthlyRange` (`:2271-2275`) sudah menghormati exclusion → regenerate/sync pun tetap tidak menagih.
- **Nol perubahan pada logika keuangan.** Tidak ada item bernominal 0, sehingga `allPaid`/`RecalculateTotalAmount` (`invoice_service.go:375-394`), alokasi pembayaran, laporan, dan kwitansi tidak tersentuh.
- **Nol migrasi.** Tabel & endpoint skip sudah ada.
- **Konsisten dengan UI yang ada.** Dialog "Kelola Bulan" otomatis memperlihatkan bulan yang di-nol-kan (satu daftar), jadi admin tetap punya jalur pembatalan yang familiar.

### 3b. Jalur tulis (write path)

**1. Endpoint baru (fasilitas) — jalur utama halaman fasilitas:**

```
PUT /v1/students/:id/facilities/:facilityId/month-days
{ "month": 10, "year": 2025, "days": 0 }
```

Atomik 0 ⇄ N (meniru pola `month-zone` di halaman yang sama):

- `days == 0` → catat skip + hapus item unpaid bulan itu.
- `days >= 1` → cabut skip bila ada (item dipulihkan), lalu set jumlah hari item ke `days`.
- Respons: `{ month, year, days, excluded, invoice_id?, invoice_item_id?, item_paid }`.

**2. Endpoint quantity generik** (`PUT /v1/invoices/:id/items/:item_id/quantity`) — dipakai permukaan detail tagihan & kasir:

- `quantity == 0` dan item kategori `facility` → delegasi ke jalur skip (sama seperti di atas).
- `quantity == 0` dan item kategori lain → `422` dengan pesan jelas ("0 hari hanya berlaku untuk item fasilitas").
- `quantity >= 1` → perilaku lama.

`SetExclusions` adalah satu-satunya penulis tabel exclusion; dua helper tipis ditambahkan agar pemanggil tidak perlu membangun daftar replace-all sendiri:

- `BillingExclusionService.SkipFacilityMonth(studentID, facilityID, month, year)` — baca daftar berjalan, tambahkan bulan, delegasikan ke `SetExclusions`.
- `BillingExclusionService.UnskipFacilityMonth(studentID, facilityID, month, year)` — baca daftar berjalan, buang bulan, delegasikan ke `SetExclusions`.

### 3c. Guard & validasi

- **Item sudah ada pembayaran** (`paid_amount > 0`): `RemoveFacilityItemFromMonthly:1159` melewatinya secara **silent**, jadi orkestrasi **wajib** menolak lebih dulu dengan `422` ("Item sudah ada pembayaran — selesaikan lewat penyesuaian pembayaran/kasir") dan **tidak** mencatat exclusion. Tanpa ini: exclusion tercatat tetapi tagihan tetap muncul → state tidak konsisten.
- **Bulan belum punya item & belum ter-skip** (`days >= 1`): `422` — tidak ada tagihan untuk diubah.
- **Bulan di luar tahun ajaran aktif**: `422` warisan validasi `SetExclusions:135-137` (perilaku sama dengan Kelola Bulan yang ada).
- **Item legacy tanpa `facility_id`**: resolusi lewat nama fasilitas/zona (`facilityItemNameMatches`, sudah dipakai di jalur baca & `RemoveFacilityItemFromMonthly`); bila tetap tidak teridentifikasi → `422` dengan pesan agar memakai dialog Kelola Bulan.
- **`days > 31` atau negatif**: `400`.

### 3d. Perubahan frontend

1. `fasilitas/$facilityId.tsx` — kolom "Jumlah Hari" (bulan berjalan): `min={1}` → `min={0}`; guard `qty <= 0` → tolak hanya NaN/negatif; simpan lewat endpoint `month-days`.
2. `fasilitas/$facilityId.tsx` — tab "Jumlah Hari Bulanan": input sudah 0–31; simpan lewat `month-days` (bukan endpoint quantity) agar baris ter-skip bisa dikembalikan dengan satu aksi; baris ter-skip ditampilkan `0` + badge **"Di-skip"**.
3. `keuangan/tagihan/$id.tsx` & `keuangan/pembayaran/components/-InvoiceSelector.tsx` — `min={0}` untuk item fasilitas; konfirmasi/teks jelas bahwa 0 = baris fasilitas dihapus dari tagihan bulan itu; item non-fasilitas tetap minimal 1.
4. Teks bantuan di kolom hari: `0 = tidak ditagih bulan ini (di-skip)`.

## 4. Edge Cases

- **Item fasilitas sudah dibayar / dibayar sebagian** → `422`, exclusion **tidak** dicatat (lihat §3c).
- **Bulan ter-skip lalu diisi N hari** → skip dicabut, item kembali dengan N hari; invoice dihitung ulang.
- **Bulan ter-skip pada invoice yang belum dibuat** → exclusion tetap tercatat; saat invoice dibuat/di-generate, item tidak ditambahkan.
- **Regenerate/sync/generate ulang bulan itu** → tetap tidak ditagih (exclusion dihormati `GenerateMonthly` & `AddFacilityToMonthlyRange`).
- **Unenroll (Berhenti)** → exclusion dihapus (perilaku R.8 yang sudah ada di `facility_service.go:736-740`).
- **Perubahan hari efektif rombel/bulan** → tidak memengaruhi bulan ter-skip (item sudah tidak ada; recalc tidak menambah item).
- **Ganti zona default / zona per bulan** pada bulan ter-skip → `RewriteFacilityMonthItem` tidak menemukan item (`target == nil` → no-op), exclusion tetap berlaku.
- **0 pada item non-fasilitas** (infaq harian, tabungan wajib) → `422` dengan pesan kategori (keputusan user).
- **Kasir** → item ter-skip otomatis tidak muncul di pilihan pembayaran (filter `sisa > 0`).
- **Kwitansi/pembayaran lama** di bulan yang lalu di-nol-kan → tidak terpengaruh (item ter-skip unpaid; item paid tidak pernah dihapus).
- **Bulan di luar tahun ajaran aktif** → `422` (perilaku sama dengan Kelola Bulan).
- **Dobel klik/konkuren** → `SetExclusions` idempotent (replace-all + diff), aman diulang.

## 5. Requirements (IMMUTABLE)

- **R.1**: Admin dapat menyimpan **0 hari** untuk item fasilitas `per_day` (antar jemput) pada bulan tertentu; hasilnya bulan itu **tidak ditagih** dan **baris fasilitasnya tidak muncul di tagihan**.
- **R.2**: 0 hari diterapkan sebagai skip bulan: item unpaid bulan tsb dihapus dari invoice **dan** bulan dicatat di `billing_month_exclusions` (satu sumber kebenaran dengan dialog "Kelola Bulan").
- **R.3**: Bulan yang di-nol-kan tetap tidak ditagih pada semua generate/sync berikutnya (generate bulanan, backfill rentang enrollment, regenerate invoice siswa).
- **R.4**: Menyetel hari `>= 1` pada bulan yang ter-skip mencabut skip dan mengembalikan item dengan jumlah hari tersebut.
- **R.5**: 0 **hanya** berlaku untuk item kategori `facility`. Item kategori kuantitas lain (infaq harian, tabungan wajib) tetap menolak 0 dengan pesan yang jelas.
- **R.6**: Item fasilitas yang **sudah ada pembayaran** tidak dapat di-nol-kan: `422` + pesan jelas, dan **tidak ada** exclusion yang tersimpan (tidak boleh ada state setengah jalan).
- **R.7**: Endpoint `PUT /v1/students/:id/facilities/:facilityId/month-days` menerima `{month, year, days}` (0–31) dan bersifat atomik (skip/pulihkan + set hari + recalc invoice total).
- **R.8**: Endpoint quantity generik menerima 0 hanya untuk item fasilitas (delegasi ke jalur skip); permukaan detail tagihan & kasir tetap berfungsi tanpa perubahan perilaku untuk nilai `>= 1`.
- **R.9**: Daftar siswa per fasilitas mengembalikan penanda `month_excluded` untuk bulan yang diminta, agar UI dapat menampilkan `0 / "Di-skip"` dan membedakannya dari "belum ada item".
- **R.10**: Tidak ada perubahan perilaku pada jalur keuangan lain: pembayaran, status invoice, laporan, kwitansi, dispensasi, unenroll, dan zona fasilitas.

## 6. Success Criteria (MUST ALL BE TRUE)

- [ ] Unit test: `month-days` dengan `days = 0` → item fasilitas hilang dari invoice bulan itu, invoice total turun, baris `billing_month_exclusions` bertambah
- [ ] Unit test: `days = 0` pada bulan yang sama diulang → idempotent (tetap 1 baris exclusion, tidak error)
- [ ] Unit test: `days >= 1` pada bulan ter-skip → exclusion hilang, item kembali dengan jumlah hari tsb, total invoice terhitung ulang
- [ ] Unit test: `days = 0` pada item fasilitas dengan `paid_amount > 0` → error `422`, **tidak ada** exclusion tersimpan, item tidak berubah
- [ ] Unit test: `GenerateMonthly` untuk bulan ter-skip → item fasilitas tidak ditambahkan (regresi epic skip tetap hijau)
- [ ] Unit test: endpoint quantity generik `quantity = 0` untuk kategori `facility` → ter-skip; untuk `monthly_infaq` → error
- [ ] Unit test: `GetStudentsByFacility` mengisi `month_excluded` sesuai data exclusion
- [ ] Unit test: request tanpa `quantity` → `400` (bukan dianggap 0)
- [ ] UI: input 0 di halaman fasilitas (kolom bulan berjalan & tab bulanan) → baris hilang dari tagihan, muncul badge "Di-skip"; isi ulang `N` mengembalikannya
- [ ] UI: dialog "Kelola Bulan" menampilkan bulan yang sama sebagai ter-skip
- [ ] `go build ./...` & `go vet ./...` di `apps/api` sukses; `tsc` + biome di `apps/dashboard` bersih
- [ ] Pre-commit hooks passing

## 7. Anti-Patterns (FORBIDDEN)

- ❌ **NO menyimpan item fasilitas bernominal Rp 0 di invoice** (keputusan user: baris tidak boleh muncul di tagihan; sekaligus menghindari invoice stuck `partial` — lihat `RecalculateTotalAmount:375-394`)
- ❌ **NO menyembunyikan item Rp 0 hanya di UI** (data tetap ada → total/laporan/status tidak sinkron dengan tampilan, dan recalc bisa mengembalikan nominalnya)
- ❌ **NO mencatat exclusion tanpa memastikan item benar-benar terhapus** (item berbayar bikin state setengah jalan — R.6)
- ❌ **NO mengubah `RemoveFacilityItemFromMonthly`/`RestoreFacilityItemToMonthly`** (dipakai skip ekskul/fasilitas yang sudah teruji; cukup panggil)
- ❌ **NO mengubah logika status invoice / `allPaid` / alokasi pembayaran** (blast radius keuangan harus nol — R.10)
- ❌ **NO menambah kolom/tabel/migrasi baru** (tabel exclusion sudah ada; penanda override hari non-nol = epic terpisah `docs/issue/feedback-01-override-hari-efektif.md`)
- ❌ **NO memakai `uint` biasa untuk `quantity`/`days` di request** (0 jadi ambigu antara "tidak dikirim" dan "nol hari" — R.7/R.8)
- ❌ **NO mengizinkan 0 untuk kategori non-fasilitas** (keputusan user — R.5)
- ❌ **NO menulis exclusion langsung dari handler/service lain tanpa lewat `SetExclusions`** (hindari duplikasi logika diff/apply)
- ❌ **NO write-off diam-diam untuk item yang sudah dibayar** (harus lewat kasir/penyesuaian pembayaran)
- ❌ **NO menyentuh mekanisme skip PASTA/ekskul** (hanya menambah pintu masuk untuk fasilitas)

## 8. Scope Boundaries

**In scope:**
- Endpoint baru `PUT /v1/students/:id/facilities/:facilityId/month-days` (DTO, service, handler, route, guard modul)
- Helper `SkipFacilityMonth` / `UnskipFacilityMonth` pada `BillingExclusionService`
- Dukungan `quantity = 0` untuk item fasilitas di endpoint quantity generik + penolakan untuk kategori lain
- Penanda `month_excluded` pada `FacilityStudentItemResponse`
- Reorder konstruksi service di `main.go` (agar `sfService` dapat memakai exclusion service)
- Frontend: empat permukaan input + badge "Di-skip" + teks bantuan
- Unit test backend untuk seluruh perilaku di atas

**Out of scope (deferred/never):**
- Item fasilitas bernominal Rp 0 yang tetap tampil di tagihan (keputusan user: tidak)
- Menolkan/menghapus bulan yang itemnya **sudah dibayar** (butuh penyesuaian pembayaran/write-off) — sama seperti batasan skip saat ini
- Kolom `quantity_overridden` / tabel override hari per bulan agar koreksi manual **non-nol** kebal recalc & regenerate — epic terpisah (`docs/issue/feedback-01-override-hari-efektif.md`)
- Tombol "Kelola Bulan" di halaman fasilitas (dialog per-siswa) — setelah epic ini kolom hari sudah menjadi pintu masuknya
- "0 hari" untuk SPP/SPD/daycare (mekanisme berbeda)
- Batch lintas siswa (isi 0 untuk banyak siswa sekaligus) — tidak diminta

## 9. Design Discovery

### Key Decisions Made

| Pertanyaan | Jawaban | Implikasi |
|------------|---------|-----------|
| Arah solusi | **A — izinkan input 0 hari** | Backend + FE diubah |
| Cakupan kategori | **Hanya item fasilitas** | Kategori kuantitas lain tetap minimal 1 (R.5) |
| Hasil di tagihan | **Baris fasilitas tidak muncul** saat 0 | 0 ⇒ skip (item dihapus + exclusion), **bukan** item Rp 0 |
| Mekanisme | Memakai ulang skip bulan yang sudah ada | Nol migrasi, nol perubahan logika keuangan, stabil terhadap generate/recalc |

### Research Deep-Dives

**1. Kenapa 0 ditolak?**
- `dto/invoice.go:91-93`: `required` + `min=1`. Untuk `uint`, `required` = bukan zero value → 0 gagal; `min=1` juga gagal.
- Tab "Jumlah Hari Bulanan" sudah `min={0}` dan mengirim 0 → validasi backend satu-satunya penghalang di permukaan itu.

**2. Apakah kekurangan hari bisa hilang sendiri?**
- `RecalculateInfaqHarian:779-807` menimpa `quantity`/`amount`/`name` item fasilitas dengan `effectiveDays.TotalDays` selama `PaidAmount == 0`; dipicu setiap upsert hari efektif (`effective_day_service.go:96-98`, `:145-154`, `:184-186`).
- Dengan pendekatan skip, item **tidak ada** sehingga tidak ada yang bisa ditimpa → kestabilan didapat gratis (berbeda dengan pendekatan item Rp 0 yang butuh penanda & guard).

**3. Apakah aman terhadap generate/sync ulang?**
- `GenerateMonthly:443-447` dan `AddFacilityToMonthlyRange:2271-2275` sudah `isMonthExcluded(...)` → skip bulan tetap dihormati saat invoice dibuat ulang.
- `RewriteFacilityMonthItem:2552-2554` no-op bila item tidak ada → ganti zona tidak menghidupkan item bulan ter-skip.

**4. Risiko state setengah jalan**
- `RemoveFacilityItemFromMonthly:1158-1167` melewati item `paid_amount != 0` **tanpa error** (berbeda dari varian ekskul yang punya write-off). Karena itu skip dari input hari **wajib** pre-check `paid_amount > 0` sebelum mencatat exclusion (§3c, R.6).

### Dead-End Paths

**1. Item fasilitas tetap ada dengan nominal Rp 0 ("settled zero")**
- *Kenapa dipertimbangkan:* cukup mengubah DTO + menandai item 0 sebagai `status paid`; baris tetap terlihat sebagai jejak "terdaftar tapi 0 hari".
- *Investigasi:* `RecalculateTotalAmount:375-394` (`allPaid`) mengharuskan item 0 berstatus `paid`; `RecalculateInfaqHarian` tetap menimpanya kecuali ditambah guard; `facilityItemStatusFromPaid(0,0)` harus diubah agar ganti zona per bulan tidak merusak status.
- *Kenapa ditinggalkan:* **keputusan user — baris tidak boleh muncul di tagihan.** Selain itu tetap meninggalkan utang guard recalc dan memperluas perubahan ke jalur status invoice.
- *🚫 Jangan ditinjau ulang kecuali:* sekolah berubah pikiran dan ingin baris `Rp 0` terlihat sebagai jejak.

**2. Menyembunyikan item Rp 0 hanya di tampilan**
- *Kenapa dipertimbangkan:* perubahan paling kecil (filter di frontend).
- *Investigasi:* `RecalculateTotalAmount` & `recalculateInvoiceTotal` menghitung `total_amount` dari seluruh item → total tetap memuat nominal 0 (tidak masalah) tetapi status/laporan dan ekspektasi "tidak ditagih" menjadi tidak konsisten; recalc dapat mengembalikan nominalnya karena item masih ada.
- *Kenapa ditinggalkan:* data ≠ tampilan; melanggar R.1 secara semantik.
- *🚫 Jangan ditinjau ulang kecuali:* tidak ada — pola ini dilarang (Anti-Patterns).

**3. Kolom `quantity_overridden` di `invoice_items`**
- *Kenapa dipertimbangkan:* usulan lama di `docs/issue/feedback-01-override-hari-efektif.md:53` untuk melindungi koreksi manual.
- *Investigasi:* perlu migrasi, UI pelepas override, hilang saat regenerate, dan mengubah perilaku kategori lain.
- *Kenapa ditinggalkan:* tidak diperlukan untuk 0 (item dihapus) dan memperluas cakupan dari keluhan.
- *🚫 Jangan ditinjau ulang kecuali:* ada kebutuhan melindungi koreksi manual **non-nol** dari recalc/regenerate.

### Open Concerns Raised

- *"Barisnya hilang — wali murid bisa bertanya."* → Diterima atas keputusan user; rekam jejaknya adalah baris `billing_month_exclusions` yang terlihat di dialog "Kelola Bulan". (Alternatif baris `Rp 0` ditolak user.)
- *"Bagaimana membatalkan 0?"* → Isi ulang jumlah hari `>= 1` pada baris yang sama, atau lewat dialog "Kelola Bulan" (satu sumber kebenaran).
- *"Bagaimana kalau bulan itu sudah dibayar?"* → Ditolak `422` dengan pesan jelas; penyelesaiannya lewat kasir/penyesuaian pembayaran (di luar cakupan).
- *"Apakah 0 ikut berlaku untuk infaq harian?"* → Tidak (keputusan user — R.5).
- *"Apakah regenerate invoice mengembalikan tagihan?"* → Tidak; exclusion dihormati saat generate (R.3).

## 10. Tasks

- **Task 1: Backend — endpoint `month-days` (0 ⇄ N) + helper skip/uns skip fasilitas + `month_excluded`** → [task-1-backend-month-days-fasilitas.md](./task-1-backend-month-days-fasilitas.md) (Ready)
- Task 2: Backend — endpoint quantity generik: terima 0 untuk item fasilitas, tolak untuk kategori lain (DTO `*uint` + delegasi skip) (dibuat iteratif setelah Task 1)
- Task 3: Frontend — halaman fasilitas: kolom bulan berjalan & tab bulanan (input 0, badge "Di-skip", simpan lewat `month-days`) (dibuat iteratif)
- Task 4: Frontend — detail tagihan & kasir (min 0 untuk item fasilitas + teks konfirmasi) dan teks bantuan kolom hari (dibuat iteratif)
