-- ============================================================
-- Fix (lanjutan): Recalculate total invoice September setelah item
-- fasilitas per_day diperbaiki oleh fix_facility_zero_days.sql
-- ============================================================
-- Catatan: versi PERTAMA fix_facility_zero_days.sql meng-update item (quantity/
-- amount/nama) TAPI recalc total invoice-nya tidak berlaku karena di PostgreSQL
-- CTE yang mengubah data tidak terlihat oleh CTE lain dalam statement yang sama
-- (snapshot sama) — sehingga total invoice dihitung dari amount item yang LAMA.
--
-- Script ini menjalankan ulang recalc total invoice untuk bulan yang item
-- fasilitasnya sudah diperbaiki (statement terpisah, item sudah ter-commit).
-- Idempoten & aman dijalankan ulang.
--
-- Jalankan di production.
-- ============================================================

BEGIN;

-- Recalc semua invoice bulanan September 2026 milik siswa yang item
-- fasilitasnya diperbaiki oleh script sebelumnya.
WITH affected AS (
  SELECT DISTINCT i.id AS invoice_id
  FROM invoices i
  WHERE i.type = 'monthly' AND i.month = 9 AND i.year = 2026
    AND i.student_id IN (9, 36, 67, 177, 230)
),
agg AS (
  SELECT ii.invoice_id,
         COALESCE(SUM(ii.amount), 0)      AS new_total,
         COALESCE(SUM(ii.paid_amount), 0) AS new_paid
  FROM invoice_items ii
  JOIN affected a ON a.invoice_id = ii.invoice_id
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

COMMIT;

-- ============================================================
-- Verifikasi setelah COMMIT:
-- ============================================================
-- SELECT i.student_id, i.status, i.total_amount, i.paid_amount,
--        i.total_amount - i.paid_amount AS sisa
-- FROM invoices i
-- WHERE i.student_id IN (9, 36, 67, 177, 230) AND i.type = 'monthly'
--   AND i.month = 9 AND i.year = 2026
-- ORDER BY i.student_id;
--
-- Ekspektasi (total = jumlah seluruh item, termasuk fasilitas):
--   siswa 9  → 454.000 (14 hari × 15rb = 210rb sudah masuk)
--   siswa 36 → 454.000
--   siswa 67 → 871.000 (partial, sudah ada bayaran 18rb)
--   siswa 177→ 881.000
--   siswa 230→ 831.000 (berisi Calisan juga — lebih besar karena itemnya lebih banyak)
