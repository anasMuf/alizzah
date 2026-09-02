-- ============================================================
-- Fix: Item fasilitas per_day quantity 0 hari padahal hari efektif sudah diset
-- ============================================================
-- Masalah: item fasilitas per-hari (mis. "ZONA 2 (0 hari)") dibuat dengan
-- jumlah hari efektif PADA SAAT DIBUAT. Bila bulan tsb hari efektifnya belum
-- diset saat item dibuat (mis. dibuat 13-08 untuk September, level baru diset
-- 31-08), item tertulis 0 hari & tidak pernah di-recalc — tidak ada mekanisme
-- recalc item fasilitas saat hari efektif berubah (beda dgn infaq/tabungan
-- wajib yg di-recalc RecalculateInfaqHarian).
--
-- Script ini MEMPERBAIKI item fasilitas per_day yang:
--   - unpaid (paid_amount = 0), amount = 0
--   - bulan tsb sudah punya hari efektif (override rombel > 0, selain itu level > 0)
-- Item untuk bulan yang hari efektifnya belum diset (level_days = 0) TIDAK
-- disentuh (akan diperbaiki saat hari efektifnya diisi — lihat fix kode).
--
-- Jalankan di production (dan test/local bila perlu).
-- ============================================================

-- ── 0) DRY-RUN: lihat item yang akan diperbaiki sebelum eksekusi ──────────
-- SELECT ii.id, i.student_id, s.full_name, cg.level,
--        ii.name, ii.quantity, ii.unit_price, ii.amount, i.month, i.year,
--        resolved.days AS hari_benar,
--        ii.unit_price * resolved.days AS amount_benar
-- FROM (
--   SELECT ii2.id AS item_id,
--          COALESCE(
--            (SELECT NULLIF(ed.total_days,0) FROM effective_days ed
--              WHERE ed.class_group_id = cg2.id AND ed.month = i2.month AND ed.year = i2.year),
--            (SELECT NULLIF(ed2.total_days,0) FROM effective_days ed2
--              WHERE ed2.class_group_id = 0 AND ed2.level = cg2.level AND ed2.month = i2.month AND ed2.year = i2.year),
--            0) AS days
--   FROM invoice_items ii2
--   JOIN invoices i2 ON i2.id = ii2.invoice_id
--   JOIN student_enrollments enr2 ON enr2.student_id = i2.student_id AND enr2.status = 'active'
--   JOIN class_groups cg2 ON cg2.id = enr2.class_group_id
--   WHERE ii2.category = 'facility'
--     AND ii2.deleted_at IS NULL
--     AND ii2.paid_amount = 0
--     AND ii2.quantity IS NOT NULL
--     AND ii2.unit_price IS NOT NULL
--     AND ii2.amount = 0
-- ) resolved
-- JOIN invoice_items ii ON ii.id = resolved.item_id
-- JOIN invoices i ON i.id = ii.invoice_id
-- JOIN students s ON s.id = i.student_id
-- JOIN student_enrollments enr ON enr.student_id = i.student_id AND enr.status = 'active'
-- JOIN class_groups cg ON cg.id = enr.class_group_id
-- WHERE resolved.days > 0
-- ORDER BY i.student_id, i.year, i.month;

BEGIN;

-- ── 0) Kumpulkan invoice terdampak ke temp table (sebelum item di-update) ──
CREATE TEMP TABLE _fix_facility_invoices ON COMMIT DROP AS
SELECT DISTINCT i.id AS invoice_id
FROM invoice_items ii
JOIN invoices i ON i.id = ii.invoice_id
JOIN student_enrollments enr ON enr.student_id = i.student_id AND enr.status = 'active'
JOIN class_groups cg ON cg.id = enr.class_group_id
WHERE ii.category = 'facility'
  AND ii.deleted_at IS NULL
  AND ii.paid_amount = 0
  AND ii.quantity IS NOT NULL
  AND ii.unit_price IS NOT NULL
  AND ii.amount = 0
  AND COALESCE(
    (SELECT NULLIF(ed.total_days,0) FROM effective_days ed
      WHERE ed.class_group_id = cg.id AND ed.month = i.month AND ed.year = i.year),
    (SELECT NULLIF(ed2.total_days,0) FROM effective_days ed2
      WHERE ed2.class_group_id = 0 AND ed2.level = cg.level AND ed2.month = i.month AND ed2.year = i.year),
    0) > 0;

-- ── 1) Update quantity/amount/nama item fasilitas per_day yang 0 hari ──────
WITH resolved AS (
  SELECT ii2.id AS item_id,
         COALESCE(
           (SELECT NULLIF(ed.total_days,0) FROM effective_days ed
             WHERE ed.class_group_id = cg2.id AND ed.month = i2.month AND ed.year = i2.year),
           (SELECT NULLIF(ed2.total_days,0) FROM effective_days ed2
             WHERE ed2.class_group_id = 0 AND ed2.level = cg2.level AND ed2.month = i2.month AND ed2.year = i2.year),
           0) AS days
  FROM invoice_items ii2
  JOIN invoices i2 ON i2.id = ii2.invoice_id
  JOIN student_enrollments enr2 ON enr2.student_id = i2.student_id AND enr2.status = 'active'
  JOIN class_groups cg2 ON cg2.id = enr2.class_group_id
  WHERE ii2.category = 'facility'
    AND ii2.deleted_at IS NULL
    AND ii2.paid_amount = 0
    AND ii2.quantity IS NOT NULL
    AND ii2.unit_price IS NOT NULL
    AND ii2.amount = 0
)
UPDATE invoice_items ii
SET quantity = r.days,
    amount   = ii.unit_price * r.days,
    name     = regexp_replace(ii.name, '\s+\(\d+ hari\)$', '') || ' (' || r.days || ' hari)'
FROM resolved r
WHERE ii.id = r.item_id
  AND r.days > 0;

-- ── 2) Recalculate total invoice (statement TERPISAH — item sudah ter-commit) ──
WITH agg AS (
  SELECT ii.invoice_id,
         COALESCE(SUM(ii.amount), 0)      AS new_total,
         COALESCE(SUM(ii.paid_amount), 0) AS new_paid
  FROM invoice_items ii
  JOIN _fix_facility_invoices t ON t.invoice_id = ii.invoice_id
  GROUP BY ii.invoice_id
)
UPDATE invoices i
SET total_amount = agg.new_total,
    paid_amount  = agg.new_paid,
    status = CASE
        WHEN agg.new_paid >= agg.new_total THEN 'paid'
        WHEN agg.new_paid > 0             THEN 'partial'
        ELSE 'unpaid'
    END
FROM agg
WHERE i.id = agg.invoice_id;

DROP TABLE _fix_facility_invoices;

COMMIT;

-- ============================================================
-- Verifikasi setelah COMMIT:
-- ============================================================
-- Item fasilitas September yg tadinya 0 hari harus bernilai benar:
-- SELECT ii.id, i.student_id, s.full_name, ii.name, ii.quantity, ii.amount
-- FROM invoice_items ii JOIN invoices i ON i.id = ii.invoice_id
-- JOIN students s ON s.id = i.student_id
-- WHERE i.student_id IN (9, 36, 67, 177, 230) AND ii.category = 'facility'
--   AND i.month = 9 AND i.year = 2026 AND ii.deleted_at IS NULL;
