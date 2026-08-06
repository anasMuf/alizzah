-- ============================================================
-- Fix: Hapus semua item pasta stale (unenroll tapi item masih
--      muncul di invoice bulanan)
-- ============================================================
-- Masalah: 4 siswa unenroll dari pasta, tapi item pasta tetap
--          muncul di invoice bulan berikutnya. Total 41 item
--          senilai Rp 2.500.000. Semua paid_amount = 0.
--
-- Siswa terdampak:
--   #16  - MUHAMMAD ZAVIER ALFARIZKY (Melukis & Mewarnai)
--   #62  - RAYYA FAHIMA SALWA RAMADHANI (Melukis & Mewarnai)
--   #227 - SHAKEEL ABHIVANDYA ROFIQI (Laptop Kids, Calisan)
--
-- Jalankan di alizzah_test dulu, lalu production.
--
-- Backup dulu:
--   pg_dump -t invoices -t invoice_items -t payment_items > backup_stale_pasta.sql
-- ============================================================

BEGIN;

-- 1. Capture invoice IDs yang terdampak SEBELUM menghapus item
CREATE TEMP TABLE _stale_invoices AS
SELECT DISTINCT i.id AS invoice_id
FROM invoice_items ii
JOIN invoices i ON ii.invoice_id = i.id
JOIN student_extracurriculars se
    ON se.student_id = i.student_id
    AND se.extracurricular_id = (
        SELECT e2.id FROM extracurriculars e2
        WHERE e2.name = ii.name AND e2.type = 'pasta'
        LIMIT 1
    )
WHERE se.end_date IS NOT NULL
  AND se.deleted_at IS NULL
  AND ii.category = 'pasta'
  AND ii.paid_amount = 0
  AND ii.deleted_at IS NULL
  AND i.deleted_at IS NULL
  AND i.type = 'monthly';

-- 2. Hapus item pasta stale
DELETE FROM invoice_items
WHERE id IN (
    SELECT ii.id
    FROM invoice_items ii
    JOIN invoices i ON ii.invoice_id = i.id
    JOIN student_extracurriculars se
        ON se.student_id = i.student_id
        AND se.extracurricular_id = (
            SELECT e2.id FROM extracurriculars e2
            WHERE e2.name = ii.name AND e2.type = 'pasta'
            LIMIT 1
        )
    WHERE se.end_date IS NOT NULL
      AND se.deleted_at IS NULL
      AND ii.category = 'pasta'
      AND ii.paid_amount = 0
      AND ii.deleted_at IS NULL
      AND i.deleted_at IS NULL
      AND i.type = 'monthly'
);

-- 3. Recalculate total_amount, paid_amount, dan status
WITH agg AS (
    SELECT
        ii.invoice_id,
        COALESCE(SUM(ii.amount), 0)      AS new_total,
        COALESCE(SUM(ii.paid_amount), 0)  AS new_paid
    FROM invoice_items ii
    WHERE ii.invoice_id IN (SELECT invoice_id FROM _stale_invoices)
      AND ii.deleted_at IS NULL
    GROUP BY ii.invoice_id
)
UPDATE invoices i
SET
    total_amount = agg.new_total,
    paid_amount  = agg.new_paid,
    status = CASE
        WHEN agg.new_paid >= agg.new_total THEN 'paid'
        WHEN agg.new_paid > 0             THEN 'partial'
        ELSE 'unpaid'
    END
FROM agg
WHERE i.id = agg.invoice_id;

-- 4. Cleanup temp table
DROP TABLE IF EXISTS _stale_invoices;

COMMIT;

-- ============================================================
-- Verifikasi (jalankan manual setelah COMMIT):
-- ============================================================

-- Pastikan tidak ada lagi stale items:
-- SELECT COUNT(*) AS sisa_stale
-- FROM invoice_items ii
-- JOIN invoices i ON ii.invoice_id = i.id
-- JOIN student_extracurriculars se
--     ON se.student_id = i.student_id
--     AND se.extracurricular_id = (
--         SELECT e2.id FROM extracurriculars e2
--         WHERE e2.name = ii.name AND e2.type = 'pasta'
--         LIMIT 1
--     )
-- WHERE se.end_date IS NOT NULL
--   AND se.deleted_at IS NULL
--   AND ii.category = 'pasta'
--   AND ii.deleted_at IS NULL
--   AND i.deleted_at IS NULL
--   AND i.type = 'monthly';
-- -- Harus: 0

-- Cek ringkasan invoice siswa terdampak:
-- SELECT i.student_id, s.full_name, i.month, i.year,
--        i.status, i.total_amount, i.paid_amount,
--        i.total_amount - i.paid_amount AS sisa
-- FROM invoices i
-- JOIN students s ON i.student_id = s.id
-- WHERE i.student_id IN (16, 62, 227)
--   AND i.type = 'monthly'
--   AND i.deleted_at IS NULL
-- ORDER BY i.student_id, i.year, i.month;
