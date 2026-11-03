-- ============================================================
-- Fix: Koreksi periode absensi SDM yang salah input
-- ============================================================
-- Konteks (alizzah_test):
--   * User bermaksud menginput absensi OKTOBER 2026, tetapi tersimpan
--     sebagai periode NOVEMBER 2026 (2026-11-05).
--   * Baris Oktober lama (2026-10-05) sudah soft-deleted (deleted_at
--     terisi) kecuali 1 karyawan baru, sehingga di dashboard Oktober
--     tampak kosong.
--   * Nilai November identik dengan nilai Oktober lama → aman
--     dipindahkan/dikembalikan ke Oktober.
--   * Periode SEPTEMBER 2026 (2026-09-05) hanya data testing → bersihkan.
--
-- Catatan:
--   * Payroll periode/detail masih kosong, jadi tidak ada snapshot gaji
--     yang perlu diubah.
--   * DELETE memakai soft-delete (deleted_at) agar konsisten dengan
--     perilaku endpoint DELETE /v1/sdm/absen dan masih bisa dipulihkan.
--   * Upsert absen di aplikasi me-reset deleted_at, jadi periode yang
--     dibersihkan tetap bisa diisi ulang dari dashboard.
--
-- Backup dulu:
--   pg_dump -d alizzah_test -t sdm_absen -t sdm_kirim_wa \
--     > sdm_absen_before_fix.sql
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- GUARD: batalkan bila data tidak sesuai skenario (mencegah timpa)
-- ------------------------------------------------------------
DO $$
DECLARE
    okt_active int;
    nov_active int;
BEGIN
    SELECT count(*) INTO okt_active
      FROM sdm_absen
     WHERE periode = DATE '2026-10-05' AND deleted_at IS NULL;

    SELECT count(*) INTO nov_active
      FROM sdm_absen
     WHERE periode = DATE '2026-11-05' AND deleted_at IS NULL;

    IF nov_active = 0 THEN
        RAISE EXCEPTION 'Tidak ada data November aktif — kemungkinan sudah diperbaiki. Dibatalkan.';
    END IF;

    IF okt_active >= nov_active THEN
        RAISE EXCEPTION 'Oktober sudah punya % baris aktif (>= November %). Dibatalkan agar tidak menimpa data valid.', okt_active, nov_active;
    END IF;

    RAISE NOTICE 'Guard lolos: Oktober aktif=%, November aktif=%', okt_active, nov_active;
END $$;

-- ------------------------------------------------------------
-- PREVIEW: kondisi sebelum perbaikan
-- ------------------------------------------------------------
SELECT periode,
       count(*) FILTER (WHERE deleted_at IS NULL) AS aktif,
       count(*) FILTER (WHERE deleted_at IS NOT NULL) AS soft_deleted
  FROM sdm_absen
 WHERE periode IN (DATE '2026-09-05', DATE '2026-10-05', DATE '2026-11-05')
 GROUP BY periode
 ORDER BY periode;

-- ------------------------------------------------------------
-- STEP 1: Kembalikan data November ke Oktober
--   - Update baris Oktober yang sudah ada (termasuk yang soft-deleted)
--   - deleted_at di-reset agar muncul lagi di dashboard
-- ------------------------------------------------------------
UPDATE sdm_absen o
   SET hadir           = n.hadir,
       hadir_siaga     = n.hadir_siaga,
       hadir_terlambat = n.hadir_terlambat,
       hadir_piket     = n.hadir_piket,
       pulang_awal     = n.pulang_awal,
       deleted_at      = NULL,
       updated_at      = now()
  FROM sdm_absen n
 WHERE o.periode = DATE '2026-10-05'
   AND n.periode = DATE '2026-11-05'
   AND n.deleted_at IS NULL
   AND o.employee_id = n.employee_id;

-- ------------------------------------------------------------
-- STEP 2: Bersihkan periode November (soft delete)
-- ------------------------------------------------------------
UPDATE sdm_absen
   SET deleted_at = now(),
       updated_at = now()
 WHERE periode = DATE '2026-11-05'
   AND deleted_at IS NULL;

-- ------------------------------------------------------------
-- STEP 3: Bersihkan absensi September (data testing, soft delete)
-- ------------------------------------------------------------
UPDATE sdm_absen
   SET deleted_at = now(),
       updated_at = now()
 WHERE periode = DATE '2026-09-05'
   AND deleted_at IS NULL;

-- ------------------------------------------------------------
-- STEP 4: Bersihkan log kirim WA September (data testing)
-- ------------------------------------------------------------
UPDATE sdm_kirim_wa
   SET deleted_at = now(),
       updated_at = now()
 WHERE periode = DATE '2026-09-05'
   AND deleted_at IS NULL;

-- ------------------------------------------------------------
-- VERIFIKASI: kondisi setelah perbaikan
-- ------------------------------------------------------------
SELECT periode,
       count(*) FILTER (WHERE deleted_at IS NULL) AS aktif,
       count(*) FILTER (WHERE deleted_at IS NOT NULL) AS soft_deleted
  FROM sdm_absen
 WHERE periode IN (DATE '2026-09-05', DATE '2026-10-05', DATE '2026-11-05')
 GROUP BY periode
 ORDER BY periode;

-- Oktober harus punya 33 baris aktif; November & September 0 aktif.
SELECT count(*) AS okt_aktif_tanpa_nov
  FROM sdm_absen o
 WHERE o.periode = DATE '2026-10-05'
   AND o.deleted_at IS NULL
   AND NOT EXISTS (
       SELECT 1 FROM sdm_absen n
        WHERE n.periode = DATE '2026-11-05'
          AND n.employee_id = o.employee_id
   );

COMMIT;
