# Modul Koperasi — Indeks Dokumentasi

Unit usaha koperasi sekolah sebagai **entitas keuangan mandiri** di dashboard Alizzah: jual-beli barang, simpan-pinjam (pinjaman tanpa bunga), dan pembukuan kas dengan jurnal terklasifikasi.

## Dokumen
| # | Dokumen | Isi |
|---|---|---|
| 1 | [`prd.md`](./prd.md) | Overview, problem/solution, **keputusan desain (D1–D6)**, fitur (Core/NTH/PTH), user stories, glosarium |
| 2 | [`erd.md`](./erd.md) | Diagram ER, spesifikasi 13 tabel, relasi lintas modul |
| 3 | [`api-contract.md`](./api-contract.md) | Endpoint REST `/api/v1/koperasi/*`, role akses, validasi |
| 4 | [`integration-plan.md`](./integration-plan.md) | Cara masuk ke codebase (Batch 8): backend, role baru, seam modal, frontend, urutan implementasi, DoD |
| 5 | [`frontend-implementation-plan.md`](./frontend-implementation-plan.md) | **Breakdown fase frontend (FE-0..FE-5)**: pola referensi, RBAC, urutan per-halaman, DoD |

> Belum dibuat (opsional): `ux-flow.md`, `ui-spec.md`.

## Keputusan terkunci (ringkas)
- **D1** Buku kas koperasi **terpisah penuh** dari kas sekolah.
- **D2** **Tabel anggota mandiri** (independen modul SDM yang belum ada).
- **D3** **Tanpa simpanan** anggota — koperasi hanya pinjaman + jual-beli.
- **D4** Pinjaman **tanpa bunga** (pokok ÷ tenor, angsuran fleksibel, opsi potong gaji manual).
- **D5** HPP **modal manual per barang**.
- **D6** Relasi siswa **ringan** (referensi `student_id`, kas tetap terpisah).
- **A1** Usul role baru `admin_koperasi` (perlu konfirmasi akhir).

## Status
🟢 **Backend selesai** (sub-batch 8a–8e ter-merge ke develop). **Frontend berjalan**: FE-0 (fondasi + Anggota) selesai; FE-1..FE-5 menyusul — lihat [`frontend-implementation-plan.md`](./frontend-implementation-plan.md).
