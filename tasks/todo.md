# Tasks: Laporan Keuangan Rebuild

## Phase 1: Foundation — Reusable Components

---

### Task 1: Buat komponen `FilterBar.tsx`

**Description:** Komponen filter bar reusable yang dipakai semua 4 sub-halaman. Berisi: Tahun Ajaran dropdown, date range (Dari-Sampai) dengan native input date, shortcut buttons (Hari Ini, Bulan Ini, TA Saat Ini), payment method dropdown (Tunai/Tabungan/Semua), dan tombol Generate. Props menerima callback `onGenerate(filters)` dan optional children slot untuk tambahan filter spesifik per halaman.

**Acceptance criteria:**
- [ ] TA dropdown terisi dari `academicYearAtom` + fallback fetch `GET /v1/academic-years`
- [ ] Date range "Dari" dan "Sampai" menggunakan `<input type="date">`
- [ ] Shortcut buttons (Hari Ini, Bulan Ini, TA Saat Ini) mengisi date range secara otomatis
- [ ] Payment method dropdown: Semua, Tunai, Tabungan
- [ ] Tombol "Generate" disabled jika date range belum diisi
- [ ] Memanggil `onGenerate(filters)` saat tombol diklik dengan semua nilai filter
- [ ] Children slot di-render di bawah filter bar (untuk multi-select spesifik halaman)

**Verification:**
- [ ] Build succeeds: `cd apps/dashboard && npx tsc --noEmit`
- [ ] Manual check: Render di storybook atau temporary page, verify semua input berfungsi, shortcut mengisi date, tombol Generate trigger callback

**Dependencies:** None

**Files likely touched:**
- `src/features/keuangan/components/FilterBar.tsx` (new)

**Estimated scope:** Medium (3-5 files, karena perlu import academic year dan type definition)

---

### Task 2: Buat komponen `MultiSelectCheckbox.tsx`

**Description:** Komponen multi-select generic via checkbox list. Props: `options: {id, label}[]`, `selected: id[]`, `onChange: (ids) => void`, `label: string`. Menampilkan label header + checkbox list vertical dengan opsi "Semua" di paling atas yang otomatis select/deselect semua item. Data options di-fetch dari parent, komponen ini hanya rendering.

**Acceptance criteria:**
- [ ] Checkbox "Semua" toggle semua item
- [ ] Checkbox individual add/remove dari selected array
- [ ] Label header menampilkan jumlah terpilih (contoh: "Fee Item (3 terpilih)")
- [ ] Support scrollable container jika options > 8 item
- [ ] Controlled component (value dari parent, onChange ke parent)

**Verification:**
- [ ] Build succeeds
- [ ] Manual check: Toggle "Semua", select individual items, verify state

**Dependencies:** None

**Files likely touched:**
- `src/features/keuangan/components/MultiSelectCheckbox.tsx` (new)

**Estimated scope:** Small (1-2 files)

---

### Task 3: Buat komponen `ReportInfoCard.tsx` dan `ReportTable.tsx`

**Description:** Dua komponen presentasional. `ReportInfoCard` menampilkan ringkasan filter yang dipilih (Sumber, Metode, Periode, TA) dalam card compact — digunakan setelah Generate. `ReportTable` adalah wrapper tabel konsisten dengan styling yang sama (ring-1, shadow-sm, rounded-xl, overflow-x-auto).

**Acceptance criteria:**
- [ ] `ReportInfoCard`: Props menerima `filters` object dan merender key-value ringkasan
- [ ] `ReportInfoCard`: Handle empty state (belum generate → tidak muncul)
- [ ] `ReportTable`: Props menerima `columns[]` dan `children` (table body rows)
- [ ] `ReportTable`: Styling konsisten: `bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden`
- [ ] `ReportTable`: Total row di footer (props `total`) dengan styling tebal + border-top

**Verification:**
- [ ] Build succeeds
- [ ] Manual check: Render dengan dummy data, verify card dan tabel styling

**Dependencies:** None

**Files likely touched:**
- `src/features/keuangan/components/ReportInfoCard.tsx` (new)
- `src/features/keuangan/components/ReportTable.tsx` (new)

**Estimated scope:** Small (1-2 files)

---

## Checkpoint: Foundation
- [ ] Build `cd apps/dashboard && npx tsc --noEmit` no errors
- [ ] Semua 4 komponen reusable siap digunakan

---

## Phase 2: Backend API Adjustments

---

### Task 4: Extend API endpoint Saldo

**Description:** Tambahkan query params `date_from`, `date_to`, `fee_item_ids` (comma-separated), `academic_year_ids` (comma-separated) ke endpoint `GET /v1/reports/saldo`. Backend memfilter transaksi berdasarkan range tanggal dan list fee item yang dipilih. Response tetap menggunakan shape existing `SaldoData` dengan rows per tanggal.

**Acceptance criteria:**
- [ ] Endpoint menerima `date_from`, `date_to`, `fee_item_ids`, `academic_year_ids` sebagai optional query params
- [ ] Jika `fee_item_ids` kosong, return semua pos
- [ ] Jika `academic_year_ids` kosong, return TA aktif
- [ ] Data di-filter berdasarkan range tanggal (bukan hanya month/year)
- [ ] Response shape backward-compatible (tidak break existing consumer)

**Verification:**
- [ ] Manual check: `curl "http://localhost:8080/v1/reports/saldo?date_from=2026-07-01&date_to=2026-07-31&fee_item_ids=1,2"` return data yang terfilter
- [ ] Regenerate orval hooks jika perlu

**Dependencies:** None (backend standalone)

**Files likely touched:**
- `app/apps/api/handler/report_handler.go`
- `app/apps/api/service/report_service.go`
- `app/apps/api/repository/report_repository.go`
- `app/apps/dashboard/src/api/endpoints/reports/saldo.ts`

**Estimated scope:** Medium (3-5 files)

---

### Task 5: Extend API endpoint Posisi Kas

**Description:** Tambahkan query params `date_from`, `date_to`, `fee_item_ids`, `expense_category_ids` ke endpoint `GET /v1/reports/posisi-kas`. Backend mengganti logika month/year menjadi date range based, dan menambahkan filter fee item + kategori pengeluaran. Response shape disesuaikan: label "Saldo Sebelum [bulan]" dan "Saldo Sampai [bulan]" pakai date range.

**Acceptance criteria:**
- [ ] Endpoint menerima `date_from`, `date_to`, `fee_item_ids`, `expense_category_ids`
- [ ] Logic month/year diganti ke date range
- [ ] Filter fee item: hanya tampilkan pos yang ID-nya match
- [ ] Filter kategori pengeluaran: hanya tampilkan detail pengeluaran yang kategorinya match
- [ ] Response shape tetap kompatibel dengan frontend `PosisiKasPost`

**Verification:**
- [ ] Manual check: `curl` dengan berbagai kombinasi filter

**Dependencies:** None

**Files likely touched:**
- `app/apps/api/handler/report_handler.go`
- `app/apps/api/service/report_service.go`
- `app/apps/api/repository/report_repository.go`
- `app/apps/dashboard/src/api/endpoints/reports/posisi-kas.ts`

**Estimated scope:** Medium (3-5 files)

---

### Task 6: Buat API endpoint/filter Pemasukan

**Description:** Evaluasi apakah `GET /v1/income-transactions` bisa difilter dengan `date_from`, `date_to`, `payment_method`, `fee_item_ids`. Jika ya, extend. Jika tidak, buat endpoint baru `GET /v1/reports/pemasukan`. Response shape harus mencakup: grouping per tanggal, per transaksi: no, fee_item_name, amount, plus info detail transaksi (source, method, terbilang, date, no_transaction, petugas).

**Acceptance criteria:**
- [ ] Endpoint bisa difilter by date range, payment method, fee_item_ids[]
- [ ] Response di-group by date
- [ ] Setiap transaksi punya info detail (source, method, terbilang, date, no, petugas)
- [ ] Setiap transaksi punya items array (no, fee_item_name, amount)
- [ ] Ada subtotal per tanggal dan grand total

**Verification:**
- [ ] Manual check: `curl` dengan filter, verify response shape
- [ ] Generate/update orval hooks di frontend

**Dependencies:** None

**Files likely touched:**
- `app/apps/api/handler/income_transaction_handler.go` (atau report_handler.go)
- `app/apps/api/service/...`
- `app/apps/api/repository/...`
- `app/apps/dashboard/src/api/endpoints/reports/pemasukan.ts` (new, manual hook)

**Estimated scope:** Medium (3-5 files)

---

### Task 7: Buat API endpoint/filter Pengeluaran

**Description:** Sama seperti Task 6 tapi untuk pengeluaran. Evaluasi `GET /v1/expenses` atau buat endpoint baru `GET /v1/reports/pengeluaran`. Filter: date range, payment_method, fee_item_ids[], expense_category_ids[].

**Acceptance criteria:**
- [ ] Endpoint bisa difilter by date range, payment method, fee_item_ids[], expense_category_ids[]
- [ ] Response di-group by date
- [ ] Setiap transaksi punya info detail + items array
- [ ] Ada subtotal per tanggal dan grand total

**Verification:**
- [ ] Manual check: `curl` dengan filter

**Dependencies:** Task 6 (pola sama, bisa parallel tapi Task 6 dulu untuk establish pattern)

**Files likely touched:**
- `app/apps/api/handler/expense_handler.go` (atau report_handler.go)
- `app/apps/api/service/...`
- `app/apps/api/repository/...`
- `app/apps/dashboard/src/api/endpoints/reports/pengeluaran.ts` (new)

**Estimated scope:** Medium (3-5 files)

---

### Task 8: Generate/update frontend API hooks

**Description:** Setelah backend selesai, generate atau tulis manual API hooks frontend untuk 4 endpoint yang akan digunakan sub-halaman. Gunakan pola yang sama seperti hook existing di `src/api/endpoints/reports/` (manual, React Query). Update type definitions.

**Acceptance criteria:**
- [ ] Hook `useGetReportsPemasukan` tersedia dengan params yang benar
- [ ] Hook `useGetReportsPengeluaran` tersedia dengan params yang benar
- [ ] Hook `useGetReportsSaldo` diupdate dengan params baru
- [ ] Hook `useGetReportsPosisiKas` diupdate dengan params baru
- [ ] Semua hook menggunakan React Query dengan `enabled: false` (triggered manual via Generate)

**Verification:**
- [ ] Build succeeds: `npx tsc --noEmit`
- [ ] Manual check: Import hooks di temporary component, verify types

**Dependencies:** Task 4, 5, 6, 7 (semua backend task)

**Files likely touched:**
- `src/api/endpoints/reports/pemasukan.ts` (new)
- `src/api/endpoints/reports/pengeluaran.ts` (new)
- `src/api/endpoints/reports/saldo.ts` (edit)
- `src/api/endpoints/reports/posisi-kas.ts` (edit)

**Estimated scope:** Medium (3-5 files)

---

## Checkpoint: Backend
- [ ] API endpoints bisa dipanggil via curl/Postman dan return data sesuai filter
- [ ] Frontend hooks compile tanpa error

---

## Phase 3: Sub-halaman — Vertical Slices

---

### Task 9: Sub-halaman Pemasukan

**Description:** Halaman `/keuangan/laporan/pemasukan` dengan FilterBar + MultiSelect Fee Item + ReportInfoCard + tabel transaksi per tanggal. Data dari `useGetReportsPemasukan` (atau income-transactions filtered), di-trigger oleh tombol Generate. Layout: info card → loop per tanggal → setiap tanggal punya info detail transaksi + tabel items (No, Dari Kategori Penerimaan, Nominal) → subtotal → grand total. Print juga diimplementasikan.

**Acceptance criteria:**
- [ ] FilterBar dengan TA, date range, payment method, shortcut
- [ ] MultiSelect Fee Item (data dari `GET /v1/fee-configs/{id}/items`)
- [ ] Tombol Generate memanggil API dengan semua filter
- [ ] Loading state (skeleton) saat fetch
- [ ] Error state (Alert) jika API gagal
- [ ] Empty state jika tidak ada data
- [ ] Data di-group per tanggal
- [ ] Info detail transaksi per grup (Sumber, Metode, Terbilang, Tgl, No, Petugas)
- [ ] Tabel items: No, Dari Kategori Penerimaan, Nominal
- [ ] Subtotal per tanggal, Grand Total di akhir
- [ ] Tombol Cetak menggunakan `openPrintWindow` dengan format HTML yang sesuai
- [ ] Navigasi breadcrumb: Laporan > Pemasukan

**Verification:**
- [ ] Build succeeds
- [ ] Manual check: Pilih filter, Generate, verifikasi tabel, Cetak

**Dependencies:** Task 1, 2, 3, 8

**Files likely touched:**
- `src/routes/_authenticated/keuangan/laporan/pemasukan.tsx` (new)

**Estimated scope:** Medium (3-5 files)

---

### Task 10: Sub-halaman Pengeluaran

**Description:** Halaman `/keuangan/laporan/pengeluaran`. Mirip Pemasukan tapi dengan multi-select tambahan: Kategori Pengeluaran (data dari `GET /v1/expense-categories`). Tabel: No, Dari Kategori Pengeluaran, Nominal. Info detail transaksi sama. Print juga diimplementasikan.

**Acceptance criteria:**
- [ ] FilterBar + MultiSelect Fee Item + MultiSelect Kategori Pengeluaran
- [ ] Tombol Generate dengan semua filter termasuk expense_category_ids
- [ ] Data di-group per tanggal
- [ ] Info detail transaksi per grup
- [ ] Tabel: No, Dari Kategori Pengeluaran, Nominal
- [ ] Subtotal per tanggal, Grand Total
- [ ] Tombol Cetak
- [ ] Loading, error, empty states

**Verification:**
- [ ] Build succeeds
- [ ] Manual check: Pilih filter, Generate, verifikasi, Cetak

**Dependencies:** Task 9 (bisa parallel, tapi Task 9 dulu untuk establish pattern halaman)

**Files likely touched:**
- `src/routes/_authenticated/keuangan/laporan/pengeluaran.tsx` (new)

**Estimated scope:** Medium (3-5 files)

---

### Task 11: Sub-halaman Saldo

**Description:** Halaman `/keuangan/laporan/saldo`. Filter: Multi-select Pos Penerimaan (bisa Semua) + Multi-select Tahun Ajaran (bisa Semua). Tabel: Tanggal, Debit, Kredit, Selisih, Saldo. Tidak ada grouping per tanggal — semua rows dalam satu tabel dengan running balance. Info card menampilkan Periode, Pos, TA.

**Acceptance criteria:**
- [ ] FilterBar + MultiSelect Pos Penerimaan + MultiSelect TA
- [ ] MultiSelect TA diisi dari `GET /v1/academic-years`
- [ ] Tombol Generate
- [ ] Info card: Periode, Pos terpilih, TA terpilih
- [ ] Tabel: Tanggal, Debit, Kredit, Selisih, Saldo
- [ ] Row total bulan di footer
- [ ] Saldo akhir di baris terakhir dengan highlight
- [ ] Tombol Cetak
- [ ] Loading, error, empty states

**Verification:**
- [ ] Build succeeds
- [ ] Manual check: Filter + Generate + verifikasi running balance

**Dependencies:** Task 9 (pattern reference)

**Files likely touched:**
- `src/routes/_authenticated/keuangan/laporan/saldo.tsx` (new)

**Estimated scope:** Medium (3-5 files)

---

### Task 12: Sub-halaman Posisi Kas

**Description:** Halaman `/keuangan/laporan/posisi-kas`. Filter: MultiSelect Fee Item + MultiSelect Kategori Pengeluaran. Tabel: Nama Pos, Saldo Sebelum, Penerimaan, Pengeluaran, Saldo Sampai. Child rows untuk detail pengeluaran per pos. Label kolom menyesuaikan date range.

**Acceptance criteria:**
- [ ] FilterBar + MultiSelect Fee Item + MultiSelect Kategori Pengeluaran
- [ ] Tombol Generate
- [ ] Tabel dengan parent row (bold) dan child rows (indented, dot prefix) untuk detail pengeluaran
- [ ] Kolom: Nama Pos, Saldo Sebelum, Penerimaan, Pengeluaran, Saldo Sampai
- [ ] Grand Total row
- [ ] Tombol Cetak
- [ ] Loading, error, empty states

**Verification:**
- [ ] Build succeeds
- [ ] Manual check: Filter + Generate + verifikasi tabel

**Dependencies:** Task 9, 10 (pattern reference)

**Files likely touched:**
- `src/routes/_authenticated/keuangan/laporan/posisi-kas.tsx` (rewrite)

**Estimated scope:** Medium (3-5 files)

---

## Checkpoint: Core Features
- [ ] Keempat sub-halaman berfungsi end-to-end: filter → generate → tabel → cetak
- [ ] Build no error
- [ ] Semua state handled (loading, error, empty)

---

## Phase 4: Migration & Cleanup

---

### Task 13: Pindahkan halaman lama ke folder `old/`

**Description:** Pindahkan 9 file halaman laporan lama ke subfolder `old/` dan tambahkan komentar header `// @deprecated — migrated to laporan rebuild`. Route definition di-set inactive (atau tetap bisa diakses via URL langsung untuk backward compatibility).

**Acceptance criteria:**
- [ ] Semua file lama dipindahkan ke `src/routes/_authenticated/keuangan/laporan/old/`
- [ ] Setiap file ditambah komentar `// @deprecated`
- [ ] Route index lama (`laporan/index.tsx`) tetap ada di old/ untuk referensi
- [ ] Build tidak error (import paths adjusted jika ada)

**Verification:**
- [ ] Build succeeds
- [ ] Navigasi ke route lama masih berfungsi (opsional)

**Dependencies:** Task 9, 10, 11, 12 (semua halaman baru sudah jadi)

**Files likely touched:**
- `src/routes/_authenticated/keuangan/laporan/old/*.tsx` (9 files dipindahkan)

**Estimated scope:** Small (1-2 files, mostly file moves)

---

### Task 14: Update hub page (`laporan/index.tsx`)

**Description:** Update halaman index laporan dari 9 card menjadi 4 card (Pemasukan, Pengeluaran, Saldo, Posisi Kas). Card design konsisten dengan existing tapi jumlah berkurang. Tambahkan redirect dari route lama (opsional, untuk backward compatibility).

**Acceptance criteria:**
- [ ] Hub page hanya menampilkan 4 card
- [ ] Setiap card punya title, description, icon, dan link ke sub-halaman baru
- [ ] Card styling konsisten dengan existing
- [ ] Breadcrumb "Laporan" di setiap sub-halaman mengarah ke hub page baru

**Verification:**
- [ ] Build succeeds
- [ ] Manual check: Klik setiap card, verify navigasi ke sub-halaman baru

**Dependencies:** Task 13

**Files likely touched:**
- `src/routes/_authenticated/keuangan/laporan/index.tsx`

**Estimated scope:** Small (1 file)

---

### Task 15: Final integration test & polish

**Description:** Integration check: test semua flow end-to-end, verifikasi tidak ada broken import atau reference ke halaman lama, polish UI (spacing, responsive, dark/light consistency), dan final review.

**Acceptance criteria:**
- [ ] Semua 4 sub-halaman navigasi lancar dari hub page
- [ ] Filter → Generate → Tabel → Cetak work di semua halaman
- [ ] Tidak ada error di console
- [ ] Responsive layout (mobile/desktop)
- [ ] Konsistensi styling antar halaman
- [ ] Tidak ada broken import ke file `old/`

**Verification:**
- [ ] `npx tsc --noEmit` no errors
- [ ] Manual walkthrough semua flow
- [ ] Test print output

**Dependencies:** Task 13, 14

**Files likely touched:**
- Various (touch-up)

**Estimated scope:** Small (1-2 files)

---

## Checkpoint: Complete
- [ ] Semua acceptance criteria terpenuhi
- [ ] Build dan dev server berjalan tanpa error
- [ ] Navigasi antar sub-halaman lancar
- [ ] Halaman lama tersimpan di `old/`
