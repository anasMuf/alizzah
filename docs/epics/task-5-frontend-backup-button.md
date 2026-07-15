# Task 5: Frontend Backup Button + Orval + README

> **Epic:** [Backup Database Otomatis & Manual](../epics/backup-database-otomatis-manual.md)
> **Status:** Ready
> **Priority:** P2 (terakhir — depend pada Task 4 untuk API endpoint)

---

## Goal

Dashboard punya tombol "Backup" di halaman keuangan (atau topbar), memanggil `POST /v1/backups`. API client di-regenerate via Orval. `README.md` restore instructions tersimpan di direktori backup. **Setelah task ini selesai, seluruh fitur backup siap digunakan oleh operator.**

## Dependencies

- ✅ **Task 4** — `POST /v1/backups` endpoint sudah deployed
- Epic requirements R.11

## Files to Modify / Create

| File | Operasi |
|------|---------|
| `app/dashboard/src/api/endpoints/backup/backup.ts` | **REGENERATE** — Orval auto-generate dari OpenAPI spec |
| `app/dashboard/src/features/backup/BackupButton.tsx` | **NEW** — Komponen tombol backup |
| `app/dashboard/src/routes/_authenticated/...` | **MODIFY** — Tambah tombol di halaman yang sesuai |
| `~/backups/alizzah-app/README.md` | **NEW** — Restore instructions |

## Step 1: Study Existing Code

- `app/dashboard/src/api/endpoints/auth/auth.ts` — Pattern Orval-generated hooks (`usePostV1AuthLogout`). Backup hook akan mirip.
- `app/dashboard/src/components/layout/Topbar.tsx:75-83` — Pattern tombol aksi (Button + onClick). BackupButton ikuti ini.
- `app/dashboard/orval.config.ts` — Konfigurasi Orval. Pastikan OpenAPI spec endpoint backup sudah masuk.
- `app/dashboard/src/store/global.ts` — Jotai atom pattern (untuk referensi state management — tidak dipakai di task ini).

## Step 2: Implementation Checklist

### 2a. Orval regenerate API client

- [ ] Pastikan OpenAPI spec endpoint `POST /v1/backups` sudah di-generate oleh swaggo di backend
- [ ] Jalankan: `cd app/apps/dashboard && npx orval --config orval.config.ts`
- [ ] Verifikasi file `app/dashboard/src/api/endpoints/backup/backup.ts` terbuat
- [ ] Verifikasi `usePostV1Backups` hook tersedia (mirip dengan `usePostV1AuthLogout`)
- [ ] Verifikasi type `PostV1Backups200` dan `PostV1BackupsResponse` terbuat

### 2b. BackupButton component (`features/backup/BackupButton.tsx`)

- [ ] Komponen sederhana:
  ```tsx
  import { useState } from "react";
  import { usePostV1Backups } from "#/api/endpoints/backup/backup";
  import { Button, ConfirmDialog } from "#/components/ui";
  
  export function BackupButton() {
    const [showConfirm, setShowConfirm] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    
    const backupMutation = usePostV1Backups({
      mutation: {
        onSuccess: (data) => {
          const result = data.data?.data;
          setMessage(`Backup berhasil: ${result?.filename} (${formatBytes(result?.size_bytes ?? 0)})`);
        },
        onError: () => {
          setMessage("Backup gagal. Coba lagi atau hubungi admin.");
        },
      },
    });
    
    const handleBackup = () => {
      setShowConfirm(false);
      setMessage(null);
      backupMutation.mutate();
    };
    
    return (
      <>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowConfirm(true)}
          disabled={backupMutation.isPending}
        >
          {backupMutation.isPending ? "Mem-backup..." : "Backup Database"}
        </Button>
        
        <ConfirmDialog
          open={showConfirm}
          title="Backup Database"
          description="Buat salinan database saat ini? File backup akan disimpan di server."
          confirmLabel="Ya, Backup"
          cancelLabel="Batal"
          onConfirm={handleBackup}
          onCancel={() => setShowConfirm(false)}
        />
        
        {message && (
          <p className="text-sm mt-2 text-gray-600">{message}</p>
        )}
      </>
    );
  }
  
  function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }
  ```

- [ ] Tampilkan di halaman yang sesuai (pilih salah satu — koordinasi dengan user):
  - **Opsi A**: Di `Topbar` (sebelah tombol Logout) — mudah diakses, tidak spesifik modul
  - **Opsi B**: Di halaman keuangan (`_authenticated/keuangan/...`) — konteks yang tepat
  - **Opsi C**: Di halaman pengaturan — administratif

### 2c. README restore instructions

- [ ] Buat file `~/backups/alizzah-app/README.md`:
  ```markdown
  # Al-Izzah Database Backups
  
  Direktori ini berisi backup otomatis database Al-Izzah Manajemen.
  
  ## File Format
  
  - Format: PostgreSQL custom dump (`pg_dump -Fc`)
  - Naming: `alizzah_backup_YYYY-MM-DD_HH-MM_WIB.dump`
  - Retention: 7 hari (file lebih tua dihapus otomatis)
  
  ## Restore Database
  
  ### Full Restore
  
  pg_restore -U <user> -h <host> -p <port> -d <dbname> alizzah_backup_2026-07-14_23-00_WIB.dump
  
  ### Convert ke Plain SQL (untuk inspeksi manual)
  
  pg_restore -f backup.sql alizzah_backup_2026-07-14_23-00_WIB.dump
  
  ### Restore Table Spesifik
  
  pg_restore -U <user> -h <host> -d <dbname> -t invoices alizzah_backup_2026-07-14_23-00_WIB.dump
  
  ## Triggers
  
  - **Otomatis**: Setiap hari 23:00 WIB
  - **Logout**: Setiap admin logout (dengan debounce 5 menit)
  - **Manual**: Via dashboard → tombol "Backup Database"
  
  ## Error Log
  
  Cek `backup_errors.log` di direktori ini untuk riwayat error.
  ```

### 2d. Build verification

- [ ] `cd app/apps/dashboard && npm run build` — sukses tanpa error
- [ ] `cd app/apps/api && go build ./cmd/api` — sukses (pastikan Swagger doc terupdate)

## Success Criteria

- [ ] Tombol "Backup Database" tampil di dashboard
- [ ] Klik tombol → dialog konfirmasi muncul
- [ ] Konfirmasi → loading state ("Mem-backup...")
- [ ] Sukses → pesan sukses dengan filename & size
- [ ] Gagal → pesan error
- [ ] File backup terbuat di server, bisa diverifikasi via SSH
- [ ] `README.md` tersimpan di direktori backup dengan restore instructions
- [ ] `npm run build` (dashboard) sukses
- [ ] Pre-commit hooks passing

## Anti-Patterns (FORBIDDEN)

- ❌ **NO backup trigger tanpa konfirmasi** — wajib ada confirm dialog untuk mencegah misclick
- ❌ **NO tombol di halaman public** — hanya tampil untuk user dengan akses modul keuangan (cek `user.modules` di frontend — opsional untuk sekarang, bisa semua role yang bisa login)
- ❌ **NO auto-refresh halaman setelah backup** — pesan sukses/gagal cukup, tidak perlu reload
