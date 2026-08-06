-- ============================================================
-- Fix: Hapus item Taekwondo dari invoice siswa 105
-- ============================================================
-- Masalah: Siswa 105 (MUHAMMAD DYLAN YUSUF DZUHAIRI) pindah
--          dari pasta Taekwondo ke Laptop Kids per 5 Agustus 2026.
--          Taekwondo sudah di-unenroll (end_date = 2026-08-05),
--          tapi item Taekwondo masih muncul di invoice Agustus
--          dan bulan-bulan berikutnya.
--
--          Kebijakan: Taekwondo Agustus HANGUS (tidak ditagih).
--
-- Jalankan di alizzah_test dulu, lalu production.
--
-- Backup dulu:
--   pg_dump -t invoices -t invoice_items -t payment_items > backup_fix_105.sql
-- ============================================================

BEGIN;

-- 1. Hapus semua item Taekwondo untuk student 105
--    (hanya yang paid_amount = 0, aman karena memang belum dibayar)
DELETE FROM invoice_items
WHERE id IN (
    SELECT ii.id
    FROM invoice_items ii
    JOIN invoices i ON ii.invoice_id = i.id
    WHERE i.student_id = 105
      AND ii.name = 'Taekwondo'
      AND ii.paid_amount = 0
);

-- 2. Recalculate total_amount, paid_amount, dan status invoice
--    untuk semua invoice bulanan Agustus 2026 ke atas
WITH agg AS (
    SELECT
        ii.invoice_id,
        COALESCE(SUM(ii.amount), 0)      AS new_total,
        COALESCE(SUM(ii.paid_amount), 0)  AS new_paid
    FROM invoice_items ii
    WHERE ii.invoice_id IN (
        SELECT id FROM invoices
        WHERE student_id = 105
          AND type = 'monthly'
          AND (year > 2026 OR (year = 2026 AND month >= 8))
    )
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

COMMIT;

-- ============================================================
-- Verifikasi (jalankan manual setelah COMMIT):
-- ============================================================

-- Pastikan Taekwondo sudah hilang:
-- SELECT ii.name, i.month, i.year
-- FROM invoice_items ii
-- JOIN invoices i ON ii.invoice_id = i.id
-- WHERE i.student_id = 105 AND ii.name = 'Taekwondo';
-- -- Harus: 0 rows

-- Cek ringkasan invoice:
-- SELECT month, year, status, total_amount, paid_amount,
--        total_amount - paid_amount AS sisa
-- FROM invoices
-- WHERE student_id = 105 AND type = 'monthly'
-- ORDER BY year, month;

-- Cek detail invoice Agustus:
-- SELECT ii.name, ii.category, ii.amount, ii.paid_amount, ii.status
-- FROM invoice_items ii
-- WHERE ii.invoice_id = (
--     SELECT id FROM invoices
--     WHERE student_id = 105 AND type = 'monthly'
--       AND month = 8 AND year = 2026
-- );
