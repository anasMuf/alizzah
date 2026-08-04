-- ============================================================
-- Migrasi: Perbaiki item facility (antar jemput dll) dengan quantity=0
-- ============================================================
-- Masalah:  Item facility unit "per_day" bisa memiliki quantity=0
--           karena effective_days per-rombel sudah dihapus (soft-delete)
--           dan kode lama tidak punya fallback ke per-jenjang.
-- Solusi:   Hitung ulang quantity & amount dari effective_days
--           (rombel dulu, fallback jenjang).
--
-- Perubahan kode terkait:
--   - apps/api/service/invoice_generate_service.go:
--     AddFacilityToMonthlyRange (fallback per-jenjang)
--
-- Jalankan di local (alizzah_test) dulu, lalu production.
-- ============================================================

BEGIN;

-- 1. Preview: item facility dengan quantity=0
SELECT ii.id, ii.invoice_id, ii.name, ii.amount, ii.quantity, ii.unit_price,
       i.student_id, i.month, i.year,
       COALESCE(ed_rombel.total_days, ed_jenjang.total_days) AS effective_days
FROM invoice_items ii
JOIN invoices i ON i.id = ii.invoice_id
JOIN student_enrollments se ON se.student_id = i.student_id AND se.status = 'active'
JOIN class_groups cg ON cg.id = se.class_group_id
LEFT JOIN effective_days ed_rombel ON (
    ed_rombel.class_group_id = se.class_group_id
    AND ed_rombel.month = i.month
    AND ed_rombel.year = i.year
    AND ed_rombel.deleted_at IS NULL
)
LEFT JOIN effective_days ed_jenjang ON (
    ed_jenjang.level = cg.level
    AND ed_jenjang.class_group_id = 0
    AND ed_jenjang.month = i.month
    AND ed_jenjang.year = i.year
    AND ed_jenjang.deleted_at IS NULL
)
WHERE ii.category = 'facility'
  AND ii.quantity = 0
  AND ii.unit_price IS NOT NULL
ORDER BY ii.id;

-- 2. Tangkap invoice_id yang akan berubah (sebelum update item)
CREATE TEMP TABLE _migrate_facility_invoices AS
SELECT DISTINCT ii.invoice_id
FROM invoice_items ii
WHERE ii.category = 'facility'
  AND ii.quantity = 0
  AND ii.unit_price IS NOT NULL;

-- 3. Update item facility: hitung ulang quantity & amount
UPDATE invoice_items ii SET
    quantity = days.total_days,
    amount = ii.unit_price * days.total_days,
    name = regexp_replace(ii.name, '\(0 hari\)', '(' || days.total_days || ' hari)')
FROM (
    SELECT 
        ii2.id,
        COALESCE(ed_rombel.total_days, ed_jenjang.total_days) AS total_days
    FROM invoice_items ii2
    JOIN invoices i ON i.id = ii2.invoice_id
    JOIN student_enrollments se ON se.student_id = i.student_id AND se.status = 'active'
    JOIN class_groups cg ON cg.id = se.class_group_id
    LEFT JOIN effective_days ed_rombel ON (
        ed_rombel.class_group_id = se.class_group_id
        AND ed_rombel.month = i.month
        AND ed_rombel.year = i.year
        AND ed_rombel.deleted_at IS NULL
    )
    LEFT JOIN effective_days ed_jenjang ON (
        ed_jenjang.level = cg.level
        AND ed_jenjang.class_group_id = 0
        AND ed_jenjang.month = i.month
        AND ed_jenjang.year = i.year
        AND ed_jenjang.deleted_at IS NULL
    )
    WHERE ii2.category = 'facility'
      AND ii2.quantity = 0
      AND ii2.unit_price IS NOT NULL
      AND COALESCE(ed_rombel.total_days, ed_jenjang.total_days) IS NOT NULL
) days
WHERE ii.id = days.id;

-- 4. Update total_amount invoice yang item-nya berubah
UPDATE invoices i SET total_amount = calc.total
FROM (
    SELECT invoice_id, SUM(amount) AS total
    FROM invoice_items
    WHERE invoice_id IN (SELECT invoice_id FROM _migrate_facility_invoices)
    GROUP BY invoice_id
) calc
WHERE i.id = calc.invoice_id;

-- 5. Bersihkan temp table
DROP TABLE _migrate_facility_invoices;

COMMIT;
