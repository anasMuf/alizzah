# Task 15: Tindak Lanjut Review PR #180 (Suggestion)

> **Konteks:** temuan tingkat *Suggestion* dari review PR #180, setelah perbaikan #1–#4
> **Status:** Done
> **Priority:** P3 (kualitas: cakupan test, a11y, kejelasan)

---

## Item yang Dikerjakan

### 1. Test predikat `is_active` benar-benar bergigi

`manual_invoice_service_test.go` sebelumnya hanya menonaktifkan tarif lewat
**soft-delete**, sehingga predikat `is_active = true` pada
`CountActiveItemsByAcademicYear` tidak teruji: menghapus predikat itu pun tak membuat
test merah.

Ditambahkan test yang menonaktifkan item (`IsActive = false`) **tanpa** soft-delete.

Dibuktikan lewat **mutation test** — predikat dihapus sementara dari query:

```
--- FAIL: TestCreateManual_Manual_ActiveYearWithInactiveTariff_Rejected
    Error: An error is expected but got nil.        (201, bukan 422)
--- PASS: TestCreateManual_Manual_ActiveYearWithoutTariff_Rejected  (soft-delete, tetap hijau)
--- PASS: TestCreateManual_Manual_ActiveYear... (dll)
```

Predikat lalu dikembalikan, dan `git diff` untuk file itu bersih.

### 2. Invarian "arrears = tepat satu item" dijaga di semua jalur

Sebelumnya hanya `CreateManual` yang menjaga. Endpoint mutasi item masih bisa
menambah item kedua, atau **menghapus item tunggalnya sampai tagihan jadi 0**.

`rejectArrearsItemMutation` kini dipanggil di awal `AddItem`, `UpdateItem`,
`UpdateItemQuantity`, dan `DeleteItem` → **409** untuk tagihan tunggakan.

Tagihan rinci (`manual`) **tidak** terpengaruh — itemnya memang boleh dikoreksi; ada
test kontrol (`TestManualItemMutation_StillAllowed`) yang memastikan hal itu dan
memverifikasi `total_amount` dihitung ulang setelah item dihapus.

Catatan backlog di [Task 10](./task-10-penegakan-mode-ta-backend.md) diamendemen
(AddItem tidak lagi tertunda), bukan diedit diam-diam.

### 3. Semantik a11y pemilih mode

Pemilih mode sebelumnya hanya membedakan pilihan lewat warna, dan sebab penolakan
tidak terhubung ke kontrol:

- kontainer menjadi `role="radiogroup"` + `aria-label`
- tiap tombol `role="radio"` + `aria-checked`
- sebab penolakan dihubungkan lewat `aria-describedby` (menunjuk penjelasan mode) dan
  `title` untuk pengguna mouse

### 4. Label "Siswa" benar-benar terhubung

`<Label>Siswa</Label>` tidak punya `htmlFor`, dan `StudentSearch` tidak menyediakan id
untuk inputnya. Ditambahkan prop opsional `inputId` (backward-compatible) dan
dipakai lewat `htmlFor` di form.

### 5. Komentar usang diselaraskan

Komentar mode masih berbunyi "tetap dapat diubah admin" — bertentangan dengan aturan
final (mode ditentukan mutlak oleh TA) dan berpotensi memicu regresi. Sudah
diperbarui.

### 6. Matriks test dilengkapi

Kombinasi `{mode total, TA lampau, punya tarif}` yang sah belum diuji. Ditambahkan di
frontend (`modeAvailability`) **dan** di tabel Go (`invoiceModeViolation`) agar paritas
klien-server terjaga.

## Files to Modify

| File | Operasi |
|------|---------|
| `apps/api/service/manual_invoice_service_test.go` | **Ubah** — test `is_active`, guard item, matriks Go |
| `apps/api/service/invoice_service.go` | **Ubah** — `rejectArrearsItemMutation` + 4 call site |
| `apps/api/repository/fee_config_item_repository.go` | **Ubah sementara** — mutation test (dikembalikan) |
| `apps/dashboard/.../components/ManualInvoiceForm.tsx` | **Ubah** — a11y + komentar |
| `apps/dashboard/.../components/-StudentSearch.tsx` | **Ubah** — prop `inputId` |
| `apps/dashboard/src/features/keuangan/manual-invoice.test.ts` | **Ubah** — matriks |
| `docs/epics/task-10-penegakan-mode-ta-backend.md` | **Ubah** — amendemen backlog |

## Verification

- [x] `gofmt -l` bersih untuk file yang disentuh
- [x] `go build ./...` / `go vet ./...` — sukses
- [x] `go test ./...` — `api/repository` & `api/service` lulus
- [x] Mutation test predikat `is_active` (lihat §1)
- [x] `pnpm test` — **87 test** lulus (+1 matriks)
- [x] `npx tsc --noEmit` bersih
- [x] `npx biome check src` — **71 warning**, tidak bertambah
- [ ] Verifikasi browser (termasuk perilaku screen reader) — diserahkan ke pemilik produk

## Yang Masih Tersisa

- **Test komponen belum ada.** RTL + jsdom sudah terpasang, tetapi `vite.config.ts`
  belum menyetel environment jsdom dan belum ada mock untuk hook generated + provider
  Query/Toast. Memasang harness itu pekerjaan tersendiri; tiga perbaikan sebelumnya
  (state basi, invalidation, label TA asal) masih hanya tertutup oleh pembacaan kode.
- **`StudentSearch` di halaman kasir belum punya nama aksesibel** — prop `inputId`
  sudah tersedia, tetapi pemanggil di `pembayaran/baru.tsx` belum memakainya karena
  di sana tidak ada `<label>` visual. Dicatat, belum disentuh (di luar temuan review).
