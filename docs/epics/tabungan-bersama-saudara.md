# Epic: Tabungan Bersama Saudara (Sibling Savings)

> **Status:** Planning
> **Created:** 2026-07-14
> **Type:** New Feature

---

## Problem

Saat ini tabungan siswa hanya bisa digunakan untuk pembayaran tagihan siswa itu sendiri. Namun di lapangan, wali/orang tua sering menggunakan tabungan satu anak untuk membayar tagihan saudaranya (contoh: Abidzar bayar registrasi Kevin). Sistem tidak mendukung ini — admin harus melakukan penarikan tunai (kena admin fee 2.5%) lalu bayar manual.

## Requirements (IMMUTABLE)

- R.1: Setiap siswa memiliki daftar saudara (sibling) yang bisa diakses dari halaman detail siswa → tab Profile
- R.2: Saudara auto-deteksi dari `student_guardians` — siswa dengan `guardian_id` yang sama otomatis menjadi saudara
- R.3: Admin bisa **tambah/hapus saudara manual** di tab Profile (untuk kasus saudara tiri/angkat dengan guardian berbeda)
- R.4: Di halaman pembayaran (kasir), saat sumber "Tabungan" dipilih, admin bisa klik "⋯" di card tabungan untuk membuka SlideOver pilih sumber tabungan
- R.5: SlideOver menampilkan: tabungan sendiri + semua tabungan saudara (beserta nama, kelas, saldo)
- R.6: Admin bisa memilih saudara sebagai sumber dana dan menentukan nominal
- R.7: Transfer antar saudara **hanya untuk pembayaran tagihan** (tidak bisa transfer bebas)
- R.8: Transfer tercatat dengan `source_type = "sibling_payment"` di tabel `savings_transactions`
- R.9: **Tidak ada admin fee** untuk transfer antar saudara (ini bukan penarikan tunai)
- R.10: Hubungan saudara bersifat dua arah — jika A saudara B, maka otomatis B saudara A

## Success Criteria

- [ ] Tab Profile menampilkan section "Saudara" dengan daftar auto-detect + manual
- [ ] Admin bisa tambah/hapus saudara via SlideOver di tab Profile
- [ ] Auto-detect bekerja: siswa dengan guardian sama otomatis muncul
- [ ] Pembayaran via tabungan saudara berhasil (debit saudara, credit invoice siswa)
- [ ] `savings_transactions` tercatat dengan `source_type = "sibling_payment"` dan `source_id = payment_id`
- [ ] `student_savings.balance` saudara berkurang sesuai nominal
- [ ] Invoice siswa terbayar (status update, paid_amount update)
- [ ] Tidak ada admin fee dikenakan pada transaksi sibling_payment
- [ ] SlideOver pilih sumber menampilkan saldo real-time
- [ ] `go build` sukses, `npx tsc` sukses
- [ ] Pre-commit hooks passing

## Anti-Patterns (FORBIDDEN)

- ❌ **NO transfer saldo bebas antar saudara** (audit: hanya untuk pembayaran tagihan, mencegah penyalahgunaan)
- ❌ **NO admin fee untuk sibling_payment** (bisnis: ini bukan penarikan tunai, wali tidak menerima uang)
- ❌ **NO tabel baru untuk menggantikan `student_guardians`** (consistency: guardian tetap jadi source of truth, `student_siblings` hanya untuk override)
- ❌ **NO hapus guardian saat hapus sibling manual** (data integrity: guardian relationship tetap utuh)

## Approach

Menambahkan model `StudentSibling` untuk menyimpan hubungan saudara manual (override). Auto-detect dari `student_guardians` — siswa dengan `guardian_id` sama. Di UI pembayaran, tambah SlideOver "Pilih Sumber Tabungan" yang menampilkan tabungan sendiri + saudara. Backend: endpoint baru `POST /v1/payments` menerima `sibling_payment_source_id` untuk menandai bahwa dana berasal dari saudara.

## Architecture

```
┌─ Database ────────────────────────────────┐
│  student_siblings (NEW)                    │
│    student_id → FK students               │
│    sibling_id → FK students               │
│    uq_sibling_pair (student_id, sibling_id)│
│                                            │
│  student_guardians (existing)              │
│    auto-detect saudara                     │
│                                            │
│  savings_transactions (existing)           │
│    source_type: + "sibling_payment"        │
└────────────────────────────────────────────┘

┌─ Backend (Go) ────────────────────────────┐
│  model/student_sibling.go        NEW       │
│  repository/student_sibling      NEW       │
│  handler/student_handler.go     + siblings │
│  service/payment_service.go     + sibling  │
│  service/savings_service.go     + debit    │
└────────────────────────────────────────────┘

┌─ Frontend (React) ────────────────────────┐
│  Profile tab: section Saudara              │
│    daftar saudara + tambah/hapus           │
│                                            │
│  PaymentSummary: card tabungan             │
│    tombol "⋯" → SlideOver sumber           │
└────────────────────────────────────────────┘
```

## Data Flow

### Deteksi Saudara (GET /v1/students/:id/siblings)

```
1. Query student_siblings WHERE student_id = ? OR sibling_id = ?
   → daftar saudara manual

2. Query student_guardians WHERE guardian_id IN (
     SELECT guardian_id FROM student_guardians WHERE student_id = ?
   )
   → daftar saudara auto-detect

3. Merge & deduplicate → return list [{id, full_name, class, level, balance}]
```

### Pembayaran dengan Tabungan Saudara (POST /v1/payments)

```
Request: {
  student_id: 75,           // Kevin (yang bayar tagihan)
  source: "savings",
  sibling_payment_source: {
    student_id: 154,        // Abidzar (sumber dana)
    amount: 925000
  },
  items: [...]
}

Transaction:
  1. Debit tabungan Abidzar (student_id=154) sebesar 925.000
     → savings_transactions: type=debit, source_type="sibling_payment"
  2. Credit invoice_items untuk Kevin (student_id=75)
  3. Update invoice status
  4. Record payment
```

## Scope Boundaries

**In scope:**
- Model `StudentSibling` + CRUD
- API: `GET /students/:id/siblings`, `POST /students/:id/siblings`, `DELETE /students/:id/siblings/:siblingId`
- Auto-detect dari `student_guardians`
- UI: section Saudara di tab Profile (tambah/hapus)
- UI: SlideOver pilih sumber tabungan di pembayaran
- Backend: support `sibling_payment` di payment service
- Backend: skip admin fee untuk `sibling_payment`

**Out of scope:**
- Notifikasi ke wali (deferred)
- Riwayat transfer antar saudara (deferred — bisa pakai savings_transactions existing)
- Batas maksimal transfer per bulan (deferred)
- Multi-sibling dalam satu transaksi (hanya 1 saudara per payment)

## Open Questions

- Apakah perlu tampil saldo saudara di halaman tabungan siswa sendiri? (deferred)
- Apakah saudara yang sudah lulus/tidak aktif tetap muncul? (default: tidak)
