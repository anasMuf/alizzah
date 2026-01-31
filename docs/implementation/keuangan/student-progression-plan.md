# Plan: Upgrade Sistem Progresi Siswa (Kenaikan & Kelulusan)

Dokumen ini merinci rencana pengembangan fitur Progresi Siswa untuk mendukung alur kerja *Top-Down* (dari tingkat akhir ke bawah), mencakup fitur **Kelulusan Masal** dan **Kenaikan Kelas** dalam satu antarmuka Wizard yang terpadu.

## 1. Latar Belakang & User Flow

Untuk memastikan data kapasitas rombel tidak *overload* saat proses kenaikan kelas, alur kerja yang benar adalah **Top-Down**:
1.  **Luluskan** siswa tingkat akhir (Misal: Kelas 6 SD / 9 SMP).
2.  **Naikkan** siswa kelas di bawahnya ke kelas yang baru saja kosong (Misal: 5 ke 6).
3.  Ulangi sampai kelas terbawah.
4.  Masukkan siswa baru ke kelas terbawah.

Saat ini sistem hanya mendukung poin 2 & 3. Kita perlu menambahkan poin 1.

## 2. Perubahan UX/UI (Web)

Kita akan mengubah `SiswaPromotion.tsx` menjadi **"Student Progression Wizard"** dengan tahapan yang lebih jelas.

### Desain Wizard (Stepped Interface)

Alih-alih tampilan *split-screen* statis, kita akan gunakan pendekatan **Linear Stepper**:

#### Step 1: Konfigurasi (Configuration)
*   **Pilih Rombel Asal**: Dropdown memilih kelas sumber.
*   **Pilih Jenis Aksi**: Pilihan berupa *Card Selection*.
    *   🎓 **Kelulusan (Graduation)**: Mengubah status menjadi `LULUS`, mengeluarkan siswa dari rombel aktif.
    *   📈 **Kenaikan Kelas (Promotion)**: Memindahkan siswa ke rombel baru.
*   **Pilih Rombel Tujuan**: (Hanya muncul jika aksi = **Kenaikan Kelas**).

#### Step 2: Seleksi Siswa (Selection)
*   Menampilkan daftar siswa dari Rombel Asal.
*   Fitur *Select All*, *Search*, dan indikator jumlah terpilih.
*   *Preview Kapasitas*:
    *   Jika **Kenaikan**: Tampilkan bar kapasitas rombel tujuan.
    *   Jika **Kelulusan**: Tampilkan info "Siswa akan dinonaktifkan dari kelas aktif".

#### Step 3: Konfirmasi & Eksekusi
*   Ringkasan akhir (Source -> Target/Lulus).
*   Total siswa.
*   Tombol Eksekusi.

## 3. Perubahan Backend (API & Validator)

Kita perlu memodifikasi endpoint dan service agar bisa menangani aksi "Kelulusan" yang tidak membutuhkan `targetRombelId`.

### A. Validator Schema (`@alizzah/validators`)
Update `promoteSiswaSchema`:
```typescript
export const promoteSiswaSchema = z.object({
    siswaIds: z.array(z.string().uuid()).min(1),
    action: z.enum(['PROMOTE', 'GRADUATE']), // Field Baru
    targetRombelId: z.string().uuid().optional(), // Jadi Optional
}).refine((data) => {
    if (data.action === 'PROMOTE' && !data.targetRombelId) {
        return false; // Target wajib jika Promote
    }
    return true;
}, {
    message: "Rombel tujuan wajib dipilih untuk kenaikan kelas",
    path: ["targetRombelId"]
});
```

### B. Service Logic (`SiswaService.ts`)
Update method `promote`:
1.  Terima parameter `action`.
2.  Jika `action === 'GRADUATE'`:
    *   Set update data: `{ status: 'LULUS', rombelId: null }` (jika skema memperbolehkan rombelId null) atau biarkan rombelId lama tapi status Lulus (tergantung kebijakan data, biasanya dikosongkan atau dipindah ke rombel 'Alumni' virtual).
    *   *Rekomendasi*: Set status `LULUS`. Rombel ID biarkan di record terakhir history (jika ada tabel history) atau biarkan di rombel terakhir tapi tidak terhitung kapasitas aktif.
    *   *Keputusan*: Update status ke `LULUS` dan `rombelId` kita biarkan (agar tahu alumni kelas mana) ATAU kita buat field baru `alumniRombelId`. 
    *   *Simpel Approach*: Update status `LULUS`. Di query kapasitas rombel (`count`), filter hanya siswa dengan status `AKTIF`. (Ini membutuhkan update di `RombelService` agar menghitung kapasitas hanya dari siswa AKTIF).

3.  Jika `action === 'PROMOTE'`:
    *   Logic lama (pindah `rombelId`, status tetap `AKTIF`).

## 4. Implementation Steps

1.  **Backend Refactor**:
    *   Update `RombelService.findAll` agar perhitungan `_count` siswa hanya menghitung yang statusnya `AKTIF`.
    *   Update `promoteSiswaSchema`.
    *   Refactor `SiswaService.promote` untuk handle logic `GRADUATE`.
2.  **Frontend Refactor**:
    *   Ubah layout `SiswaPromotion.tsx` menjadi Wizard Mode.
    *   Integrasikan state `actionType`.
    *   Sesuaikan payload mutasi API.

## 5. Timeline Eksekusi
*   **Step 1**: Backend Refactor (Validator & Service). **(Prioritas Tinggi)**
*   **Step 2**: Frontend UI Revamp.
